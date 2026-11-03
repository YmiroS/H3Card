import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "tools/check-environment.ps1"


@unittest.skipUnless(os.name == "nt" and shutil.which("powershell.exe"), "Windows PowerShell required")
class EnvironmentBootstrapTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="chouka env 中文 ")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.git_exe = shutil.which("git.exe")
        if not self.git_exe:
            self.skipTest("Git required for isolated local repository tests")
        self.env = dict(os.environ, CHOUKA_ENV_SCRIPT=str(SCRIPT), CHOUKA_TEST_GIT=self.git_exe,
                        GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull,
                        GIT_AUTHOR_NAME="Bootstrap Test", GIT_COMMITTER_NAME="Bootstrap Test",
                        GIT_AUTHOR_EMAIL="test@example.invalid", GIT_COMMITTER_EMAIL="test@example.invalid",
                        GIT_TERMINAL_PROMPT="0", GIT_ALLOW_PROTOCOL="file")
        self.remote = self.root / "origin.git"
        self.seed = self.root / "seed"
        self.target = self.root / "工作目录 with spaces" / "chouka"
        self.target.parent.mkdir()
        self.git("init", "--bare", "--initial-branch=main", self.remote)
        self.git("init", "--initial-branch=main", self.seed)
        (self.seed / "app.txt").write_text("first\n", encoding="utf-8")
        self.git("-C", self.seed, "add", "app.txt")
        self.git("-C", self.seed, "commit", "-m", "initial")
        self.git("-C", self.seed, "remote", "add", "origin", self.remote)
        self.git("-C", self.seed, "push", "origin", "main")
        self.env.update(CHOUKA_TEST_TARGET=str(self.target), CHOUKA_TEST_REMOTE=str(self.remote))

    def git(self, *args):
        return subprocess.check_output([self.git_exe, *map(str, args)], env=self.env,
                                       stderr=subprocess.PIPE, encoding="utf-8").strip()

    def ps(self, body, **extra):
        # Import functions through the AST: never dot-source the executable entry point.
        harness = r'''
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$script:Warnings=0
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($env:CHOUKA_ENV_SCRIPT,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($statement in $ast.EndBlock.Statements) {
    if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) {
        Invoke-Expression $statement.Extent.Text
    }
}
''' + body
        return subprocess.run(["powershell.exe", "-NoLogo", "-NoProfile", "-Command", harness],
                              env=dict(self.env, **extra), capture_output=True, encoding="utf-8", timeout=90)

    def sync(self, succeeds=True, **extra):
        result = self.ps("Sync-Chouka $env:CHOUKA_TEST_GIT $env:CHOUKA_TEST_TARGET $env:CHOUKA_TEST_REMOTE 'main'", **extra)
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_clone_and_fast_forward_preserve_ignored_config(self):
        (self.seed / ".gitignore").write_text("worker/config.json\n", encoding="utf-8")
        self.git("-C", self.seed, "add", ".gitignore")
        self.git("-C", self.seed, "commit", "-m", "ignore local config")
        self.git("-C", self.seed, "push", "origin", "main")
        self.sync()
        config = self.target / "worker/config.json"
        config.parent.mkdir()
        config.write_text("PRIVATE LOCAL CONFIG", encoding="utf-8")
        (self.seed / "app.txt").write_text("latest\n", encoding="utf-8")
        self.git("-C", self.seed, "commit", "-am", "update")
        self.git("-C", self.seed, "push", "origin", "main")
        self.sync()
        self.assertEqual((self.target / "app.txt").read_text(), "latest\n")
        self.assertEqual(config.read_text(), "PRIVATE LOCAL CONFIG")
        self.sync()  # Already current is also successful.

    def test_ignored_config_is_not_overwritten_by_new_remote_file(self):
        (self.seed / ".gitignore").write_text("worker/config.json\n", encoding="utf-8")
        self.git("-C", self.seed, "add", ".gitignore")
        self.git("-C", self.seed, "commit", "-m", "ignore config")
        self.git("-C", self.seed, "push", "origin", "main")
        self.sync()
        local = self.target / "worker/config.json"
        local.parent.mkdir()
        local.write_text("LOCAL PRIVATE CONFIG", encoding="utf-8")
        remote = self.seed / "worker/config.json"
        remote.parent.mkdir()
        remote.write_text("REMOTE DEFAULT CONFIG", encoding="utf-8")
        self.git("-C", self.seed, "add", "--force", "worker/config.json")
        self.git("-C", self.seed, "commit", "-m", "track formerly ignored config")
        self.git("-C", self.seed, "push", "origin", "main")
        head = self.git("-C", self.target, "rev-parse", "HEAD")
        self.sync(succeeds=False)
        self.assertEqual(local.read_text(), "LOCAL PRIVATE CONFIG")
        self.assertEqual(self.git("-C", self.target, "rev-parse", "HEAD"), head)

    def test_default_target_distinguishes_workspace_and_chouka(self):
        workspace = self.root / "workspace with other git"
        self.git("init", workspace)
        repository = self.root / "installed chouka"
        (repository / "worker").mkdir(parents=True)
        (repository / "server").mkdir()
        (repository / "tools").mkdir()
        (repository / "worker/agent.py").touch()
        (repository / "server/app.py").touch()
        for script_root, expected in ((workspace, workspace / "chouka"),
                                      (repository, repository),
                                      (repository / "tools", repository)):
            with self.subTest(script_root=script_root):
                result = self.ps(r'''
Write-Output (Get-DefaultTarget $env:CHOUKA_TEST_SCRIPT_ROOT)
''', CHOUKA_TEST_SCRIPT_ROOT=str(script_root))
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual(Path(result.stdout.strip()), expected)

    def test_non_repository_is_not_overwritten(self):
        self.target.mkdir()
        marker = self.target / "important.txt"
        marker.write_text("keep me")
        self.sync(succeeds=False)
        self.assertEqual(marker.read_text(), "keep me")
        self.assertFalse((self.target / ".git").exists())

    def test_dirty_and_untracked_files_stop_before_fetch(self):
        self.sync()
        for file in ("app.txt", "new file.txt"):
            with self.subTest(file=file):
                path = self.target / file
                before = path.read_bytes() if path.exists() else None
                path.write_text("local changes")
                head = self.git("-C", self.target, "rev-parse", "HEAD")
                self.sync(succeeds=False)
                self.assertEqual(path.read_text(), "local changes")
                self.assertEqual(self.git("-C", self.target, "rev-parse", "HEAD"), head)
                self.assertFalse((self.target / ".git/FETCH_HEAD").exists())
                if before is None:
                    path.unlink()
                else:
                    path.write_bytes(before)

    def test_wrong_remote_branch_and_detached_head_stop(self):
        self.sync()
        self.sync(succeeds=False, CHOUKA_TEST_REMOTE=str(self.root / "other.git"))
        self.git("-C", self.target, "checkout", "-b", "local-work")
        self.sync(succeeds=False)
        self.git("-C", self.target, "checkout", "--detach")
        self.sync(succeeds=False)
        self.assertFalse((self.target / ".git/FETCH_HEAD").exists())

    def test_local_commits_are_not_rewound(self):
        self.sync()
        (self.target / "app.txt").write_text("local commit")
        self.git("-C", self.target, "commit", "-am", "local work")
        head = self.git("-C", self.target, "rev-parse", "HEAD")
        self.sync(succeeds=False)
        self.assertEqual(self.git("-C", self.target, "rev-parse", "HEAD"), head)

    def test_submodule_cloned_and_dirty_submodule_blocks_update(self):
        sub = self.root / "submodule source"
        self.git("init", "--initial-branch=main", sub)
        (sub / "source.txt").write_text("frontend")
        self.git("-C", sub, "add", ".")
        self.git("-C", sub, "commit", "-m", "frontend")
        self.git("-C", self.seed, "submodule", "add", sub, "frontend")
        self.git("-C", self.seed, "commit", "-am", "add submodule")
        self.git("-C", self.seed, "push", "origin", "main")
        self.sync()
        source = self.target / "frontend/source.txt"
        self.assertEqual(source.read_text(), "frontend")
        source.write_text("uncommitted frontend")
        self.sync(succeeds=False)
        self.assertEqual(source.read_text(), "uncommitted frontend")

    def test_native_argument_quoting_and_exit_code(self):
        arguments = ['空格 with spaces', 'quoted "text"', 'C:\\ends with slash\\', 'a\\"b', '']
        result = self.ps(r'''
$r=Invoke-Tool $env:CHOUKA_TEST_PY @('-c','import json,sys; print(json.dumps(sys.argv[1:],ensure_ascii=True)); sys.exit(7)', '空格 with spaces', 'quoted "text"', 'C:\ends with slash\', 'a\"b', '')
if ($r.Code -ne 7) { throw 'Wrong exit code' }
Write-Output $r.Output
''', CHOUKA_TEST_PY=os.sys.executable)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(json.loads(result.stdout), arguments)

    def test_check_only_never_installs_or_syncs(self):
        result = self.ps(r'''
function Find-Git { return $null }
function Install-Git { throw 'Must not install' }
function Sync-Chouka { throw 'Must not modify repositories' }
function Test-Environment { param($Target) }
$TargetDirectory=$env:CHOUKA_TEST_TARGET; $CheckOnly=$true; $Branch='main'
$code=Main
if ($code -ne 2) { throw 'Missing Git should produce warning exit code' }
''')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.target.exists())

    def test_install_failure_still_runs_diagnostics(self):
        result = self.ps(r'''
function Find-Git { return $null }
function Install-Git { throw 'Offline' }
function Sync-Chouka { throw 'Must not sync without Git' }
$script:diagnosed=$false
function Test-Environment { param($Target) $script:diagnosed=$true }
$TargetDirectory=$env:CHOUKA_TEST_TARGET; $CheckOnly=$false; $Branch='main'
$code=Main
if ($code -ne 1 -or -not $script:diagnosed) { throw 'Failed install must not skip diagnosis' }
''')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_real_git_detection_does_not_assign_readonly_home(self):
        result = self.ps(r'''
$found=Find-Git
if ($found -and (-not (Test-Path -LiteralPath $found.Git) -or -not (Test-Path -LiteralPath $found.Bash))) {
    throw 'Incomplete installation returned'
}
''')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_official_installer_signature_guard_and_cleanup(self):
        for signature, expected_calls, winget in (("Valid", 1, "none"), ("NotSigned", 0, "none"),
                                                  ("Valid", 1, "exception"), ("Valid", 1, "nonzero")):
            with self.subTest(signature=signature, winget=winget):
                result = self.ps(r'''
$script:started=0; $script:download=''
function Get-Command {
    param($Name,$ErrorAction)
    if ($env:CHOUKA_TEST_WINGET -ne 'none') { return [pscustomobject]@{Source='mock-winget.exe'} }
    return $null
}
function Invoke-Tool {
    param($File,$Arguments,$TimeoutSeconds)
    if ($env:CHOUKA_TEST_WINGET -eq 'exception') { throw 'Mock winget launch failure' }
    return [pscustomobject]@{Code=1;Output='';Error='mock winget failure'}
}
function Invoke-RestMethod {
    param($Uri,$Headers,$TimeoutSec)
    return [pscustomobject]@{assets=@([pscustomobject]@{
        name='Git-2.53.0-64-bit.exe';
        browser_download_url='https://github.com/git-for-windows/git/releases/download/v2.53.0.windows.1/Git-2.53.0-64-bit.exe'
    })}
}
function Invoke-WebRequest {
    param([switch]$UseBasicParsing,$Uri,$OutFile,$TimeoutSec)
    $script:download=$OutFile
    [IO.File]::WriteAllText($OutFile,'mock installer - never executed')
}
function Get-AuthenticodeSignature {
    param($LiteralPath)
    return [pscustomobject]@{Status=$env:CHOUKA_TEST_SIGNATURE; SignerCertificate=[pscustomobject]@{Subject='CN=Open Source Developer, Johannes Schindelin'}}
}
function Start-Process {
    param($FilePath,$ArgumentList,[switch]$Wait,[switch]$PassThru)
    if ($ArgumentList -notcontains '/CURRENTUSER' -or $ArgumentList -notcontains '/NORESTART') { throw 'Unsafe install options' }
    $script:started++
    return [pscustomobject]@{ExitCode=0}
}
function Find-Git {
    if ($script:started) { return [pscustomobject]@{Git='mock git';Bash='mock bash'} }
    return $null
}
$failed=$false
try { $null=Install-Git } catch { $failed=$true }
if ($script:started -ne [int]$env:CHOUKA_TEST_INSTALL_CALLS) { throw 'Signature guard did not protect execution' }
if ($failed -ne ($env:CHOUKA_TEST_SIGNATURE -ne 'Valid')) { throw 'Unexpected installer result' }
if (-not $script:download -or (Test-Path -LiteralPath (Split-Path $script:download -Parent))) { throw 'Installer temp cleanup failed' }
''', CHOUKA_TEST_SIGNATURE=signature, CHOUKA_TEST_INSTALL_CALLS=str(expected_calls),
                    CHOUKA_TEST_WINGET=winget, PROCESSOR_ARCHITECTURE="AMD64", PROCESSOR_ARCHITEW6432="AMD64")
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_winget_user_install_path_is_mocked(self):
        result = self.ps(r'''
function Get-Command { param($Name,$ErrorAction) return [pscustomobject]@{Source='mock-winget.exe'} }
function Invoke-Tool {
    param($File,$Arguments,$TimeoutSeconds)
    if ($File -ne 'mock-winget.exe' -or ($Arguments -join ' ') -notmatch '--id Git.Git --exact --source winget --scope user') { throw 'Incorrect package or scope' }
    return [pscustomobject]@{Code=0;Output='';Error=''}
}
function Find-Git { return [pscustomobject]@{Git='mock git';Bash='mock bash'} }
function Invoke-RestMethod { throw 'Must not download when winget succeeds' }
$found=Install-Git
if ($found.Git -ne 'mock git') { throw 'Install not detected' }
''')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_bootstrap_files_encoding_and_launcher_contract(self):
        self.assertTrue(SCRIPT.read_bytes().startswith(b"\xef\xbb\xbf"))
        launcher = (ROOT / "检查环境并更新Chouka.bat").read_text(encoding="ascii")
        self.assertIn('-File "%SCRIPT%" %*', launcher)
        self.assertIn('set "RESULT=%ERRORLEVEL%"', launcher)
        self.assertIn('exit /b %RESULT%', launcher)
        self.assertIn('set "SCRIPT=%~dp0check-environment.ps1"', launcher)


if __name__ == "__main__":
    unittest.main()
