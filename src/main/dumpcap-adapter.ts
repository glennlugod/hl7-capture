import { ChildProcess, execSync, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import PCAPNGParser from "pcap-ng-parser";

import type { NormalizedPacket, NetworkInterface } from "../common/types";

export interface DumpcapOptions {
  interface?: NetworkInterface;
  bpf?: string;
  snaplen?: number;
}

// parser types imported from src/common/types.ts

export class DumpcapAdapter extends EventEmitter {
  private readonly options: DumpcapOptions;
  private proc: ChildProcess | null = null;
  private running = false;

  private resolveInterfaceIndex(iface: string): string | null {
    try {
      const out = execSync("dumpcap -D", { encoding: "utf8" }).trim();
      const lines = out
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        const m = /^(\d+)\s*\.\s*(.+)$/.exec(line);
        if (m) {
          const idx = m[1];
          const desc = m[2];
          if (desc.includes(iface) || desc.toLowerCase().includes(iface.toLowerCase())) {
            return idx;
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private buildArgs(): string[] {
    const args: string[] = [];

    if (this.options.interface) {
      const iface = this.options.interface;
      // Prefer numeric index when available; fall back to name for resolution
      const ifaceStr = typeof iface.index === "number" ? String(iface.index) : iface.name;

      if (/^\d+$/.test(ifaceStr)) {
        args.push("-i", ifaceStr);
      } else {
        const resolved = this.resolveInterfaceIndex(ifaceStr);
        if (resolved) args.push("-i", resolved);
        else args.push("-i", ifaceStr);
      }
    }

    // Use stdout pcap output
    args.push("-w", "-");

    if (this.options.bpf) {
      args.push("-f", this.options.bpf);
    }

    if (this.options.snaplen) {
      args.push("-s", String(this.options.snaplen));
    }

    return args;
  }

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

    const args = this.buildArgs();

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
      // We'll create the parser lazily but first install a small detector
      // transform that inspects the first few bytes coming from dumpcap's
      // stdout. If the data looks like text (dumpcap error text, for
      // example when a filter is invalid), we avoid piping it into the
      // binary parser which would throw Buffer read errors. When a valid
      // pcap/pcap-ng magic header is seen we attach the parser and pipe.
      const createParserAndAttachHandlers = () => {
        const parser = new PCAPNGParser();

        // Helper to emit normalized/fallback packet
        const emitFromPayload = (
          payload: Buffer,
          tsSec: number,
          tsUsec: number,
          inclLen?: number,
          origLen?: number
        ) => {
          const normalized = this.normalizePacket(payload, tsSec, tsUsec);
          if (normalized) {
            this.emit("packet", normalized);
          } else {
            this.emit("packet", {
              header: {
                tsSec,
                tsUsec,
                inclLen: inclLen ?? (payload ? payload.length : 0),
                origLen: origLen ?? (payload ? payload.length : 0),
              },
              data: payload,
            });
          }
        };

        // Legacy-style 'packet' events (tests may emit these)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parser.on("packet", (p: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hdr: any = p.header || p.packetHeader || {};
          const tsSec = hdr.timestampSeconds ?? hdr.tsSec ?? 0;
          const tsUsec = hdr.timestampMicroseconds ?? hdr.tsUsec ?? 0;
          const inclLen =
            hdr.capturedLength ?? hdr.inclLen ?? hdr.capLen ?? (p.data ? p.data.length : 0);
          const origLen = hdr.originalLength ?? hdr.origLen ?? inclLen;
          emitFromPayload(p.data ?? Buffer.alloc(0), tsSec, tsUsec, inclLen, origLen);
        });

        // pcap-ng 'data' events with timestampHigh/timestampLow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parser.on("data", (p: any) => {
          try {
            const tsHigh: number = p.timestampHigh ?? 0;
            const tsLow: number = p.timestampLow ?? 0;
            const ts64 = (BigInt(tsHigh) << 32n) + BigInt(tsLow);
            const totalUsec = ts64; // assume microsecond resolution
            const tsSec = Number(totalUsec / 1000000n);
            const tsUsec = Number(totalUsec % 1000000n);
            const payload: Buffer = p.data ?? Buffer.alloc(0);
            emitFromPayload(payload, tsSec, tsUsec, payload.length, payload.length);
          } catch (err) {
            this.emit(
              "log",
              `pcap-ng-parser data handler error: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        });

        parser.on("interface", (iface: { linkType?: number; snapLen?: number; name?: string }) => {
          this.emit("log", `pcap-ng-parser interface: ${JSON.stringify(iface)}`);
        });

        parser.on("end", () => {
          this.emit("log", "pcap-ng-parser stream ended");
          this.emit("parser-end");
        });

        parser.on("error", (err: Error) => this.emit("error", err));

        return parser;
      };

      // Only pipe into the parser after we've detected a valid pcap/pcap-ng
      // header. The detector will buffer a small amount of data and then
      // either attach the parser (and forward buffered data) or emit an
      // error if the stream looks like textual error output.
      if (stream && typeof (stream as unknown as { pipe?: unknown }).pipe === "function") {
        const s = stream as unknown;
        const readable = s as NodeJS.ReadableStream;

        // Buffer incoming bytes until we can decide if the output is binary
        // (pcap/pcap-ng magic) or textual error output. Once detected, write
        // buffered bytes into a freshly created parser and pipe the
        // remainder of the stream into that parser.
        let buf = Buffer.alloc(0);
        let detected = false;

        const onData = (chunk: Buffer) => {
          if (detected) return;
          buf = Buffer.concat([buf, chunk]);
          if (buf.length < 4) return; // need at least 4 bytes for magic

          const first4 = buf.subarray(0, 4);
          const isPcapNg = first4.equals(Buffer.from([0x0a, 0x0d, 0x0d, 0x0a]));
          const isPcapBE = first4.equals(Buffer.from([0xa1, 0xb2, 0xc3, 0xd4]));
          const isPcapLE = first4.equals(Buffer.from([0xd4, 0xc3, 0xb2, 0xa1]));

          if (isPcapNg || isPcapBE || isPcapLE) {
            detected = true;
            const parser = createParserAndAttachHandlers();

            // Restore buffered bytes into the readable stream so piping
            // delivers the full, ordered stream to the parser.
            try {
              // 'unshift' is available on NodeJS Readable streams
              (readable as unknown as { unshift?: (chunk: Buffer) => void }).unshift?.(buf);
            } catch (err) {
              this.emit(
                "log",
                `failed unshifting buffered bytes to readable: ${err instanceof Error ? err.message : String(err)}`
              );
            }

            // stop collecting data via the listener and pipe remaining stream
            readable.removeListener("data", onData);
            readable.on("error", (err) => this.emit("error", err));
            readable.pipe(parser as unknown as NodeJS.WritableStream);

            this.emit("log", "Detected binary pcap/pcap-ng output; attaching parser");
            buf = Buffer.alloc(0);
            return;
          }

          // Not binary; stop listening and emit a readable error message.
          detected = true;
          readable.removeListener("data", onData);
          const textPreview = buf.toString("utf8").slice(0, 200);
          const err = new Error(`dumpcap produced non-binary output: ${textPreview}`);
          this.emit("error", err);
        };

        readable.on("data", onData);
        readable.on("end", () => {
          if (!detected) {
            // stream ended before we saw 4 bytes; emit an error with what we have
            const textPreview = buf.toString("utf8").slice(0, 200);
            this.emit("error", new Error(`dumpcap stream ended unexpectedly: ${textPreview}`));
          }
        });
        readable.on("error", (err) => this.emit("error", err));
      }
    } catch (err: unknown) {
      const e = new Error(
        "Required dependency 'pcap-ng-parser' not found or parser initialization failed. Install it and retry: npm install pcap-ng-parser"
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
