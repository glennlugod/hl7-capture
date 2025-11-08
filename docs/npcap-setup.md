# Npcap Setup Guide

## Overview

This project uses `dumpcap` (part of Wireshark) as the supported capture backend. On Windows, install Npcap so dumpcap can capture on interfaces without elevated privileges.

## Prerequisites

### Windows

Npcap must be installed on your system before running this application. Download and install Npcap from:

**https://npcap.com/#download**

### Important Installation Options

When installing Npcap, consider enabling non-admin capture options so `dumpcap` can be used without elevation.

## Automatic Setup

There is no native `cap` module dependency anymore; the project does not copy Npcap DLLs into node_modules. After installing Npcap and ensuring `dumpcap.exe` is on PATH, the application can start `dumpcap` directly.

## Manual Setup

If you encounter issues, verify `dumpcap.exe` is on PATH or available in a common Wireshark installation folder (e.g., "C:\Program Files\Wireshark").

## Troubleshooting

### Error: "The specified module could not be found"

If dumpcap cannot start due to missing Npcap, steps:

1. Verify Npcap is installed:

```powershell
Test-Path "C:\Windows\System32\Npcap"
```

2. Check for dumpcap.exe (common location):

```powershell
Test-Path "C:\Program Files\Wireshark\dumpcap.exe"
```

3. Reinstall Npcap from https://npcap.com/#download and enable non-admin capture when possible.

### Error: "Npcap DLLs not found"

If the setup script reports that Npcap DLLs are not found:

1. Install or reinstall Npcap from https://npcap.com/#download
2. Make sure to enable "Install Npcap in WinPcap API-compatible Mode" during installation
3. Run `npm install` again after Npcap is installed

## Platform Notes

-- **Windows:** Requires Npcap installation (covered in this guide)

- **macOS:** Uses built-in packet capture capabilities
- **Linux:** Requires libpcap to be installed (`sudo apt-get install libpcap-dev`)

## Additional Resources

- [Npcap Official Website](https://npcap.com/)
- [cap npm package](https://www.npmjs.com/package/cap)
- [Electron Native Modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
