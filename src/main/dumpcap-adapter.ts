import { execSync, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";

// This adapter relies exclusively on the installed `pcap-parser` package.

export interface DumpcapOptions {
  interface?: string;
  bpf?: string;
  snaplen?: number;
}

export class DumpcapAdapter extends EventEmitter {
  private readonly options: DumpcapOptions;
  private proc: any = null;
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
    } catch (err: any) {
      // not found on PATH
      console.debug(`dumpcap lookup failed: ${err?.message ?? String(err)}`);
    }

    // Common Windows install locations for Wireshark
    if (process.platform === "win32") {
      const candidates: string[] = [];
      if (process.env["ProgramFiles"])
        candidates.push(path.join(process.env["ProgramFiles"]!, "Wireshark", "dumpcap.exe"));
      if (process.env["ProgramFiles(x86)"])
        candidates.push(path.join(process.env["ProgramFiles(x86)"], "Wireshark", "dumpcap.exe"));

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

    // Force stdout to be binary
    try {
      this.proc = spawn(dumpcapPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err: any) {
      this.emit("error", err as Error);
      throw err;
    }

    this.running = true;
    this.emit("start");

    // Hook stderr for diagnostics
    if (this.proc && this.proc.stderr) {
      this.proc.stderr.on("data", (chunk: Buffer) => {
        const msg = chunk.toString("utf8");
        this.emit("log", msg);
      });
    }
    if (this.proc && this.proc.stdout) {
      // Require the npm pcap-parser library (streaming parser). If it's not
      // available the adapter fails fast so the runtime/CI must ensure the
      // dependency is present.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pcapParser = require("pcap-parser");
        const parser = pcapParser.parse(this.proc.stdout as NodeJS.ReadableStream);
        parser.on("packet", (p: any) => {
          try {
            // p.header: { timestampSeconds, timestampMicroseconds, capturedLength, originalLength }
            const hdr = p.header || p.packetHeader || {};
            const tsSec = hdr.timestampSeconds ?? hdr.tsSec ?? 0;
            const tsUsec = hdr.timestampMicroseconds ?? hdr.tsUsec ?? 0;
            const inclLen =
              hdr.capturedLength ?? hdr.inclLen ?? hdr.capLen ?? (p.data ? p.data.length : 0);
            const origLen = hdr.originalLength ?? hdr.origLen ?? inclLen;
            this.emit("packet", { header: { tsSec, tsUsec, inclLen, origLen }, data: p.data });
          } catch (err) {
            this.emit("error", err as Error);
          }
        });

        parser.on("end", () => {
          this.emit("stop");
          this.running = false;
        });

        parser.on("error", (err: Error) => this.emit("error", err));
      } catch (err: any) {
        const e = new Error(
          "Required dependency 'pcap-parser' not found. Install it and retry: npm install pcap-parser"
        );
        // Attach original error as cause when supported, and log for diagnostics
        try {
          // Node 16+ supports Error options with cause
          (e as any).cause = err;
        } catch (error_: any) {
          console.debug("Could not attach cause to error:", error_);
        }
        this.emit("error", e);
        // Ensure caller sees the failure
        throw e;
      }
    }
  }

  public async stop(): Promise<void> {
    if (!this.running) return;

    if (this.proc) {
      try {
        this.proc.kill();
      } catch (err: any) {
        // Log the error during process termination for diagnostics
        console.debug("Failed to kill dumpcap process:", err);
      }
      this.proc = null;
    }

    this.running = false;
    this.emit("stop");
  }

  public isRunning(): boolean {
    return this.running;
  }
}
