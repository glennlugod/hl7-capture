<#
Run Dumpcap in development mode and pipe pcap output to stdout.

Usage:
    .\run-dumpcap-dev.ps1 -Interface 1 -Filter "tcp"

Notes:
- This helper does not modify system PATH. It tries to locate dumpcap in
    common Wireshark install locations and on PATH.
- Running dumpcap may require elevated privileges depending on Npcap options.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Interface,

    [Parameter(Mandatory=$false)]
    [string]$Filter = "tcp",

    [Parameter(Mandatory=$false)]
    [string]$DumpcapPath
)

function Find-Dumpcap {
    param($hint)
    if ($hint -and (Test-Path $hint)) { return $hint }

    $which = (Get-Command dumpcap -ErrorAction SilentlyContinue)
    if ($which) { return $which.Source }

    $candidates = @(
        "$env:ProgramFiles\Wireshark\dumpcap.exe",
        "$env:ProgramFiles(x86)\Wireshark\dumpcap.exe"
    )

    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }

    return $null
}

$dumpcap = Find-Dumpcap -hint $DumpcapPath
if (-not $dumpcap) {
    Write-Error "dumpcap not found on PATH or common install locations. Install Wireshark/Npcap and try again."
    exit 2
}

$args = @('-i', $Interface, '-f', $Filter, '-w', '-')

Write-Host "Starting dumpcap: $dumpcap $($args -join ' ')"

# Start dumpcap and stream binary pcap to stdout — consumer must read binary from stdout
& $dumpcap @args
param(
    [Parameter(Mandatory=$false)]
    [string]$Interface = "1",

    [Parameter(Mandatory=$false)]
    [string]$Filter = "tcp",

    [Parameter(Mandatory=$false)]
    [string]$DumpcapPath = "C:\\Program Files\\Wireshark\\dumpcap.exe"
)

Write-Host "Running dumpcap for development: Interface=$Interface Filter=$Filter"

if (-Not (Test-Path $DumpcapPath)) {
    Write-Error "dumpcap not found at $DumpcapPath. Install Wireshark/Npcap or supply -DumpcapPath"
    exit 1
}

# Build safe argument array
$dumpcapArgs = @('-i', $Interface, '-f', $Filter, '-w', '-')

Write-Host "Executing: $DumpcapPath $($dumpcapArgs -join ' ')"

# Execute dumpcap directly with the safe args
& "$DumpcapPath" @dumpcapArgs
