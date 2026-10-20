using System;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        bool first;
        using (Mutex instance = new Mutex(true, @"Local\ChoukaIFBridgeManager", out first)) {
            if (!first) {
                MessageBox.Show("本地抽卡 IF Bridge 已在运行。", "本地抽卡_IF_Bridge");
                return;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new BridgeManager());
        }
    }
}

internal sealed class BridgeManager : Form
{
    private readonly BridgeRuntime runtime = new BridgeRuntime(AppDomain.CurrentDomain.BaseDirectory);
    private readonly Label cli = new Label();
    private readonly Label service = new Label();
    private readonly Label authorization = new Label();
    private readonly Label models = new Label();
    private readonly Button install = new Button();
    private readonly Button start = new Button();
    private readonly Button stop = new Button();
    private readonly Button login = new Button();
    private readonly CheckBox startup = new CheckBox();
    private readonly NotifyIcon tray = new NotifyIcon();
    private readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
    private bool exiting, installing, loginPrompted, loginRunning, changingStartup;
    private int refreshing;

    internal BridgeManager()
    {
        Text = "本地抽卡_IF_Bridge";
        Size = new Size(590, 300);
        MinimumSize = new Size(590, 300);
        MaximumSize = new Size(840, 350);
        StartPosition = FormStartPosition.CenterScreen;
        ShowInTaskbar = true;
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        Font = new Font("Microsoft YaHei UI", 9);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.RowCount = 7;
        layout.ColumnCount = 1;
        for (int i = 0; i < 7; i++) layout.RowStyles.Add(new RowStyle(SizeType.Absolute, i == 4 ? 46 : 32));
        Controls.Add(layout);
        AddLine(layout, cli, "IF CLI：检测中");
        AddLine(layout, service, "桥接：检查端口 8278");
        AddLine(layout, authorization, "授权：检测中");
        AddLine(layout, models, "模型：检测中");

        FlowLayoutPanel buttons = new FlowLayoutPanel();
        buttons.Dock = DockStyle.Fill;
        layout.Controls.Add(buttons, 0, 4);
        AddButton(buttons, install, "1 安装 IF CLI", delegate { InstallCli(); });
        AddButton(buttons, login, "2 登录 BUC", delegate { Login(); });
        AddButton(buttons, start, "3 启动桥接", delegate { StartBridge(); });
        AddButton(buttons, stop, "停止桥接", delegate { StopBridge(); });
        AddButton(buttons, new Button(), "刷新状态", delegate { RefreshStatus(); });

        startup.Text = "登录 Windows 后自动启动";
        startup.AutoSize = true;
        startup.Checked = runtime.AutoStart;
        startup.CheckedChanged += StartupChanged;
        layout.Controls.Add(startup, 0, 5);
        Label hint = new Label();
        hint.AutoSize = true;
        hint.Text = "网页：HTTPS 8443（需信任证书）  ·  本机桥接：127.0.0.1:8278";
        layout.Controls.Add(hint, 0, 6);

        ContextMenuStrip menu = new ContextMenuStrip();
        menu.Items.Add("打开窗口", null, delegate { ShowWindow(); });
        menu.Items.Add("退出程序", null, delegate { ExitProgram(); });
        tray.Icon = Icon;
        tray.Text = "本地抽卡 IF Bridge";
        tray.ContextMenuStrip = menu;
        tray.Visible = true;
        tray.DoubleClick += delegate { ShowWindow(); };
        timer.Interval = 5000;
        timer.Tick += delegate { RefreshStatus(); };
        timer.Start();
        Shown += delegate { FirstStart(); };
        FormClosing += OnClosing;
        FormClosed += delegate { timer.Stop(); tray.Visible = false; tray.Dispose(); };
    }

