# Windows PowerShell 5.1. Keep this file ASCII-only.
[CmdletBinding()]
param(
    [ValidateSet('Install', 'Status', 'Remove', 'Check')]
    [string]$Action = 'Status'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FullPath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path) -or
        $Path -notmatch '^[A-Za-z]:[\\/]' -or
        $Path.IndexOfAny([IO.Path]::GetInvalidPathChars()) -ge 0) {
        throw 'The startup plan contains an invalid absolute path.'
    }
    return [IO.Path]::GetFullPath($Path)
}

function Test-SamePath([string]$Left, [string]$Right) {
    return [string]::Equals((Get-FullPath $Left).TrimEnd('\'),
        (Get-FullPath $Right).TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)
}

function Get-StartupPlan {
    $root = Split-Path -Parent $PSScriptRoot
    $expectedPython = [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $root) 'python_embeded\python.exe'))
    $describe = Join-Path $PSScriptRoot 'autostart.py'
    if (-not (Test-Path -LiteralPath $expectedPython -PathType Leaf) -or
        -not (Test-Path -LiteralPath $describe -PathType Leaf)) {
        throw 'The embedded Python or worker/autostart.py is missing.'
    }
    try {
        $raw = @(& $expectedPython -B $describe --describe 2>$null)
        $describeExit = $LASTEXITCODE
    } catch {
        throw 'The read-only Python startup precheck failed. No task was changed.'
    }
    if ($describeExit -ne 0 -or $raw.Count -eq 0) {
        throw 'The read-only Python startup precheck failed. No task was changed.'
    }
    try {
        $json = $raw -join "`n"
        if ($json -match '[^\x00-\x7F]') { throw 'Non-ASCII JSON.' }
        $plan = ConvertFrom-Json -InputObject $json -ErrorAction Stop
        if ($plan -isnot [pscustomobject]) { throw 'Expected an object.' }
        foreach ($field in @('task_name', 'launcher', 'working_directory', 'config', 'python')) {
            $property = $plan.PSObject.Properties[$field]
            if ($null -eq $property -or $property.Value -isnot [string] -or
                [string]::IsNullOrWhiteSpace($property.Value)) { throw 'Missing field.' }
        }
        if ($plan.task_name -cnotmatch '^ChoukaNode-[0-9a-fA-F]{16}$') { throw 'Invalid task name.' }
        $launcher = Get-FullPath $plan.launcher
        $workDir = Get-FullPath $plan.working_directory
        $fileName = [IO.Path]::GetFileName($launcher)
        # No spaces, cmd metacharacters, percent expansion, or delayed expansion.
        if ($fileName -notmatch '^[\p{L}\p{Nd}_-]+\.bat$') { throw 'Unsafe launcher filename.' }
        if (-not (Test-SamePath $workDir $root) -or
            -not (Test-SamePath (Split-Path -Parent $launcher) $workDir) -or
            -not (Test-SamePath $plan.config (Join-Path $PSScriptRoot 'config.json')) -or
            -not (Test-SamePath $plan.python $expectedPython)) { throw 'Unexpected installation path.' }
        foreach ($file in @($launcher, $plan.config, $plan.python)) {
            if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Missing installation file.' }
        }
        $cmd = Join-Path ([Environment]::GetFolderPath('System')) 'cmd.exe'
        if (-not (Test-Path -LiteralPath $cmd -PathType Leaf)) { throw 'System cmd.exe is missing.' }
        return [pscustomobject]@{
            TaskName = $plan.task_name
            Launcher = $launcher
            WorkingDirectory = $workDir
            Config = Get-FullPath $plan.config
            Python = $expectedPython
            Command = $cmd
            Arguments = '/d /c call .\' + $fileName + ' --no-pause 1>>"worker\logs\autostart.log" 2>&1'
        }
    } catch {
        throw 'The Python startup plan is invalid or unsafe. No task was changed.'
    }
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Install/Remove require an administrator console. Right-click the BAT and select Run as administrator. No automatic elevation is performed.'
    }
}

