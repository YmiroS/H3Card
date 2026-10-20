param(
    [string]$PythonRoot = (Join-Path $PSScriptRoot '..\..\python_embeded'),
    [string]$OutputRoot = (Join-Path $env:TEMP ('ChoukaIFBridge-' + (Get-Date -Format 'yyyyMMdd-HHmmss')))
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = (Resolve-Path $PythonRoot).Path
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $compiler)) { throw 'This build needs the Windows .NET Framework C# compiler.' }
if (Test-Path $OutputRoot) { throw "Build destination already exists: $OutputRoot" }
$release = Join-Path $OutputRoot 'ChoukaIFBridge'
$runtime = Join-Path $release 'runtime'
New-Item -ItemType Directory -Path $runtime, (Join-Path $release 'server'), (Join-Path $release 'manifests') -Force | Out-Null
foreach ($name in @('python.exe', 'python312.zip', 'LICENSE.txt')) {
    Copy-Item (Join-Path $python $name) $runtime
}
Copy-Item (Join-Path $python '*.dll') $runtime
Copy-Item (Join-Path $python '*.pyd') $runtime
[IO.File]::WriteAllText((Join-Path $runtime 'python312._pth'), "python312.zip`r`n.`r`n", (New-Object System.Text.UTF8Encoding($false)))
Copy-Item (Join-Path $repo 'server\if_studio_bridge.py') (Join-Path $release 'server')
Copy-Item (Join-Path $repo 'manifests\_if_model_limits.json') (Join-Path $release 'manifests')
Copy-Item (Join-Path $PSScriptRoot 'Install.ps1') $release
& $compiler '/nologo' '/target:winexe' '/optimize+' '/codepage:65001' '/r:System.Windows.Forms.dll' '/r:System.Drawing.dll' '/r:System.Web.Extensions.dll' "/out:$(Join-Path $release 'ChoukaIFBridge.exe')" (Join-Path $PSScriptRoot 'BridgeRuntime.cs') (Join-Path $PSScriptRoot 'BridgeManager.cs')
if ($LASTEXITCODE -ne 0) { throw 'Bridge manager compilation failed.' }
& (Join-Path $runtime 'python.exe') -B -c 'import http.server,ipaddress,subprocess,mimetypes'
if ($LASTEXITCODE -ne 0) { throw 'Bundled Python runtime cannot import the bridge requirements.' }
Compress-Archive -Path $release -DestinationPath (Join-Path $OutputRoot 'ChoukaIFBridge.zip')
Write-Host "Package: $(Join-Path $OutputRoot 'ChoukaIFBridge.zip')"
Write-Host "Run: $(Join-Path $release 'ChoukaIFBridge.exe')"
