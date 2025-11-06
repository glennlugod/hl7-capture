import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

import { HL7CaptureManager } from './hl7-capture'

let mainWindow: BrowserWindow | null;
let captureManager: HL7CaptureManager;

const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

/**
 * Create the Electron browser window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../renderer/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle: ready
 */
app.on("ready", () => {
  createWindow();
  initializeCaptureManager();
});

/**
 * App lifecycle: window-all-closed
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * App lifecycle: activate (macOS)
 */
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Initialize HL7 Capture Manager and set up event listeners
 */
function initializeCaptureManager(): void {
  captureManager = new HL7CaptureManager();

  // Listen for new HL7 elements
  captureManager.on("element", (element) => {
    if (mainWindow) {
      mainWindow.webContents.send("new-element", element);
    }
  });

  // Listen for completed sessions
  captureManager.on("session-complete", (session) => {
    if (mainWindow) {
      mainWindow.webContents.send("session-complete", session);
    }
  });

  // Listen for status updates
  captureManager.on("status", (status) => {
    if (mainWindow) {
      mainWindow.webContents.send("capture-status", status);
    }
  });

  // Listen for errors
  captureManager.on("error", (error) => {
    if (mainWindow) {
      mainWindow.webContents.send("capture-error", error.message);
    }
  });
}

/**
 * IPC Handlers - HL7 capture operations
 */

// Network interface detection
ipcMain.handle("get-interfaces", async () => {
  return captureManager.getNetworkInterfaces();
});

// Capture control
ipcMain.handle("start-capture", async (_event, interfaceName: string, config) => {
  try {
    await captureManager.startCapture(interfaceName, config);
  } catch (error) {
    throw new Error(`Failed to start capture: ${error}`);
  }
});

ipcMain.handle("stop-capture", async () => {
  try {
    await captureManager.stopCapture();
  } catch (error) {
    throw new Error(`Failed to stop capture: ${error}`);
  }
});

ipcMain.handle("pause-capture", async () => {
  try {
    await captureManager.pauseCapture();
  } catch (error) {
    throw new Error(`Failed to pause capture: ${error}`);
  }
});

ipcMain.handle("resume-capture", async () => {
  try {
    await captureManager.resumeCapture();
  } catch (error) {
    throw new Error(`Failed to resume capture: ${error}`);
  }
});

// Session management
ipcMain.handle("get-sessions", async () => {
  return captureManager.getSessions();
});

ipcMain.handle("clear-sessions", async () => {
  captureManager.clearSessions();
});

ipcMain.handle("save-marker-config", async (_event, config) => {
  captureManager.saveMarkerConfig(config);
});

ipcMain.handle("validate-marker-config", async (_event, config) => {
  return captureManager.validateMarkerConfig(config);
});
