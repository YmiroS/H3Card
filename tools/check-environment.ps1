[CmdletBinding()]
param(
    [string]$TargetDirectory,
    [string]$RepoUrl = 'git@gitlab.alibaba-inc.com:MTPipeline/ChouKa.git',
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._/-]*$')][string]$Branch = 'main',
    [switch]$CheckOnly
)

# Windows PowerShell 5.1 requires the UTF-8 BOM for Chinese messages.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$script:Warnings = 0

function Write-Status {
    param([string]$Level, [string]$Message)
    $color = switch ($Level) { '正常' { 'Green' } '警告' { 'Yellow' } '失败' { 'Red' } default { 'Cyan' } }
    if ($Level -eq '警告') { $script:Warnings++ }
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Invoke-Tool {
    param([string]$File, [string[]]$Arguments = @(), [int]$TimeoutSeconds = 120)
    # Quote each Windows argv value, including embedded quotes and trailing backslashes.
    $quoted = foreach ($argument in $Arguments) {
        '"' + ($argument -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
    }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $File
    $info.Arguments = $quoted -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables['PYTHONIOENCODING'] = 'utf-8'
    $info.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $info.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill()
            throw "命令超时：$File。若为 Git 操作，请确认无残留进程后检查仓库锁文件，不要直接删除锁。"
        }
        return [pscustomobject]@{ Code = $process.ExitCode; Output = $stdout.Result.Trim(); Error = $stderr.Result.Trim() }
    } finally { $process.Dispose() }
}

function Invoke-Git {
    param([string]$Git, [string[]]$Arguments)
    $result = Invoke-Tool $Git $Arguments 300
    if ($result.Code -ne 0) {
        throw "Git 操作失败（退出码 $($result.Code)）。$($result.Error) $($result.Output)"
    }
    return $result.Output
}

function Find-Git {
    $command = Get-Command git.exe -ErrorAction SilentlyContinue
    $candidates = @()
    if ($command) { $candidates += $command.Source }
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
        if ($base) {
            $candidates += Join-Path $base 'Git\cmd\git.exe'
            $candidates += Join-Path $base 'Programs\Git\cmd\git.exe'
        }
    }
    foreach ($candidate in $candidates) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $gitRoot = Split-Path (Split-Path $candidate -Parent) -Parent
        $bash = Join-Path $gitRoot 'git-bash.exe'
        if ((Test-Path -LiteralPath $bash) -and (Invoke-Tool $candidate @('--version')).Code -eq 0) {
            return [pscustomobject]@{ Git = $candidate; Bash = $bash }
        }
    }
    return $null
}

function Install-Git {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Status '提示' '正在通过 winget 安装当前用户版 Git for Windows（含 Git Bash）……'
        try {
            $result = Invoke-Tool $winget.Source @('install', '--id', 'Git.Git', '--exact', '--source', 'winget', '--scope', 'user', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') 900
            $found = Find-Git
            if ($found) { return $found }
            Write-Status '警告' "winget 未完成安装（退出码 $($result.Code)），改用官方签名安装包。"
        } catch {
            Write-Status '警告' "winget 启动或执行异常，改用官方签名安装包：$($_.Exception.Message)"
        }
    }
    $architecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $suffix = switch ($architecture) {
        'AMD64' { '64-bit' }
        'ARM64' { 'arm64' }
        default { throw "不支持的 Windows 架构：$architecture。请手动安装 Git for Windows。" }
    }
    Write-Status '提示' '正在获取 Git for Windows 官方安装包；需要能够访问 GitHub。'
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'Chouka-Environment-Check' } -TimeoutSec 30
    $assets = @($release.assets | Where-Object { $_.name -match "^Git-[0-9.]+-$suffix\.exe$" })
    if ($assets.Count -ne 1) { throw '未找到匹配的官方 Git 安装包，请手动安装后重试。' }
    $url = [uri]$assets[0].browser_download_url
    if ($url.Scheme -ne 'https' -or $url.Host -ne 'github.com' -or
        -not $url.AbsolutePath.StartsWith('/git-for-windows/git/releases/download/')) {
        throw '官方安装包地址校验失败，未下载安装包。'
    }
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ('chouka-git-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $temporary)
    try {
        $installer = Join-Path $temporary $assets[0].name
        Invoke-WebRequest -UseBasicParsing -Uri $url.AbsoluteUri -OutFile $installer -TimeoutSec 600
        $signature = Get-AuthenticodeSignature -LiteralPath $installer
        if ($signature.Status -ne 'Valid' -or
            $signature.SignerCertificate.Subject -notmatch 'Johannes Schindelin|Git for Windows') {
            throw 'Git 安装包数字签名或发布者校验失败，已拒绝执行。'
        }
        $process = Start-Process -FilePath $installer -ArgumentList @('/CURRENTUSER', '/VERYSILENT', '/NORESTART', '/SP-', '/o:PathOption=Cmd') -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) { throw "Git 安装失败，退出码：$($process.ExitCode)" }
        $found = Find-Git
        if (-not $found) { throw '安装后仍未找到 Git 和 Git Bash，请检查安装路径。' }
        return $found
    } finally {
        # Only remove the temporary installer directory created by this invocation.
        Remove-Item -LiteralPath $temporary -Recurse -Force
    }
}

