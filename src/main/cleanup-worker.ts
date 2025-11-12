/**
 * Cleanup Worker Module
 * Manages periodic deletion of expired persisted sessions
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

import type { HL7Session } from "../common/types";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const rename = promisify(fs.rename);

/**
 * Cleanup summary event payload
 */
export interface CleanupSummary {
  filesDeleted: number;
  bytesFreed: number;
  filesInTrash: number;
  startTime: number;
  endTime: number;
  dryRun: boolean;
}

/**
 * Cleanup Worker Configuration
 */
export interface CleanupWorkerConfig {
  sessionsDir: string;
  trashDir: string;
  cleanupIntervalHours: number;
  retentionDays: number;
  dryRunMode: boolean;
  onCleanupSummary?: (summary: CleanupSummary) => void;
}

/**
 * Cleanup Worker
 * Periodically removes expired session files and manages trash
 */
export class CleanupWorker {
  private config: CleanupWorkerConfig;
  private timerId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: CleanupWorkerConfig) {
    this.config = config;
  }

  /**
   * Start the cleanup worker with configured interval
   */
  async start(): Promise<void> {
    if (this.timerId !== null) {
      console.warn("Cleanup worker already running");
      return;
    }

    console.log(
      `Starting cleanup worker (interval: ${this.config.cleanupIntervalHours}h, retention: ${this.config.retentionDays}d)`
    );

    // Run cleanup immediately on start
    await this._runCleanup();

    // Schedule periodic cleanup
    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000;
    this.timerId = setInterval(async () => {
      await this._runCleanup().catch((err) => {
        console.error("Cleanup interval execution failed:", err);
      });
    }, intervalMs);
  }

  /**
   * Stop the cleanup worker
   */
  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log("Cleanup worker stopped");
    }
  }

  /**
   * Update worker configuration (new interval, retention days, etc.)
   */
  async updateConfig(config: Partial<CleanupWorkerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // If interval changed, restart the worker
    if (config.cleanupIntervalHours !== undefined) {
      this.stop();
      await this.start();
    }
  }

  /**
   * Run cleanup immediately (called via IPC or manually)
   */
  async runCleanupNow(): Promise<CleanupSummary> {
    return this._runCleanup();
  }

  /**
   * Internal: Execute cleanup operation
   */
  private async _runCleanup(): Promise<CleanupSummary> {
    if (this.isRunning) {
      console.warn("Cleanup already in progress");
      return { filesDeleted: 0, bytesFreed: 0, filesInTrash: 0, startTime: Date.now(), endTime: Date.now(), dryRun: false };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let filesDeleted = 0;
    let bytesFreed = 0;
    let filesInTrash = 0;

    try {
      // Ensure sessions directory exists
      await mkdir(this.config.sessionsDir, { recursive: true });

      // List all session files
      const files = await readdir(this.config.sessionsDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      console.log(`Cleanup: scanning ${jsonFiles.length} session files`);

      // Check each session for expiration
      for (const fileName of jsonFiles) {
        try {
          const filePath = path.join(this.config.sessionsDir, fileName);
          const fileStats = await stat(filePath);

          // Read session to check persistedUntil
          const content = await readFile(filePath, "utf-8");
          const session: HL7Session = JSON.parse(content);

          const now = Date.now();
          const isExpired = session.persistedUntil !== undefined && session.persistedUntil < now;

          if (isExpired) {
            bytesFreed += fileStats.size;

            if (this.config.dryRunMode) {
              console.log(`[DRY-RUN] Would delete: ${fileName} (${fileStats.size} bytes)`);
            } else {
              // Move to trash instead of immediate delete
              filesInTrash += await this._moveToTrash(filePath, fileName);
              filesDeleted++;
            }
          }
        } catch (error) {
          console.error(`Error processing session file ${fileName}:`, error);
        }
      }

      // Cleanup old trash entries (older than 7 days)
      if (!this.config.dryRunMode) {
        await this._cleanupTrash();
      }

      console.log(
        `Cleanup: deleted ${filesDeleted} files (${bytesFreed} bytes), in trash: ${filesInTrash}`
      );

      const summary: CleanupSummary = {
        filesDeleted,
        bytesFreed,
        filesInTrash,
        startTime,
        endTime: Date.now(),
        dryRun: this.config.dryRunMode,
      };

      // Emit summary event if callback provided
      if (this.config.onCleanupSummary) {
        this.config.onCleanupSummary(summary);
      }

      return summary;
    } catch (error) {
      console.error("Cleanup failed:", error);
      return {
        filesDeleted: 0,
        bytesFreed: 0,
        filesInTrash: 0,
        startTime,
        endTime: Date.now(),
        dryRun: this.config.dryRunMode,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Move file to trash with retry logic
   */
  private async _moveToTrash(filePath: string, fileName: string): Promise<number> {
    const timestamp = Date.now();
    const trashSubdir = path.join(this.config.trashDir, `cleanup-${timestamp}`);

    try {
      // Create trash subdirectory
      await mkdir(trashSubdir, { recursive: true });

      // Move file to trash
      const trashPath = path.join(trashSubdir, fileName);
      await rename(filePath, trashPath);

      console.log(`Moved to trash: ${fileName}`);
      return 1;
    } catch (error) {
      console.error(`Failed to move ${fileName} to trash, attempting immediate delete:`, error);

      try {
        // Fallback: immediate delete if trash move fails
        await unlink(filePath);
        console.log(`Immediately deleted: ${fileName}`);
        return 1;
      } catch (deleteError) {
        console.error(`Failed to delete ${fileName}:`, deleteError);
        return 0;
      }
    }
  }

  /**
   * Cleanup old trash entries (older than 7 days)
   */
  private async _cleanupTrash(): Promise<void> {
    try {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      // Ensure trash directory exists
      await mkdir(this.config.trashDir, { recursive: true });

      const trashEntries = await readdir(this.config.trashDir);

      for (const entry of trashEntries) {
        const entryPath = path.join(this.config.trashDir, entry);
        const entryStats = await stat(entryPath);

        if (!entryStats.isDirectory()) continue;

        // Check if directory name matches pattern: cleanup-{timestamp}
        const match = entry.match(/^cleanup-(\d+)$/);
        if (!match) continue;

        const timestamp = parseInt(match[1], 10);
        const age = now - timestamp;

        if (age > sevenDaysMs) {
          try {
            // Remove old trash entries recursively
            const files = await readdir(entryPath);
            for (const file of files) {
              await unlink(path.join(entryPath, file));
            }
            await rmdir(entryPath);
            console.log(`Cleaned up old trash: ${entry}`);
          } catch (error) {
            console.error(`Failed to cleanup trash entry ${entry}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Trash cleanup failed:", error);
    }
  }
}
