import { contextBridge, ipcRenderer } from "electron";

import type {
  MarkerConfig,
  HL7Element,
  HL7Session,
  NetworkInterface,
  AppConfig,
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
