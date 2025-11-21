import { ChildProcess, execFileSync, execSync, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import * as pcapp from "pcap-parser";

import { logger } from "./logger";

import type {
  PcapPacket,
  PcapPacketHeader,
  PcapParser,
  NormalizedPacket,
  NetworkInterface,
} from "../common/types";

export interface DumpcapOptions {
  interface?: NetworkInterface;
  bpf?: string;
  snaplen?: number;
}

/**
 * Discover the dumpcap binary on disk or via PATH. Exported so other
 * modules can probe for dumpcap consistently.
 */
export function findDumpcapBinary(): string | null {
  logger.debug("findDumpcap: searching for dumpcap binary");
  // Prefer dumpcap on PATH
  const which = process.platform === "win32" ? "where" : "which";
  try {
    const res = execSync(`${which} dumpcap`, { encoding: "utf8" }).trim();
    logger.debug(`findDumpcap: PATH search result: ${res}`);
    if (res) return res.split(/\r?\n/)[0];
  } catch (err: unknown) {
    // not found on PATH
    const msg = err instanceof Error ? err.message : String(err);
    logger.debug(`findDumpcap: PATH lookup failed: ${msg}`);
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
    logger.debug(`findDumpcap: checking Windows candidates: ${JSON.stringify(candidates)}`);
    for (const c of candidates) {
      logger.debug(`findDumpcap: checking candidate ${c}`);
      if (fs.existsSync(c)) {
        logger.debug(`findDumpcap: found dumpcap at ${c}`);
        return c;
      }
    }
  }

  logger.debug("findDumpcap: dumpcap not found");
  return null;
}

// parser types imported from src/common/types.ts

export class DumpcapAdapter extends EventEmitter {
  private readonly options: DumpcapOptions;
  private proc: ChildProcess | null = null;
  private running = false;

  private resolveInterfaceIndex(iface: string): string | null {
    try {
      // Prefer the explicit dumpcap path (found via `findDumpcap`) so we
      // consistently call the same binary that `start()` uses instead of
      // relying on PATH lookup. Fall back to `dumpcap` on PATH if we can't
      // find an absolute path.
      const dumpcapPath = this.findDumpcap() || "dumpcap";
      // If we have an absolute path to the dumpcap binary, run the command
      // from the same directory (`cwd`) to reduce surprises from relative
      // dependencies; otherwise, use the current working directory.
      const dumpcapCwd = path.isAbsolute(dumpcapPath) ? path.dirname(dumpcapPath) : process.cwd();
      // Use execFileSync to execute the binary directly and avoid shell
      // quoting issues with execSync + string commands.
      const out = execFileSync(dumpcapPath, ["-D"], { encoding: "utf8", cwd: dumpcapCwd }).trim();
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
            logger.debug(`interface resolution for "${iface}": found index ${idx}`);
            return idx;
          } else {
            logger.debug(`resolveInterfaceIndex: checking interface: ${desc}`);
          }
        }
      }
    } catch {
      // ignore
    }
    logger.debug(`interface resolution for "${iface}": not found`);
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
        const resolved = this.resolveInterfaceIndex(iface.name);
        if (resolved) args.push("-i", resolved);
        else args.push("-i", ifaceStr);
      }
    }

    // Use stdout pcap output
    // Force libpcap (pcap) format instead of pcapng by adding -F pcap
    // This ensures compatibility with pcap-parser which expects classic pcap
    args.push("-F", "pcap", "-w", "-");

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
    // Defer to shared exported locator to avoid duplicating lookup logic.
    return findDumpcapBinary();
  }

  public async start(): Promise<void> {
    if (this.running) {
      logger.debug("start: called but already running");
      return;
    }
    logger.debug("start: called");

    const dumpcapPath = this.findDumpcap();
    if (!dumpcapPath) {
      const err = new Error("dumpcap not found on PATH or common locations");
      logger.error("dumpcap not found on PATH or common locations");
      this.emit("error", err);
      throw err;
    }

    const args = this.buildArgs();

    // Single try-catch for spawn + parser initialization
    try {
      // Force stdout to be binary. Set cwd to the parent folder of the
      // resolved dumpcap binary to ensure the process runs in the directory
      // where dumpcap resides (this helps when dumpcap expects relative
      // files or dependencies located next to the binary). If dumpcapPath
      // is not an absolute path (e.g., fallback to `dumpcap`), fall back
      // to the current working directory so behavior remains unchanged.
      const dumpcapCwd = path.isAbsolute(dumpcapPath) ? path.dirname(dumpcapPath) : process.cwd();
      logger.debug(`start: spawn cwd: ${dumpcapCwd}`);
      this.proc = spawn(dumpcapPath, args, { cwd: dumpcapCwd, stdio: ["ignore", "pipe", "pipe"] });
      logger.debug(`start: spawned dumpcap pid=${this.proc?.pid}`);
      this.running = true;
      this.emit("start");

      // Hook stderr for diagnostics
      this.proc?.stderr?.on("data", (chunk: Buffer) => {
        const msg = chunk.toString("utf8");
        logger.info(`dumpcap stderr: ${msg}`);
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
      logger.debug("start: failed: cleanup and emit error");
      logger.error(`dumpcap start failed: ${errObj.message}`);
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
      const parser = pcapp.parse(stream) as unknown as PcapParser;

      // For testing with a static pcap file, uncomment below:
      // const filePath = "E:\\horiba-pcap.pcap"; // Replace with your pcap file path
      // const readableStream = fs.createReadStream(filePath);
      // const parser = pcapp.parse(readableStream) as unknown as PcapParser;

      parser.on("packet", (p: PcapPacket) => {
        logger.debug(`received packet: ${p.data?.length ?? 0} bytes`);
        // Normalize packet without throwing; defensive checks are used to avoid
        // corrupt reads. If normalization yields null, emit fallback shape.
        const hdr: PcapPacketHeader = p.header || p.packetHeader || {};
        const tsSec = hdr.timestampSeconds ?? hdr.tsSec ?? 0;
        const tsUsec = hdr.timestampMicroseconds ?? hdr.tsUsec ?? 0;
        const inclLen =
          hdr.capturedLength ?? hdr.inclLen ?? hdr.capLen ?? (p.data ? p.data.length : 0);
        const origLen = hdr.originalLength ?? hdr.origLen ?? inclLen;

        // Try real network packet normalization first, then loopback
        let normalized = this.normalizePacket(p.data, tsSec, tsUsec);
        if (!normalized) {
          normalized = this.normalizeLoopbackPacket(p.data, tsSec, tsUsec);
        }
        const headerObj = { tsSec, tsUsec, inclLen, origLen };
        if (normalized) {
          // attach header information to normalized packet
          const withHeader = { ...normalized, header: headerObj };
          this.emit("packet", withHeader);
        } else {
          this.emit("raw-packet", { header: headerObj, data: p.data });
        }
      });

      // When the parser stream ends it doesn't necessarily mean the underlying
      // dumpcap process has exited or that the capture should be considered
      // fully stopped by consumers. Avoid emitting the public "stop" event
      // here to prevent prematurely ending capture sessions. Emit a
      // diagnostic event instead so upper layers can decide how to react.
      parser.on("end", () => {
        logger.info("pcap-parser stream ended");
        this.emit("parser-end");
        // Do not modify `this.running` or emit the public "stop" here. The
        // process lifecycle is managed by spawn/stop helpers which will emit
        // "stop" when the child process actually exits or when stop() is
        // explicitly called.
      });

      parser.on("error", (err: Error) => {
        logger.error(`pcap-parser error: ${err.message}`);
        this.emit("error", err);
      });
    } catch (err: unknown) {
      const e = new Error(
        "Required dependency 'pcap-parser' not found or parser initialization failed. Install it and retry: npm install pcap-parser"
      );
      // Attach original error if possible. If this throws, let it propagate — avoid nested try-catch.
      (e as unknown as { cause?: unknown }).cause = err;
      logger.error(`parser initialization failed: ${e.message}`);
      this.emit("error", e);
      throw e;
    }
  }

  /**
   * Safely attempt to extract packet fields from a real network adapter packet.
   * Returns a normalized shape or null if the packet doesn't match expected Ethernet/IPv4/TCP structure.
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
    if (ethType !== 0x0800) {
      return null; // not IPv4
    }

    const ipOffset = 14;
    const verIhl = raw.readUInt8(ipOffset);
    const ihl = (verIhl & 0x0f) * 4;
    const protocol = raw.readUInt8(ipOffset + 9);
    if (protocol !== 6) {
      return null; // not TCP
    }

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
   * Safely attempt to extract packet fields from a loopback (127.0.0.1) packet.
   * Windows loopback captures may include a 4-byte prefix (link-layer type) before the IPv4 header.
   * Returns a normalized shape or null if the packet doesn't match loopback format.
   * This routine avoids throwing by performing length checks before reads.
   */
  private normalizeLoopbackPacket(
    raw: Buffer | undefined,
    tsSec: number,
    tsUsec: number
  ): NormalizedPacket | null {
    if (!raw || !Buffer.isBuffer(raw)) return null;

    logger.debug(
      `normalizeLoopbackPacket: buffer length=${raw.length}, first 20 bytes hex=${raw.slice(0, Math.min(20, raw.length)).toString("hex")}`
    );

    // Minimum length check before reading any bytes
    if (raw.length < 1) return null;

    // Check if this looks like an IPv4 packet (first nibble should be 4 for IPv4)
    let offset = 0;
    let verIhl = raw.readUInt8(0);
    let version = (verIhl >> 4) & 0x0f;
    let ihlBits = verIhl & 0x0f;
    logger.debug(
      `normalizeLoopbackPacket: byte[0]=0x${verIhl.toString(16)}, version=${version}, ihlBits=${ihlBits}`
    );

    // If version is not 4, check if there's a 4-byte prefix (common on Windows loopback)
    if (version !== 4 && raw.length >= 8) {
      logger.debug(
        `normalizeLoopbackPacket: version=${version} at offset 0, trying offset 4 (4-byte prefix)`
      );
      offset = 4;
      verIhl = raw.readUInt8(offset);
      version = (verIhl >> 4) & 0x0f;
      ihlBits = verIhl & 0x0f;
      logger.debug(
        `normalizeLoopbackPacket: byte[${offset}]=0x${verIhl.toString(16)}, version=${version}, ihlBits=${ihlBits}`
      );
    }

    // If version is still 0 or not 4, treat as raw payload
    if (version === 0 || version !== 4) {
      if (version === 0) {
        logger.debug(
          "normalizeLoopbackPacket: version=0 detected, treating as raw loopback payload (no IP header)"
        );
      } else {
        logger.debug(
          `normalizeLoopbackPacket: version is ${version}, not IPv4 (0x4), treating as raw payload`
        );
      }
      const ts = tsSec * 1000 + Math.floor(tsUsec / 1000);
      // Use synthetic loopback IPs for packets without identifiable headers
      return { sourceIP: "127.0.0.1", destIP: "127.0.0.1", data: raw, ts };
    }

    // Proceed with IPv4 + TCP parsing
    const minLen = offset + 20;
    if (raw.length < minLen) {
      logger.debug(
        `normalizeLoopbackPacket: buffer too short for IPv4 header at offset ${offset}, returning null`
      );
      return null;
    }

    const ihl = ihlBits * 4;
    const protocol = raw.readUInt8(offset + 9);
    logger.debug(`normalizeLoopbackPacket: protocol=${protocol}, ihl=${ihl}`);
    if (protocol !== 6) {
      logger.debug(`normalizeLoopbackPacket: protocol is ${protocol}, not TCP (6), returning null`);
      return null; // not TCP
    }

    // Extract source and destination IPs from IPv4 header (accounting for offset)
    const srcIP = `${raw.readUInt8(offset + 12)}.${raw.readUInt8(offset + 13)}.${raw.readUInt8(offset + 14)}.${raw.readUInt8(
      offset + 15
    )}`;
    const dstIP = `${raw.readUInt8(offset + 16)}.${raw.readUInt8(offset + 17)}.${raw.readUInt8(offset + 18)}.${raw.readUInt8(
      offset + 19
    )}`;

    logger.debug(`normalizeLoopbackPacket: srcIP=${srcIP}, dstIP=${dstIP}`);

    // Verify this is actually a loopback packet
    const loopbackPrefix = "127.";
    if (!srcIP.startsWith(loopbackPrefix) && !dstIP.startsWith(loopbackPrefix)) {
      logger.debug("normalizeLoopbackPacket: neither IP is loopback, returning null");
      return null;
    }

    // Extract TCP payload
    const tcpOffset = offset + ihl;
    if (raw.length < tcpOffset + 20) {
      logger.debug(
        `normalizeLoopbackPacket: not enough data for TCP header at offset ${tcpOffset}, returning null`
      );
      return null; // not enough data for TCP header
    }
    const dataOffsetByte = raw.readUInt8(tcpOffset + 12);
    const tcpHeaderLen = ((dataOffsetByte & 0xf0) >> 4) * 4;
    const payloadStart = tcpOffset + tcpHeaderLen;
    const payload = payloadStart < raw.length ? raw.subarray(payloadStart) : Buffer.alloc(0);
    const ts = tsSec * 1000 + Math.floor(tsUsec / 1000);

    logger.debug(`normalizeLoopbackPacket: success! payload length=${payload.length}`);
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
      logger.warn(`kill-after-spawn-failure: ${msg}`);
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
      logger.warn(`remove-listeners-failed: ${msg}`);
    }
  }

  private safeKillProc(proc: ChildProcess | null): void {
    if (!proc) return;
    try {
      proc.kill();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`kill-error: ${msg}`);
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
      logger.error(`escalation-kill-failed: ${msg}`);
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