function Get-ExistingTask($Plan) {
    # Enumerate the root folder so a missing task is not confused with access errors.
    $tasks = @(Get-ScheduledTask -TaskPath '\' -ErrorAction Stop |
        Where-Object { $_.TaskName -eq $Plan.TaskName })
    if ($tasks.Count -gt 1) { throw 'More than one matching task was returned.' }
    if ($tasks.Count -eq 1) { return $tasks[0] }
    return $null
}

function Assert-OwnedTask($Task, $Plan) {
    $actions = @($Task.Actions)
    if ($actions.Count -ne 1) { throw 'The existing task is not owned by this installation; refusing to change it.' }
    $entry = $actions[0]
    try {
        $owned = (Test-SamePath ([string]$entry.Execute) $Plan.Command) -and
            (Test-SamePath ([string]$entry.WorkingDirectory) $Plan.WorkingDirectory) -and
            [string]::Equals([string]$entry.Arguments, $Plan.Arguments, [StringComparison]::Ordinal)
    } catch { $owned = $false }
    if (-not $owned) {
        throw 'The existing task action or working directory is not owned by this installation; refusing to change it.'
    }
}

function Show-Plan($Plan) {
    Write-Host ('Task: ' + $Plan.TaskName)
    Write-Host ('Launcher: ' + $Plan.Launcher)
    Write-Host ('Working directory: ' + $Plan.WorkingDirectory)
    Write-Host ('Config: ' + $Plan.Config)
    Write-Host ('Python: ' + $Plan.Python)
    Write-Host 'Startup: machine boot, delayed 60 seconds; no interactive logon required.'
    Write-Host 'Task status is not proof that ComfyUI or Worker is online.'
}

function Show-TaskStatus($Task, $Plan) {
    if ($null -eq $Task) {
        Write-Host 'Startup task is not installed. Service state was not checked.'
        return
    }
    # Never display arbitrary action strings from a colliding, unrelated task.
    Assert-OwnedTask $Task $Plan
    $info = Get-ScheduledTaskInfo -TaskName $Plan.TaskName -TaskPath '\' -ErrorAction Stop
    Write-Host ('Task state: ' + $Task.State)
    foreach ($entry in @($Task.Actions)) {
        Write-Host ('Action execute: ' + $entry.Execute)
        Write-Host ('Action arguments: ' + $entry.Arguments)
        Write-Host ('Action working directory: ' + $entry.WorkingDirectory)
    }
    foreach ($trigger in @($Task.Triggers)) {
        Write-Host ('Trigger type: ' + $trigger.CimClass.CimClassName)
        Write-Host ('Trigger enabled: ' + $trigger.Enabled)
        if ($null -ne $trigger.PSObject.Properties['Delay']) {
            Write-Host ('Trigger delay: ' + $trigger.Delay)
        }
    }
    Write-Host ('Principal user: ' + $Task.Principal.UserId)
    Write-Host ('Principal logon type: ' + $Task.Principal.LogonType)
    Write-Host ('Principal run level: ' + $Task.Principal.RunLevel)
    Write-Host ('Last run time: ' + $info.LastRunTime)
    Write-Host ('Last task result: ' + $info.LastTaskResult)
    Write-Host ('Next run time: ' + $info.NextRunTime)
    Write-Host 'These are Task Scheduler records only; services have not been probed.'
}

