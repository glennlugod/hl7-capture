import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import fs from "node:fs";
import path from "node:path";

import { configStore } from "./config-store";
import { HL7CaptureManager } from "./hl7-capture";

import type { NetworkInterface } from "../common/types";

let mainWindow: BrowserWindow | null;
let captureManager: HL7CaptureManager;
let appTray: Tray | null = null;

const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

// Prefer the repo public icon during development, and the renderer bundle icon in production.
const iconPath = isDev
  ? path.join(process.cwd(), "public", "img", "icon.ico")
  : path.join(__dirname, "../renderer/img/icon.ico");

/**
 * Create the Electron browser window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
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

  // Minimize to tray behaviour on Windows
  mainWindow.on("minimize", (event: Electron.Event) => {
    // Only apply for non-macOS platforms (Windows/Linux)
    if (process.platform === "darwin") return;
    event.preventDefault();
    mainWindow?.hide();
    ensureTray();
  });

  // When the window is shown again, remove the tray (we don't need it visible)
  mainWindow.on("show", () => {
    if (appTray) {
      try {
        appTray.destroy();
      } catch (e) {
        console.warn("Error destroying tray:", e);
      }
      appTray = null;
    }
  });

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

app.on("before-quit", () => {
  if (appTray) {
    try {
      appTray.destroy();
    } catch (e) {
      console.warn("Error destroying tray during quit:", e);
    }
    appTray = null;
  }
});

/**
 * Create or update the application tray icon/menu
 */
function ensureTray(): void {
  if (appTray) return;

  let trayImage: Electron.NativeImage | undefined;
  if (fs.existsSync(iconPath)) {
    trayImage = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback embedded 16x16 PNG
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAKUlEQVR4AWP4z8DAwMDDgYGBgYGBgYGBgYGBgYGAQYABBgAABa0A/Qgq+XQAAAAASUVORK5CYII=";
    trayImage = nativeImage.createFromBuffer(Buffer.from(base64Png, "base64"));
  }

  appTray = new Tray(trayImage);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  appTray.setToolTip("HL7 Capture");
  appTray.setContextMenu(contextMenu);

  appTray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

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
      // Preload listens for 'hl7-element-received'
      mainWindow.webContents.send("hl7-element-received", element);
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
ipcMain.handle("start-capture", async (_event, networkInterface: NetworkInterface, config) => {
  try {
    // Accept a NetworkInterface object from the renderer/preload and pass it through
    await captureManager.startCapture(networkInterface, config);
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
  configStore.save(config);
});

ipcMain.handle("load-marker-config", async () => {
  return configStore.load();
});

ipcMain.handle("save-interface-selection", async (_event, interfaceName: string | null) => {
  configStore.saveSelectedInterfaceName(interfaceName);
});

ipcMain.handle("load-interface-selection", async () => {
  return configStore.loadSelectedInterfaceName();
});

ipcMain.handle("validate-marker-config", async (_event, config) => {
  return captureManager.validateMarkerConfig(config);
});

// Window / Tray IPC
ipcMain.handle("minimize-to-tray", async () => {
  if (process.platform === "darwin") return;
  if (mainWindow) {
    mainWindow.hide();
    ensureTray();
  }
});

ipcMain.handle("restore-from-tray", async () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
