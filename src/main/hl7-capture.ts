/**
 * HL7 Capture Module
 * Handles TCP packet capture, HL7 marker detection, and session management
 */

import { execSync } from "node:child_process";
import { EventEmitter } from "node:events";
import * as os from "node:os";

import { DumpcapAdapter } from "./dumpcap-adapter";

import type {
  NetworkInterface,
  MarkerConfig,
  HL7Session,
  HL7Element,
  PcapPacket,
  NormalizedPacket,
  // NormalizedPacket,
} from "../common/types";

// Local lightweight types for external packet sources and packet shapes
interface PacketSource extends EventEmitter {
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
  isRunning?: () => boolean;
}

/**
 * HL7 Capture Manager
 * Manages TCP capture and HL7 session tracking
 */
export class HL7CaptureManager extends EventEmitter {
  private isCapturing: boolean = false;
  private isPaused: boolean = false;
  private currentInterface: NetworkInterface = { index: -1, name: "" };
  private markerConfig: MarkerConfig;
  private readonly sessions: Map<string, HL7Session> = new Map();
  private sessionCounter: number = 0;
  private readonly maxSessions: number = 100;

  // Session tracking
  private activeSessionKey: string | null = null;
  private sessionBuffer: Buffer = Buffer.alloc(0);
  // Optional external packet source (e.g., DumpcapAdapter)
  private externalPacketSource: PacketSource | null = null;

