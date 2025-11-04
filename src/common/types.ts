/**
 * Shared TypeScript types used across main, preload, and renderer processes
 */

export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
}

export interface CapturedPacket {
  id: string;
  timestamp: number;
  sourceIP: string;
  destinationIP: string;
  protocol: string;
  sourcePort?: number;
  destinationPort?: number;
  length: number;
  rawData: Buffer;
}

export interface CaptureStatus {
  isCapturing: boolean;
  isPaused: boolean;
  interface: string;
  packetCount: number;
}

export interface IpcMethods {
  getNetworkInterfaces: () => Promise<NetworkInterface[]>;
  startCapture: (interfaceName: string) => Promise<void>;
  stopCapture: () => Promise<void>;
  pauseCapture: () => Promise<void>;
  resumeCapture: () => Promise<void>;
  getPackets: () => Promise<CapturedPacket[]>;
  clearPackets: () => Promise<void>;
  onNewPacket: (callback: (packet: CapturedPacket) => void) => void;
  onCaptureStatus: (callback: (status: CaptureStatus) => void) => void;
  onError: (callback: (error: string) => void) => void;
}
