$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
if (-not (Test-Path (Join-Path $source 'ChoukaIFBridge.exe'))) {
    throw 'Run Install.ps1 from the unpacked ChoukaIFBridge folder.'
}
$destination = Join-Path $env:LOCALAPPDATA 'Programs\ChoukaIFBridge'
if (Test-Path $destination) {
    throw "An installation already exists. No files were replaced: $destination"
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $destination -Recurse
$executable = Join-Path $destination 'ChoukaIFBridge.exe'
$shortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'Chouka IF Bridge.lnk'
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = $executable
$link.WorkingDirectory = $destination
$link.IconLocation = $executable
$link.Save()
Start-Process -FilePath $executable
Write-Host "Chouka IF Bridge installed: $executable"
