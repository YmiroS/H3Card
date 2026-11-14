$ErrorActionPreference = 'Stop'

try {
    Write-Host 'GitHub SSH 公钥生成 / 获取' -ForegroundColor Cyan
    Write-Host '私钥只保存在本机，不会打印。新密钥使用空口令，请妥善保管本机账号。'
    $email = (Read-Host '请输入 GitHub 邮箱').Trim()
    if ($email -notmatch '^[^@\s"\\]+@[^@\s"\\]+\.[^@\s"\\]+$') {
        throw '邮箱格式不正确，请重新运行并输入有效邮箱。'
    }

    $keygen = Get-Command ssh-keygen.exe -ErrorAction SilentlyContinue
    if ($keygen) {
        $keygenPath = $keygen.Source
    } else {
        $candidates = @(
            "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe",
            "$env:ProgramFiles\Git\usr\bin\ssh-keygen.exe",
            "$env:LOCALAPPDATA\Programs\Git\usr\bin\ssh-keygen.exe"
        )
        $git = Get-Command git.exe -ErrorAction SilentlyContinue
        if ($git) {
            $gitRoot = Split-Path (Split-Path $git.Source -Parent) -Parent
            $candidates = @((Join-Path $gitRoot 'usr\bin\ssh-keygen.exe')) + $candidates
        }
        $keygenPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
    if (-not $keygenPath) {
        throw '找不到 ssh-keygen。请安装 Git for Windows 或启用 Windows OpenSSH 客户端后重试。'
    }

    $sshDir = Join-Path $env:USERPROFILE '.ssh'
    $keyPath = Join-Path $sshDir 'id_ed25519'
    $publicPath = "$keyPath.pub"
    if (-not (Test-Path -LiteralPath $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir | Out-Null
    }

    if (Test-Path -LiteralPath $keyPath -PathType Leaf) {
        Write-Host "复用现有密钥：$keyPath（不修改原邮箱注释）"
        if (-not (Test-Path -LiteralPath $publicPath -PathType Leaf)) {
            Write-Host '公钥文件缺失，正在从私钥恢复；如果原私钥设有口令，请按提示输入。'
            $publicKey = & $keygenPath -y -f $keyPath
            if ($LASTEXITCODE -ne 0) { throw '恢复公钥失败。' }
            $publicKey | Set-Content -LiteralPath $publicPath -Encoding ASCII
        }
    } else {
        if (Test-Path -LiteralPath $publicPath) {
            throw "只找到公钥但没有对应私钥，为避免覆盖已停止：$publicPath"
        }
        # PowerShell 5.1 会丢失原生命令的空参数，用原始参数串保留 -N ""。
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = $keygenPath
        $startInfo.Arguments = '-t ed25519 -C "{0}" -f "{1}" -N ""' -f $email, $keyPath
        $startInfo.UseShellExecute = $false
        $process = [System.Diagnostics.Process]::Start($startInfo)
        $process.WaitForExit()
        $exitCode = $process.ExitCode
        $process.Dispose()
        if ($exitCode -ne 0) { throw "生成密钥失败，退出码：$exitCode" }
    }

    $publicKey = (Get-Content -LiteralPath $publicPath -Raw).Trim()
    if ($publicKey -notmatch '^ssh-ed25519\s+\S+') {
        throw "公钥格式不正确，请检查：$publicPath"
    }
    Write-Host ''
    Write-Host '========== 复制下面这一整行公钥 ==========' -ForegroundColor Green
    Write-Host $publicKey
    Write-Host '========================================='
    Write-Host "公钥文件：$publicPath"
    try {
        Set-Clipboard -Value $publicKey
        Write-Host '公钥已复制到剪贴板。' -ForegroundColor Green
    } catch {
        Write-Warning '未能复制到剪贴板，请手动复制上面的公钥。'
    }
    Write-Host ''
    Write-Host '打开 https://github.com/settings/ssh/new'
    Write-Host '填写 Title，Key type 选择 Authentication Key，将公钥粘贴到 Key 后保存。'
    Write-Host '保存后可运行：ssh -T git@github.com'
    Write-Host '此脚本不修改已有 SSH 配置、Git 邮箱或仓库地址；使用 SSH 克隆地址连接 GitHub。'
} catch {
    Write-Host "失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
