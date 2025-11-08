/**
 * HL7 Capture Module
 * Handles TCP packet capture, HL7 marker detection, and session management
 */

import { EventEmitter } from "events";
import * as os from "os";

import { DumpcapAdapter } from "./dumpcap-adapter";

// decoders are no longer used from 'cap'

import type { NetworkInterface, MarkerConfig, HL7Session, HL7Element } from "../common/types";

/**
 * HL7 Capture Manager
 * Manages TCP capture and HL7 session tracking
 */
export class HL7CaptureManager extends EventEmitter {
  private isCapturing: boolean = false;
  private isPaused: boolean = false;
  private currentInterface: string = "";
  private markerConfig: MarkerConfig;
  private sessions: Map<string, HL7Session> = new Map();
  private sessionCounter: number = 0;
  private maxSessions: number = 100;

  // Session tracking
  private activeSessionKey: string | null = null;
  private sessionBuffer: Buffer = Buffer.alloc(0);
  // capture backend state (dumpcap adapter is used when external source not provided)
  private buffer: Buffer = Buffer.alloc(65535);
  // Optional external packet source (e.g., DumpcapAdapter)
  private externalPacketSource: EventEmitter | null = null;

  constructor() {
    super();
    this.markerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      sourceIP: "",
      destinationIP: "",
    };
  }

  /**
   * Resolve a libpcap device name for Cap.open.
   * Accepts either an interface name, a friendly label, or an IP address.
   * Falls back to Cap.findDevice(ip) when available.
   */
  private resolveDevice(interfaceOrIp: string): string {
    // If the input looks like an IP address, try to find the device for that IP
    // If an IP was provided, prefer returning the IP (caller resolves friendly names)
    if (interfaceOrIp && this.isValidIP(interfaceOrIp)) {
      return interfaceOrIp;
    }

    // Try to match by interface label or name from os.networkInterfaces
    const nics = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(nics)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        // Match on address, or on provided friendly label/name
        if (
          (addr.family === "IPv4" && addr.address === interfaceOrIp) ||
          name === interfaceOrIp ||
          `${name} - ${addr.address}` === interfaceOrIp
        ) {
          // As a last resort return the interface name
          return name;
        }
      }
    }

    // Fallback to whatever was provided
    return interfaceOrIp;
  }

  /**
   * Get available network interfaces
   */
  public getNetworkInterfaces(): NetworkInterface[] {
    const interfaces: NetworkInterface[] = [];
    const networkInterfaces = os.networkInterfaces();

    for (const [name, addrs] of Object.entries(networkInterfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        // Only include IPv4 interfaces
        if (addr.family === "IPv4") {
          interfaces.push({
            name: name,
            address: `${name} - ${addr.address}`,
            ip: addr.address,
            mac: addr.mac,
          });
        }
      }
    }

    return interfaces;
  }

  /**
   * Validate marker configuration
   */
  public validateMarkerConfig(config: MarkerConfig): boolean {
    // Check markers are valid hex values
    if (
      config.startMarker < 0 ||
      config.startMarker > 0xff ||
      config.acknowledgeMarker < 0 ||
      config.acknowledgeMarker > 0xff ||
      config.endMarker < 0 ||
      config.endMarker > 0xff
    ) {
      return false;
    }

    // IP addresses are optional but if provided should be valid
    if (config.sourceIP && !this.isValidIP(config.sourceIP)) {
      return false;
    }

    if (config.destinationIP && !this.isValidIP(config.destinationIP)) {
      return false;
    }

    return true;
  }

  /**
   * Basic IP validation
   */
  private isValidIP(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = Number.parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Start capture on specified interface
   */
  public async startCapture(interfaceName: string, config: MarkerConfig): Promise<void> {
    if (this.isCapturing) {
      throw new Error("Capture already in progress");
    }

    this.currentInterface = interfaceName;
    this.markerConfig = config;
    this.isCapturing = true;
    this.sessions.clear();
    this.sessionCounter = 0;

    // Emit status update
    this.emit("status", {
      isCapturing: true,
      sessionCount: 0,
      elementCount: 0,
    });

    // If an external packet source is attached, use it
    if (this.externalPacketSource) {
      this.externalPacketSource.on("packet", (pkt: any) => {
        try {
          if (pkt?.data) {
            this.processPacket(pkt.sourceIP || "", pkt.destIP || "", pkt.data);
          }
        } catch (err) {
          this.emit("error", err as Error);
        }
      });

      return;
    }

    // No external source attached: create internal DumpcapAdapter and start it
    const dumpcap = new DumpcapAdapter({
      interface: this.currentInterface,
      bpf: this.markerConfig ? "tcp" : undefined,
    });
    this.attachPacketSource(dumpcap);
    dumpcap.on("start", () => this.emit("status", { isCapturing: true }));
    dumpcap.on("stop", () => this.emit("status", { isCapturing: false }));
    dumpcap.on("error", (err: Error) => this.emit("error", err));

    try {
      await dumpcap.start();
    } catch (err: any) {
      this.detachPacketSource();
      this.isCapturing = false;
      this.emit("error", err as Error);
      throw err;
    }
  }

  /**
   * Attach an EventEmitter packet source (implements 'packet' events)
   */
  public attachPacketSource(source: EventEmitter): void {
    this.externalPacketSource = source;
    source.on("error", (err: Error) => this.emit("error", err));
  }

  /**
   * Detach the current external packet source
   */
  public detachPacketSource(): void {
    if (!this.externalPacketSource) return;
    try {
      this.externalPacketSource.removeAllListeners("packet");
      this.externalPacketSource.removeAllListeners("error");
    } finally {
      this.externalPacketSource = null;
    }
  }

  /**
   * Stop capture
   */
  public async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    // If an external packet source is attached and has a stop method, call it
    if (
      this.externalPacketSource &&
      typeof (this.externalPacketSource as any).stop === "function"
    ) {
      try {
        await (this.externalPacketSource as any).stop();
      } catch (err) {
        // ignore stop errors
      }
    }

    this.isCapturing = false;
    this.isPaused = false;
    this.activeSessionKey = null;
    this.sessionBuffer = Buffer.alloc(0);

    this.emit("status", {
      isCapturing: false,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
    });
  }

  /**
   * Pause capture
   */
  public async pauseCapture(): Promise<void> {
    if (!this.isCapturing || this.isPaused) {
      return;
    }

    this.isPaused = true;

    this.emit("status", {
      isCapturing: this.isCapturing,
      isPaused: true,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
    });
  }

  /**
   * Resume capture
   */
  public async resumeCapture(): Promise<void> {
    if (!this.isCapturing || !this.isPaused) {
      return;
    }

    this.isPaused = false;

    this.emit("status", {
      isCapturing: this.isCapturing,
      isPaused: false,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
    });
  }

  /**
   * Get all captured sessions
   */
  public getSessions(): HL7Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions
   */
  public clearSessions(): void {
    this.sessions.clear();
    this.sessionCounter = 0;

    this.emit("status", {
      isCapturing: this.isCapturing,
      sessionCount: 0,
      elementCount: 0,
    });
  }

  /**
   * Save marker configuration
   */
  public saveMarkerConfig(config: MarkerConfig): void {
    this.markerConfig = config;
  }

  /**
   * Get total element count across all sessions
   */
  private getTotalElementCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      count += session.elements.length;
    }
    return count;
  }

  /**
   * Create a new HL7 element
   */
  private createElement(
    type: "start" | "message" | "ack" | "end",
    direction: "device-to-pc" | "pc-to-device",
    data: Buffer
  ): HL7Element {
    return {
      id: `element-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      direction,
      type,
      hexData: data.toString("hex"),
      content: type === "message" ? data.toString("utf8") : undefined,
      decodedMessage: type === "message" ? data.toString("utf8") : undefined,
      rawBytes: data,
    };
  }

  /**
   * Process incoming packet data
   */
  private processPacket(sourceIP: string, destIP: string, data: Buffer): void {
    console.log(`Processing packet from ${sourceIP} to ${destIP}, length: ${data.length}`);
    console.log(data);

    if (!this.isCapturing) return;

    // Determine direction
    const direction: "device-to-pc" | "pc-to-device" =
      sourceIP === this.markerConfig.sourceIP ? "device-to-pc" : "pc-to-device";

    // Check for HL7 markers
    if (data.length === 1) {
      const marker = data[0];

      // Start marker (0x05)
      if (marker === this.markerConfig.startMarker) {
        this.handleStartMarker(sourceIP, destIP, data, direction);
      }
      // Acknowledge marker (0x06)
      else if (marker === this.markerConfig.acknowledgeMarker) {
        this.handleAckMarker(data, direction);
      }
      // End marker (0x04)
      else if (marker === this.markerConfig.endMarker) {
        this.handleEndMarker(data, direction);
      }
    } else {
      // Potential HL7 message
      this.handleMessage(data, direction);
    }
  }

  /**
   * Handle start marker (0x05)
   */
  private handleStartMarker(
    sourceIP: string,
    destIP: string,
    data: Buffer,
    direction: "device-to-pc" | "pc-to-device"
  ): void {
    this.sessionCounter++;
    const sessionKey = `session-${this.sessionCounter}`;

    const element = this.createElement("start", direction, data);

    const session: HL7Session = {
      id: sessionKey,
      sessionId: this.sessionCounter,
      startTime: Date.now(),
      deviceIP: sourceIP,
      pcIP: destIP,
      elements: [element],
      messages: [],
      isComplete: false,
    };

    this.sessions.set(sessionKey, session);
    this.activeSessionKey = sessionKey;
    this.sessionBuffer = Buffer.alloc(0);

    // Emit new element
    this.emit("element", element);

    // Limit sessions to maxSessions
    if (this.sessions.size > this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey !== undefined) {
        this.sessions.delete(oldestKey);
      }
    }
  }

  /**
   * Handle acknowledge marker (0x06)
   */
  private handleAckMarker(data: Buffer, direction: "device-to-pc" | "pc-to-device"): void {
    if (!this.activeSessionKey) return;

    const session = this.sessions.get(this.activeSessionKey);
    if (!session) return;

    const element = this.createElement("ack", direction, data);
    session.elements.push(element);

    this.emit("element", element);
  }

  /**
   * Handle HL7 message
   */
  private handleMessage(data: Buffer, direction: "device-to-pc" | "pc-to-device"): void {
    if (!this.activeSessionKey) return;

    const session = this.sessions.get(this.activeSessionKey);
    if (!session) return;

    // Accumulate message data
    this.sessionBuffer = Buffer.concat([this.sessionBuffer, data]);

    // Check for message terminator (CR LF)
    const crlfIndex = this.sessionBuffer.indexOf(Buffer.from("\r\n"));
    if (crlfIndex !== -1) {
      const messageData = this.sessionBuffer.slice(0, crlfIndex + 2);
      const element = this.createElement("message", direction, messageData);

      session.elements.push(element);
      session.messages.push(messageData.toString("utf8"));

      this.emit("element", element);

      // Clear buffer
      this.sessionBuffer = this.sessionBuffer.slice(crlfIndex + 2);
    }
  }

  /**
   * Handle end marker (0x04)
   */
  private handleEndMarker(data: Buffer, direction: "device-to-pc" | "pc-to-device"): void {
    if (!this.activeSessionKey) return;

    const session = this.sessions.get(this.activeSessionKey);
    if (!session) return;

    const element = this.createElement("end", direction, data);
    session.elements.push(element);
    session.endTime = Date.now();
    session.isComplete = true;

    this.emit("element", element);
    this.emit("session-complete", session);

    // Update status
    this.emit("status", {
      isCapturing: this.isCapturing,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
    });

    // Clear active session
    this.activeSessionKey = null;
    this.sessionBuffer = Buffer.alloc(0);
  }
}
