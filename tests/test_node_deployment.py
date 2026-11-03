import asyncio
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT.parent / "一键部署节点.cmd"
sys.path.insert(0, str(ROOT / "worker"))
from agent import WorkerAgent


class DeploymentGateTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.config = self.directory / "config.json"
        self.config.write_text(json.dumps({
            "server_url": "http://controller.invalid",
            "comfy_input_dir": str(self.directory / "input"),
            "deployment_drain_file": "drain.json",
            "deployment_ack_file": "ack.json",
            "deployment_signal_file": "signal.json",
        }), encoding="utf-8")
        self.worker = WorkerAgent(self.config)
        self.worker.comfy_online = True
        self.worker._json_request = mock.AsyncMock(return_value=None)

    def drain(self):
        (self.directory / "drain.json").write_text('{"token":"unique-update"}')

    async def test_drain_prevents_acquire_without_contacting_controller(self):
        self.drain()
        self.assertIsNone(await self.worker.acquire())
        self.worker._json_request.assert_not_awaited()

    async def test_ack_requires_idle_online_worker_and_matching_token(self):
        self.drain()
        for field, value in (("current", {"job_id": "job"}), ("local_busy", True),
                             ("release_failed", "unconfirmed"), ("comfy_online", False),
                             ("pending_sync", {"type": "sync_files"})):
            before = getattr(self.worker, field)
            setattr(self.worker, field, value)
            self.worker.acknowledge_deployment()
            self.assertFalse((self.directory / "ack.json").exists(), field)
            setattr(self.worker, field, before)
        self.worker.acknowledge_deployment()
        ack = json.loads((self.directory / "ack.json").read_text())
        self.assertEqual(ack["token"], "unique-update")
        self.assertEqual(ack["pid"], os.getpid())
        self.assertLess(abs(ack["time"] - time.time()), 5)
        self.assertTrue(self.worker.deployment_blocks_jobs())

    async def test_removing_gate_restores_acquire(self):
        self.drain()
        (self.directory / "drain.json").unlink()
        await self.worker.acquire()
        self.worker._json_request.assert_awaited_once()

    async def test_acquire_in_flight_is_not_acknowledged_before_execution(self):
        started = asyncio.Event()
        release = asyncio.Event()

        async def response(*args, **kwargs):
            started.set()
            await release.wait()
            return {"job_id": "leased"}

        self.worker._json_request.side_effect = response
        task = asyncio.create_task(self.worker.acquire())
        await started.wait()
        self.drain()
        release.set()
        assignment = await task
        self.worker.current = assignment
        self.worker.acknowledge_deployment()
        self.assertFalse((self.directory / "ack.json").exists())
        self.worker.current = None
        self.worker.acknowledge_deployment()
        self.assertTrue((self.directory / "ack.json").exists())

    async def test_completed_signal_report_deduplicates_after_ack(self):
        result = {"request_id": "request-1", "status": "done", "message": "updated"}
        (self.directory / "signal.json").write_text(json.dumps(result))
        self.worker.refresh_deployment_report()
        self.assertEqual(self.worker.sync_report, result)
        self.worker.sync_report = None
        self.worker.state["last_maintenance_request_id"] = "request-1"
        self.worker.refresh_deployment_report()
        self.assertIsNone(self.worker.sync_report)

    @unittest.skipUnless(os.name == "nt", "Windows updater launch")
    async def test_shared_update_never_invokes_git_or_legacy_restart(self):
        deploy = self.directory / "deploy.cmd"
        deploy.touch()
        self.worker.config["deployment_script"] = str(deploy)
        self.worker.pending_sync = {"request_id": "request-1", "type": "sync_files"}
        self.worker.local_status = mock.AsyncMock()
        self.worker.pull_code = mock.AsyncMock()
        self.worker.schedule_node_restart = mock.AsyncMock()
        with mock.patch("agent.subprocess.Popen") as launch:
            await self.worker.execute_pending_sync()
        launch.assert_called_once()
        self.worker.pull_code.assert_not_awaited()
        self.worker.schedule_node_restart.assert_not_awaited()
        self.assertIsNone(self.worker.pending_sync)
        self.assertEqual(json.loads((self.directory / "signal.json").read_text())["status"], "running")


