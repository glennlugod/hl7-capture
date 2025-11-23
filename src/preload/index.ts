import { contextBridge, ipcRenderer } from "electron";

import type {
  MarkerConfig,
  HL7Element,
  HL7Session,
  NetworkInterface,
  AppConfig,
  SubmissionConfig,
} from "../common/types";

/**
 * HL7 Capture IPC API
 * Exposed to renderer process via contextBridge for secure IPC communication
 */
const electronAPI = {
  // Network interface operations
  getNetworkInterfaces: (): Promise<NetworkInterface[]> => ipcRenderer.invoke("get-interfaces"),

  // HL7 capture operations
  startCapture: (networkInterface: NetworkInterface, config: MarkerConfig): Promise<void> =>
    ipcRenderer.invoke("start-capture", networkInterface, config),

  stopCapture: (): Promise<void> => ipcRenderer.invoke("stop-capture"),

  pauseCapture: (): Promise<void> => ipcRenderer.invoke("pause-capture"),

  resumeCapture: (): Promise<void> => ipcRenderer.invoke("resume-capture"),

  getSessions: (): Promise<HL7Session[]> => ipcRenderer.invoke("get-sessions"),

  clearSessions: (): Promise<void> => ipcRenderer.invoke("clear-sessions"),

  saveMarkerConfig: (config: MarkerConfig): Promise<void> =>
    ipcRenderer.invoke("save-marker-config", config),

  loadMarkerConfig: (): Promise<MarkerConfig> => ipcRenderer.invoke("load-marker-config"),

  getCaptureStatus: (): Promise<{
    isCapturing: boolean;
    isPaused: boolean;
    sessionCount: number;
    elementCount: number;
    interface: NetworkInterface;
  }> => ipcRenderer.invoke("get-capture-status"),

  saveInterfaceSelection: (interfaceName: string | null): Promise<void> =>
    ipcRenderer.invoke("save-interface-selection", interfaceName),

  loadInterfaceSelection: (): Promise<string | null> =>
    ipcRenderer.invoke("load-interface-selection"),

  validateMarkerConfig: (config: MarkerConfig): Promise<boolean> =>
    ipcRenderer.invoke("validate-marker-config", config),

  // Application-level config
  loadAppConfig: (): Promise<AppConfig> => ipcRenderer.invoke("load-app-config"),

  saveAppConfig: (cfg: AppConfig): Promise<void> => ipcRenderer.invoke("save-app-config", cfg),

  // Phase 3: Session Persistence (NEW)
  getPersistedSessions: (): Promise<HL7Session[]> => ipcRenderer.invoke("get-persisted-sessions"),

  deletePersistedSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke("delete-persisted-session", sessionId),

  getPersistenceConfig: (): Promise<{ enablePersistence: boolean; retentionDays: number }> =>
    ipcRenderer.invoke("get-persistence-config"),

  updatePersistenceConfig: (enablePersistence: boolean, retentionDays: number): Promise<void> =>
    ipcRenderer.invoke("update-persistence-config", enablePersistence, retentionDays),

  // Phase 4: Cleanup Worker (NEW)
  runCleanupNow: (): Promise<void> => ipcRenderer.invoke("run-cleanup-now"),

  getCleanupConfig: (): Promise<{ cleanupIntervalHours: number; dryRunMode: boolean }> =>
    ipcRenderer.invoke("get-cleanup-config"),

  updateCleanupConfig: (cleanupIntervalHours: number, dryRunMode: boolean): Promise<void> =>
    ipcRenderer.invoke("update-cleanup-config", cleanupIntervalHours, dryRunMode),

  // Phase 5: Submission Worker (NEW)
  triggerSubmissionNow: (): Promise<void> => ipcRenderer.invoke("trigger-submission-now"),

  getSubmissionConfig: (): Promise<SubmissionConfig> => ipcRenderer.invoke("get-submission-config"),

  updateSubmissionConfig: (
    endpoint: string,
    authHeader: string,
    concurrency: number,
    maxRetries: number,
    intervalMinutes: number,
    performer: string
  ): Promise<void> =>
    ipcRenderer.invoke(
      "update-submission-config",
      endpoint,
      authHeader,
      concurrency,
      maxRetries,
      intervalMinutes,
      performer
    ),

  // Phase 6: Submission Tracking UI (NEW)
  retrySubmission: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke("retry-submission", sessionId),

  ignoreSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke("ignore-session", sessionId),

  deleteSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke("delete-session", sessionId),

  // Window / Tray controls
  minimizeToTray: (): Promise<void> => ipcRenderer.invoke("minimize-to-tray"),

  restoreFromTray: (): Promise<void> => ipcRenderer.invoke("restore-from-tray"),

  // Event listeners
  onNewElement: (callback: (element: HL7Element) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, element: HL7Element) => {
      callback(element);
    };
    ipcRenderer.on("hl7-element-received", listener);
    return () => ipcRenderer.removeListener("hl7-element-received", listener);
  },

  onSessionComplete: (callback: (session: HL7Session) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, session: HL7Session) => {
      callback(session);
    };
    ipcRenderer.on("session-complete", listener);
    return () => ipcRenderer.removeListener("session-complete", listener);
  },

  onCaptureStatus: (
    callback: (status: {
      isCapturing: boolean;
      isPaused?: boolean;
      sessionCount: number;
      elementCount: number;
    }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: {
        isCapturing: boolean;
        isPaused?: boolean;
        sessionCount: number;
        elementCount: number;
      }
    ) => {
      callback(status);
    };
    ipcRenderer.on("capture-status", listener);
    return () => ipcRenderer.removeListener("capture-status", listener);
  },

  onError: (callback: (error: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: string) => {
      callback(error);
    };
    ipcRenderer.on("capture-error", listener);
    return () => ipcRenderer.removeListener("capture-error", listener);
  },

  // Phase 6: Real-time submission event listeners
  onSubmissionProgress: (
    callback: (progress: { inFlight: number; queueSize: number }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: { inFlight: number; queueSize: number }
    ) => {
      callback(progress);
    };
    ipcRenderer.on("submission-progress", listener);
    return () => ipcRenderer.removeListener("submission-progress", listener);
  },

  onSubmissionResult: (
    callback: (result: {
      sessionId: string;
      submissionStatus: "submitted" | "failed";
      submissionAttempts: number;
      submittedAt?: number;
      error?: string;
    }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      result: {
        sessionId: string;
        submissionStatus: "submitted" | "failed";
        submissionAttempts: number;
        submittedAt?: number;
        error?: string;
      }
    ) => {
      callback(result);
    };
    ipcRenderer.on("submission-result", listener);
    return () => ipcRenderer.removeListener("submission-result", listener);
  },

  // Phase 7: Logging configuration (NEW)
  getLoggingConfig: (): Promise<{ logLevel: string; logsDir: string }> =>
    ipcRenderer.invoke("get-logging-config"),

  updateLoggingConfig: (
    logLevel: string,
    logsDir: string
  ): Promise<{ success: boolean; logLevel: string; logsDir: string }> =>
    ipcRenderer.invoke("update-logging-config", logLevel, logsDir),

  openLogsFolder: (): Promise<{ success: boolean }> => ipcRenderer.invoke("open-logs-folder"),
};

/**
 * Expose API to renderer process
 */
contextBridge.exposeInMainWorld("electron", electronAPI);

/**
 * Declare window.electron for TypeScript
 */
declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}