function Get-DefaultTarget {
    param([string]$ScriptDirectory = $PSScriptRoot)
    $root = $ScriptDirectory
    $parent = Split-Path $root -Parent
    if ((Split-Path $root -Leaf) -eq 'tools' -and
        (Test-Path -LiteralPath (Join-Path $parent 'worker\agent.py')) -and
        (Test-Path -LiteralPath (Join-Path $parent 'server\app.py'))) { $root = $parent }
    if ((Test-Path -LiteralPath (Join-Path $root 'worker\agent.py')) -and
        (Test-Path -LiteralPath (Join-Path $root 'server\app.py'))) { return $root }
    return Join-Path $root 'chouka'
}

function Sync-Chouka {
    param([string]$Git, [string]$Target, [string]$Remote, [string]$Ref)
    if ([string]::IsNullOrWhiteSpace($Remote) -or $Remote.StartsWith('-')) { throw '仓库地址不能为空或以减号开头。' }
    if (-not (Test-Path -LiteralPath $Target)) {
        $parent = Split-Path $Target -Parent
        if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "目标父目录不存在：$parent" }
        Write-Status '提示' "首次克隆 $Ref 到 $Target（包含前端子模块）……"
        [void](Invoke-Git $Git @('clone', '--recurse-submodules', '--branch', $Ref, '--', $Remote, $Target))
        return
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Target '.git'))) {
        throw "目标目录已存在但不是 Git 仓库，未覆盖：$Target。请换一个不存在的目标目录，或先自行备份整理。"
    }
    $top = Invoke-Git $Git @('-C', $Target, 'rev-parse', '--show-toplevel')
    if ([IO.Path]::GetFullPath($top).TrimEnd('\', '/') -ine [IO.Path]::GetFullPath($Target).TrimEnd('\', '/')) {
        throw '目标不是仓库根目录，已停止更新。'
    }
    $origin = Invoke-Git $Git @('-C', $Target, 'remote', 'get-url', 'origin')
    if ($origin.TrimEnd('/') -ine $Remote.TrimEnd('/')) {
        throw '现有 origin 与指定仓库不一致，未修改远程地址。请确认后通过 -RepoUrl 指定正确地址。'
    }
    $current = Invoke-Git $Git @('-C', $Target, 'symbolic-ref', '--short', 'HEAD')
    if ($current -cne $Ref) { throw "当前分支为 $current，预期为 $Ref。未自动切换分支。" }
    $dirty = Invoke-Git $Git @('-C', $Target, 'status', '--porcelain', '--untracked-files=normal', '--ignore-submodules=none')
    if ($dirty) { throw "发现本地修改或未跟踪文件（含子模块），已停止更新。请先自行提交或备份；脚本不会 reset、clean 或 stash。`n$dirty" }
    Write-Status '提示' "正在获取 origin/$Ref……"
    [void](Invoke-Git $Git @('-C', $Target, 'fetch', 'origin', $Ref))
    $ancestor = Invoke-Tool $Git @('-C', $Target, 'merge-base', '--is-ancestor', 'HEAD', 'FETCH_HEAD')
    if ($ancestor.Code -ne 0) { throw '本地包含未推送提交或与远端分叉，已停止；未回退或合并本地提交。' }
    [void](Invoke-Git $Git @('-C', $Target, 'merge', '--ff-only', '--no-overwrite-ignore', 'FETCH_HEAD'))
    [void](Invoke-Git $Git @('-C', $Target, 'submodule', 'update', '--init', '--recursive'))
    Write-Status '正常' '代码与子模块更新成功。'
}

