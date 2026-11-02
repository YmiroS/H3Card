"""Managed dependency contracts; pip/imports mocked, cmd copies only tiny fixtures.

Fixtures are resolved inside the test snapshot (worker/ and the original BAT).
Windows integration uses a private, site-disabled copy of the running embedded
Python, real cmd/robocopy, and a recording helper, never the production helper.
"""
import importlib.metadata
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import nullcontext, redirect_stdout
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "worker" / "sync_dependencies.py"
BATCH = ROOT / "同步主节点模型和用户.bat"
SPEC = importlib.util.spec_from_file_location("dependency_executor_under_test", HELPER)
dependencies = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dependencies)
PLUGIN = "ComfyUI_Nvidia_VFX_Nodes"
VERSION = "0.2.0.0"
NODES = ["RTXVideoSuperResolution", "RTXTrueHDR", "RTXVideoFrameGeneration"]


class DependencyExecutorTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="dependency-test-")
        self.addCleanup(temporary.cleanup)
        self.comfy = Path(temporary.name) / "ComfyUI"
        self.plugin = self.comfy / "custom_nodes" / PLUGIN
        self.plugin.mkdir(parents=True)
        (self.plugin / "__init__.py").write_text(
            "raise AssertionError('Do not import the plugin in this process')\n",
            encoding="utf-8",
        )
        self.enterContext(redirect_stdout(io.StringIO()))
        self.lock = self.enterContext(mock.patch.object(
            dependencies, "dependency_lock", side_effect=lambda *a, **k: nullcontext()))
        self.clock = self.enterContext(mock.patch.object(dependencies.time, "time", return_value=1000))
        self.version = self.enterContext(mock.patch.object(
            dependencies.importlib.metadata, "version", return_value=VERSION))
        self.run = self.enterContext(mock.patch.object(
            dependencies.subprocess, "run",
            return_value=subprocess.CompletedProcess([], 0, stdout="OK\n")))

    def ensure(self):
        return dependencies.ensure_dependencies(self.comfy, deadline=1030)

    def missing_then_installed(self):
        self.version.side_effect = [importlib.metadata.PackageNotFoundError("nvidia-vfx"), VERSION]

    def assert_import_command(self, call):
        command = call.args[0]
        self.assertEqual(command[:3], [sys.executable, "-s", "-c"])
        self.assertIn("importlib.import_module(name)", command[3])
        self.assertEqual(command[4:], ["nvvfx"])
        self.assertEqual(call.kwargs["timeout"], 30)
        self.assertEqual(call.kwargs["stderr"], subprocess.STDOUT)
        self.assertFalse(call.kwargs.get("shell", False))

    def test_registry_is_exactly_the_single_approved_plugin(self):
        self.assertEqual(dependencies.PLUGIN_DEPENDENCIES, {
            PLUGIN: {"packages": {"nvidia-vfx": VERSION}, "imports": ("nvvfx",),
                     "nodes": tuple(NODES)},
        })

    def test_plugin_requires_an_init_file_not_just_a_directory(self):
        initializer = self.plugin / "__init__.py"
        initializer.unlink()
        for init_is_directory in (False, True):
            with self.subTest(init_is_directory=init_is_directory):
                if init_is_directory:
                    initializer.mkdir()
                with self.assertRaisesRegex(RuntimeError, PLUGIN):
                    self.ensure()
                self.version.assert_not_called()
                self.run.assert_not_called()

    def test_exact_version_only_checks_import_in_fresh_embedded_subprocess(self):
        self.assertEqual(self.ensure(), NODES)
        self.assertEqual(self.version.call_args_list, [mock.call("nvidia-vfx")] * 2)
        self.run.assert_called_once()
        self.assert_import_command(self.run.call_args)

    def test_missing_version_installs_only_pinned_binary_from_official_indexes(self):
        self.missing_then_installed()
        self.assertEqual(self.ensure(), NODES)
        self.assertEqual(self.run.call_count, 2)
        install, check = self.run.call_args_list
        self.assertEqual(install.args[0], [
            sys.executable, "-s", "-m", "pip", "--isolated", "install",
            "--disable-pip-version-check", "--no-input", "--no-deps",
            "--only-binary=:all:", "--retries", "1", "--timeout", "30",
            "--index-url", "https://pypi.org/simple",
            "--extra-index-url", "https://pypi.nvidia.com", "nvidia-vfx==0.2.0.0",
        ])
        self.assertEqual(install.kwargs["timeout"], 30)
        self.assertFalse(install.kwargs.get("shell", False))
        self.assert_import_command(check)
        self.assertEqual(self.version.call_args_list, [mock.call("nvidia-vfx")] * 2)

    def test_other_installed_versions_are_not_upgraded_or_downgraded(self):
        for installed in ("0.1.0.0", "0.3.0.0", "0.2.0.0+local"):
            with self.subTest(installed=installed):
                self.version.return_value = installed
                with self.assertRaisesRegex(RuntimeError, "未自动升级或降级"):
                    self.ensure()
                self.run.assert_not_called()

    def test_unknown_and_managed_requirements_are_never_read_or_enumerated(self):
        unknown = self.comfy / "custom_nodes" / "UnapprovedPlugin"
        unknown.mkdir()
        for directory in (unknown, self.plugin):
            (directory / "requirements.txt").write_text(
                "torch==0.0.0\nnvidia-cuda-runtime-cu12==0.0.0\n"
                "--extra-index-url https://untrusted.invalid/simple\n", encoding="utf-8")
        self.missing_then_installed()
        with mock.patch.object(Path, "iterdir", side_effect=AssertionError("No enumeration")), \
             mock.patch.object(Path, "glob", side_effect=AssertionError("No glob")), \
             mock.patch.object(Path, "rglob", side_effect=AssertionError("No recursive glob")), \
             mock.patch.object(Path, "open", side_effect=AssertionError("No requirements reads")):
            self.assertEqual(self.ensure(), NODES)
        for call in self.run.call_args_list:
            command = call.args[0]
            self.assertEqual(command[0], sys.executable)  # Never system pip/python.
            text = " ".join(command).lower()
            for forbidden in ("torch", "cuda", "requirements", "untrusted.invalid"):
                self.assertNotIn(forbidden, text)
        self.assertEqual(self.version.call_args_list, [mock.call("nvidia-vfx")] * 2)

    def test_pip_failure_stops_before_import_or_postinstall_success(self):
        self.missing_then_installed()
        self.run.return_value = subprocess.CompletedProcess([], 1, stdout="pip refused installation")
        with self.assertRaisesRegex(RuntimeError, "pip refused installation"):
            self.ensure()
        self.run.assert_called_once()
        self.version.assert_called_once_with("nvidia-vfx")

    def test_import_failure_never_returns_required_nodes(self):
        for missing in (False, True):
            with self.subTest(after_install=missing):
                self.run.reset_mock()
                self.version.reset_mock(side_effect=True)
                self.version.return_value = VERSION
                failed = subprocess.CompletedProcess([], 7, stdout="nvvfx import failed")
                if missing:
                    self.missing_then_installed()
                    self.run.side_effect = [subprocess.CompletedProcess([], 0, stdout="installed"), failed]
                else:
                    self.run.side_effect = [failed]
                with self.assertRaisesRegex(RuntimeError, "nvvfx import failed"):
                    self.ensure()
                self.assertEqual(self.run.call_count, 2 if missing else 1)
                self.version.assert_called_once_with("nvidia-vfx")

    def test_pip_and_import_subprocess_timeouts_are_failures(self):
        for missing in (False, True):
            with self.subTest(pip=missing):
                self.run.reset_mock()
                self.version.reset_mock(side_effect=True)
                self.version.return_value = VERSION
                if missing:
                    self.missing_then_installed()
                self.run.side_effect = subprocess.TimeoutExpired("mock command", 30)
                with self.assertRaisesRegex(RuntimeError, "超时"):
                    self.ensure()
                self.run.assert_called_once()
                self.version.assert_called_once_with("nvidia-vfx")

    def test_expired_deadline_never_launches_pip_or_import(self):
        for missing in (False, True):
            with self.subTest(pip=missing):
                self.version.reset_mock(side_effect=True)
                self.version.return_value = VERSION
                if missing:
                    self.missing_then_installed()
                self.clock.return_value = 1030
                with self.assertRaisesRegex(RuntimeError, "超时"):
                    self.ensure()
                self.run.assert_not_called()

    def test_install_uses_shared_deadline_not_a_new_import_budget(self):
        self.missing_then_installed()
        self.clock.side_effect = [1000, 1031]
        with self.assertRaisesRegex(RuntimeError, "超时"):
            self.ensure()
        self.run.assert_called_once()
        self.assertEqual(self.run.call_args.kwargs["timeout"], 30)

    def test_postinstall_metadata_must_confirm_exact_version(self):
        for final in ("0.1.0.0", importlib.metadata.PackageNotFoundError("nvidia-vfx")):
            with self.subTest(final=final):
                self.run.reset_mock()
                self.version.reset_mock()
                self.version.side_effect = [importlib.metadata.PackageNotFoundError("nvidia-vfx"), final]
                with self.assertRaises((RuntimeError, importlib.metadata.PackageNotFoundError)):
                    self.ensure()
                self.assertEqual(self.run.call_count, 2)
                self.assertEqual(self.version.call_args_list, [mock.call("nvidia-vfx")] * 2)

    def test_subprocess_start_failure_is_not_swallowed(self):
        self.run.side_effect = OSError("cannot launch embedded Python")
        with self.assertRaises(OSError):
            self.ensure()

    def test_external_pip_config_cannot_add_wheel_sources_or_redirect_install(self):
        config = self.comfy / "poisoned-pip.ini"
        config.write_text("[global]\nfind-links = https://untrusted.invalid/wheels\n"
                          "[install]\ntarget = " + str(self.comfy / "wrong-site") + "\n",
                          encoding="utf-8")
        self.missing_then_installed()
        with mock.patch.dict(os.environ, {"PIP_CONFIG_FILE": str(config)}):
            self.ensure()
        install = self.run.call_args_list[0]
        environment = install.kwargs["env"]
        self.assertEqual(environment["PIP_CONFIG_FILE"], os.devnull)
        command = install.args[0]
        parser = (
            "import json,sys; from pip._internal.commands import create_command; "
            "o,r=create_command('install',isolated=True).parse_args(sys.argv[1:]); "
            "print(json.dumps({'links':o.find_links,'target':o.target_dir}))"
        )
        result = subprocess_run_real(
            [sys.executable, "-s", "-c", parser, *command[command.index("install") + 1:]],
            env=environment,
        )
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(json.loads(result.stdout), {"links": [], "target": None})

    def test_dependency_check_is_inside_the_interpreter_lock(self):
        def locked(_python, _deadline):
            self.version.assert_not_called()
            return nullcontext()
        self.lock.side_effect = locked
        self.assertEqual(self.ensure(), NODES)
        self.lock.assert_called_once_with(sys.executable, 1030)

    def test_cli_reports_dependency_failure_instead_of_success(self):
        for failure in (RuntimeError("dependency failure"), OSError("launch failure"),
                        importlib.metadata.PackageNotFoundError("nvidia-vfx")):
            with self.subTest(failure=failure), \
                 mock.patch.object(sys, "argv", [str(HELPER), "--comfy-root", str(self.comfy)]), \
                 mock.patch.object(dependencies, "ensure_dependencies", side_effect=failure), \
                 self.assertRaisesRegex(SystemExit, "插件依赖处理失败"):
                dependencies.main()

    def test_real_helper_cli_missing_plugin_exits_nonzero_without_installing(self):
        missing_root = self.comfy / "missing-plugin"
        result = subprocess_run_real(
            [sys.executable, "-B", "-s", str(HELPER), "--comfy-root", str(missing_root)])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("插件依赖处理失败", result.stdout)
        self.assertIn(PLUGIN, result.stdout)
        self.assertFalse(missing_root.exists())


