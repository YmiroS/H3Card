import os
import struct
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
            if (BridgeRuntime.Port != 8278 || BridgeRuntime.Origin != "http://dinghaichouka.youku.com:8199" ||
                BridgeRuntime.SecureOrigin != "https://dinghaichouka.youku.com:8443")
                throw new Exception("Unexpected bridge port or Chouka origins");
            Console.WriteLine("shutdown-ok");
        }
    }
}
'''
        self.run_probe(source, 'ShutdownProbe', 'shutdown-ok')

    def test_embedded_tray_icon_and_hidden_window_activation(self):
        source = r'''
using System;
using System.ComponentModel;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
internal static class TrayProbe {
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr window);
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr window);
    [STAThread]
    private static void Main() {
        using (BridgeManager manager = new BridgeManager()) {
            var flags = BindingFlags.Instance | BindingFlags.NonPublic;
            var events = (EventHandlerList)typeof(Component).GetProperty("Events", flags).GetValue(manager, null);
            var key = typeof(Form).GetField("EVENT_SHOWN", BindingFlags.Static | BindingFlags.NonPublic).GetValue(null);
            events.RemoveHandler(key, events[key]);
            ((Timer)typeof(BridgeManager).GetField("timer", flags).GetValue(manager)).Stop();
            manager.Text = "Chouka tray test " + Guid.NewGuid();
            var tray = (NotifyIcon)typeof(BridgeManager).GetField("tray", flags).GetValue(manager);
            if (!tray.Visible || tray.Icon == null || tray.Icon.Size != SystemInformation.SmallIconSize)
                throw new Exception("Missing tray icon or incorrect size");
            using (Bitmap icon = tray.Icon.ToBitmap()) {
                Color pixel = icon.GetPixel(icon.Width / 2, icon.Height / 2);
                if (pixel.A == 0 || pixel.R != 250 || pixel.G != 180 || pixel.B != 96)
                    throw new Exception("Embedded icon was not loaded");
            }
            manager.Show();
            manager.Hide();
            var click = typeof(BridgeManager).GetMethod("OnTrayMouseClick", flags);
            click.Invoke(manager, new object[] {tray, new MouseEventArgs(MouseButtons.Right, 1, 0, 0, 0)});
            if (manager.Visible) throw new Exception("Right click should keep context-menu behavior");
            click.Invoke(manager, new object[] {tray, new MouseEventArgs(MouseButtons.Left, 1, 0, 0, 0)});
            if (!manager.Visible) throw new Exception("Single left click did not restore window");
            manager.WindowState = FormWindowState.Minimized;
            manager.Hide();
            if (!Program.ShowExistingWindow(manager.Text)) throw new Exception("Existing window was not found");
            Application.DoEvents();
            if (!IsWindowVisible(manager.Handle) || IsIconic(manager.Handle))
                throw new Exception("Second launch did not restore hidden minimized window");
            if (Program.ShowExistingWindow("not-a-chouka-window-" + Guid.NewGuid()))
                throw new Exception("Unexpected window matched");
            manager.Dispose();
            if (tray.Visible) throw new Exception("Disposed manager left a stale tray icon");
            Console.WriteLine("tray-and-activation-ok");
        }
    }
}
'''
        self.run_probe(source, 'TrayProbe', 'tray-and-activation-ok', embed_icon=True)

    def test_built_package_icon_renders_correctly_in_dotnet(self):
        source = r'''
using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
internal static class PackagedIconProbe {
    [STAThread]
    private static void Main(string[] args) {
        var assembly = Assembly.LoadFrom(args[0]);
        using (var stream = assembly.GetManifestResourceStream("ChoukaIFBridge.ico"))
        using (var icon = new Icon(stream))
        using (var small = new Icon(icon, SystemInformation.SmallIconSize))
        using (var bitmap = small.ToBitmap()) {
            int visible = 0, transparent = 0;
            for (int y = 0; y < bitmap.Height; y++) for (int x = 0; x < bitmap.Width; x++) {
                Color pixel = bitmap.GetPixel(x, y);
                if (pixel.A == 0) transparent++;
                if (pixel.A < 64) continue;
                visible++;
                if (pixel.R < 80 || pixel.G < pixel.R || pixel.B < pixel.G || pixel.B - pixel.R < 20)
                    throw new Exception("Corrupted tray icon pixel: " + pixel);
            }
            if (visible < 20 || transparent == 0) throw new Exception("Empty or opaque tray icon");
            Console.WriteLine("packaged-icon-ok");
        }
    }
}
'''
        with tempfile.TemporaryDirectory(prefix='chouka-icon-build-test-') as directory:
            output = Path(directory) / 'build'
            built = subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                                    str(ROOT / 'desktop/build.ps1'), '-OutputRoot', str(output)],
                                   capture_output=True, text=True, errors='replace', timeout=90)
            self.assertEqual(built.returncode, 0, built.stdout + built.stderr)
            icon = (output / 'ChoukaIFBridge.ico').read_bytes()
            count = struct.unpack_from('<H', icon, 4)[0]
            self.assertEqual(count, 4)
            for index in range(count):
                offset = struct.unpack_from('<I', icon, 6 + 16 * index + 12)[0]
                self.assertEqual(struct.unpack_from('<I', icon, offset)[0], 40, 'Expected BMP/DIB, not PNG')
            self.run_probe(source, 'PackagedIconProbe', 'packaged-icon-ok',
                           arguments=[str(output / 'ChoukaIFBridge/ChoukaIFBridge.exe')])

    def run_probe(self, source, main, expected, embed_icon=False, arguments=()):
        with tempfile.TemporaryDirectory(prefix='chouka-desktop-test-') as directory:
            path = Path(directory)
            (path / 'Probe.cs').write_text(source, encoding='utf-8')
            resources = []
            if embed_icon:
                pixels = bytes((96, 180, 250, 255)) * 16 * 16
                mask = bytes(4 * 16)
                image = struct.pack('<IiiHHIIiiII', 40, 16, 32, 1, 32, 0, len(pixels), 0, 0, 0, 0) + pixels + mask
                icon = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', 16, 16, 0, 0, 1, 32, len(image), 22) + image
                (path / 'Probe.ico').write_bytes(icon)
                resources.append('/resource:' + str(path / 'Probe.ico') + ',ChoukaIFBridge.ico')
            result = subprocess.run([str(COMPILER), '/nologo', '/target:exe', '/codepage:65001',
                                     '/main:' + main, '/r:System.Windows.Forms.dll',
                                     '/r:System.Drawing.dll', '/r:System.Web.Extensions.dll', *resources,
                                     '/out:' + str(path / 'Probe.exe'), str(path / 'Probe.cs'),
                                     str(ROOT / 'desktop/BridgeManager.cs'),
                                     str(ROOT / 'desktop/BridgeRuntime.cs')],
                                    capture_output=True, text=True, errors='replace', timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            probe = subprocess.run([str(path / 'Probe.exe'), *arguments], capture_output=True, text=True,
                                   errors='replace', timeout=8)
            self.assertEqual(probe.returncode, 0, probe.stdout + probe.stderr)
            self.assertIn(expected, probe.stdout)


if __name__ == '__main__':
    unittest.main()