function Test-Environment {
    param([string]$Target)
    Write-Host "`n=== Windows / ComfyUI 环境检查 ===" -ForegroundColor Cyan
    $workspace = Split-Path $Target -Parent
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        Write-Status '正常' ("系统：{0}；可用内存 {1:N1} / {2:N1} GB" -f $os.Caption, ($os.FreePhysicalMemory / 1MB), ($os.TotalVisibleMemorySize / 1MB))
        $disk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq [IO.Path]::GetPathRoot($Target).TrimEnd('\') }
        if ($disk) {
            $level = if ($disk.FreeSpace -lt 10GB) { '警告' } else { '正常' }
            Write-Status $level ("目标磁盘：剩余 {0:N1} GB（模型空间需另行预留）" -f ($disk.FreeSpace / 1GB))
        }
    } catch { Write-Status '警告' '无法读取系统内存或磁盘信息。' }
    $smi = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue
    if ($smi) {
        try {
            $gpu = Invoke-Tool $smi.Source @('--query-gpu=name,driver_version,memory.total,memory.free', '--format=csv,noheader') 20
            if ($gpu.Code -ne 0) { throw 'GPU query failed' }
            Write-Status '正常' "显卡 / 驱动 / 总显存 / 空闲显存：$($gpu.Output)"
        } catch { Write-Status '警告' 'nvidia-smi 查询失败或超时，请检查 NVIDIA 驱动。' }
    } else { Write-Status '警告' '未找到 nvidia-smi，无法确认 NVIDIA 驱动与显卡。' }
    $python = Join-Path $workspace 'python_embeded\python.exe'
    if (Test-Path -LiteralPath $python -PathType Leaf) {
        try {
            $probe = Invoke-Tool $python @('-s', '-c', 'import json,sys,torch; ok=torch.cuda.is_available(); print(json.dumps({"python":sys.version.split()[0],"torch":torch.__version__,"cuda":torch.version.cuda,"cuda_available":ok,"gpu":torch.cuda.get_device_name(0) if ok else None},ensure_ascii=True)); sys.exit(0 if ok else 1)') 60
            if ($probe.Code -ne 0) {
                Write-Status '警告' "嵌入式 Python 的 PyTorch/CUDA 检查未通过：$($probe.Output) $($probe.Error)"
            } else { Write-Status '正常' "嵌入式 Python / PyTorch / CUDA：$($probe.Output)" }
        } catch { Write-Status '警告' "嵌入式 Python 检查失败：$($_.Exception.Message)" }
    } else { Write-Status '警告' "缺少嵌入式 Python：$python；不自动安装或更换 PyTorch/CUDA。" }
    foreach ($entry in @(
        @{ Path = (Join-Path $workspace 'ComfyUI\main.py'); Name = 'ComfyUI' },
        @{ Path = (Join-Path $Target 'worker\agent.py'); Name = 'Chouka Worker' },
        @{ Path = (Join-Path $Target 'worker\config.json'); Name = 'Worker 本地配置（仅检查存在，不读取凭据）' },
        @{ Path = (Join-Path $Target 'web_dist\index.html'); Name = '已构建前端' }
    )) {
        if (Test-Path -LiteralPath $entry.Path -PathType Leaf) { Write-Status '正常' "$($entry.Name)：已找到" }
        else { Write-Status '警告' "$($entry.Name)：未找到 $($entry.Path)" }
    }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($node) {
        $version = Invoke-Tool $node.Source @('--version')
        Write-Status '提示' "Node.js：$($version.Output)（仅开发/构建需要；不自动安装依赖或构建）"
    } else { Write-Status '提示' '未安装 Node.js：不影响使用仓库中的已构建前端。' }
    foreach ($port in @(8188, 8199)) {
        $client = New-Object Net.Sockets.TcpClient
        try {
            $connection = $client.ConnectAsync('127.0.0.1', $port)
            if ($connection.Wait(1000) -and $client.Connected) {
                Write-Status '提示' "本机端口 $port 正在监听（仅 TCP 探测，不代表服务健康）。"
            } else { Write-Status '提示' "本机端口 $port 未监听，服务可能尚未启动。" }
        } catch { Write-Status '提示' "本机端口 $port 未监听，服务可能尚未启动。" }
        finally { $client.Dispose() }
    }
}

