import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { HL7Session } from "../../src/common/types";
import { SessionStore } from "../../src/main/session-store";

const readFile = promisify(fs.readFile);

describe("SessionStore", () => {
  let sessionStore: SessionStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, ".test-sessions-", Date.now().toString());
    sessionStore = new SessionStore(testDir);
    await sessionStore.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file));
      }
      fs.rmdirSync(testDir);
    } catch {
      // ignore cleanup errors
    }
  });

  describe("AC 1: Atomic Write Operations", () => {
    it("should save session with atomic write (temp file + rename)", async () => {
      const session: HL7Session = {
        id: "sess-001",
        sessionId: 1,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      const sessionFile = path.join(testDir, "sess-001.json");
      expect(fs.existsSync(sessionFile)).toBe(true);
      expect(fs.existsSync(`${sessionFile}.tmp`)).toBe(false); // temp file cleaned up
    });

    it("should not leave partial files on disk (crash safety)", async () => {
      const session: HL7Session = {
        id: "sess-002",
        sessionId: 2,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      const files = fs.readdirSync(testDir);

      // Only complete file should exist, no .tmp files
      expect(files).toEqual(["sess-002.json"]);
    });

    it("should overwrite existing session file atomically", async () => {
      const session: HL7Session = {
        id: "sess-003",
        sessionId: 3,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: ["Test message 1"],
        isComplete: false,
      };

      await sessionStore.saveSession(session, 30);

      // Update session
      session.messages.push("Test message 2");
      session.isComplete = true;
      await sessionStore.saveSession(session, 30);

      const sessionFile = path.join(testDir, "sess-003.json");
      const content = await readFile(sessionFile, "utf-8");
      const loaded = JSON.parse(content);

      expect(loaded.messages).toHaveLength(2);
      expect(loaded.isComplete).toBe(true);
    });

    it("should queue concurrent writes for same session", async () => {
      const session: HL7Session = {
        id: "sess-004",
        sessionId: 4,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: ["M1"],
        isComplete: false,
      };

      const p1 = sessionStore.saveSession(session, 30);
      session.messages = ["M2"];
      const p2 = sessionStore.saveSession(session, 30);

      await Promise.all([p1, p2]);

      const sessionFile = path.join(testDir, "sess-004.json");
      const content = await readFile(sessionFile, "utf-8");
      const loaded = JSON.parse(content);

      // Should have latest state
      expect(loaded.messages).toEqual(["M2"]);
    });
  });

  describe("AC 2: Load All Sessions", () => {
    it("should load all sessions from disk", async () => {
      const session1: HL7Session = {
        id: "sess-010",
        sessionId: 10,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const session2: HL7Session = {
        id: "sess-011",
        sessionId: 11,
        startTime: Date.now() + 1000,
        deviceIP: "192.168.1.11",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session1, 30);
      await sessionStore.saveSession(session2, 30);

      const loaded = await sessionStore.loadAllSessions();

      expect(loaded).toHaveLength(2);
      expect(loaded.map((s) => s.id)).toEqual(["sess-010", "sess-011"]);
    });

    it("should return empty array for empty directory", async () => {
      const loaded = await sessionStore.loadAllSessions();
      expect(loaded).toEqual([]);
    });

    it("should skip corrupted session files and continue loading", async () => {
      const session: HL7Session = {
        id: "sess-020",
        sessionId: 20,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      // Write corrupted file
      const badFile = path.join(testDir, "sess-021.json");
      fs.writeFileSync(badFile, "{ invalid json");

      const loaded = await sessionStore.loadAllSessions();

      // Should load valid session, skip corrupted one
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("sess-020");
    });

    it("should handle initialize() call within loadAllSessions", async () => {
      const newStore = new SessionStore(testDir);
      // Don't call initialize, let loadAllSessions do it
      const loaded = await newStore.loadAllSessions();
      expect(loaded).toEqual([]);
    });
  });

  describe("AC 3: Delete Session", () => {
    it("should delete session file from disk", async () => {
      const session: HL7Session = {
        id: "sess-030",
        sessionId: 30,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);
      expect(fs.existsSync(path.join(testDir, "sess-030.json"))).toBe(true);

      await sessionStore.deleteSession("sess-030");
      expect(fs.existsSync(path.join(testDir, "sess-030.json"))).toBe(false);
    });

    it("should not throw when deleting non-existent session", async () => {
      await expect(sessionStore.deleteSession("non-existent")).resolves.not.toThrow();
    });
  });

  describe("AC 4: Metadata Storage", () => {
    it("should store version and retention metadata", async () => {
      const session: HL7Session = {
        id: "sess-040",
        sessionId: 40,
        startTime: 1000000,
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      const sessionFile = path.join(testDir, "sess-040.json");
      const content = await readFile(sessionFile, "utf-8");
      const loaded = JSON.parse(content);

      expect(loaded._metadata).toBeDefined();
      expect(loaded._metadata.version).toBe("1.0.0");
      expect(loaded._metadata.retentionDays).toBe(30);
      expect(loaded._metadata.savedAt).toBeDefined();
    });

    it("should calculate persistedUntil timestamp", async () => {
      const startTime = 1000000;
      const retentionDays = 7;
      const expectedPersist = startTime + retentionDays * 86400000;

      const session: HL7Session = {
        id: "sess-041",
        sessionId: 41,
        startTime,
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, retentionDays);

      const sessionFile = path.join(testDir, "sess-041.json");
      const content = await readFile(sessionFile, "utf-8");
      const loaded = JSON.parse(content);

      expect(loaded.persistedUntil).toBe(expectedPersist);
    });
  });

  describe("AC 5: Retention Policy & Cleanup", () => {
    it("should identify expired sessions", async () => {
      const now = Date.now();
      const oldStartTime = now - 40 * 86400000; // 40 days ago
      const newStartTime = now - 5 * 86400000; // 5 days ago

      const oldSession: HL7Session = {
        id: "sess-050",
        sessionId: 50,
        startTime: oldStartTime,
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const newSession: HL7Session = {
        id: "sess-051",
        sessionId: 51,
        startTime: newStartTime,
        deviceIP: "192.168.1.11",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(oldSession, 30); // expires after 30 days
      await sessionStore.saveSession(newSession, 30); // expires after 30 days

      const expired = await sessionStore.getExpiredSessions(now);

      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe("sess-050");
    });

    it("should cleanup expired sessions", async () => {
      const now = Date.now();
      const oldStartTime = now - 40 * 86400000; // 40 days ago
      const newStartTime = now - 5 * 86400000; // 5 days ago

      const oldSession: HL7Session = {
        id: "sess-060",
        sessionId: 60,
        startTime: oldStartTime,
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const newSession: HL7Session = {
        id: "sess-061",
        sessionId: 61,
        startTime: newStartTime,
        deviceIP: "192.168.1.11",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(oldSession, 30);
      await sessionStore.saveSession(newSession, 30);

      const deletedCount = await sessionStore.cleanupExpiredSessions(30);

      expect(deletedCount).toBe(1);
      expect(fs.existsSync(path.join(testDir, "sess-060.json"))).toBe(false);
      expect(fs.existsSync(path.join(testDir, "sess-061.json"))).toBe(true);
    });

    it("should not fail when cleaning empty directory", async () => {
      const deletedCount = await sessionStore.cleanupExpiredSessions(30);
      expect(deletedCount).toBe(0);
    });
  });

  describe("Utility Methods", () => {
    it("should check if session exists", async () => {
      const session: HL7Session = {
        id: "sess-070",
        sessionId: 70,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      expect(await sessionStore.sessionExists("sess-070")).toBe(true);
      expect(await sessionStore.sessionExists("sess-999")).toBe(false);
    });

    it("should return session directory path", () => {
      expect(sessionStore.getSessionDir()).toBe(testDir);
    });
  });

  describe("Phase 2: Crash Recovery", () => {
    it("should find orphaned .tmp files from crashed writes", async () => {
      // Create a fake .tmp file to simulate crashed write
      const tmpFile = path.join(testDir, "sess-crash-001.json.tmp");
      fs.writeFileSync(tmpFile, JSON.stringify({ incomplete: true }));

      const orphaned = await sessionStore.findOrphanedTempFiles();

      expect(orphaned).toContain("sess-crash-001.json.tmp");
    });

    it("should recover by cleaning up orphaned .tmp file", async () => {
      const tmpFile = path.join(testDir, "sess-crash-002.json.tmp");
      // Write invalid/incomplete JSON to trigger cleanup instead of recovery
      fs.writeFileSync(tmpFile, "{ incomplete");

      const result = await sessionStore.recoverFromCrash("sess-crash-002.json.tmp");

      expect(result).toBe("cleaned");
      expect(fs.existsSync(tmpFile)).toBe(false);
    });

    it("should recover by completing partial write from valid .tmp file", async () => {
      const session: HL7Session = {
        id: "sess-recover-001",
        sessionId: 100,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: ["Recovered message"],
        isComplete: true,
      };

      const tmpFile = path.join(testDir, "sess-recover-001.json.tmp");
      fs.writeFileSync(tmpFile, JSON.stringify(session, null, 2));

      const result = await sessionStore.recoverFromCrash("sess-recover-001.json.tmp");

      expect(result).toBe("recovered");
      expect(fs.existsSync(tmpFile)).toBe(false);
      expect(fs.existsSync(path.join(testDir, "sess-recover-001.json"))).toBe(true);
    });

    it("should perform full crash recovery and return statistics", async () => {
      // Create multiple scenarios
      const session1: HL7Session = {
        id: "sess-multi-001",
        sessionId: 101,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      // Valid partial write
      const tmpFile1 = path.join(testDir, "sess-multi-001.json.tmp");
      fs.writeFileSync(tmpFile1, JSON.stringify(session1, null, 2));

      // Orphaned corrupted file
      const tmpFile2 = path.join(testDir, "sess-multi-002.json.tmp");
      fs.writeFileSync(tmpFile2, "{ invalid json");

      const stats = await sessionStore.performCrashRecovery();

      expect(stats.recovered).toBe(1);
      expect(stats.cleaned).toBe(1);
      expect(fs.existsSync(tmpFile1)).toBe(false);
      expect(fs.existsSync(tmpFile2)).toBe(false);
    });

    it("should handle crash recovery on empty directory", async () => {
      const stats = await sessionStore.performCrashRecovery();

      expect(stats.recovered).toBe(0);
      expect(stats.cleaned).toBe(0);
    });
  });

  describe("Phase 2: Schema Migration", () => {
    it("should add metadata to legacy sessions without it", async () => {
      const legacySession: HL7Session = {
        id: "sess-legacy-001",
        sessionId: 110,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const migrated = await sessionStore.migrateSessionSchema(legacySession);

      expect(migrated).toBeDefined();
      const migratedWithMeta = migrated as unknown as Record<string, unknown>;
      expect(migratedWithMeta._metadata).toBeDefined();
      const meta = migratedWithMeta._metadata as Record<string, unknown>;
      expect(meta.version).toBe("1.0.0");
      expect(meta.retentionDays).toBe(30);
    });

    it("should preserve metadata on current version sessions", async () => {
      const session: HL7Session = {
        id: "sess-versioned-001",
        sessionId: 111,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const sessionWithMeta = session as unknown as Record<string, unknown>;
      sessionWithMeta._metadata = {
        version: "1.0.0",
        savedAt: Date.now(),
        retentionDays: 7,
      };

      const migrated = await sessionStore.migrateSessionSchema(session);
      const migratedWithMeta = migrated as unknown as Record<string, unknown>;
      const meta = migratedWithMeta._metadata as Record<string, unknown>;

      expect(meta.version).toBe("1.0.0");
      expect(meta.retentionDays).toBe(7);
    });

    it("should load and migrate all sessions on startup", async () => {
      // Save sessions with and without metadata
      const session1: HL7Session = {
        id: "sess-startup-001",
        sessionId: 112,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const session2: HL7Session = {
        id: "sess-startup-002",
        sessionId: 113,
        startTime: Date.now(),
        deviceIP: "192.168.1.11",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      // Save first without metadata by writing directly
      const session1Path = path.join(testDir, "sess-startup-001.json");
      fs.writeFileSync(session1Path, JSON.stringify(session1, null, 2));

      // Save second with our store (will add metadata)
      await sessionStore.saveSession(session2, 30);

      const migrated = await sessionStore.loadAndMigrateAllSessions();

      expect(migrated).toHaveLength(2);
      for (const session of migrated) {
        const sessionWithMeta = session as unknown as Record<string, unknown>;
        expect(sessionWithMeta._metadata).toBeDefined();
      }
    });

    it("should continue migration on corrupted file", async () => {
      const session: HL7Session = {
        id: "sess-recover-valid",
        sessionId: 114,
        startTime: Date.now(),
        deviceIP: "192.168.1.10",
        lisIP: "192.168.1.1",
        elements: [],
        messages: [],
        isComplete: true,
      };

      await sessionStore.saveSession(session, 30);

      // Write corrupted file
      const badFile = path.join(testDir, "sess-corrupted.json");
      fs.writeFileSync(badFile, "{ invalid");

      // Should skip corrupted file and migrate valid one
      const migrated = await sessionStore.loadAndMigrateAllSessions();

      expect(migrated.length).toBeGreaterThanOrEqual(1);
      expect(migrated.some((s) => s.id === "sess-recover-valid")).toBe(true);
    });
  });
});
