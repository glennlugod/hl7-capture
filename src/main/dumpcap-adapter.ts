import { ChildProcess, execSync, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import * as pcapParserLib from "pcap-parser";

import type { PcapPacket, PcapPacketHeader, PcapParser, NormalizedPacket } from "../common/types";

export interface DumpcapOptions {
  interface?: string;
  bpf?: string;
  snaplen?: number;
}

// parser types imported from src/common/types.ts

export class DumpcapAdapter extends EventEmitter {
  private readonly options: DumpcapOptions;
  private proc: ChildProcess | null = null;
  private running = false;

  constructor(options: DumpcapOptions = {}) {
    super();
    this.options = options;
  }

  private findDumpcap(): string | null {
    // Prefer dumpcap on PATH
    const which = process.platform === "win32" ? "where" : "which";
    try {
      const res = execSync(`${which} dumpcap`, { encoding: "utf8" }).trim();
      if (res) return res.split(/\r?\n/)[0];
    } catch (err: unknown) {
      // not found on PATH
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("log", `dumpcap lookup failed: ${msg}`);
    }

    // Common Windows install locations for Wireshark
    if (process.platform === "win32") {
      const candidates: string[] = [];
      if (process.env["ProgramFiles"]) {
        candidates.push(path.join(process.env["ProgramFiles"], "Wireshark", "dumpcap.exe"));
      }
      if (process.env["ProgramFiles(x86)"]) {
        candidates.push(path.join(process.env["ProgramFiles(x86)"], "Wireshark", "dumpcap.exe"));
      }

      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    }

    return null;
  }

  public async start(): Promise<void> {
    if (this.running) return;

    const dumpcapPath = this.findDumpcap();
    if (!dumpcapPath) {
      const err = new Error("dumpcap not found on PATH or common locations");
      this.emit("error", err);
      throw err;
    }

    const args: string[] = [];

    // interface selection
    if (this.options.interface) {
      // On some platforms dumpcap accepts -i <index|name>
      args.push("-i", String(this.options.interface));
    }

    // Use stdout pcap output
    args.push("-w", "-");

    // Apply BPF filter only if provided
    if (this.options.bpf) {
      args.push("-f", this.options.bpf);
    }

    // snaplen
    if (this.options.snaplen) {
      args.push("-s", String(this.options.snaplen));
    }

    // Single try-catch for spawn + parser initialization
    try {
      // Force stdout to be binary
      this.proc = spawn(dumpcapPath, args, { stdio: ["ignore", "pipe", "pipe"] });

      this.running = true;
      this.emit("start");

      // Hook stderr for diagnostics
      this.proc?.stderr?.on("data", (chunk: Buffer) => {
        const msg = chunk.toString("utf8");
        this.emit("log", msg);
      });

      if (this.proc?.stdout) {
        // Initialize parser and wire events
        await this.setupParser(this.proc.stdout as NodeJS.ReadableStream);
      }
    } catch (err: unknown) {
      // If dumpcap failed after being created, attempt best-effort stop to avoid
      // leaving an orphaned native process running. Helpers encapsulate their own
      // try-catch so this method still has only one try-catch.
      await this.bestEffortKill(this.proc);

      this.proc = null;
      this.running = false;
      const errObj = err instanceof Error ? err : new Error(String(err));
      this.emit("error", errObj);
      throw errObj;
    }
  }

  /**
   * Initialize pcap parser on the provided stream and wire parser events.
   * This method contains a single try-catch (per the refactor requirement).
   */
  private async setupParser(stream: NodeJS.ReadableStream): Promise<void> {
    try {
      // Use imported module; cast to our local parser interface so tests can still mock the module
      const parser = pcapParserLib.parse(stream) as unknown as PcapParser;

      parser.on("packet", (p: PcapPacket) => {
        // Normalize packet without throwing; defensive checks are used to avoid
        // corrupt reads. If normalization yields null, emit fallback shape.
        const hdr: PcapPacketHeader = p.header || p.packetHeader || {};
        const tsSec = hdr.timestampSeconds ?? hdr.tsSec ?? 0;
        const tsUsec = hdr.timestampMicroseconds ?? hdr.tsUsec ?? 0;
        const inclLen =
          hdr.capturedLength ?? hdr.inclLen ?? hdr.capLen ?? (p.data ? p.data.length : 0);
        const origLen = hdr.originalLength ?? hdr.origLen ?? inclLen;

        const normalized = this.normalizePacket(p.data, tsSec, tsUsec);
        if (normalized) {
          this.emit("packet", normalized);
        } else {
          this.emit("packet", { header: { tsSec, tsUsec, inclLen, origLen }, data: p.data });
        }
      });

      // When the parser stream ends it doesn't necessarily mean the underlying
      // dumpcap process has exited or that the capture should be considered
      // fully stopped by consumers. Avoid emitting the public "stop" event
      // here to prevent prematurely ending capture sessions. Emit a
      // diagnostic event instead so upper layers can decide how to react.
      parser.on("end", () => {
        this.emit("log", "pcap-parser stream ended");
        this.emit("parser-end");
        // Do not modify `this.running` or emit the public "stop" here. The
        // process lifecycle is managed by spawn/stop helpers which will emit
        // "stop" when the child process actually exits or when stop() is
        // explicitly called.
      });

      parser.on("error", (err: Error) => this.emit("error", err));
    } catch (err: unknown) {
      const e = new Error(
        "Required dependency 'pcap-parser' not found or parser initialization failed. Install it and retry: npm install pcap-parser"
      );
      // Attach original error if possible. If this throws, let it propagate — avoid nested try-catch.
      (e as unknown as { cause?: unknown }).cause = err;
      this.emit("error", e);
      throw e;
    }
  }

  /**
   * Safely attempt to extract packet fields and return a normalized shape or null.
   * This routine avoids throwing by performing length checks before reads.
   */
  private normalizePacket(
    raw: Buffer | undefined,
    tsSec: number,
    tsUsec: number
  ): NormalizedPacket | null {
    if (!raw || !Buffer.isBuffer(raw)) return null;

    // Minimum lengths: Ethernet (14) + IPv4 (20) + TCP (20)
    if (raw.length < 14 + 20 + 20) return null;

    const ethType = raw.readUInt16BE(12);
    if (ethType !== 0x0800) return null; // not IPv4

    const ipOffset = 14;
    const verIhl = raw.readUInt8(ipOffset);
    const ihl = (verIhl & 0x0f) * 4;
    const protocol = raw.readUInt8(ipOffset + 9);
    if (protocol !== 6) return null; // not TCP

    const srcIP = `${raw.readUInt8(ipOffset + 12)}.${raw.readUInt8(ipOffset + 13)}.${raw.readUInt8(
      ipOffset + 14
    )}.${raw.readUInt8(ipOffset + 15)}`;
    const dstIP = `${raw.readUInt8(ipOffset + 16)}.${raw.readUInt8(ipOffset + 17)}.${raw.readUInt8(
      ipOffset + 18
    )}.${raw.readUInt8(ipOffset + 19)}`;

    const tcpOffset = ipOffset + ihl;
    const dataOffsetByte = raw.readUInt8(tcpOffset + 12);
    const tcpHeaderLen = ((dataOffsetByte & 0xf0) >> 4) * 4;
    const payloadStart = tcpOffset + tcpHeaderLen;
    const payload = payloadStart < raw.length ? raw.subarray(payloadStart) : Buffer.alloc(0);
    const ts = tsSec * 1000 + Math.floor(tsUsec / 1000);

    return { sourceIP: srcIP, destIP: dstIP, data: payload, ts };
  }

  /**
   * Best-effort kill helper: encapsulates risky kill operations and logs failures.
   * Each helper has its own single try-catch to satisfy the "one try-catch per method" rule.
   */
  private async bestEffortKill(proc: ChildProcess | null): Promise<void> {
    if (!proc) return;
    try {
      // ChildProcess.kill exists on the type; check runtime to be defensive
      if (typeof (proc.kill as unknown) === "function") {
        proc.kill();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("log", `kill-after-spawn-failure: ${msg}`);
    }
  }

  private safeRemoveListeners(proc: ChildProcess | null): void {
    if (!proc) return;
    try {
      // removeAllListeners exists on ChildProcess as an EventEmitter method
      (proc as unknown as NodeJS.EventEmitter).removeAllListeners("exit");
      (proc as unknown as NodeJS.EventEmitter).removeAllListeners("close");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("log", `remove-listeners-failed: ${msg}`);
    }
  }

  private safeKillProc(proc: ChildProcess | null): void {
    if (!proc) return;
    try {
      proc.kill();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("log", `kill-error: ${msg}`);
    }
  }

  private safeEscalateKill(proc: ChildProcess | null, isWin: boolean): void {
    if (!proc) return;
    try {
      if (isWin) {
        // Best-effort: use taskkill to forcefully kill by PID
        if (typeof proc.pid === "number") spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"]);
      } else {
        // SIGKILL may be unsupported on Windows but we're in the non-Windows branch
        proc.kill("SIGKILL");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("log", `escalation-kill-failed: ${msg}`);
    }
  }

  public async stop(): Promise<void> {
    if (!this.running) return;

    if (!this.proc) {
      this.running = false;
      this.emit("stop");
      return;
    }

    const proc = this.proc;
    const isWin = process.platform === "win32";

    // Wait for process to exit, attempt graceful kill then escalate to forced
    // termination if the process does not exit within timeout.
    await new Promise<void>((resolve) => {
      // If the provided proc doesn't look like an EventEmitter (as is the
      // case for some tests which provide a plain object mock), avoid calling
      // .once/.on which would throw. Instead, attempt best-effort kills and
      // resolve immediately.
      const maybeProc: unknown = proc;
      const isEventEmitter = (v: unknown): v is NodeJS.EventEmitter =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as NodeJS.EventEmitter).once === "function";
      const hasOnce = isEventEmitter(maybeProc);
      if (!hasOnce) {
        // Best-effort: try to kill and escalate, then resolve.
        this.safeKillProc(proc);
        // Give a tick for any async side-effects, then escalate.
        setTimeout(() => {
          this.safeEscalateKill(proc, isWin);
          // Use helper that logs failures internally.
          this.safeRemoveListeners(proc);
          resolve();
        }, 0);
        return;
      }

      let finished = false;

      const done = () => {
        if (finished) return;
        finished = true;
        // Use helper that logs failures internally.
        this.safeRemoveListeners(proc);
        resolve();
      };

      proc.once("exit", done);
      proc.once("close", done);

      // Attempt graceful kill using helper which logs failures.
      this.safeKillProc(proc);

      // After timeout, escalate: on Windows use taskkill, otherwise SIGKILL
      const to = setTimeout(() => {
        if (finished) return;
        // Use helper to escalate; helper will log failures internally.
        this.safeEscalateKill(proc, isWin);
      }, 2000);

      // Ensure timer cleared when done
      const wrappedDone = () => {
        clearTimeout(to);
        done();
      };

      proc.once("exit", wrappedDone);
      proc.once("close", wrappedDone);
    });

    this.proc = null;
    this.running = false;
    this.emit("stop");
  }

  public isRunning(): boolean {
    return this.running;
  }
}
