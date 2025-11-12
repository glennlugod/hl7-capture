import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";

import type { HL7Session } from "../common/types";
interface SubmissionConfig {
  sessionsDir: string;
  endpoint: string;
  authHeader?: string;
  concurrency: number;
  maxRetries: number;
  submissionIntervalMinutes: number;
}
interface SubmissionResult {
  sessionId: string;
  success: boolean;
  submissionAttempts: number;
  error?: string;
  submittedAt?: number;
}
export class SubmissionWorker extends EventEmitter {
  private config: SubmissionConfig;
  private isRunning: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private queue: HL7Session[] = [];
  private inFlight: number = 0;
  private readonly retryDelays = [1000, 2000, 4000];
  constructor(config: SubmissionConfig) {
    super();
    this.config = { ...config };
  }
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("SubmissionWorker already running");
      return;
    }
    this.isRunning = true;
    console.log("SubmissionWorker started");
    await this._runSubmission();
    const intervalMs = this.config.submissionIntervalMinutes * 60 * 1000;
    this.timer = setInterval(() => {
      this._runSubmission().catch((err) => {
        console.error("SubmissionWorker periodic submission failed:", err);
      });
    }, intervalMs);
  }
  public stop(): void {
    if (!this.isRunning) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.queue = [];
  }
  public async triggerNow(): Promise<void> {
    if (!this.isRunning) return;
    await this._runSubmission();
  }
  public updateConfig(config: Partial<SubmissionConfig>): void {
    this.config = { ...this.config, ...config };
  }
  public getConfig(): SubmissionConfig {
    return { ...this.config };
  }
  private async _runSubmission(): Promise<void> {
    if (!this.config.endpoint || this.config.endpoint.trim().length === 0) {
      this.emit("onSubmissionProgress", { inFlight: 0, queueSize: 0, activeWorker: false });
      return;
    }
    try {
      await this._discoverPendingSessions();
      while (this.queue.length > 0 && this.inFlight < this.config.concurrency) {
        const session = this.queue.shift();
        if (session) {
          this.inFlight++;
          this._submitSession(session).finally(() => {
            this.inFlight--;
          });
        }
      }
      this.emit("onSubmissionProgress", {
        inFlight: this.inFlight,
        queueSize: this.queue.length,
        activeWorker: this.isRunning,
      });
    } catch (err) {
      console.error("SubmissionWorker._runSubmission error:", err);
    }
  }
  private async _discoverPendingSessions(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.sessionsDir)) return;
      const files = await fs.promises.readdir(this.config.sessionsDir);
      const pending: HL7Session[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(this.config.sessionsDir, file);
        try {
          const raw = await fs.promises.readFile(filePath, "utf-8");
          const session: HL7Session = JSON.parse(raw);
          if (session.submissionStatus === "pending") pending.push(session);
        } catch (err) {
          console.warn("Failed to read session file", err);
        }
      }
      for (const session of pending) {
        if (!this.queue.some((s) => s.id === session.id)) {
          this.queue.push(session);
        }
      }
    } catch (err) {
      console.error("SubmissionWorker._discoverPendingSessions error:", err);
    }
  }
  private async _submitSession(session: HL7Session): Promise<void> {
    const maxAttempts = this.config.maxRetries;
    let attempts = session.submissionAttempts || 0;
    let lastError: string | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)];
        await this._delay(delay);
      }
      try {
        const response = await this._postSession(session);
        if (response.ok) {
          session.submissionStatus = "submitted";
          session.submittedAt = Date.now();
          session.submissionAttempts = attempts + 1;
          session.submissionError = undefined;
          await this._updateSessionFile(session);
          this.emit("onSubmissionResult", {
            sessionId: session.id,
            success: true,
            submissionAttempts: session.submissionAttempts,
            submittedAt: session.submittedAt,
          } as SubmissionResult);
          return;
        } else if (response.status >= 400 && response.status < 500) {
          lastError = `HTTP ${response.status}`;
          break;
        } else {
          lastError = `HTTP ${response.status}`;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      attempts++;
    }
    session.submissionStatus = "failed";
    session.submissionAttempts = attempts;
    session.submissionError = lastError;
    await this._updateSessionFile(session);
    this.emit("onSubmissionResult", {
      sessionId: session.id,
      success: false,
      submissionAttempts: session.submissionAttempts,
      error: lastError,
    } as SubmissionResult);
  }
  private async _postSession(session: HL7Session): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.authHeader) headers["Authorization"] = this.config.authHeader;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          messages: session.messages,
          deviceIP: session.deviceIP,
          lisIP: session.lisIP,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
  private async _updateSessionFile(session: HL7Session): Promise<void> {
    try {
      const filePath = path.join(this.config.sessionsDir, `${session.id}.json`);
      const tmpPath = `${filePath}.tmp`;
      const content = JSON.stringify(session, null, 2);
      await fs.promises.writeFile(tmpPath, content, "utf-8");
      await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
      console.error("Failed to update", err);
      throw err;
    }
  }
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
