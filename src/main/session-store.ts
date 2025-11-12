import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { HL7Session } from "../common/types";

const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const fsRename = promisify(fs.rename);
const fsMkdir = promisify(fs.mkdir);

/**
 * SessionStore provides crash-safe, atomic persistence for HL7 sessions.
 * AC 1-3: Implements atomic writes with temp file + rename pattern
 * AC 4: Stores metadata (version, retention days)
 * AC 5: Supports crash recovery and retention policy enforcement
 */
export class SessionStore {
  private readonly sessionDir: string;
  private readonly writeQueue: Map<string, Promise<void>> = new Map();
  private readonly version = "1.0.0";

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
  }

  /**
   * Initialize store: create directory if needed
   */
  async initialize(): Promise<void> {
    try {
      await fsMkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  /**
   * AC 1: Save session with atomic write (temp file + rename)
   * Ensures crash safety: either file exists completely or not at all
   */
  async saveSession(session: HL7Session, retentionDays: number): Promise<void> {
    const sessionKey = session.id;

    // Queue writes to prevent concurrent writes for same session
    const existingPromise = this.writeQueue.get(sessionKey);
    if (existingPromise) {
      await existingPromise;
    }

    const writePromise = this._atomicWriteSession(session, retentionDays);
    this.writeQueue.set(sessionKey, writePromise);

    try {
      await writePromise;
    } finally {
      this.writeQueue.delete(sessionKey);
    }
  }

  /**
   * Internal: atomic write with temp file + rename pattern
   */
  private async _atomicWriteSession(session: HL7Session, retentionDays: number): Promise<void> {
    const sessionFileName = `${session.id}.json`;
    const sessionFilePath = path.join(this.sessionDir, sessionFileName);
    const tempFilePath = `${sessionFilePath}.tmp`;

    // Calculate persistedUntil timestamp
    const persistedUntil = session.startTime + retentionDays * 86400000;

    // Create session payload with metadata
    const payload = {
      ...session,
      persistedUntil,
      _metadata: {
        version: this.version,
        savedAt: Date.now(),
        retentionDays,
      },
    };

    // Write to temp file first
    await writeFile(tempFilePath, JSON.stringify(payload, null, 2), "utf-8");

    // Atomic rename (succeeds or fails, no partial state)
    await fsRename(tempFilePath, sessionFilePath);
  }

  /**
   * AC 2: Load all sessions from disk
   * Returns crashed sessions with recovery state
   */
  async loadAllSessions(): Promise<HL7Session[]> {
    await this.initialize();
    const sessions: HL7Session[] = [];

    try {
      const files = await readdir(this.sessionDir);

      for (const file of files) {
        if (file.endsWith(".json") && !file.endsWith(".tmp")) {
          try {
            const filePath = path.join(this.sessionDir, file);
            const content = await readFile(filePath, "utf-8");
            const data = JSON.parse(content);
            sessions.push(data);
          } catch (error) {
            console.error(`Failed to load session ${file}:`, error);
            // Continue loading other sessions
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return sessions;
  }

  /**
   * AC 3: Delete session from disk
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionFileName = `${sessionId}.json`;
    const sessionFilePath = path.join(this.sessionDir, sessionFileName);

    try {
      const stats = await stat(sessionFilePath);
      if (stats.isFile()) {
        await unlink(sessionFilePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * AC 5: Get expired sessions (retention policy check)
   */
  async getExpiredSessions(now: number = Date.now()): Promise<HL7Session[]> {
    const allSessions = await this.loadAllSessions();
    return allSessions.filter((session) => session.persistedUntil && session.persistedUntil <= now);
  }

  /**
   * AC 5: Delete expired sessions based on retention policy
   */
  async cleanupExpiredSessions(retentionDays: number): Promise<number> {
    const now = Date.now();
    const allSessions = await this.loadAllSessions();
    let deletedCount = 0;

    for (const session of allSessions) {
      const persistedUntil = session.persistedUntil || session.startTime + retentionDays * 86400000;
      if (persistedUntil <= now) {
        try {
          await this.deleteSession(session.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete expired session ${session.id}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Get session directory path (for testing or external access)
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * Check if session file exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const sessionFilePath = path.join(this.sessionDir, `${sessionId}.json`);
    try {
      await stat(sessionFilePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Phase 6: Load a single session by ID
   */
  async loadSession(sessionId: string): Promise<HL7Session | null> {
    const sessionFilePath = path.join(this.sessionDir, `${sessionId}.json`);
    try {
      const data = await readFile(sessionFilePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Phase 6: Update a single session (used for retry, ignore operations)
   */
  async updateSession(session: HL7Session, retentionDays: number): Promise<void> {
    await this.saveSession(session, retentionDays);
  }

  /**
   * Phase 2: Crash Recovery & Data Migration
   * Detect and recover from incomplete writes (orphaned .tmp files)
   */

  /**
   * Scan for orphaned .tmp files from crashed writes
   * Returns list of incomplete write operations
   */
  async findOrphanedTempFiles(): Promise<string[]> {
    const orphanedFiles: string[] = [];

    try {
      const files = await readdir(this.sessionDir);
      for (const file of files) {
        if (file.endsWith(".tmp")) {
          orphanedFiles.push(file);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return orphanedFiles;
  }

  /**
   * Attempt to recover incomplete write
   * Recovery strategy: Clean up temp file (data was not fully written)
   */
  async recoverFromCrash(tempFileName: string): Promise<"cleaned" | "recovered"> {
    const tempFilePath = path.join(this.sessionDir, tempFileName);
    const sessionFilePath = tempFilePath.replace(/\.tmp$/, "");

    try {
      // Check if final file already exists (write completed after crash)
      try {
        await stat(sessionFilePath);
        // Final file exists, just clean up temp file
        try {
          await unlink(tempFilePath);
        } catch {
          // Ignore if temp file doesn't exist
        }
        return "recovered";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      // Final file doesn't exist, check if temp file has valid content
      try {
        const content = await readFile(tempFilePath, "utf-8");
        const data = JSON.parse(content);

        // Temp file has valid JSON, try to complete the write
        if (data && typeof data === "object") {
          await fsRename(tempFilePath, sessionFilePath);
          return "recovered";
        }
      } catch {
        // Temp file is corrupted or incomplete, just delete it
      }

      // Clean up orphaned temp file (even if corrupted)
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore if already deleted
      }
      return "cleaned";
    } catch (error) {
      console.error(`Failed to recover from crash (${tempFileName}):`, error);
      return "cleaned";
    }
  }

  /**
   * Phase 2: Execute full crash recovery
   * Called on app startup to clean up from any previous crashes
   * Returns recovery statistics
   */
  async performCrashRecovery(): Promise<{ recovered: number; cleaned: number }> {
    const stats = { recovered: 0, cleaned: 0 };

    try {
      const orphanedFiles = await this.findOrphanedTempFiles();

      for (const tempFile of orphanedFiles) {
        const result = await this.recoverFromCrash(tempFile);
        if (result === "recovered") {
          stats.recovered++;
        } else {
          stats.cleaned++;
        }
      }
    } catch (error) {
      console.error("Crash recovery encountered error:", error);
    }

    return stats;
  }

  /**
   * Phase 2: Data migration helper
   * Validate and optionally upgrade session schema to new version
   * Current version: 1.0.0
   */
  async migrateSessionSchema(session: HL7Session): Promise<HL7Session> {
    const sessionWithMetadata = session as unknown as Record<string, unknown>;
    const metadata = sessionWithMetadata._metadata as Record<string, unknown> | undefined;

    // If no metadata, this is a pre-metadata session, add it
    if (!metadata) {
      const migratedData: Record<string, unknown> = { ...session };
      migratedData._metadata = {
        version: this.version,
        savedAt: Date.now(),
        retentionDays: 30, // Default retention for legacy sessions
      };
      return migratedData as unknown as HL7Session;
    }

    // Validate schema version compatibility
    const storedVersion = (metadata.version as string) || "1.0.0";
    if (storedVersion !== this.version) {
      // Log version mismatch but allow loading (forward compatible for minor versions)
      console.warn(
        `Session schema version mismatch: stored=${storedVersion}, current=${this.version}`
      );
    }

    return session;
  }

  /**
   * Load and migrate all sessions with schema upgrade support
   * Used during app startup to ensure all sessions are up-to-date
   */
  async loadAndMigrateAllSessions(): Promise<HL7Session[]> {
    const sessions = await this.loadAllSessions();
    const migratedSessions: HL7Session[] = [];

    for (const session of sessions) {
      try {
        const migrated = await this.migrateSessionSchema(session);
        migratedSessions.push(migrated);

        // Save migrated session back to disk if schema changed
        if (JSON.stringify(session) !== JSON.stringify(migrated)) {
          const migratedWithMeta = migrated as unknown as Record<string, unknown>;
          const meta = migratedWithMeta._metadata as Record<string, unknown> | undefined;
          const retentionDays = (meta?.retentionDays as number) || 30;
          await this.saveSession(migrated, retentionDays);
        }
      } catch (error) {
        console.error(`Failed to migrate session ${session.id}:`, error);
        // Continue migration for other sessions
      }
    }

    return migratedSessions;
  }
}
