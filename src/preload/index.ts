import { contextBridge, ipcRenderer } from 'electron'

import type { IpcMethods, CapturedPacket, CaptureStatus } from "@common/types";

/**
 * Secure IPC API exposed to renderer process via contextBridge
 */
const electronAPI: IpcMethods = {
  getNetworkInterfaces: () => ipcRenderer.invoke("get-interfaces"),

  startCapture: (interfaceName: string) => ipcRenderer.invoke("start-capture", interfaceName),

  stopCapture: () => ipcRenderer.invoke("stop-capture"),

  pauseCapture: () => ipcRenderer.invoke("pause-capture"),

  resumeCapture: () => ipcRenderer.invoke("resume-capture"),

  getPackets: () => ipcRenderer.invoke("get-packets"),

  clearPackets: () => ipcRenderer.invoke("clear-packets"),

  onNewPacket: (callback: (packet: CapturedPacket) => void) => {
    ipcRenderer.on("packet-received", (_, packet: CapturedPacket) => {
      callback(packet);
    });
  },

  onCaptureStatus: (callback: (status: CaptureStatus) => void) => {
    ipcRenderer.on("capture-status", (_, status: CaptureStatus) => {
      callback(status);
    });
  },

  onError: (callback: (error: string) => void) => {
    ipcRenderer.on("capture-error", (_, error: string) => {
      callback(error);
    });
  },
};

/**
 * Expose API to renderer process with contextIsolation
 */
contextBridge.exposeInMainWorld("electron", electronAPI);