@unittest.skipUnless(os.name == "nt" and shutil.which("powershell.exe") and SCRIPT.is_file(),
                     "Windows portable package bootstrap required")
class DeploymentScriptTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="node 部署 space ")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.source = self.directory / "source"
        self.target = self.directory / "target"
        self.target.mkdir()
        self.control = self.target / "节点部署"
        self.control.mkdir()
        for relative in ("ComfyUI/main.py", "python_embeded/python.exe", "chouka/worker/agent.py"):
            self.file(relative, "runtime")
        self.env = dict(os.environ, TEST_DEPLOY_SCRIPT=str(SCRIPT), TEST_SOURCE=str(self.source),
                        TEST_TARGET=str(self.target), TEST_CONTROL=str(self.control))

    def file(self, relative, value):
        path = self.source / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding="utf-8")
        return path

    def ps(self, body, succeeds=True):
        harness = r'''
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding=New-Object Text.UTF8Encoding
$Utf8=New-Object Text.UTF8Encoding($false)
$text=[IO.File]::ReadAllText($env:TEST_DEPLOY_SCRIPT,[Text.Encoding]::UTF8)
$body=($text -split '(?m)^#==POWERSHELL==\r?$',2)[1]
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseInput($body,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($statement in $ast.EndBlock.Statements) {
    if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) { Invoke-Expression $statement.Extent.Text }
}
$Source=$env:TEST_SOURCE; $Target=$env:TEST_TARGET; $Control=$env:TEST_CONTROL
''' + body
        result = subprocess.run(["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", harness],
                                env=self.env, capture_output=True, encoding="utf-8", errors="replace", timeout=90)
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def test_inventory_excludes_all_worker_state_variants_and_custom_state(self):
        excluded = ["chouka/worker/worker_state.json", "chouka/worker/worker-state.json",
                    "chouka/worker/worker_state.json.tmp.5", "chouka/worker/worker-state-old.json",
                    "chouka/worker/identity/custom.json", "chouka/worker/identity/custom.json.tmp.12345",
                    "chouka/worker/identity/custom.json.bak", "chouka/worker/config.json",
                    "ComfyUI/output/result.png", "ComfyUI/user/default/comfy.settings.json",
                    "ComfyUI/user/manager/config.ini", "ComfyUI/.git/config", "ComfyUI/.env",
                    "ComfyUI/models/.cache/token.json", "python_embeded/__pycache__/a.pyc"]
        for relative in excluded:
            self.file(relative, "PRIVATE")
        self.file("chouka/worker/config.json", json.dumps({"state_file": "identity/custom.json"}))
        self.file("ComfyUI/user/default/workflows/工作流.json", "workflow")
        self.file("ComfyUI/models/model.safetensors", "model")
        self.file("启动.bat", "launcher")
        inventory = json.loads(self.ps("ConvertTo-Json -InputObject @(Get-Inventory $Source) -Depth 5"))
        paths = {x["Relative"].replace("\\", "/") for x in inventory}
        for relative in excluded:
            self.assertNotIn(relative, paths)
        self.assertIn("ComfyUI/user/default/workflows/工作流.json", paths)
        self.assertIn("ComfyUI/models/model.safetensors", paths)
        self.assertIn("启动.bat", paths)

    def test_real_robocopy_staging_apply_and_rollback_preserve_identity(self):
        self.file("ComfyUI/中文 file.txt", "new runtime")
        self.file("根目录启动.bat", "root launcher")
        self.file("chouka/worker/worker_state.json", "REMOTE ID")
        state = self.target / "chouka/worker/worker-state.json"
        state.parent.mkdir(parents=True)
        state.write_text("LOCAL ID")
        old = self.target / "ComfyUI/中文 file.txt"
        old.parent.mkdir(parents=True)
        old.write_text("old runtime")
        os.utime(old, (1, 1))
        self.ps(r'''
$files=@(Get-Inventory $Source)
$delta=@(Get-Delta $files $Target)
Copy-Delta $delta $Source (Join-Path $Control 'stage')
Apply-Delta $delta
if ([IO.File]::ReadAllText((Join-Path $Target 'ComfyUI\中文 file.txt')) -ne 'new runtime') { throw 'Apply failed' }
if (@(Get-Delta $files $Target).Count) { throw 'Not incremental' }
Restore-Transaction
''')
        self.assertEqual(old.read_text(), "old runtime")
        self.assertEqual(state.read_text(), "LOCAL ID")
        self.assertFalse((self.target / "chouka/worker/worker_state.json").exists())
        self.assertFalse((self.target / "python_embeded/python.exe").exists())

    def test_initial_config_uses_entered_name_and_never_copies_source_identity(self):
        self.file("chouka/worker/config.json", json.dumps({
            "server_url": "https://controller.invalid", "enrollment_token": "enrollment-only",
            "worker_name": "SOURCE", "is_primary_node": True,
            "capacity_host_id": "SOURCE-HOST", "state_file": "source-private.json",
            "node_launcher": "E:/source/launcher.bat", "worker_token": "DO-NOT-COPY",
        }))
        self.ps(r'''
function nvidia-smi.exe { 'NVIDIA GeForce RTX 4090'; $global:LASTEXITCODE=0 }
$Node=[pscustomobject]@{name='用户输入的节点名'}
Write-Json (Join-Path $Control 'node.json') $Node
Initialize-Worker
Initialize-Worker
if ((Read-Json (Join-Path $Control 'node.json')).name -ne '用户输入的节点名') { throw 'Node name lost' }
''')
        config = json.loads((self.target / "chouka/worker/config.json").read_text(encoding="utf-8"))
        self.assertEqual(config["worker_name"], "用户输入的节点名")
        self.assertFalse(config["is_primary_node"])
        self.assertEqual(config["state_file"], "worker-state.json")
        self.assertNotIn("capacity_host_id", config)
        self.assertNotIn("worker_token", config)
        self.assertTrue(config["node_launcher"].endswith("启动Windows节点_4090.bat"))
        self.assertEqual(Path(config["comfy_input_dir"]), self.target / "ComfyUI/input")
        self.assertFalse((self.target / "chouka/worker/worker-state.json").exists())
        self.assertEqual(config["enrollment_token"], "enrollment-only")

    def test_5090_selects_generic_launcher(self):
        self.file("chouka/worker/config.json", json.dumps({
            "server_url": "https://controller.invalid", "enrollment_token": "enrollment-only",
        }))
        self.ps(r'''
function nvidia-smi.exe { 'NVIDIA GeForce RTX 5090'; $global:LASTEXITCODE=0 }
$Node=[pscustomobject]@{name='GPU-5090-NEW'}
Initialize-Worker
''')
        config = json.loads((self.target / "chouka/worker/config.json").read_text(encoding="utf-8"))
        self.assertTrue(config["node_launcher"].endswith("启动Windows节点.bat"))

    def test_custom_absolute_state_file_is_excluded(self):
        identity = self.file("chouka/worker/private-identity.json", "SOURCE IDENTITY")
        self.file("chouka/worker/config.json", json.dumps({"state_file": str(identity)}))
        inventory = json.loads(self.ps("ConvertTo-Json -InputObject @(Get-Inventory $Source) -Depth 5"))
        self.assertNotIn("chouka/worker/private-identity.json", {x["Relative"].replace("\\", "/") for x in inventory})

    def test_json_overwrite_is_atomic_and_works_on_powershell_51(self):
        self.ps(r'''
$path=Join-Path $Control 'repeat.json'
Write-Json $path @{attempt=1;name='首次写入'}
Write-Json $path @{attempt=2;name='覆盖写入'}
Write-Json $path @{attempt=3;name='再次覆盖'}
$result=Read-Json $path
if ($result.attempt -ne 3 -or $result.name -ne '再次覆盖') { throw 'JSON overwrite failed' }
if (@(Get-ChildItem -LiteralPath $Control -Filter '*.tmp.*').Count) { throw 'Temporary JSON left behind' }
''')

    def test_existing_processes_without_heartbeat_do_not_bypass_readiness(self):
        self.ps(r'''
Write-Json (Join-Path $Target 'chouka\worker\config.json') @{node_launcher=(Join-Path $Target 'chouka\启动Windows节点.bat')}
function Get-ComfyProcess { [pscustomobject]@{ProcessId=991} }
function Get-NodeWorkers { @([pscustomobject]@{ProcessId=992}) }
function Start-Process { throw 'Unexpected process launch' }
function Start-Sleep { throw 'HEALTH_NOT_READY' }
$failed=$false
try { Start-Node } catch { if ($_.Exception.Message -ne 'HEALTH_NOT_READY') { throw }; $failed=$true }
if (-not $failed) { throw 'Existing processes incorrectly counted as healthy' }
''')

    def test_existing_services_require_matching_heartbeat_pid_and_api(self):
        self.ps(r'''
Write-Json (Join-Path $Target 'chouka\worker\config.json') @{node_launcher=(Join-Path $Target 'chouka\启动Windows节点.bat')}
function Get-ComfyProcess { [pscustomobject]@{ProcessId=991} }
function Get-NodeWorkers { @([pscustomobject]@{ProcessId=992}) }
function Start-Process { throw 'Unexpected process launch' }
function Start-Sleep { throw 'HEALTH_NOT_READY' }
$script:requests=0
function Invoke-RestMethod { $script:requests++; [pscustomobject]@{system=@{ready=$true};devices=@('GPU')} }
$heartbeat=Join-Path $Control 'heartbeat.json'
Write-Json $heartbeat @{pid=992;time=[DateTimeOffset]::UtcNow.AddSeconds(2).ToUnixTimeSeconds();worker_id='local-worker';comfy_online=$true}
Start-Node
if ($script:requests -ne 1) { throw 'Readiness API not checked' }
Write-Json $heartbeat @{pid=999;time=[DateTimeOffset]::UtcNow.AddSeconds(2).ToUnixTimeSeconds();worker_id='old-worker';comfy_online=$true}
$failed=$false
try { Start-Node } catch { if ($_.Exception.Message -ne 'HEALTH_NOT_READY') { throw }; $failed=$true }
if (-not $failed -or $script:requests -ne 1) { throw 'Wrong Worker heartbeat accepted' }
''')

    def test_temporary_readiness_api_failure_is_retried(self):
        self.ps(r'''
Write-Json (Join-Path $Target 'chouka\worker\config.json') @{node_launcher=(Join-Path $Target 'chouka\启动Windows节点.bat')}
function Get-ComfyProcess { [pscustomobject]@{ProcessId=991} }
function Get-NodeWorkers { @([pscustomobject]@{ProcessId=992}) }
function Start-Process { throw 'Unexpected process launch' }
function Start-Sleep {}
$script:requests=0
function Invoke-RestMethod {
    $script:requests++
    if ($script:requests -eq 1) { throw 'Still warming up' }
    [pscustomobject]@{system=@{ready=$true};devices=@('GPU')}
}
Write-Json (Join-Path $Control 'heartbeat.json') @{pid=992;time=[DateTimeOffset]::UtcNow.AddSeconds(2).ToUnixTimeSeconds();worker_id='local-worker';comfy_online=$true}
Start-Node
if ($script:requests -ne 2) { throw 'Transient API failure not retried' }
''')

    def test_partial_stop_failure_attempts_service_recovery(self):
        worker = self.target / 'chouka/worker/agent.py'
        worker.parent.mkdir(parents=True)
        worker.write_text('old worker runtime')
        self.ps(r'''
Write-Json (Join-Path $Target 'chouka\worker\config.json') @{node_launcher='test'}
function Copy-Delta {}
function Wait-Drain { Write-Json (Join-Path $Control 'drain.json') @{token='test'} }
$script:running=$true; $script:restarts=0
function Stop-Node { $script:running=$false; throw 'Injected partial stop failure' }
function Start-Node { $script:restarts++; $script:running=$true }
$failed=$false
try { Invoke-Update } catch { if ($_.Exception.Message -ne 'Injected partial stop failure') { throw }; $failed=$true }
if (-not $failed -or -not $script:running -or $script:restarts -ne 1) { throw 'Partially stopped Worker not recovered' }
if (Test-Path -LiteralPath (Join-Path $Control 'drain.json')) { throw 'Drain gate not released after recovery' }
''')
        self.assertEqual(worker.read_text(), 'old worker runtime')

    def test_no_delta_reports_error_if_service_readiness_fails(self):
        self.ps(r'''
Write-Json (Join-Path $Control 'update-request.json') @{request_id='request-1';status='running';message='pending'}
function Get-Inventory { @() }
function Start-Node { throw 'Injected readiness failure' }
$failed=$false
try { Invoke-Update } catch { if ($_.Exception.Message -ne 'Injected readiness failure') { throw }; $failed=$true }
if (-not $failed) { throw 'Readiness failure swallowed' }
if ((Read-Json (Join-Path $Control 'update-request.json')).status -ne 'error') { throw 'Readiness failure reported as done' }
''')

    def test_no_delta_reports_success_only_after_service_readiness(self):
        self.ps(r'''
Write-Json (Join-Path $Control 'update-request.json') @{request_id='request-1';status='running';message='pending'}
function Get-Inventory { @() }
function Start-Node {
    if ((Read-Json (Join-Path $Control 'update-request.json')).status -ne 'running') { throw 'Premature success report' }
}
Invoke-Update
if ((Read-Json (Join-Path $Control 'update-request.json')).status -ne 'done') { throw 'Successful readiness not reported' }
''')

    def test_rejects_parent_traversal(self):
        self.ps("Join-Safe $Target '..\\escape.txt'", succeeds=False)

    def test_changed_source_stamp_and_size_are_detected(self):
        self.ps(r'''
$first=@(Get-Inventory $Source)
$stamp=Get-InventoryStamp $first
[IO.File]::WriteAllText((Join-Path $Source 'ComfyUI\main.py'),'changed source')
$second=@(Get-Inventory $Source)
if ((Get-InventoryStamp $second) -eq $stamp) { throw 'Source change not detected' }
''')

    def test_no_arguments_prompts_for_name_before_any_installation(self):
        self.ps(r'''
$env:CHOUKA_DEPLOY_SELF=Join-Path $Target 'bootstrap.cmd'
$env:COMPUTERNAME='ISOLATED-NEW-NODE'
[Environment]::SetEnvironmentVariable('CHOUKA_DEPLOY_MODE',$null,'Process')
function Read-Host { throw 'NAME_PROMPT_REACHED' }
try { & ([scriptblock]::Create($body)); throw 'No name prompt' }
catch { if ($_.Exception.Message -ne 'NAME_PROMPT_REACHED') { throw } }
if (Test-Path -LiteralPath (Join-Path $Target 'ComfyUI_Mie_V33')) { throw 'Installation started before name input' }
''')

    def test_existing_runtime_directory_is_never_used_as_new_node_destination(self):
        script = self.source / "部署.cmd"
        script.write_bytes(SCRIPT.read_bytes())
        result = subprocess.run(["cmd.exe", "/d", "/c", str(script), "--update"], capture_output=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("不要在已有 ComfyUI", result.stdout.decode("utf-8"))
        self.assertFalse((self.source / "ComfyUI_Mie_V33").exists())

    def test_cmd_help_runs_without_installation_from_chinese_space_path(self):
        script = self.directory / "部署 script.cmd"
        script.write_bytes(SCRIPT.read_bytes())
        result = subprocess.run(["cmd.exe", "/d", "/c", str(script), "--help"], capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("首次部署", result.stdout.decode("utf-8"))
        self.assertFalse((self.directory / "ComfyUI_Mie_V33").exists())


if __name__ == "__main__":
    unittest.main()
