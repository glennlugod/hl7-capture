import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import fs from "node:fs";
import * as os from "node:os";
import path from "node:path";

import { configStore } from "./config-store";
import { HL7CaptureManager } from "./hl7-capture";

import type { NetworkInterface, AppConfig } from "../common/types";

let mainWindow: BrowserWindow | null;
let captureManager: HL7CaptureManager;
let appTray: Tray | null = null;

const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

// Prefer the repo public icon during development, and the renderer bundle icon in production.
const iconPath = isDev
  ? path.join(process.cwd(), "public", "img", "icon.ico")
  : path.join(__dirname, "../renderer/img/icon.ico");

/**
 * Enable auto-start for the current user on Windows using Electron's built-in API
 */
function enableAutoStart(): void {
  if (process.platform !== "win32") return;

  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
    });
    console.log("Auto-start enabled for current user");
  } catch (error) {
    console.error("Failed to enable auto-start:", error);
  }
}

/**
 * Disable auto-start for the current user on Windows
 */
function disableAutoStart(): void {
  if (process.platform !== "win32") return;

  try {
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
    });
    console.log("Auto-start disabled for current user");
  } catch (error) {
    console.error("Failed to disable auto-start:", error);
  }
}

/**
 * Create the Electron browser window
 */
function createWindow(): void {
  const appConfig = configStore.loadAppConfig();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: !appConfig.startMinimized, // Hide window initially if starting minimized
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

  // If starting minimized, minimize after loading
  if (appConfig.startMinimized) {
    mainWindow.once("ready-to-show", () => {
      mainWindow?.minimize();
    });
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

  // Phase 3: Initialize session persistence on app startup
  try {
    const appCfg = configStore.loadAppConfig();
    const sessionDir = path.join(os.homedir(), ".hl7-capture", "sessions");
    const enablePersistence = appCfg?.enablePersistence ?? true;
    const retentionDays = appCfg?.retentionDays ?? 30;

    captureManager
      .initializePersistence(sessionDir, enablePersistence, retentionDays)
      .catch((err) => console.error("Failed to initialize session persistence:", err));
  } catch (err) {
    console.warn("Failed to initialize session persistence:", err);
  }

  // Phase 4: Initialize cleanup worker on app startup
  try {
    const appCfg = configStore.loadAppConfig();
    const cleanupIntervalHours = appCfg?.cleanupIntervalHours ?? 24;
    const dryRunMode = appCfg?.dryRunMode ?? false;

    captureManager
      .initializeCleanupWorker(cleanupIntervalHours, dryRunMode)
      .catch((err) => console.error("Failed to initialize cleanup worker:", err));
  } catch (err) {
    console.warn("Failed to initialize cleanup worker:", err);
  }

  // Phase 5: Initialize submission worker on app startup
  try {
    const appCfg = configStore.loadAppConfig();
    const submissionEndpoint = appCfg?.submissionEndpoint ?? "";
    const submissionAuthHeader = appCfg?.submissionAuthHeader ?? "";
    const submissionConcurrency = appCfg?.submissionConcurrency ?? 2;
    const submissionMaxRetries = appCfg?.submissionMaxRetries ?? 3;
    const submissionIntervalMinutes = appCfg?.submissionIntervalMinutes ?? 1;
    const submissionPerformer = appCfg?.submissionPerformer ?? "";

    if (submissionEndpoint) {
      captureManager
        .initializeSubmissionWorker(
          submissionEndpoint,
          submissionAuthHeader,
          submissionConcurrency,
          submissionMaxRetries,
          submissionIntervalMinutes,
          submissionPerformer
        )
        .catch((err) => console.error("Failed to initialize submission worker:", err));
    }
  } catch (err) {
    console.warn("Failed to initialize submission worker:", err);
  }

  // After initializing capture manager, load saved configuration and
  // optionally auto-start capture if user enabled it in settings.
  try {
    const savedConfig = configStore.load();
    const selectedInterfaceName = configStore.loadSelectedInterfaceName();
    const appCfg = configStore.loadAppConfig();

    // Set login item settings based on saved configuration
    if (process.platform === "win32") {
      app.setLoginItemSettings({
        openAtLogin: appCfg?.autoStartApp ?? false,
        path: process.execPath,
      });
    }

    // If application-level autoStartCapture flag is enabled, attempt to start
    // capture using the saved marker configuration. Match the previously
    // selected interface by name or fall back to the first available.
    if (appCfg?.autoStartCapture) {
      const available = captureManager.getNetworkInterfaces();
      let ifaceToUse: import("../common/types").NetworkInterface | null = null;

      if (selectedInterfaceName) {
        ifaceToUse = available.find((i) => i.name === selectedInterfaceName) ?? null;
      }

      if (!ifaceToUse && available.length > 0) {
        ifaceToUse = available[0];
      }

      if (ifaceToUse) {
        // Start capture but don't await here to avoid blocking app ready.
        captureManager
          .startCapture(ifaceToUse, savedConfig)
          .catch((err) => console.error("Auto-start capture failed:", err));
      } else {
        console.warn("Auto-start requested but no network interfaces available to start capture.");
      }
    }
  } catch (err) {
    console.warn("Failed to auto-start capture:", err);
  }
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

  // Initialize submission config from persisted settings
  const appConfig = configStore.loadAppConfig();
  captureManager.updateSubmissionConfig(
    appConfig.submissionEndpoint || "",
    appConfig.submissionAuthHeader || "",
    appConfig.submissionConcurrency || 2,
    appConfig.submissionMaxRetries || 3,
    appConfig.submissionIntervalMinutes || 5
  );

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

  // Phase 6: Listen for submission progress updates
  captureManager.on("submission-progress", (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send("submission-progress", progress);
    }
  });

  // Phase 6: Listen for submission result updates
  captureManager.on("submission-result", (result) => {
    if (mainWindow) {
      mainWindow.webContents.send("submission-result", result);
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

ipcMain.handle("get-capture-status", async () => {
  return captureManager.getStatus();
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

// Phase 3: Session persistence handlers
ipcMain.handle("get-persisted-sessions", async () => {
  try {
    return await captureManager.getPersistedSessions();
  } catch (error) {
    throw new Error(`Failed to get persisted sessions: ${error}`);
  }
});

ipcMain.handle("delete-persisted-session", async (_event, sessionId: string) => {
  try {
    await captureManager.deletePersistedSession(sessionId);
  } catch (error) {
    throw new Error(`Failed to delete persisted session: ${error}`);
  }
});

ipcMain.handle("get-persistence-config", async () => {
  return captureManager.getPersistenceConfig();
});

ipcMain.handle(
  "update-persistence-config",
  async (_event, enablePersistence: boolean, retentionDays: number) => {
    try {
      await captureManager.updatePersistenceConfig(enablePersistence, retentionDays);
    } catch (error) {
      throw new Error(`Failed to update persistence config: ${error}`);
    }
  }
);

// Phase 4: Cleanup worker handlers
ipcMain.handle("run-cleanup-now", async () => {
  try {
    await captureManager.runCleanupNow();
  } catch (error) {
    throw new Error(`Failed to run cleanup: ${error}`);
  }
});

ipcMain.handle("get-cleanup-config", async () => {
  return captureManager.getCleanupConfig();
});

ipcMain.handle(
  "update-cleanup-config",
  async (_event, cleanupIntervalHours: number, dryRunMode: boolean) => {
    try {
      await captureManager.updateCleanupConfig(cleanupIntervalHours, dryRunMode);
    } catch (error) {
      throw new Error(`Failed to update cleanup config: ${error}`);
    }
  }
);

// Phase 5: Submission Worker IPC Handlers
ipcMain.handle("trigger-submission-now", async () => {
  try {
    await captureManager.triggerSubmissionNow();
  } catch (error) {
    throw new Error(`Failed to trigger submission: ${error}`);
  }
});

ipcMain.handle("get-submission-config", async () => {
  const appConfig = configStore.loadAppConfig();
  return {
    submissionEndpoint: appConfig.submissionEndpoint || "",
    submissionAuthHeader: appConfig.submissionAuthHeader || "",
    submissionConcurrency: appConfig.submissionConcurrency || 2,
    submissionMaxRetries: appConfig.submissionMaxRetries || 3,
    submissionIntervalMinutes: appConfig.submissionIntervalMinutes || 1,
    submissionPerformer: appConfig.submissionPerformer || "",
  };
});

ipcMain.handle(
  "update-submission-config",
  async (
    _event,
    endpoint: string,
    authHeader: string,
    concurrency: number,
    maxRetries: number,
    intervalMinutes: number,
    performer: string
  ) => {
    try {
      const appConfig = configStore.loadAppConfig();
      const updatedConfig: AppConfig = {
        ...appConfig,
        submissionEndpoint: endpoint,
        submissionAuthHeader: authHeader,
        submissionConcurrency: concurrency,
        submissionMaxRetries: maxRetries,
        submissionIntervalMinutes: intervalMinutes,
        submissionPerformer: performer,
      };
      configStore.saveAppConfig(updatedConfig);

      // Also update the capture manager's worker
      captureManager.updateSubmissionConfig(
        endpoint,
        authHeader,
        concurrency,
        maxRetries,
        intervalMinutes,
        performer
      );
    } catch (error) {
      throw new Error(`Failed to update submission config: ${error}`);
    }
  }
);

// Phase 6: Submission Tracking UI IPC Handlers
ipcMain.handle("retry-submission", async (_event, sessionId: string) => {
  try {
    const success = await captureManager.retrySubmission(sessionId);
    return success;
  } catch (error) {
    throw new Error(`Failed to retry submission for ${sessionId}: ${error}`);
  }
});

ipcMain.handle("ignore-session", async (_event, sessionId: string) => {
  try {
    await captureManager.ignoreSession(sessionId);
  } catch (error) {
    throw new Error(`Failed to ignore session ${sessionId}: ${error}`);
  }
});

ipcMain.handle("delete-session", async (_event, sessionId: string) => {
  try {
    await captureManager.deleteSession(sessionId);
  } catch (error) {
    throw new Error(`Failed to delete session ${sessionId}: ${error}`);
  }
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

// Application config handlers
ipcMain.handle("load-app-config", async () => {
  return configStore.loadAppConfig();
});

ipcMain.handle("save-app-config", async (_event, cfg) => {
  configStore.saveAppConfig(cfg);

  // Sync auto-start setting with Windows registry
  if (cfg.autoStartApp) {
    enableAutoStart();
  } else {
    disableAutoStart();
  }
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
