import { app, BrowserWindow, ipcMain } from 'electron'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

import type { CapturedPacket, NetworkInterface, CaptureStatus } from "@common/types";

let mainWindow: BrowserWindow | null = null;
let captureSession: any = null;
let isCapturing = false;
let isPaused = false;
let selectedInterface = "";
let packetBuffer: CapturedPacket[] = [];
const MAX_PACKETS = 1000;

/**
 * Get list of available network interfaces
 */
function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    const ipv4 = addrs.find((addr) => addr.family === "IPv4");
    if (ipv4) {
      result.push({
        name,
        ip: ipv4.address,
        mac: ipv4.mac,
      });
    }
  }

  return result;
}

/**
 * Start packet capture on selected interface
 */
async function startCapture(interfaceName: string): Promise<void> {
  if (isCapturing) {
    throw new Error("Capture already in progress");
  }

  try {
    // Dynamically import pcap since it has native bindings
    const pcap = await import("pcap");

    selectedInterface = interfaceName;
    captureSession = pcap.createSession(interfaceName, {
      bufferSize: 0,
      filter: "ip",
      snaplen: 65535,
    });

    captureSession.on("packet", (rawPacket: Buffer) => {
      if (!isPaused) {
        const packet = parsePacket(rawPacket, interfaceName);
        addToBuffer(packet);

        if (mainWindow) {
          mainWindow.webContents.send("packet-received", packet);
        }
      }
    });

    captureSession.on("error", (error: Error) => {
      console.error("Capture error:", error);
      if (mainWindow) {
        mainWindow.webContents.send("capture-error", error.message);
      }
    });

    isCapturing = true;
    isPaused = false;
    captureSession.resume();

    broadcastCaptureStatus();
  } catch (error) {
    isCapturing = false;
    throw error;
  }
}

/**
 * Stop packet capture
 */
async function stopCapture(): Promise<void> {
  if (!isCapturing) {
    return;
  }

  try {
    if (captureSession) {
      captureSession.close();
      captureSession = null;
    }

    isCapturing = false;
    isPaused = false;
    selectedInterface = "";
    packetBuffer = [];

    broadcastCaptureStatus();
  } catch (error) {
    console.error("Error stopping capture:", error);
    throw error;
  }
}

/**
 * Pause capture (preserve buffer)
 */
async function pauseCapture(): Promise<void> {
  if (!isCapturing) {
    throw new Error("Capture not in progress");
  }

  isPaused = true;
  broadcastCaptureStatus();
}

/**
 * Resume capture
 */
async function resumeCapture(): Promise<void> {
  if (!isCapturing) {
    throw new Error("Capture not in progress");
  }

  isPaused = false;
  broadcastCaptureStatus();
}

/**
 * Get all captured packets
 */
function getPackets(): CapturedPacket[] {
  return packetBuffer;
}

/**
 * Clear packet buffer
 */
function clearPackets(): void {
  packetBuffer = [];
  broadcastCaptureStatus();
}

/**
 * Add packet to buffer (maintain size limit)
 */
function addToBuffer(packet: CapturedPacket): void {
  packetBuffer.push(packet);

  if (packetBuffer.length > MAX_PACKETS) {
    packetBuffer.shift();
  }
}

/**
 * Parse raw packet and extract headers
 */
function parsePacket(rawPacket: Buffer, interfaceName: string): CapturedPacket {
  const id = uuidv4();
  const timestamp = Date.now();

  let sourceIP = "0.0.0.0";
  let destinationIP = "0.0.0.0";
  let protocol = "Unknown";
  let sourcePort: number | undefined;
  let destinationPort: number | undefined;

  try {
    // Skip Ethernet header (14 bytes) if present
    let offset = 14;

    // Check if raw packet starts with IP header
    if (rawPacket.length > 20) {
      const version = rawPacket[offset] >> 4;

      if (version === 4) {
        // IPv4
        sourceIP = rawPacket.slice(offset + 12, offset + 16).join(".");
        destinationIP = rawPacket.slice(offset + 16, offset + 20).join(".");

        const protocolNumber = rawPacket[offset + 9];
        protocol = getProtocolName(protocolNumber);

        // Parse transport layer if TCP/UDP
        const headerLength = (rawPacket[offset] & 0x0f) * 4;
        const transportOffset = offset + headerLength;

        if (
          (protocolNumber === 6 || protocolNumber === 17) &&
          rawPacket.length > transportOffset + 4
        ) {
          sourcePort = rawPacket.readUInt16BE(transportOffset);
          destinationPort = rawPacket.readUInt16BE(transportOffset + 2);
        }
      }
    }
  } catch (error) {
    console.debug("Error parsing packet:", error);
  }

  return {
    id,
    timestamp,
    sourceIP,
    destinationIP,
    protocol,
    sourcePort,
    destinationPort,
    length: rawPacket.length,
    rawData: rawPacket,
  };
}

/**
 * Map protocol number to name
 */
function getProtocolName(protocolNumber: number): string {
  const protocols: { [key: number]: string } = {
    1: "ICMP",
    6: "TCP",
    17: "UDP",
  };

  return protocols[protocolNumber] || `Other (${protocolNumber})`;
}

/**
 * Broadcast current capture status to renderer
 */
function broadcastCaptureStatus(): void {
  if (mainWindow) {
    const status: CaptureStatus = {
      isCapturing,
      isPaused,
      interface: selectedInterface,
      packetCount: packetBuffer.length,
    };

    mainWindow.webContents.send("capture-status", status);
  }
}

/**
 * Create main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development";
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
 * App event handlers
 */
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * IPC Handlers (exposed to renderer via preload)
 */
ipcMain.handle("get-interfaces", getNetworkInterfaces);
ipcMain.handle("start-capture", (_, interfaceName: string) => startCapture(interfaceName));
ipcMain.handle("stop-capture", stopCapture);
ipcMain.handle("pause-capture", pauseCapture);
ipcMain.handle("resume-capture", resumeCapture);
ipcMain.handle("get-packets", getPackets);
ipcMain.handle("clear-packets", clearPackets);
