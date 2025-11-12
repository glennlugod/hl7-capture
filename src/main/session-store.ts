import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { HL7Session } from '../common/types'

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
}
