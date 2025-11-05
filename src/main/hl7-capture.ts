/**
 * HL7 Capture Module
 * Handles TCP packet capture, HL7 marker detection, and session management
 */

import { EventEmitter } from 'events'
import * as os from 'os'

import type { NetworkInterface, MarkerConfig, HL7Session, HL7Element } from "../common/types";

/**
 * HL7 Capture Manager
 * Manages TCP capture and HL7 session tracking
 */
export class HL7CaptureManager extends EventEmitter {
  private isCapturing: boolean = false;
  private currentInterface: string = "";
  private markerConfig: MarkerConfig;
  private sessions: Map<string, HL7Session> = new Map();
  private sessionCounter: number = 0;
  private maxSessions: number = 100;

  // Session tracking
  private activeSessionKey: string | null = null;
  private sessionBuffer: Buffer = Buffer.alloc(0);

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
   * Get available network interfaces
   */
  public getNetworkInterfaces(): NetworkInterface[] {
    const interfaces: NetworkInterface[] = [];
    const networkInterfaces = os.networkInterfaces();

    for (const [name, addrs] of Object.entries(networkInterfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        // Only include IPv4 non-internal interfaces
        if (addr.family === "IPv4" && !addr.internal) {
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
      const num = parseInt(part, 10);
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

    // TODO: Implement actual pcap capture
    // For now, we'll simulate capture in development
    this.simulateCapture();
  }

  /**
   * Stop capture
   */
  public async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;
    this.activeSessionKey = null;
    this.sessionBuffer = Buffer.alloc(0);

    this.emit("status", {
      isCapturing: false,
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

  /**
   * Simulate HL7 capture for testing (development only)
   */
  private simulateCapture(): void {
    // Simulate a complete HL7 session after 2 seconds
    setTimeout(() => {
      if (!this.isCapturing) return;

      const sourceIP = this.markerConfig.sourceIP || "192.168.1.100";
      const destIP = this.markerConfig.destinationIP || "192.168.1.200";

      // Start marker
      this.processPacket(sourceIP, destIP, Buffer.from([0x05]));

      // Acknowledge
      setTimeout(() => {
        this.processPacket(destIP, sourceIP, Buffer.from([0x06]));

        // HL7 Message
        setTimeout(() => {
          const hl7Message = "MSH|^~\\&|Device|Lab|LIS|Lab|20231105120000||ORU^R01|123|P|2.3\r\n";
          this.processPacket(sourceIP, destIP, Buffer.from(hl7Message));

          // End marker
          setTimeout(() => {
            this.processPacket(sourceIP, destIP, Buffer.from([0x04]));
          }, 500);
        }, 500);
      }, 500);
    }, 2000);
  }
}
