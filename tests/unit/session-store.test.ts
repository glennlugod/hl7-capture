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
});
