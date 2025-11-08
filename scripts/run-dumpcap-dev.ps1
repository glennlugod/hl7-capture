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
