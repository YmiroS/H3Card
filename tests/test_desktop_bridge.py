import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COMPILER = Path(os.environ.get('WINDIR', r'C:\Windows')) / 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'


@unittest.skipUnless(os.name == 'nt' and COMPILER.is_file(), 'Windows .NET Framework compiler required')
class DesktopBridgeTests(unittest.TestCase):
    def test_logout_does_not_block_on_confirmation(self):
        source = r'''
using System;
using System.Reflection;
using System.Windows.Forms;
internal static class ShutdownProbe {
    [STAThread]
    private static void Main() {
        using (BridgeManager manager = new BridgeManager()) {
            var closing = typeof(BridgeManager).GetMethod("OnClosing", BindingFlags.Instance | BindingFlags.NonPublic,
                null, new Type[] {typeof(object), typeof(FormClosingEventArgs)}, null);
            var args = new FormClosingEventArgs(CloseReason.WindowsShutDown, false);
            closing.Invoke(manager, new object[] {manager, args});
            if (args.Cancel) throw new Exception("Windows logout was cancelled");
            if (BridgeRuntime.Port != 8278 || BridgeRuntime.Origin != "http://dinghaichouka.youku.com:8199")
                throw new Exception("Unexpected bridge port or intranet origin");
            Console.WriteLine("shutdown-ok");
        }
    }
}
'''
        with tempfile.TemporaryDirectory(prefix='chouka-desktop-test-') as directory:
            path = Path(directory)
            (path / 'Probe.cs').write_text(source, encoding='utf-8')
            result = subprocess.run([str(COMPILER), '/nologo', '/target:exe', '/codepage:65001',
                                     '/main:ShutdownProbe', '/r:System.Windows.Forms.dll',
                                     '/r:System.Drawing.dll', '/r:System.Web.Extensions.dll',
                                     '/out:' + str(path / 'Probe.exe'), str(path / 'Probe.cs'),
                                     str(ROOT / 'desktop/BridgeManager.cs'),
                                     str(ROOT / 'desktop/BridgeRuntime.cs')],
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            probe = subprocess.run([str(path / 'Probe.exe')], capture_output=True, text=True, timeout=8)
            self.assertEqual(probe.returncode, 0, probe.stdout + probe.stderr)
            self.assertIn('shutdown-ok', probe.stdout)


if __name__ == '__main__':
    unittest.main()