    private void StartupChanged(object sender, EventArgs args)
    {
        if (changingStartup) return;
        try { runtime.AutoStart = startup.Checked; }
        catch (Exception error) {
            MessageBox.Show(error.Message, Text);
            changingStartup = true;
            startup.Checked = runtime.AutoStart;
            changingStartup = false;
        }
    }
    private static void AddLine(TableLayoutPanel layout, Label label, string value)
    {
        label.Text = value;
        label.AutoEllipsis = true;
        label.Dock = DockStyle.Fill;
        layout.Controls.Add(label);
    }
    private static void AddButton(FlowLayoutPanel panel, Button button, string text, EventHandler action)
    {
        button.Text = text;
        button.AutoSize = true;
        button.Click += action;
        panel.Controls.Add(button);
    }
    private void FirstStart()
    {
        if (!runtime.CliInstalled()) {
            InstallCli();
            RefreshStatus();
        } else {
            if (!BridgeRuntime.PortOccupied()) StartBridge();
            RefreshStatus();
        }
    }
    private void InstallCli()
    {
        if (installing) return;
        if (MessageBox.Show("将从内网 IF 安装源下载并校验安装脚本，安装 CLI 到当前用户目录。继续？", Text,
            MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        installing = true;
        install.Enabled = false;
        cli.Text = "IF CLI：正在下载安装…";
        ThreadPool.QueueUserWorkItem(delegate {
            Exception failure = null;
            try { runtime.InstallCli(); }
            catch (Exception error) { failure = error; }
            if (!IsDisposed && IsHandleCreated) BeginInvoke((Action)delegate {
                installing = false;
                install.Enabled = true;
                if (failure != null) MessageBox.Show(failure.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                else if (!BridgeRuntime.PortOccupied()) StartBridge();
                RefreshStatus();
            });
        });
    }
    private void StartBridge()
    {
        try { runtime.Start(); RefreshStatus(); }
        catch (Exception error) { MessageBox.Show(error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Warning); RefreshStatus(); }
    }
    private void StopBridge()
    {
        if (MessageBox.Show("停止桥接可能中断正在进行的 IF 任务。确定停止？", Text,
            MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
        runtime.Stop();
        RefreshStatus();
    }
    private void Login()
    {
        if (loginRunning) return;
        try {
            Process process = runtime.Login();
            loginRunning = true;
            login.Enabled = false;
            authorization.Text = "授权：已打开 IF CLI 登录流程，请在浏览器完成授权";
            ThreadPool.QueueUserWorkItem(delegate {
                process.WaitForExit();
                int code = process.ExitCode;
                process.Dispose();
                if (!IsDisposed && IsHandleCreated) BeginInvoke((Action)delegate {
                    loginRunning = false;
                    login.Enabled = true;
                    if (code != 0) MessageBox.Show("IF 登录没有完成，请检查 IF CLI 登录窗口。", Text);
                    RefreshStatus();
                });
            });
        } catch (Exception error) { MessageBox.Show(error.Message, Text); }
    }
    private void RefreshStatus()
    {
        if (Interlocked.Exchange(ref refreshing, 1) != 0) return;
        ThreadPool.QueueUserWorkItem(delegate {
            BridgeSnapshot state;
            try { state = runtime.Status(); }
            catch (Exception error) { state = new BridgeSnapshot(); state.Service = "状态检查失败：" + error.Message; }
            Interlocked.Exchange(ref refreshing, 0);
            if (!IsDisposed && IsHandleCreated) BeginInvoke((Action)delegate {
                cli.Text = "IF CLI：" + state.Cli;
                service.Text = "桥接：" + state.Service;
                authorization.Text = "授权：" + state.Authorization;
                models.Text = "模型：" + state.Models;
                install.Enabled = !installing && !state.CliReady;
                login.Enabled = !loginRunning && state.CliReady;
                stop.Enabled = state.Managed;
                start.Enabled = !state.Managed && state.CliReady && !BridgeRuntime.PortOccupied();
                if (state.LoginRequired && !loginPrompted && !loginRunning) {
                    loginPrompted = true;
                    if (MessageBox.Show("尚未登录内部 IF 账号。现在打开 BUC 授权？", Text,
                        MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes) Login();
                }
            });
        });
    }
    private void ShowWindow() { Show(); WindowState = FormWindowState.Normal; Activate(); }
    private void ExitProgram() { exiting = true; Close(); }
    private void OnClosing(object sender, FormClosingEventArgs args)
    {
        if (!exiting && args.CloseReason == CloseReason.UserClosing) { args.Cancel = true; Hide(); return; }
        if (args.CloseReason == CloseReason.WindowsShutDown || args.CloseReason == CloseReason.TaskManagerClosing) {
            runtime.Stop();
            return;
        }
        if (MessageBox.Show("退出将停止由本程序启动的桥接；正在运行的 IF 任务可能中断。确定退出？", Text,
            MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) {
            args.Cancel = true;
            exiting = false;
            return;
        }
        runtime.Stop();
    }
}