function Main {
    if ($env:OS -ne 'Windows_NT') { throw '此脚本仅支持 Windows。' }
    if (-not $TargetDirectory) { $TargetDirectory = Get-DefaultTarget }
    $TargetDirectory = [IO.Path]::GetFullPath($TargetDirectory)
    Write-Host "=== Chouka 环境检查与代码更新 ===`n目标目录：$TargetDirectory`n分支：$Branch" -ForegroundColor Cyan
    if ($CheckOnly) { Write-Status '提示' '仅检查：不安装软件、不连接仓库、不修改代码。' }
    $git = Find-Git
    $updateFailed = $false
    if (-not $git -and -not $CheckOnly) {
        try { $git = Install-Git }
        catch { $updateFailed = $true; Write-Status '失败' "Git 安装未完成：$($_.Exception.Message)" }
    }
    if ($git) {
        Write-Status '正常' "Git：$($git.Git)；Git Bash：$($git.Bash)"
    } else { Write-Status '警告' '未找到完整的 Git for Windows / Git Bash；正常模式会尝试安装。' }
    if (-not $CheckOnly -and $git) {
        $previousSsh = $env:GIT_SSH_COMMAND
        $previousPrompt = $env:GIT_TERMINAL_PROMPT
        $previousGcm = $env:GCM_INTERACTIVE
        $previousPath = $env:PATH
        try {
            $gitHome = Split-Path (Split-Path $git.Git -Parent) -Parent
            $env:PATH = (Join-Path $gitHome 'cmd') + ';' + (Join-Path $gitHome 'usr\bin') + ';' + $previousPath
            # Unknown host keys and missing credentials fail closed, without hidden prompts.
            if (-not $previousSsh) { $env:GIT_SSH_COMMAND = 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=2' }
            $env:GIT_TERMINAL_PROMPT = '0'
            $env:GCM_INTERACTIVE = 'Never'
            Sync-Chouka $git.Git $TargetDirectory $RepoUrl $Branch
            $head = Invoke-Git $git.Git @('-C', $TargetDirectory, 'rev-parse', '--short', 'HEAD')
            Write-Status '正常' "当前版本：$head；模型和本地配置未清理，运行中的服务未重启。"
        } catch {
            $updateFailed = $true
            Write-Status '失败' $_.Exception.Message
            Write-Status '提示' 'GitLab 首次拉取需要内网/VPN 与已授权 SSH key；Git Bash 安装不会自动赋予代码权限。首次 SSH 主机指纹应由管理员核实。部分克隆或子模块失败时，请检查目录后再重试。'
        } finally {
            $env:GIT_SSH_COMMAND = $previousSsh
            $env:GIT_TERMINAL_PROMPT = $previousPrompt
            $env:GCM_INTERACTIVE = $previousGcm
            $env:PATH = $previousPath
        }
    }
    Test-Environment $TargetDirectory
    Write-Host "`n检查结束：$script:Warnings 项警告。环境探测不等于真实出图验收。" -ForegroundColor Cyan
    if ($updateFailed) { return 1 }
    if ($script:Warnings -gt 0) { return 2 }
    return 0
}

try { exit (Main) }
catch { Write-Status '失败' $_.Exception.Message; exit 1 }