# Keep real subprocess entry point separate from the executor's subprocess mock.
_REAL_RUN = subprocess.run


def subprocess_run_real(command, **kwargs):
    environment = kwargs.pop("env", os.environ.copy())
    environment["PYTHONIOENCODING"] = "utf-8"
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    return _REAL_RUN(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                     text=True, encoding="utf-8", errors="replace", timeout=90,
                     env=environment, **kwargs)


class DependencyLockTests(unittest.TestCase):
    def test_contention_times_out_and_exception_releases_the_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            python = Path(directory) / "python.exe"
            with self.assertRaisesRegex(ValueError, "release"):
                with dependencies.dependency_lock(python, time.time() + 5):
                    with self.assertRaisesRegex(RuntimeError, "等待同一 Python"):
                        with dependencies.dependency_lock(python, time.time() + 0.05):
                            self.fail("Conflicting lock was acquired")
                    raise ValueError("release")
            with dependencies.dependency_lock(python, time.time() + 5):
                pass

    def test_concurrent_processes_recheck_version_and_only_install_once(self):
        source = '''
import importlib.metadata
import os
import subprocess
import sys
import time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import sync_dependencies as d
root = Path(sys.argv[2])
original_lock = d.dependency_lock
d.dependency_lock = lambda python, deadline: original_lock(root / 'python.exe', deadline)
marker = root / 'installed.txt'
def version(package):
    if not marker.exists():
        raise importlib.metadata.PackageNotFoundError(package)
    return marker.read_text()
def run(command, **kwargs):
    if 'pip' in command:
        with (root / 'pip-invocations.txt').open('a') as log:
            log.write(str(os.getpid()) + '\\n')
        time.sleep(0.3)
        marker.write_text('0.2.0.0')
    return subprocess.CompletedProcess(command, 0, stdout='OK')
d.importlib.metadata.version = version
d.subprocess.run = run
(root / ('ready-' + str(os.getpid()))).touch()
limit = time.time() + 10
while len(list(root.glob('ready-*'))) != 2:
    if time.time() > limit:
        raise RuntimeError('test barrier timeout')
    time.sleep(0.01)
assert len(d.ensure_dependencies(root / 'ComfyUI', deadline=time.time() + 10)) == 3
print('CHECK_OK')
'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plugin = root / "ComfyUI/custom_nodes" / PLUGIN
            plugin.mkdir(parents=True)
            (plugin / "__init__.py").touch()
            command = [sys.executable, "-s", "-c", source, str(HELPER.parent), str(root)]
            environment = os.environ.copy()
            environment["PYTHONIOENCODING"] = "utf-8"
            processes = [subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                          env=environment) for _ in range(2)]
            try:
                for process in processes:
                    output, _ = process.communicate(timeout=30)
                    self.assertEqual(process.returncode, 0, output.decode("utf-8", errors="replace"))
                    self.assertIn(b"CHECK_OK", output)
                self.assertEqual(len((root / "pip-invocations.txt").read_text().splitlines()), 1)
            finally:
                for process in processes:
                    if process.poll() is None:
                        process.kill()
                        process.wait(timeout=10)


@unittest.skipUnless(os.name == "nt", "Requires real Windows cmd and robocopy")
class WindowsBatchDependencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cmd = shutil.which("cmd.exe")
        if not cls.cmd or not shutil.which("robocopy.exe"):
            raise unittest.SkipTest("cmd.exe and robocopy.exe must be available")
        cls.runtime_source = Path(sys.executable).resolve().parent
        cls.python_tag = f"python{sys.version_info.major}{sys.version_info.minor}"
        if not (cls.runtime_source / (cls.python_tag + ".zip")).is_file():
            raise unittest.SkipTest("Run with project embedded Python (stdlib ZIP required)")

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="sync-batch-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "同步 fixture with spaces"
        self.source = self.root / "source"
        self.pack = self.root / "private pack"
        self.comfy = self.pack / "ComfyUI"
        self.chouka = self.pack / "chouka"
        self.worker = self.chouka / "worker"
        self.worker.mkdir(parents=True)
        self.comfy.mkdir(parents=True)
        self.batch = self.chouka / BATCH.name
        shutil.copyfile(BATCH, self.batch)
        self.log = self.worker / "helper-invocation.json"
        self.exit_file = self.worker / "helper-exit.txt"
        self.exit_file.write_text("0", encoding="ascii")
        self.stub = self.worker / "sync_dependencies.py"
        self.stub.write_text(
            "import json, pathlib, sys\n"
            "here = pathlib.Path(__file__).resolve().parent\n"
            "record = {'argv': sys.argv, 'executable': sys.executable,\n"
            "          'no_user_site': sys.flags.no_user_site,\n"
            "          'isolated': sys.flags.isolated, 'no_site': sys.flags.no_site,\n"
            "          'ignore_environment': sys.flags.ignore_environment,\n"
            "          'sys_path': sys.path, 'site_loaded': 'site' in sys.modules}\n"
            "(here / 'helper-invocation.json').write_text(json.dumps(record), encoding='utf-8')\n"
            "raise SystemExit(int((here / 'helper-exit.txt').read_text(encoding='ascii')))\n",
            encoding="utf-8",
        )
        # Copy only the executable, runtime DLLs, and stdlib: no pip/site-packages,
        # no symlink privileges, no wrapper that could call a system interpreter.
        self.python_dir = self.pack / "python_embeded"
        self.python_dir.mkdir()
        required = ("python.exe", self.python_tag + ".dll", self.python_tag + ".zip")
        optional = ("python3.dll", "vcruntime140.dll", "vcruntime140_1.dll")
        for name in required + optional:
            original = self.runtime_source / name
            if name in required or original.is_file():
                shutil.copyfile(original, self.python_dir / name)
        (self.python_dir / (self.python_tag + "._pth")).write_text(
            self.python_tag + ".zip\n.\n", encoding="ascii")
        self.python = self.python_dir / "python.exe"
        self.assets = (
            "models/diffusion_models/qwen_image_2.1_int8_convrot.safetensors",
            "models/clip/qwen3vl_8b_fp8_scaled.safetensors",
            "models/vae/qwen_image_2.1_vae_bf16.safetensors",
        )
        fixture_files = self.assets + (
            "comfyui_version.py", "comfy/ldm/qwen_image21/model.py",
            "comfy_extras/nodes_qwen.py", "user/fixture.json",
            f"custom_nodes/{PLUGIN}/__init__.py",
        )
        for relative in fixture_files:
            path = self.source / "ComfyUI" / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"inert test fixture\n")
        self.env = os.environ.copy()
        self.env.update({
            "CHOUKA_SYNC_SOURCE_ROOT": str(self.source),
            "CHOUKA_SYNC_DEST_ROOT": str(self.pack),
            "COMPUTERNAME": "CHOUKA-DEPENDENCY-TEST",  # Cannot hit source-node early exit.
        })
        # Fail immediately if the copied runtime cannot execute the inert helper.
        probe = subprocess_run_real(
            [str(self.python), "-s", "-c", "import json, pathlib; print('private runtime OK')"],
            env=self.env.copy(), cwd=str(self.root))
        self.assertEqual(probe.returncode, 0, probe.stdout)
        self.assertIn("private runtime OK", probe.stdout)

    def execute_batch(self, *arguments):
        # CALL avoids cmd /c's special leading-quote stripping. Disable AutoRun;
        # both roots are absolute temporary paths, never the real source share.
        # Pass cmd's command line verbatim: list2cmdline uses C-runtime quote
        # escaping (backslash-quote), which cmd itself does not understand.
        command = f'"{self.cmd}" /d /c call "{self.batch}" --non-interactive'
        if arguments:
            command += " " + " ".join(arguments)
        return subprocess_run_real(command, env=self.env.copy(), cwd=str(self.root))

    def assert_helper_invocation(self):
        self.assertTrue(self.log.is_file(), "Batch never invoked the dependency helper")
        record = json.loads(self.log.read_text(encoding="utf-8"))
        self.assertEqual(Path(record["executable"]).resolve(), self.python.resolve())
        self.assertEqual(Path(record["argv"][0]).resolve(), self.stub.resolve())
        self.assertEqual(record["argv"][1:], ["--comfy-root", str(self.comfy)])
        self.assertEqual(record["no_user_site"], 1)
        self.assertEqual(record["isolated"], 1)
        self.assertEqual(record["no_site"], 1)
        self.assertEqual(record["ignore_environment"], 1)
        self.assertFalse(record["site_loaded"])
        # ._pth paths are runtime-relative, not script-relative. In particular,
        # this fixture must not accidentally enable sibling imports or the cwd.
        self.assertNotIn("", record["sys_path"])
        self.assertEqual([Path(path).resolve() for path in record["sys_path"]], [
            (self.python_dir / (self.python_tag + ".zip")).resolve(),
            self.python_dir.resolve(),
        ])
        self.assertNotIn(self.worker.resolve(),
                         [Path(path).resolve() for path in record["sys_path"]])

    def assert_models_copied(self):
        for relative in self.assets + ("user/fixture.json",):
            self.assertEqual((self.comfy / relative).read_bytes(),
                             (self.source / "ComfyUI" / relative).read_bytes())

    def test_full_sync_executes_helper_with_destination_embedded_python(self):
        result = self.execute_batch()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assert_helper_invocation()
        self.assert_models_copied()
        self.assertTrue((self.comfy / "custom_nodes" / PLUGIN / "__init__.py").is_file())
        self.assertIn("Managed plugin dependencies verified", result.stdout)

    def test_full_sync_private_runtime_ignores_pythonpath_and_pythonhome(self):
        untrusted = self.root / "untrusted Python environment"
        untrusted.mkdir()
        marker = untrusted / "executed.txt"
        # These would shadow the helper's stdlib imports if PYTHONPATH leaked in.
        for name in ("json.py", "pathlib.py", "sitecustomize.py"):
            (untrusted / name).write_text(
                f"open({str(marker)!r}, 'w').write('environment code executed')\n"
                "raise AssertionError('untrusted Python environment imported')\n",
                encoding="utf-8",
            )
        self.env.update({"PYTHONPATH": str(untrusted), "PYTHONHOME": str(untrusted)})
        result = self.execute_batch()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assert_helper_invocation()
        self.assertFalse(marker.exists(), result.stdout)

    def test_full_sync_helper_failure_propagates_nonzero(self):
        self.exit_file.write_text("23", encoding="ascii")
        result = self.execute_batch("--upgrade")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assert_helper_invocation()
        self.assert_models_copied()
        self.assertNotIn("File synchronization completed successfully", result.stdout)
        self.assertNotIn("Managed plugin dependencies verified", result.stdout)

    def test_dry_run_never_executes_helper_or_copies_files(self):
        self.exit_file.write_text("23", encoding="ascii")
        for flags in (("--dry-run",), ("--models-only", "--dry-run")):
            with self.subTest(flags=flags):
                result = self.execute_batch(*flags)
                self.assertEqual(result.returncode, 0, result.stdout)
                self.assertFalse(self.log.exists(), result.stdout)
                self.assertEqual(list(self.comfy.iterdir()), [], result.stdout)
                self.assertIn("Dry-run inspection completed successfully", result.stdout)

    def test_models_only_copies_assets_without_core_or_dependency_helper(self):
        self.exit_file.write_text("23", encoding="ascii")
        result = self.execute_batch("--models-only")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assert_models_copied()
        self.assertFalse(self.log.exists(), result.stdout)
        self.assertFalse((self.comfy / "comfyui_version.py").exists())
        self.assertFalse((self.comfy / "custom_nodes").exists())
        self.assertNotIn("Managed plugin dependencies verified", result.stdout)

    def test_full_sync_missing_helper_fails_closed(self):
        self.stub.unlink()
        result = self.execute_batch()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("Cannot find managed dependency helper", result.stdout)
        self.assertFalse(self.log.exists())

    def test_full_sync_missing_embedded_python_fails_closed(self):
        self.python.unlink()
        result = self.execute_batch()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("Cannot find ComfyUI Python", result.stdout)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
