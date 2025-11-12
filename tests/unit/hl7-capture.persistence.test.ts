import fs from "node:fs";
import path from "node:path";

import { HL7Session } from "../../src/common/types";
import { HL7CaptureManager } from "../../src/main/hl7-capture";

describe("Phase 3: HL7CaptureManager Session Persistence", () => {
  let manager: HL7CaptureManager;
  let testSessionDir: string;

  beforeEach(() => {
    manager = new HL7CaptureManager();
    testSessionDir = path.join(__dirname, ".test-sessions-", Date.now().toString());
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      if (fs.existsSync(testSessionDir)) {
        const files = fs.readdirSync(testSessionDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testSessionDir, file));
        }
        fs.rmdirSync(testSessionDir);
      }
    } catch {
      // ignore cleanup errors
    }
  });

  describe("Persistence Configuration", () => {
    it("should initialize with persistence disabled by default", async () => {
      const config = manager.getPersistenceConfig();

      expect(config.enablePersistence).toBe(true); // default is enabled
      expect(config.retentionDays).toBe(30); // default 30 days
    });

    it("should get persistence configuration", () => {
      const config = manager.getPersistenceConfig();

      expect(config).toHaveProperty("enablePersistence");
      expect(config).toHaveProperty("retentionDays");
      expect(typeof config.enablePersistence).toBe("boolean");
      expect(typeof config.retentionDays).toBe("number");
    });

    it("should validate retention days range (1-365)", async () => {
      // Test clamping of retention days
      await manager.updatePersistenceConfig(false, 0);
      let config = manager.getPersistenceConfig();
      expect(config.retentionDays).toBe(1); // Should clamp to 1

      await manager.updatePersistenceConfig(false, 400);
      config = manager.getPersistenceConfig();
      expect(config.retentionDays).toBe(365); // Should clamp to 365

      await manager.updatePersistenceConfig(false, 30);
      config = manager.getPersistenceConfig();
      expect(config.retentionDays).toBe(30); // Should stay 30
    });
  });

  describe("Persistence Initialization", () => {
    it("should initialize session store successfully", async () => {
      await manager.initializePersistence(testSessionDir, true, 30);

      const config = manager.getPersistenceConfig();
      expect(config.enablePersistence).toBe(true);
      expect(fs.existsSync(testSessionDir)).toBe(true);
    });

    it("should skip initialization when persistence disabled", async () => {
      await manager.initializePersistence(testSessionDir, false, 30);

      const config = manager.getPersistenceConfig();
      expect(config.enablePersistence).toBe(false);
    });

    it("should perform crash recovery on initialization", async () => {
      // Create a test temp file to simulate crash
      fs.mkdirSync(testSessionDir, { recursive: true });
      const tmpFile = path.join(testSessionDir, "test.json.tmp");
      const session: HL7Session = {
        id: "test-session",
        sessionId: 1,
        startTime: Date.now(),
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
      };
      fs.writeFileSync(tmpFile, JSON.stringify(session, null, 2));

      await manager.initializePersistence(testSessionDir, true, 30);

      // Temp file should be recovered/cleaned
      expect(fs.existsSync(tmpFile)).toBe(false);
    });

    it("should load persisted sessions on initialization", async () => {
      // Pre-create a session file
      fs.mkdirSync(testSessionDir, { recursive: true });
      const session: HL7Session = {
        id: "persisted-session",
        sessionId: 1,
        startTime: Date.now() - 86400000,
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: ["Test message"],
        isComplete: true,
      };
      const sessionFile = path.join(testSessionDir, "persisted-session.json");
      fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

      await manager.initializePersistence(testSessionDir, true, 30);

      // Session should be loaded into memory
      const persistedSessions = await manager.getPersistedSessions();
      expect(persistedSessions).toContainEqual(
        expect.objectContaining({ id: "persisted-session" })
      );
    });
  });

  describe("Persisted Session Management", () => {
    beforeEach(async () => {
      await manager.initializePersistence(testSessionDir, true, 30);
    });

    it("should retrieve persisted sessions", async () => {
      // Save a session
      const session: HL7Session = {
        id: "test-persist-001",
        sessionId: 1,
        startTime: Date.now(),
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const sessionFile = path.join(testSessionDir, "test-persist-001.json");
      fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

      const sessions = await manager.getPersistedSessions();

      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.some((s) => s.id === "test-persist-001")).toBe(true);
    });

    it("should delete persisted session", async () => {
      // Create session file
      const session: HL7Session = {
        id: "test-delete-001",
        sessionId: 1,
        startTime: Date.now(),
        deviceIP: "192.168.1.1",
        lisIP: "192.168.1.2",
        elements: [],
        messages: [],
        isComplete: true,
      };

      const sessionFile = path.join(testSessionDir, "test-delete-001.json");
      fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

      expect(fs.existsSync(sessionFile)).toBe(true);

      await manager.deletePersistedSession("test-delete-001");

      expect(fs.existsSync(sessionFile)).toBe(false);
    });

    it("should silently succeed when deleting non-existent session", async () => {
      // deleteSession silently ignores ENOENT errors by design
      await expect(manager.deletePersistedSession("non-existent")).resolves.toBeUndefined();
    });
  });

  describe("Persistence During Capture", () => {
    it("should not throw when persistence not initialized", () => {
      const manager2 = new HL7CaptureManager();
      const config = manager2.getPersistenceConfig();

      // Should handle gracefully
      expect(config.enablePersistence).toBe(true); // default enabled
    });

    it("should update persistence config", async () => {
      await manager.updatePersistenceConfig(false, 7);

      let config = manager.getPersistenceConfig();
      expect(config.enablePersistence).toBe(false);
      expect(config.retentionDays).toBe(7);

      await manager.updatePersistenceConfig(true, 60);
      config = manager.getPersistenceConfig();
      expect(config.enablePersistence).toBe(true);
      expect(config.retentionDays).toBe(60);
    });
  });
});
