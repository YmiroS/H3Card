import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "worker"))
import autostart
from agent import AgentError, WorkerAgent, node_launcher_for


class NodeAutostartTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "安装目录 with spaces" / "chouka"
        (self.root / "worker").mkdir(parents=True)
        for path in (self.root.parent / "python_embeded/python.exe",
                     self.root.parent / "ComfyUI/main.py", self.root / "worker/agent.py",
                     self.root / "worker/restart_node.py"):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.touch()
        self.config = {"server_url": "https://controller.invalid", "enrollment_token": "SECRET",
                       "worker_name": "TEST", "comfy_url": "http://127.0.0.1:8188",
                       "comfy_input_dir": str(self.root.parent / "ComfyUI/input")}
        for name in ("启动Windows节点.bat", "启动Windows节点_4090.bat",
                     "启动Windows节点_A6000.bat", "启动Windows节点_PRO6000_96GB.bat"):
            (self.root / name).write_bytes((ROOT / name).read_bytes())
        self.save_config()

    def save_config(self):
        (self.root / "worker/config.json").write_text(json.dumps(self.config), encoding="utf-8")

    def describe(self, names=("NVIDIA GeForce RTX 5090 D",)):
        return autostart.describe_installation(self.root, [{"name": name} for name in names])

    def test_existing_device_profiles_reuse_exact_launchers_without_writes(self):
        before = {str(path): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        cases = {"NVIDIA GeForce RTX 5090 D": "", "NVIDIA GeForce RTX 5090": "",
                 "NVIDIA GeForce RTX 4090": "_4090", "NVIDIA RTX A6000": "_A6000",
                 "NVIDIA RTX PRO 6000 Blackwell Workstation Edition": "_PRO6000_96GB"}
        task_names = set()
        for gpu, suffix in cases.items():
            with self.subTest(gpu=gpu):
                plan = self.describe([gpu])
                self.assertEqual(Path(plan["launcher"]).name, f"启动Windows节点{suffix}.bat")
                self.assertNotIn("SECRET", json.dumps(plan))
                self.assertEqual(set(plan), {"task_name", "launcher", "working_directory", "config", "python"})
                task_names.add(plan["task_name"])
        self.assertEqual(len(task_names), 1)
        after = {str(path): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(before, after)
        self.assertFalse((self.root / "worker/worker-state.json").exists())
        self.assertFalse((self.root / "worker/logs").exists())

    def test_explicit_existing_launcher_has_priority_without_gpu_probe(self):
        self.config["node_launcher"] = "../启动Windows节点_A6000.bat"
        self.save_config()
        with mock.patch.object(WorkerAgent, "_nvidia_gpus", side_effect=AssertionError("No probing")):
            plan = autostart.describe_installation(self.root)
        self.assertTrue(plan["launcher"].endswith("启动Windows节点_A6000.bat"))
        agent = WorkerAgent.__new__(WorkerAgent)
        agent.config, agent.config_path = self.config, self.root / "worker/config.json"
        with mock.patch.object(WorkerAgent, "_nvidia_gpus", side_effect=AssertionError("No probing")):
            self.assertEqual(agent.node_launcher_path(), Path(plan["launcher"]))

    def test_missing_unknown_and_mixed_gpus_are_not_guessed_for_install(self):
        for names in ([], ["RTX 4070 Ti"], ["RTX 5090", "RTX 4090"],
                      ["RTX 4090", "RTX A6000"], ["RTX 5090", "Unknown GPU"]):
            with self.subTest(names=names), self.assertRaises(AgentError):
                self.describe(names)

    def test_same_profile_multi_gpu_and_pro6000_restart_use_same_selection(self):
        plan = self.describe(["RTX 4090", "RTX 4090"])
        self.assertTrue(plan["launcher"].endswith("_4090.bat"))
        devices = [{"name": "NVIDIA RTX PRO 6000 Blackwell Workstation Edition"}]
        self.assertEqual(node_launcher_for(self.root / "worker/config.json", self.config, devices),
                         self.root / "启动Windows节点_PRO6000_96GB.bat")

    def test_invalid_config_mismatches_fail_without_changes(self):
        for patch in ({"comfy_url": "http://remote:8188"}, {"comfy_url": "http://127.0.0.1:8190"},
                      {"comfy_url": "http://127.0.0.1:8188/base"},
                      {"comfy_input_dir": str(self.root / "wrong-input")},
                      {"node_launcher": "../unsafe & launch.bat"},
                      {"node_launcher": str(self.root.parent / "outside.bat")}):
            with self.subTest(patch=patch):
                original = copy.deepcopy(self.config)
                self.config.update(patch)
                self.save_config()
                before = (self.root / "worker/config.json").read_bytes()
                with self.assertRaises((AgentError, OSError)):
                    self.describe()
                self.assertEqual((self.root / "worker/config.json").read_bytes(), before)
                self.config = original

    def test_launcher_contract_and_missing_files_fail_closed(self):
        launcher = self.root / "启动Windows节点.bat"
        original = launcher.read_text(encoding="utf-8")
        for before, after in (("--instance-status", "--not-supported"),
                              ('set "WORKER_CONFIG=worker\\config.json"',
                               'set "WORKER_CONFIG=worker\\another.json"'),
                              ('set "PY=..\\python_embeded\\python.exe"',
                               'set "PY=%UNTRUSTED%"')):
            with self.subTest(before=before):
                launcher.write_text(original.replace(before, after), encoding="utf-8")
                with self.assertRaises(AgentError):
                    self.describe()
        launcher.write_text(original, encoding="utf-8")
        (self.root / "worker/restart_node.py").unlink()
        with self.assertRaises(AgentError):
            self.describe()

    def test_cli_does_not_echo_secret_parser_errors(self):
        with mock.patch.object(autostart, "describe_installation", side_effect=ValueError("SECRET")), \
             mock.patch.object(sys, "argv", ["autostart.py", "--describe"]), \
             mock.patch("sys.stderr") as output:
            self.assertEqual(autostart.main(), 1)
        self.assertNotIn("SECRET", str(output.write.call_args_list))

    @unittest.skipUnless(os.name == "nt", "Windows PowerShell contract test")
    def test_powershell_registration_is_mocked_and_uses_password_boot_limited_task(self):
        harness = r'''
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($env:CHOUKA_AUTOSTART_SCRIPT, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Parser errors' }
foreach ($statement in $ast.EndBlock.Statements) {
    if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) {
        Invoke-Expression $statement.Extent.Text
    }
}
$script:registered = 0; $script:removed = 0; $script:latest = $null
function Get-ExistingTask { param($Plan) return $script:latest }
function Get-Credential {
    param($UserName, $Message)
    return New-Object Management.Automation.PSCredential($UserName, (ConvertTo-SecureString 'fake-test-password' -AsPlainText -Force))
}
function New-ScheduledTaskAction {
    param($Execute, $Argument, $WorkingDirectory)
    return [pscustomobject]@{Execute=$Execute; Arguments=$Argument; WorkingDirectory=$WorkingDirectory}
}
function New-ScheduledTaskTrigger {
    param([switch]$AtStartup)
    if (-not $AtStartup) { throw 'Expected boot trigger' }
    return [pscustomobject]@{Delay=''}
}
function New-ScheduledTaskSettingsSet {
    param([switch]$StartWhenAvailable, $MultipleInstances, $RestartCount, $RestartInterval,
          [switch]$AllowStartIfOnBatteries, [switch]$DontStopIfGoingOnBatteries, $ExecutionTimeLimit)
    if (-not $StartWhenAvailable -or $MultipleInstances -ne 'IgnoreNew' -or
        $RestartCount -ne 3 -or $RestartInterval.TotalMinutes -ne 1 -or
        -not $AllowStartIfOnBatteries -or -not $DontStopIfGoingOnBatteries -or
        $ExecutionTimeLimit -ne [TimeSpan]::Zero) { throw 'Wrong task settings' }
    return [pscustomobject]@{Checked=$true}
}
function New-Item { param($ItemType, $Path, [switch]$Force, $ErrorAction) }
function Register-ScheduledTask {
    param($TaskName,$TaskPath,$Action,$Trigger,$Settings,$User,$Password,$RunLevel,$Description,$ErrorAction,[switch]$Force)
    $script:registered++
    if ($RunLevel -ne 'Limited' -or $User -ne [Security.Principal.WindowsIdentity]::GetCurrent().Name -or
        $Password -ne 'fake-test-password' -or $Trigger.Delay -ne 'PT60S' -or -not $Settings.Checked) {
        throw 'Wrong registration contract'
    }
}
function Start-ScheduledTask { throw 'Must never start a task' }
function Stop-Process { throw 'Must never stop services' }
$PSScriptRoot = Split-Path -Parent $env:CHOUKA_AUTOSTART_SCRIPT
$plan = [pscustomobject]@{TaskName='ChoukaNode-1234567890abcdef'; Command='C:\Windows\System32\cmd.exe';
    Arguments='/d /c call .\test.bat --no-pause'; WorkingDirectory='C:\install with spaces'; Launcher='C:\install with spaces\test.bat'}
Install-StartupTask $plan $null
if ($script:registered -ne 1) { throw 'Task was not registered once' }
$owned = [pscustomobject]@{Actions=@([pscustomobject]@{Execute=$plan.Command; Arguments=$plan.Arguments; WorkingDirectory=$plan.WorkingDirectory})}
Assert-OwnedTask $owned $plan
$owned.Actions[0].Arguments='foreign action'
$rejected=$false
try { Install-StartupTask $plan $owned } catch { $rejected=$true }
if (-not $rejected -or $script:registered -ne 1) { throw 'Unknown task was overwritten' }
# A colliding task appearing between the first check and registration is also rejected.
$script:latest=$owned
$rejected=$false
try { Install-StartupTask $plan $null } catch { $rejected=$true }
if (-not $rejected -or $script:registered -ne 1) { throw 'Late collision was overwritten' }
$script:latest=$null
function Get-Credential { param($UserName,$Message) return $null }
$rejected=$false
try { Install-StartupTask $plan $null } catch { $rejected=$true }
if (-not $rejected -or $script:registered -ne 1) { throw 'Cancelled credentials registered a task' }
Write-Output 'MOCK_TASK_CONTRACT_PASS'
'''
        result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", harness],
                                env={**os.environ, "CHOUKA_AUTOSTART_SCRIPT": str(ROOT / "worker/autostart.ps1")},
                                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=40)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("MOCK_TASK_CONTRACT_PASS", result.stdout)
        self.assertNotIn("fake-test-password", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
