import { Cap, Decoders } from "cap";
import { app, BrowserWindow, ipcMain } from "electron";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import type { CapturedPacket, NetworkInterface, CaptureStatus } from "@common/types";

let mainWindow: BrowserWindow | null = null;
let captureSession: Cap | null = null;
let isCapturing = false;
let isPaused = false;
let selectedInterface = "";
let packetBuffer: CapturedPacket[] = [];
const MAX_PACKETS = 1000;
const BUFFER_SIZE = 10 * 1024 * 1024; // 10MB buffer
const capBuffer = Buffer.alloc(65535);

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
    selectedInterface = interfaceName;
    captureSession = new Cap();

    const filter = "ip or ip6";
    const linkType = captureSession.open(interfaceName, filter, BUFFER_SIZE, capBuffer);

    captureSession.setMinBytes(0);

    isCapturing = true;
    isPaused = false;

    // Start packet capture loop
    startPacketLoop();

    broadcastCaptureStatus();
  } catch (error) {
    isCapturing = false;
    captureSession = null;
    throw error;
  }
}

/**
 * Packet capture loop
 */
function startPacketLoop(): void {
  if (!captureSession || !isCapturing) {
    return;
  }

  try {
    const readPackets = () => {
      if (!captureSession || !isCapturing) {
        return;
      }

      captureSession.read((nbytes: number, truncated: boolean) => {
        if (!isPaused && isCapturing) {
          try {
            const packet = parseCapPacket(capBuffer, nbytes, selectedInterface);
            addToBuffer(packet);

            if (mainWindow) {
              mainWindow.webContents.send("packet-received", packet);
            }
          } catch (error) {
            console.debug("Error processing packet:", error);
          }
        }

        // Continue reading packets
        setImmediate(readPackets);
      });
    };

    // Start the packet reading loop
    readPackets();
  } catch (error) {
    console.error("Capture error:", error);
    if (mainWindow) {
      mainWindow.webContents.send("capture-error", (error as Error).message);
    }
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
 * Parse packet captured with cap library
 */
function parseCapPacket(buffer: Buffer, nbytes: number, interfaceName: string): CapturedPacket {
  const id = uuidv4();
  const timestamp = Date.now();

  let sourceIP = "0.0.0.0";
  let destinationIP = "0.0.0.0";
  let protocol = "Unknown";
  let sourcePort: number | undefined;
  let destinationPort: number | undefined;
  let packetLength = nbytes;

  try {
    // Decode Ethernet frame
    const ethernetPacket = Decoders.Ethernet(buffer);

    if (ethernetPacket) {
      // Check for IPv4
      if (ethernetPacket.info.type === Decoders.PROTOCOL.ETHERNET.IPV4) {
        const ipv4Packet = Decoders.IPV4(buffer, ethernetPacket.offset);

        if (ipv4Packet) {
          sourceIP = ipv4Packet.info.srcaddr;
          destinationIP = ipv4Packet.info.dstaddr;
          packetLength = ipv4Packet.info.totallen;

          const protocolNumber = ipv4Packet.info.protocol;
          protocol = getProtocolName(protocolNumber);

          // Parse TCP
          if (protocolNumber === Decoders.PROTOCOL.IP.TCP) {
            const tcpPacket = Decoders.TCP(buffer, ipv4Packet.offset);
            if (tcpPacket) {
              sourcePort = tcpPacket.info.srcport;
              destinationPort = tcpPacket.info.dstport;
            }
          }
          // Parse UDP
          else if (protocolNumber === Decoders.PROTOCOL.IP.UDP) {
            const udpPacket = Decoders.UDP(buffer, ipv4Packet.offset);
            if (udpPacket) {
              sourcePort = udpPacket.info.srcport;
              destinationPort = udpPacket.info.dstport;
            }
          }
        }
      }
      // Check for IPv6
      else if (ethernetPacket.info.type === Decoders.PROTOCOL.ETHERNET.IPV6) {
        const ipv6Packet = Decoders.IPV6(buffer, ethernetPacket.offset);

        if (ipv6Packet) {
          sourceIP = ipv6Packet.info.srcaddr;
          destinationIP = ipv6Packet.info.dstaddr;

          const protocolNumber = ipv6Packet.info.protocol;
          protocol = getProtocolName(protocolNumber);

          // Parse TCP
          if (protocolNumber === Decoders.PROTOCOL.IP.TCP) {
            const tcpPacket = Decoders.TCP(buffer, ipv6Packet.offset);
            if (tcpPacket) {
              sourcePort = tcpPacket.info.srcport;
              destinationPort = tcpPacket.info.dstport;
            }
          }
          // Parse UDP
          else if (protocolNumber === Decoders.PROTOCOL.IP.UDP) {
            const udpPacket = Decoders.UDP(buffer, ipv6Packet.offset);
            if (udpPacket) {
              sourcePort = udpPacket.info.srcport;
              destinationPort = udpPacket.info.dstport;
            }
          }
        }
      }
    }
  } catch (error) {
    console.debug("Error parsing packet:", error);
  }

  // Create a copy of the packet data
  const rawData = Buffer.alloc(nbytes);
  buffer.copy(rawData, 0, 0, nbytes);

  return {
    id,
    timestamp,
    sourceIP,
    destinationIP,
    protocol,
    sourcePort,
    destinationPort,
    length: packetLength,
    rawData,
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