  constructor() {
    super();
    this.markerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "",
      lisIP: "",
      lisPort: undefined,
    };
  }

  /**
   * Build a BPF (Berkeley Packet Filter) expression from the marker config.
   * Rules:
   * - match any traffic coming from deviceIP or lisIP
   * - match any traffic destined to deviceIP or lisIP
   * - match any traffic with src or dst port equal to lisPort
   * - combine rules with OR, and require TCP transport
   */
  private buildBPF(config: MarkerConfig): string | undefined {
    if (!config) return undefined;

    const parts: string[] = [];

    if (config.deviceIP) {
      // traffic coming from deviceIP or destined to deviceIP
      parts.push(`src host ${config.deviceIP}`, `dst host ${config.deviceIP}`);
    }

    if (config.lisIP) {
      parts.push(`src host ${config.lisIP}`, `dst host ${config.lisIP}`);
    }

    if (config.lisPort !== undefined && config.lisPort !== null) {
      // match either source or destination port
      parts.push(`src port ${config.lisPort}`, `dst port ${config.lisPort}`);
    }

    if (parts.length === 0) {
      return "tcp";
    }

    // Combine with OR and require tcp
    const inner = parts.join(" or ");
    return `tcp and (${inner})`;
  }

  /**
   * Probe whether an external packet source reports it's running.
   * This helper contains its own single try/catch so callers don't need to.
   */
  private probeIsRunning(source: PacketSource | null): boolean {
    if (!source) return false;
    const maybeFn = source.isRunning;
    if (typeof maybeFn !== "function") return false;

    try {
      return !!maybeFn.call(source);
    } catch {
      // If probing fails, treat as not running
      return false;
    }
  }

  /**
   * Get available network interfaces
   */
  public getNetworkInterfaces(): NetworkInterface[] {
    const interfaces: NetworkInterface[] = [];

    // Attempt to use dumpcap -D to enumerate interfaces (gives stable numeric indices)
    try {
      // spawn a synchronous process to get a small amount of output
      const out = execSync("dumpcap -D", { encoding: "utf8" }).trim();
      // dumpcap -D output lines look like: "1. \t\t\t\Device\NPF_{...} (Ethernet)"
      const lines = out
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        // Extract leading index and the rest using exec to satisfy lint rules
        const re = /^(\d+)\s*\.\s*(.+)$/;
        const m = re.exec(line);
        if (m) {
          const idx = Number(m[1]);
          const desc = m[2];
          // Try to extract a readable name and maybe an IP via OS interfaces as fallback
          // Only include index and name per shared type definition
          interfaces.push({ index: idx, name: desc });
        }
      }
      if (interfaces.length > 0) return interfaces;
    } catch {
      // ignore failures and fall back to OS enumeration
    }

    // Fallback: enumerate OS networkInterfaces and leave index undefined
    const networkInterfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(networkInterfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        // Only include IPv4 interfaces
        if (addr.family === "IPv4") {
          interfaces.push({
            index: -1,
            name: name,
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
    if (config.deviceIP && !this.isValidIP(config.deviceIP)) {
      return false;
    }

    if (config.lisIP && !this.isValidIP(config.lisIP)) {
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
   * Type-guard to detect NormalizedPacket shapes at runtime
   */
  private isNormalizedPacket(pkt: unknown): pkt is NormalizedPacket {
    if (!pkt || typeof pkt !== "object") return false;
    const p = pkt as Record<string, unknown>;
    return (
      typeof p.sourceIP === "string" && typeof p.destIP === "string" && Buffer.isBuffer(p.data)
    );
  }

  /**
   * Start capture on specified interface (accepts a NetworkInterface object)
   */
  public async startCapture(
    networkInterface: NetworkInterface,
    config: MarkerConfig
  ): Promise<void> {
    let dumpcap: DumpcapAdapter | null = null;

    try {
      // If an external packet source is attached, we will wire it below.
      // Do not pre-emptively detach a provided external source here; callers
      // may attach a source and start it after calling startCapture (tests
      // and some integrations do this). The attach/detach helpers handle
      // lifecycle cleanup when stopCapture/detachPacketSource are called.

      if (this.isCapturing) {
        throw new Error("Capture already in progress");
      }

      // Normalize the provided NetworkInterface into the string expected by DumpcapAdapter
      // Prefer numeric index when available and non-negative, otherwise use the name.
      // Keep the original NetworkInterface object for later use by adapters
      this.currentInterface = networkInterface;
      this.markerConfig = config;
      this.isCapturing = true;
      this.sessions.clear();
      this.sessionCounter = 0;

      // Emit status update
      this.emit("status", {
        isCapturing: true,
        sessionCount: 0,
        elementCount: 0,
        interface: this.currentInterface,
      });

      // If an external packet source is attached, ensure it's wired and return
      if (this.externalPacketSource) {
        this.attachPacketSource(this.externalPacketSource);
        return;
      }

      // No external source attached: create internal DumpcapAdapter and start it
      // Build a BPF filter that matches any traffic coming from or going to
      // the device or LIS IPs or the LIS port. If no filterable fields are
      // provided, fall back to a generic 'tcp' filter.
      const bpf = this.buildBPF(this.markerConfig);
      dumpcap = new DumpcapAdapter({
        interface: this.currentInterface,
        bpf,
      });
      this.attachPacketSource(dumpcap);

      await dumpcap.start();
    } catch (error_) {
      // If dumpcap failed after being created, attempt to stop it to avoid
      // leaving an orphaned native process running. Use a best-effort stop
      // call without awaiting to avoid nested try/catch structures.
      if (dumpcap) {
        const stopFn = (dumpcap as unknown as PacketSource).stop;
        if (typeof stopFn === "function") {
          // Schedule a best-effort stop asynchronously so synchronous throws
          // from stop() don't occur inside this catch block (avoids nested
          // try/catch in this function). The inner callback may use its own
          // try/catch but that's a different function scope.
          setImmediate(() => {
            try {
              const res = stopFn.call(dumpcap);
              if (res && typeof (res as Promise<unknown>).then === "function") {
                (res as Promise<unknown>).catch((e: unknown) => this.emit("error", e as Error));
              }
            } catch (e) {
              this.emit("error", e as Error);
            }
          });
        }
      }

      this.detachPacketSource();
      this.isCapturing = false;
      this.emit("error", error_ as Error);
      throw error_;
    }
  }

  /**
   * Attach an EventEmitter packet source (implements 'packet' events)
   */
  public attachPacketSource(source: PacketSource): void {
    // Avoid re-attaching the same source multiple times
    if (this.externalPacketSource === source) return;
    this.externalPacketSource = source;

    // Forward errors
    source.on("error", (err: Error) => {
      console.error("Packet source error:", err);
      this.emit("error", err);
    });

    // When the source starts, reflect it in manager state and inform UI
    source.on("start", () => {
      this.isCapturing = true;
      this.emit("status", {
        isCapturing: true,
        sessionCount: this.sessions.size,
        elementCount: this.getTotalElementCount(),
        interface: this.currentInterface,
      });
    });

    // When the source stops, ensure manager state is updated
    source.on("stop", () => {
      this.isCapturing = false;
      this.emit("status", {
        isCapturing: false,
        sessionCount: this.sessions.size,
        elementCount: this.getTotalElementCount(),
        interface: this.currentInterface,
      });
    });

    // Packet forwarding: normalize expected packet shape and pass to processor
    source.on("packet", (pkt: PcapPacket | NormalizedPacket) => {
      try {
        if (!pkt?.data) return;
        // Forward raw bytes to the byte-oriented processor. Direction is
        // defaulted within `processPacket` for adapters that don't provide
        // source/destination information.
        this.processPacket(pkt);
      } catch (err) {
        this.emit("error", err as Error);
      }
    });

    source.on("log", (message: string) => {
      console.log(`[PacketSource] ${message}`);
    });
  }

  /**
   * Detach the current external packet source
   */
  public detachPacketSource(stopFirst = true): void {
    if (!this.externalPacketSource) return;
    // Optionally attempt to stop the source first (best-effort). When the
    // source already emitted 'stop' we don't want to call stop again, so
    // callers can pass stopFirst = false. detachPacketSource should not throw
    // — it's best-effort and will swallow stop errors to avoid requiring
    // callers to nest try/catch.
    if (stopFirst) {
      const maybeStop = this.externalPacketSource?.stop;
      if (typeof maybeStop === "function") {
        try {
          const res = maybeStop.call(this.externalPacketSource);
          if (res && typeof (res as Promise<unknown>).then === "function") {
            // Attach a no-op catch to avoid unhandled promise rejections.
            (res as Promise<unknown>).catch(() => {});
          }
        } catch {
          // ignore stop errors during detach
        }
      }
    }

    // Remove listeners we may have attached. removeAllListeners is safe even
    // if some listeners were already removed.
    this.externalPacketSource.removeAllListeners("packet");
    this.externalPacketSource.removeAllListeners("error");
    this.externalPacketSource.removeAllListeners("start");
    this.externalPacketSource.removeAllListeners("stop");

    this.externalPacketSource = null;
  }

  /**
   * Stop capture
   */
  public async stopCapture(): Promise<void> {
    // Attempt to stop any attached external packet source (dumpcap) even if
    // internal `isCapturing` state is out-of-sync. This ensures we don't leave
    // orphaned native processes running.
    // Use a single try/catch pattern for the method: attempt to stop the
    // external packet source if present, but swallow errors and emit them via
    // manager's 'error' event. detachPacketSource is best-effort and itself
    // swallows stop errors, so we don't need nested try/catch.
    if (this.externalPacketSource && typeof this.externalPacketSource.stop === "function") {
      try {
        await this.externalPacketSource.stop();
      } catch (error_) {
        // Best-effort stop; emit the error but continue cleanup
        this.emit("error", error_ as Error);
      }
    }

    // Always clear manager state and detach the packet source reference so
    // subsequent starts are clean. detachPacketSource will not throw.
    this.isCapturing = false;
    this.isPaused = false;
    this.activeSessionKey = null;
    this.sessionBuffer = Buffer.alloc(0);

    this.detachPacketSource();

    this.emit("status", {
      isCapturing: false,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
      interface: this.currentInterface,
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
      interface: this.currentInterface,
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
      interface: this.currentInterface,
    });
  }

  /**
   * Get all captured sessions
   */
  public getSessions(): HL7Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get current capture status for UI initialization
   */
  public getStatus(): {
    isCapturing: boolean;
    isPaused: boolean;
    sessionCount: number;
    elementCount: number;
    interface: NetworkInterface;
  } {
    return {
      isCapturing: this.isCapturing,
      isPaused: this.isPaused,
      sessionCount: this.sessions.size,
      elementCount: this.getTotalElementCount(),
      interface: this.currentInterface,
    };
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
      interface: this.currentInterface,
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
  private processPacket(pkt: PcapPacket | NormalizedPacket): void {
    // Safely read packet bytes and bail out if absent
    const data = pkt?.data;
    if (!data || data.length === 0) return;

    console.log(`Processing packet, length: ${data.length}`);
    console.log(data);

    if (!this.isCapturing) return;

    // Check for HL7 markers
    if (data.length === 1) {
      const marker = data[0];

      // Start marker (0x05)
      if (marker === this.markerConfig.startMarker) {
        // If the packet is a NormalizedPacket provide source/destination IPs
        if (this.isNormalizedPacket(pkt)) {
          this.handleStartMarker(pkt.sourceIP, pkt.destIP, data, "device-to-pc");
        } else {
          this.handleStartMarker("", "", data, "device-to-pc");
        }
      }
      // Acknowledge marker (0x06)
      else if (marker === this.markerConfig.acknowledgeMarker) {
        this.handleAckMarker(data, "pc-to-device");
      }
      // End marker (0x04)
      else if (marker === this.markerConfig.endMarker) {
        this.handleEndMarker(data, "device-to-pc");
      }
    } else {
      // Potential HL7 message
      this.handleMessage(data, "device-to-pc");
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
      lisIP: destIP,
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
      // Create a new Buffer copy for the message data (preserve original semantics)
      const messageData = Buffer.from(this.sessionBuffer.subarray(0, crlfIndex + 2));
      const element = this.createElement("message", direction, messageData);

      session.elements.push(element);
      session.messages.push(messageData.toString("utf8"));

      this.emit("element", element);

      // Clear buffer by creating a view of remaining bytes
      this.sessionBuffer = this.sessionBuffer.subarray(crlfIndex + 2);
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
      interface: this.currentInterface,
    });

    // Clear active session
    this.activeSessionKey = null;
    this.sessionBuffer = Buffer.alloc(0);
  }
}
