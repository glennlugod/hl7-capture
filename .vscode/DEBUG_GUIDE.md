# VSCode Debug Configuration Guide

This guide explains how to use the debug configurations set up for the HL7 Capture Electron application.

## Available Debug Configurations

### 1. Debug Electron (Main Process)

**Best for:** Debugging the main Electron process (backend/Node.js code)

- Launches the Electron app with the debugger attached to the main process
- Set breakpoints in `src/main/index.ts` and other main process files
- Use this when debugging:
  - IPC handlers
  - Packet capture logic
  - Native module interactions (cap library)
  - Window management

**How to use:**

1. Set breakpoints in main process files (e.g., `src/main/index.ts`)
2. Press `F5` or select this configuration and click the green play button
3. The app will launch and stop at your breakpoints

### 2. Debug Electron (Main + Inspect)

**Best for:** Advanced debugging requiring both main process and renderer inspection

- Launches with both main process debugging and remote debugging enabled
- Opens debug port 5858 for main process and 9223 for renderer
- Use this when you need to debug both processes simultaneously

**How to use:**

1. Start this configuration first
2. Wait for the app to fully launch
3. Then run "Attach to Renderer (Chrome DevTools)" to debug the renderer process

### 3. Attach to Renderer (Chrome DevTools)

**Best for:** Debugging the React UI and renderer process

- Attaches Chrome DevTools to the running Electron renderer process
- Set breakpoints in React components and renderer code
- Use this when debugging:
  - React components
  - UI interactions
  - State management
  - Renderer-side IPC calls

**How to use:**

1. **IMPORTANT:** First start "Debug Electron (Main + Inspect)"
2. Wait for the Electron window to open
3. Select "Attach to Renderer (Chrome DevTools)" and start it
4. Set breakpoints in renderer files (e.g., `src/renderer/App.tsx`)

**Note:** If you get a connection error, make sure the app is already running with the "Debug Electron (Main + Inspect)" configuration.

### 4. Run Tests

**Best for:** Debugging Jest tests

- Runs Jest tests with the debugger attached
- Set breakpoints in test files to debug failing tests

**How to use:**

1. Set breakpoints in test files (e.g., `tests/unit/packetParser.test.ts`)
2. Start this configuration
3. Tests will run and stop at your breakpoints

## Common Debugging Workflows

### Debugging Main Process Only

1. Open `src/main/index.ts`
2. Set breakpoints where needed
3. Press `F5` (or select "Debug Electron (Main Process)")
4. App launches and stops at breakpoints

### Debugging Renderer Process Only

1. Start "Debug Electron (Main + Inspect)"
2. Wait for app window to appear
3. Start "Attach to Renderer (Chrome DevTools)"
4. Set breakpoints in React components
5. Interact with the UI to trigger breakpoints

### Debugging Both Main and Renderer

1. Set breakpoints in both main and renderer code
2. Start "Debug Electron (Main + Inspect)"
3. Wait for app to launch
4. Start "Attach to Renderer (Chrome DevTools)"
5. Both debuggers are now active

### Debugging Tests

1. Open a test file
2. Set breakpoints
3. Start "Run Tests" configuration
4. Debugger stops at breakpoints during test execution

## Troubleshooting

### "Cannot connect to target at localhost:9223"

**Solution:** This error occurs when trying to attach to the renderer before the app is running. Always start "Debug Electron (Main + Inspect)" first, then attach to the renderer.

### Breakpoints not hitting in renderer

**Solution:**

1. Make sure you're using "Attach to Renderer (Chrome DevTools)"
2. Check that source maps are enabled in `vite.config.ts`
3. Try refreshing the Electron window (Ctrl+R / Cmd+R)

### App crashes on startup during debug

**Solution:**

1. Check that Npcap is properly installed (run `node scripts/setup-npcap.js`)
2. Make sure you have admin/elevated privileges on Windows
3. Check the Debug Console for error messages

### Source maps not working

**Solution:**

1. Ensure TypeScript source maps are enabled in `tsconfig.json`
2. Rebuild the project with `npm run dev`
3. Restart the debug session

## Tips

- **Use the Debug Console** to evaluate expressions while paused at a breakpoint
- **Watch variables** by right-clicking and selecting "Add to Watch"
- **Step through code** using F10 (step over) and F11 (step into)
- **DevTools** automatically open in development mode for additional debugging
- **Hot reload** works while debugging - your code changes will reload automatically

## Keyboard Shortcuts

- `F5` - Start debugging / Continue
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into
- `Shift+F11` - Step out
- `Shift+F5` - Stop debugging
- `Ctrl+Shift+F5` - Restart debugging

## Additional Resources

- [VSCode Debugging Documentation](https://code.visualstudio.com/docs/editor/debugging)
- [Electron Debugging Guide](https://www.electronjs.org/docs/latest/tutorial/debugging-main-process)
- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
