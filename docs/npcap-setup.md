# Npcap Setup Guide

## Overview

This application uses the `cap` npm package for network packet capture, which requires Npcap (or WinPcap) to be installed on Windows systems.

## Prerequisites

### Windows

Npcap must be installed on your system before running this application. Download and install Npcap from:

**https://npcap.com/#download**

### Important Installation Options

When installing Npcap, make sure to:

- ✅ Enable **"Install Npcap in WinPcap API-compatible Mode"**
- This ensures compatibility with the `cap` npm package

## Automatic Setup

The project includes an automated setup script that runs after `npm install`:

```bash
npm install
```

This will:

1. Rebuild native modules for Electron using `electron-rebuild`
2. Copy required Npcap DLLs (`wpcap.dll` and `Packet.dll`) from `C:\Windows\System32\Npcap` to the `cap` module's build directory

## Manual Setup

If you encounter issues with the automatic setup, you can manually copy the DLLs:

```powershell
Copy-Item "C:\Windows\System32\Npcap\*.dll" -Destination "node_modules\cap\build\Release\" -Force
```

## Troubleshooting

### Error: "The specified module could not be found"

This error occurs when the Npcap DLLs are not accessible to the cap module. Solutions:

1. **Verify Npcap is installed:**

   ```powershell
   Test-Path "C:\Windows\System32\Npcap"
   ```

2. **Check for DLL files:**

   ```powershell
   Get-ChildItem "C:\Windows\System32\Npcap" -Filter "*.dll"
   ```

3. **Run the setup script manually:**

   ```bash
   node scripts/setup-npcap.js
   ```

4. **Reinstall Npcap** with WinPcap API-compatible mode enabled

### Error: "Npcap DLLs not found"

If the setup script reports that Npcap DLLs are not found:

1. Install or reinstall Npcap from https://npcap.com/#download
2. Make sure to enable "Install Npcap in WinPcap API-compatible Mode" during installation
3. Run `npm install` again after Npcap is installed

## Platform Notes

- **Windows:** Requires Npcap installation (covered in this guide)
- **macOS:** Uses built-in packet capture capabilities
- **Linux:** Requires libpcap to be installed (`sudo apt-get install libpcap-dev`)

## Additional Resources

- [Npcap Official Website](https://npcap.com/)
- [cap npm package](https://www.npmjs.com/package/cap)
- [Electron Native Modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
