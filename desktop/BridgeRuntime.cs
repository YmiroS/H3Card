using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using Microsoft.Win32;

internal sealed class BridgeSnapshot
{
    public string Cli = "未检测";
    public string Service = "未启动";
    public string Authorization = "未检测";
    public string Models = "未检测";
    public bool LoginRequired;
    public bool Managed;
    public bool CliReady;
}

internal sealed class BridgeRuntime
{
    internal const int Port = 8278;
    internal const string Origin = "http://dinghaichouka.youku.com:8199";
    internal const string SecureOrigin = "https://dinghaichouka.youku.com:8443";
    internal const string InstallerUrl = "https://ifs.alibaba-inc.com/openapi/v1/assets/install.ps1";
    internal const string InstallerSha256 = "aa9453e7ae6d0ba1a285ce0e604f2ddcc875bbec9a561e44abda6df3b76eb614";
    private const string StartupKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string StartupName = "ChoukaIFBridge";
    private readonly string root;
    private Process bridge;

    internal BridgeRuntime(string rootDirectory) { root = rootDirectory; }
    internal string CliPath { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "ifs", "ifs.exe"); } }
    private string PythonPath { get { return Path.Combine(root, "runtime", "python.exe"); } }
    private string ScriptPath { get { return Path.Combine(root, "server", "if_studio_bridge.py"); } }

    internal bool CliInstalled()
    {
        if (!File.Exists(CliPath)) return false;
        try {
            using (Process process = Process.Start(new ProcessStartInfo(CliPath, "--version") {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true
            })) {
                if (!process.WaitForExit(5000)) { process.Kill(); return false; }
                return process.ExitCode == 0 && process.StandardOutput.ReadToEnd()
                    .StartsWith("ifs version ", StringComparison.OrdinalIgnoreCase);
            }
        } catch { return false; }
    }

    internal static bool PortOccupied()
    {
        try {
            using (TcpClient client = new TcpClient()) {
                IAsyncResult connect = client.BeginConnect("127.0.0.1", Port, null, null);
                if (!connect.AsyncWaitHandle.WaitOne(500)) return false;
                client.EndConnect(connect);
                return true;
            }
        } catch (SocketException) { return false; }
    }

    internal void Start()
    {
        if (bridge != null && !bridge.HasExited) return;
        if (!CliInstalled()) throw new InvalidOperationException("先安装并验证 IF CLI");
        if (!File.Exists(PythonPath) || !File.Exists(ScriptPath))
            throw new FileNotFoundException("程序缺少桥接运行文件，请重新解压完整安装包");
        if (PortOccupied()) throw new InvalidOperationException("端口 8278 已被其他程序占用；不会覆盖或停止它");
        ProcessStartInfo info = new ProcessStartInfo(PythonPath,
            "-B -u \"" + ScriptPath + "\" --origin " + Origin + " --origin " + SecureOrigin + " --port " + Port +
            " --manager-stdin --cli \"" + CliPath + "\"");
        info.WorkingDirectory = root;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardInput = true;
        bridge = Process.Start(info);
    }

    internal void Stop()
    {
        if (bridge == null) return;
        if (!bridge.HasExited) {
            try { bridge.StandardInput.WriteLine("stop"); bridge.StandardInput.Close(); }
            catch (IOException) { }
            if (!bridge.WaitForExit(5000)) { bridge.Kill(); bridge.WaitForExit(5000); }
        }
        bridge.Dispose();
        bridge = null;
    }

    internal BridgeSnapshot Status()
    {
        BridgeSnapshot result = new BridgeSnapshot();
        if (!CliInstalled()) { result.Cli = "未安装或版本检查失败"; return result; }
        result.CliReady = true;
        result.Cli = "已安装（无需再安装）：" + CliPath;
        bool managed = bridge != null && !bridge.HasExited;
        result.Managed = managed;
        if (!PortOccupied()) {
            result.Service = managed ? "启动中（端口尚未就绪）" : "未启动，端口 8278 空闲";
            return result;
        }
        result.Service = managed ? "本程序运行中，127.0.0.1:8278" : "端口 8278 已被占用";
        try {
            Dictionary<string, object> state = GetJson("/status");
            object ready;
            if (!state.TryGetValue("ready", out ready) || !(ready is bool))
                throw new InvalidOperationException("桥接状态格式不正确");
            if (!managed) result.Service = "现有桥接可用（非本程序管理），127.0.0.1:8278";
            if (!(bool)ready) {
                result.Authorization = "BUC 未授权或已失效";
                result.LoginRequired = true;
                return result;
            }
            result.Authorization = "BUC 已授权";
            try {
                Dictionary<string, object> models = GetJson("/models");
                System.Collections.IList available = models["models"] as System.Collections.IList;
                result.Models = available == null ? "模型响应异常" : "可用模型：" + available.Count;
            } catch (Exception error) { result.Models = "读取失败：" + error.Message; }
        } catch (Exception error) {
            if (managed) result.Authorization = "连接异常：" + error.Message;
            else {
                result.Service = "8278 已占用，非受支持的 Chouka 桥接；关闭占用程序后刷新";
                result.Authorization = "无法验证现有服务：" + error.Message;
            }
        }
        return result;
    }

    private static Dictionary<string, object> GetJson(string path)
    {
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + Port + path);
        request.Method = "GET";
        request.Timeout = 10000;
        request.Headers["Origin"] = SecureOrigin;
        request.Proxy = null;
        using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
        using (StreamReader reader = new StreamReader(response.GetResponseStream())) {
            if (response.Headers["Access-Control-Allow-Origin"] != SecureOrigin)
                throw new InvalidOperationException("桥接未授权内网网页来源");
            return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
        }
    }

    internal void InstallCli()
    {
        if (File.Exists(CliPath)) throw new InvalidOperationException("IF CLI 文件已存在但版本检查失败；不会覆盖现有文件");
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        byte[] script;
        using (WebClient client = new WebClient()) script = client.DownloadData(InstallerUrl);
        string digest;
        using (SHA256 sha = SHA256.Create()) digest = BitConverter.ToString(sha.ComputeHash(script)).Replace("-", "").ToLowerInvariant();
        if (digest != InstallerSha256) throw new InvalidOperationException("内网安装脚本校验失败，已取消安装；请更新桥接程序");
        string path = Path.Combine(Path.GetTempPath(), "chouka-ifs-install-" + Guid.NewGuid().ToString("N") + ".ps1");
        try {
            using (FileStream file = new FileStream(path, FileMode.CreateNew, FileAccess.Write)) {
                file.Write(new byte[] {0xef, 0xbb, 0xbf}, 0, 3);
                file.Write(script, 0, script.Length);
            }
            ProcessStartInfo info = new ProcessStartInfo("powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -File \"" + path + "\"");
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.EnvironmentVariables["IFS_HUB_BASE_URL"] = "https://ifs.alibaba-inc.com";
            info.EnvironmentVariables["IFS_INSTALL_DIR"] = Path.GetDirectoryName(CliPath);
            info.EnvironmentVariables["IFS_BIN"] = "ifs";
            info.EnvironmentVariables.Remove("IFS_VERSION");
            info.EnvironmentVariables.Remove("VERSION");
            using (Process process = Process.Start(info)) {
                StringBuilder output = new StringBuilder();
                process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs line) {
                    if (line.Data != null) lock (output) { if (output.Length < 4000) output.AppendLine(line.Data); }
                };
                process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs line) {
                    if (line.Data != null) lock (output) { if (output.Length < 4000) output.AppendLine(line.Data); }
                };
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                if (!process.WaitForExit(660000)) { process.Kill(); throw new TimeoutException("IF CLI 安装超时"); }
                process.WaitForExit();
                if (process.ExitCode != 0) throw new InvalidOperationException("IF CLI 安装失败：" + output);
            }
            if (!CliInstalled()) throw new InvalidOperationException("安装脚本已结束，但未能验证 IF CLI");
        } finally { if (File.Exists(path)) File.Delete(path); }
    }

    internal Process Login()
    {
        if (!CliInstalled()) throw new InvalidOperationException("先安装 IF CLI");
        return Process.Start(new ProcessStartInfo(CliPath,
            "auth login --registry ifs.alibaba-inc.com --profile buc") { UseShellExecute = true });
    }

    internal bool AutoStart {
        get {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(StartupKey))
                return key != null && (string)key.GetValue(StartupName, "") == "\"" + ApplicationPath + "\"";
        }
        set {
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(StartupKey)) {
                string expected = "\"" + ApplicationPath + "\"";
                string existing = (string)key.GetValue(StartupName, "");
                if (!value && existing == expected) key.DeleteValue(StartupName, false);
                else if (value) key.SetValue(StartupName, expected, RegistryValueKind.String);
            }
        }
    }
    private static string ApplicationPath { get { return Process.GetCurrentProcess().MainModule.FileName; } }
}