function Install-StartupTask($Plan, $Existing) {
    if ($null -ne $Existing) { Assert-OwnedTask $Existing $Plan }
    Write-Host 'Install a real machine-boot task, NOT a logon task. It will run even before you sign in.'
    Write-Host 'Use this SAME Windows account and its actual Windows password, NOT a Windows Hello PIN.'
    Write-Host 'Windows stores the task credential. No password is saved in repository files, logs, or process arguments.'
    Write-Host 'The task runs with Limited privileges. This command will NOT run it or restart any service.'
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $credential = $null
    $plainPassword = $null
    $passwordPointer = [IntPtr]::Zero
    try {
        $credential = Get-Credential -UserName $identity.Name -Message 'Boot startup: enter the current account Windows password (not PIN).'
        if ($null -eq $credential -or $credential.Password.Length -eq 0) {
            throw 'A nonempty actual Windows password is required; installation was cancelled.'
        }
        try {
            $account = New-Object Security.Principal.NTAccount($credential.UserName)
            $sid = $account.Translate([Security.Principal.SecurityIdentifier])
        } catch {
            throw 'Cannot resolve the credential account SID. No task was changed.'
        }
        if (-not $sid.Equals($identity.User)) {
            throw 'The credential must belong to the current Windows user. Switching accounts is not allowed.'
        }
        $taskAction = New-ScheduledTaskAction -Execute $Plan.Command -Argument $Plan.Arguments -WorkingDirectory $Plan.WorkingDirectory
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $trigger.Delay = 'PT60S'
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
            -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
        # Recheck immediately before registration; never force-replace an unknown task.
        $latest = Get-ExistingTask $Plan
        if ($null -ne $latest) { Assert-OwnedTask $latest $Plan }
        $logDirectory = Join-Path $Plan.WorkingDirectory 'worker\logs'
        New-Item -ItemType Directory -Path $logDirectory -Force -ErrorAction Stop | Out-Null
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        $register = @{
            TaskName = $Plan.TaskName
            TaskPath = '\'
            Action = $taskAction
            Trigger = $trigger
            Settings = $settings
            User = $identity.Name
            Password = $plainPassword
            RunLevel = 'Limited'
            Description = 'Chouka ComfyUI + Worker at machine boot; current user password logon.'
            ErrorAction = 'Stop'
        }
        if ($null -ne $latest) { $register.Force = $true }
        try {
            Register-ScheduledTask @register | Out-Null
        } catch {
            # Do not forward provider error records, which may contain bound parameters.
            throw 'Task registration failed. Check the actual Windows password and local task/logon policy. No credential details are displayed.'
        } finally {
            $register.Password = $null
            $register = $null
        }
        Write-Host 'Boot startup task registered. It has NOT been started; existing services were left running.'
        Write-Host ('Future launcher output appends to: ' + (Join-Path $logDirectory 'autostart.log'))
    } finally {
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
        $plainPassword = $null
        if ($null -ne $credential) { $credential.Password.Dispose() }
        $credential = $null
    }
}

try {
    # Every action starts with the same read-only Python validation.
    $plan = Get-StartupPlan
    Show-Plan $plan
    switch ($Action) {
        'Check' {
            Write-Host 'Read-only startup precheck passed. No Task Scheduler commands were called.'
        }
        'Status' {
            Show-TaskStatus (Get-ExistingTask $plan) $plan
        }
        'Install' {
            Assert-Administrator
            Install-StartupTask $plan (Get-ExistingTask $plan)
        }
        'Remove' {
            Assert-Administrator
            $existing = Get-ExistingTask $plan
            if ($null -eq $existing) {
                Write-Host 'Startup task is already absent. Existing services were not stopped.'
            } else {
                Assert-OwnedTask $existing $plan
                Unregister-ScheduledTask -TaskName $plan.TaskName -TaskPath '\' -Confirm:$false -ErrorAction Stop
                Write-Host 'Startup task removed. Existing ComfyUI and Worker services were NOT stopped.'
            }
        }
    }
    exit 0
} catch {
    # Our validation/credential messages are safe; do not dump arbitrary provider errors.
    if ($_.Exception -is [Management.Automation.RuntimeException] -and
        $_.Exception.WasThrownFromThrowStatement) {
        [Console]::Error.WriteLine(('ERROR: ' + $_.Exception.Message))
    } else {
        [Console]::Error.WriteLine('ERROR: Startup task management failed. No service start/stop was requested. Check permissions, script availability, and Task Scheduler policy.')
    }
    exit 1
}
