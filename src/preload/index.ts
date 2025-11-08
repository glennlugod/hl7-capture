import { contextBridge, ipcRenderer } from "electron";

import type { MarkerConfig, HL7Element, HL7Session, NetworkInterface } from "../common/types";

/**
 * HL7 Capture IPC API
 * Exposed to renderer process via contextBridge for secure IPC communication
 */
const electronAPI = {
  // Network interface operations
  getNetworkInterfaces: (): Promise<NetworkInterface[]> => ipcRenderer.invoke("get-interfaces"),

  // HL7 capture operations
  startCapture: (interfaceName: string, config: MarkerConfig): Promise<void> =>
    ipcRenderer.invoke("start-capture", interfaceName, config),

  stopCapture: (): Promise<void> => ipcRenderer.invoke("stop-capture"),

  pauseCapture: (): Promise<void> => ipcRenderer.invoke("pause-capture"),

  resumeCapture: (): Promise<void> => ipcRenderer.invoke("resume-capture"),

  getSessions: (): Promise<HL7Session[]> => ipcRenderer.invoke("get-sessions"),

  clearSessions: (): Promise<void> => ipcRenderer.invoke("clear-sessions"),

  // Event listeners
  onNewElement: (callback: (element: HL7Element) => void): void => {
    ipcRenderer.on("hl7-element-received", (_event, element) => {
      callback(element);
    });
  },

  onSessionComplete: (callback: (session: HL7Session) => void): void => {
    ipcRenderer.on("session-complete", (_event, session) => {
      callback(session);
    });
  },

  onCaptureStatus: (
    callback: (status: {
      isCapturing: boolean;
      isPaused?: boolean;
      sessionCount: number;
      elementCount: number;
    }) => void
  ): void => {
    ipcRenderer.on("capture-status", (_event, status) => {
      callback(status);
    });
  },

  onError: (callback: (error: string) => void): void => {
    ipcRenderer.on("capture-error", (_event, error) => {
      callback(error);
    });
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
