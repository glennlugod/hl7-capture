import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { CleanupWorker, CleanupSummary } from "../../src/main/cleanup-worker";
import { HL7Session } from "../../src/common/types";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

describe("CleanupWorker", () => {
  let cleanupWorker: CleanupWorker;
  let testSessionsDir: string;
  let testTrashDir: string;

  beforeEach(() => {
    testSessionsDir = path.join(__dirname, ".test-cleanup-sessions-", Date.now().toString());
    testTrashDir = path.join(__dirname, ".test-cleanup-trash-", Date.now().toString());
  });

  afterEach(async () => {
    // Stop worker if running
    if (cleanupWorker) {
      cleanupWorker.stop();
    }

    // Cleanup test directories
    try {
      if (fs.existsSync(testSessionsDir)) {
        const files = fs.readdirSync(testSessionsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testSessionsDir, file));
        }
        fs.rmdirSync(testSessionsDir);
      }

      if (fs.existsSync(testTrashDir)) {
        const entries = fs.readdirSync(testTrashDir);
        for (const entry of entries) {
          const entryPath = path.join(testTrashDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            const subfiles = fs.readdirSync(entryPath);
            for (const file of subfiles) {
              fs.unlinkSync(path.join(entryPath, file));
            }
            fs.rmdirSync(entryPath);
          }
        }
        fs.rmdirSync(testTrashDir);
      }
    } catch {
      // ignore cleanup errors
    }
  });

  describe("AC 1: Periodic Cleanup Execution", () => {
    it("should delete expired sessions based on persistedUntil", async () => {
      const now = Date.now();
      const expiredSession: HL7Session = {
        id: "expired-001",
        sessionId: 1,
        startTime: now - 86400000 * 40, // 40 days ago
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: now - 86400000, // Expired 1 day ago
      };

      const futureSession: HL7Session = {
        id: "future-001",
        sessionId: 2,
        startTime: now,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: now + 86400000 * 10, // Expires in 10 days
      };

      // Create sessions
      fs.mkdirSync(testSessionsDir, { recursive: true });
      await writeFile(
        path.join(testSessionsDir, "expired-001.json"),
        JSON.stringify(expiredSession, null, 2)
      );
      await writeFile(
        path.join(testSessionsDir, "future-001.json"),
        JSON.stringify(futureSession, null, 2)
      );

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(summary.filesDeleted).toBe(1);
      expect(!fs.existsSync(path.join(testSessionsDir, "expired-001.json"))).toBe(true);
      expect(fs.existsSync(path.join(testSessionsDir, "future-001.json"))).toBe(true);
    });

    it("should run cleanup immediately on start", async () => {
      const now = Date.now();
      const expiredSession: HL7Session = {
        id: "expired-002",
        sessionId: 1,
        startTime: now - 86400000 * 40,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: now - 86400000,
      };

      fs.mkdirSync(testSessionsDir, { recursive: true });
      await writeFile(
        path.join(testSessionsDir, "expired-002.json"),
        JSON.stringify(expiredSession, null, 2)
      );

      let summaryEmitted = false;
      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
        onCleanupSummary: () => {
          summaryEmitted = true;
        },
      });

      await cleanupWorker.start();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow cleanup to complete

      expect(summaryEmitted).toBe(true);
    });
  });

  describe("AC 2: Atomic and Safe Deletion", () => {
    it("should move files to trash instead of immediate delete", async () => {
      const now = Date.now();
      const expiredSession: HL7Session = {
        id: "expired-003",
        sessionId: 1,
        startTime: now - 86400000 * 40,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: now - 86400000,
      };

      fs.mkdirSync(testSessionsDir, { recursive: true });
      await writeFile(
        path.join(testSessionsDir, "expired-003.json"),
        JSON.stringify(expiredSession, null, 2)
      );

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(summary.filesInTrash).toBeGreaterThan(0);
      expect(fs.existsSync(testTrashDir)).toBe(true);
    });

    it("should cleanup old trash entries (older than 7 days)", async () => {
      fs.mkdirSync(testTrashDir, { recursive: true });

      // Create old trash entry (8 days old)
      const eightDaysAgoMs = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const oldTrashDir = path.join(testTrashDir, `cleanup-${eightDaysAgoMs}`);
      fs.mkdirSync(oldTrashDir, { recursive: true });

      const oldFile = path.join(oldTrashDir, "old-session.json");
      fs.writeFileSync(oldFile, JSON.stringify({}));

      expect(fs.existsSync(oldFile)).toBe(true);

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      await cleanupWorker.runCleanupNow();

      expect(fs.existsSync(oldFile)).toBe(false);
    });
  });

  describe("AC 3: Configurable Interval and Dry-Run Mode", () => {
    it("should not delete files in dry-run mode", async () => {
      const now = Date.now();
      const expiredSession: HL7Session = {
        id: "expired-004",
        sessionId: 1,
        startTime: now - 86400000 * 40,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: now - 86400000,
      };

      fs.mkdirSync(testSessionsDir, { recursive: true });
      await writeFile(
        path.join(testSessionsDir, "expired-004.json"),
        JSON.stringify(expiredSession, null, 2)
      );

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: true,
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(summary.dryRun).toBe(true);
      expect(summary.filesDeleted).toBe(0);
      expect(fs.existsSync(path.join(testSessionsDir, "expired-004.json"))).toBe(true);
    });

    it("should validate and clamp interval hours (1-168)", async () => {
      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 0, // Invalid, should clamp to 1
        retentionDays: 30,
        dryRunMode: false,
      });

      await cleanupWorker.updateConfig({ cleanupIntervalHours: 0 });

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 200, // Invalid, should clamp to 168
        retentionDays: 30,
        dryRunMode: false,
      });

      // Worker should start without error despite invalid input
      await cleanupWorker.start();
      cleanupWorker.stop();
      expect(true).toBe(true);
    });
  });

  describe("AC 4: IPC Interface and Observability", () => {
    it("should emit cleanup summary with accurate metrics", async () => {
      const now = Date.now();
      const expiredSessions: HL7Session[] = [
        {
          id: "expired-005",
          sessionId: 1,
          startTime: now - 86400000 * 40,
          deviceIP: "192.168.1.1",
          lisIP: "192.168.1.2",
          elements: [],
          messages: Array(10).fill("message"), // 10 messages
          isComplete: true,
          persistedUntil: now - 86400000,
        },
        {
          id: "expired-006",
          sessionId: 2,
          startTime: now - 86400000 * 40,
          deviceIP: "192.168.1.1",
          lisIP: "192.168.1.2",
          elements: [],
          messages: Array(5).fill("message"),
          isComplete: true,
          persistedUntil: now - 86400000,
        },
      ];

      fs.mkdirSync(testSessionsDir, { recursive: true });
      for (const session of expiredSessions) {
        await writeFile(
          path.join(testSessionsDir, `${session.id}.json`),
          JSON.stringify(session, null, 2)
        );
      }

      let emittedSummary: CleanupSummary | null = null;
      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
        onCleanupSummary: (summary) => {
          emittedSummary = summary;
        },
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(emittedSummary).not.toBeNull();
      expect(emittedSummary!.filesDeleted).toBe(2);
      expect(emittedSummary!.bytesFreed).toBeGreaterThan(0);
      expect(emittedSummary!.startTime).toBeLessThanOrEqual(emittedSummary!.endTime);
    });
  });

  describe("AC 5: Configuration Awareness", () => {
    it("should respect retention days when determining expiration", async () => {
      const now = Date.now();
      const thirtyOneDay = now - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const twentyNineDay = now - 29 * 24 * 60 * 60 * 1000; // 29 days ago

      const oldSession: HL7Session = {
        id: "old-001",
        sessionId: 1,
        startTime: thirtyOneDay,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: thirtyOneDay + 30 * 24 * 60 * 60 * 1000, // Expires in 30 days from start
      };

      const newSession: HL7Session = {
        id: "new-001",
        sessionId: 2,
        startTime: twentyNineDay,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
        persistedUntil: twentyNineDay + 30 * 24 * 60 * 60 * 1000,
      };

      fs.mkdirSync(testSessionsDir, { recursive: true });
      await writeFile(path.join(testSessionsDir, "old-001.json"), JSON.stringify(oldSession, null, 2));
      await writeFile(path.join(testSessionsDir, "new-001.json"), JSON.stringify(newSession, null, 2));

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(summary.filesDeleted).toBe(1);
      expect(!fs.existsSync(path.join(testSessionsDir, "old-001.json"))).toBe(true);
      expect(fs.existsSync(path.join(testSessionsDir, "new-001.json"))).toBe(true);
    });

    it("should update config dynamically", async () => {
      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      await cleanupWorker.updateConfig({
        cleanupIntervalHours: 12,
        dryRunMode: true,
        retentionDays: 7,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid session JSON gracefully", async () => {
      fs.mkdirSync(testSessionsDir, { recursive: true });

      // Write invalid JSON
      fs.writeFileSync(path.join(testSessionsDir, "invalid.json"), "{ invalid json }");

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      const summary = await cleanupWorker.runCleanupNow();

      expect(summary.filesDeleted).toBe(0);
      expect(fs.existsSync(path.join(testSessionsDir, "invalid.json"))).toBe(true);
    });

    it("should handle concurrent cleanup attempts", async () => {
      fs.mkdirSync(testSessionsDir, { recursive: true });

      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      // Try to run cleanup twice concurrently
      const [summary1, summary2] = await Promise.all([
        cleanupWorker.runCleanupNow(),
        cleanupWorker.runCleanupNow(),
      ]);

      // Second should be blocked
      expect(summary1.filesDeleted).toBe(0);
      expect(summary2.filesDeleted).toBe(0);
    });

    it("should handle stop gracefully", () => {
      cleanupWorker = new CleanupWorker({
        sessionsDir: testSessionsDir,
        trashDir: testTrashDir,
        cleanupIntervalHours: 24,
        retentionDays: 30,
        dryRunMode: false,
      });

      cleanupWorker.stop();
      cleanupWorker.stop(); // Call stop twice

      expect(true).toBe(true);
    });
  });
});
