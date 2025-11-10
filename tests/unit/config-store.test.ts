/**
 * Unit tests for ConfigStore
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { ConfigStore } from "../../src/main/config-store";

import type { MarkerConfig } from "../../src/common/types";

// Mock Electron app.getPath
jest.mock("electron", () => ({
  app: {
    getPath: jest.fn((pathType: string) => {
      if (pathType === "userData") {
        return path.join(__dirname, "..", ".test-app-data");
      }
      return "";
    }),
  },
}));

describe("ConfigStore", () => {
  let store: ConfigStore;
  const testConfigDir = path.join(__dirname, "..", ".test-app-data", "config");

  beforeEach(() => {
    // Clear test directory before each test
    const testAppDataDir = path.join(__dirname, "..", "..", ".test-app-data");
    if (fs.existsSync(testAppDataDir)) {
      fs.rmSync(testAppDataDir, { recursive: true, force: true });
    }
    // Create fresh instance for each test
    store = new ConfigStore();
  });

  afterAll(() => {
    // Cleanup test directory after all tests
    const testAppDataDir = path.join(__dirname, "..", ".test-app-data");
    if (fs.existsSync(testAppDataDir)) {
      fs.rmSync(testAppDataDir, { recursive: true, force: true });
    }
  });

  describe("load", () => {
    it("should return default config when no config file exists", () => {
      const config = store.load();

      expect(config).toEqual({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "",
        lisIP: "",
        lisPort: undefined,
      });
    });

    it("should load existing config from file", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
        lisPort: 6000,
      };

      // Save config first
      store.save(testConfig);

      // Create new store instance to simulate app restart
      const newStore = new ConfigStore();
      const loadedConfig = newStore.load();

      expect(loadedConfig).toEqual(testConfig);
    });

    it("should merge partial config with defaults", () => {
      // Manually create a partial config file
      fs.mkdirSync(testConfigDir, { recursive: true });
      const partialConfig = {
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
      };
      fs.writeFileSync(
        path.join(testConfigDir, "marker-config.json"),
        JSON.stringify(partialConfig)
      );

      const config = store.load();

      expect(config).toEqual({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
        lisPort: undefined,
      });
    });

    it("should return default config if file is invalid JSON", () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      fs.writeFileSync(path.join(testConfigDir, "marker-config.json"), "invalid json {");

      const config = store.load();

      expect(config).toEqual({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "",
        lisIP: "",
        lisPort: undefined,
      });
    });
  });

  describe("save", () => {
    it("should save config to file", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
        lisPort: 6000,
      };

      store.save(testConfig);

      const configPath = path.join(testConfigDir, "marker-config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const savedContent = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(savedContent).toEqual(testConfig);
    });

    it("should create config directory if it doesn't exist", () => {
      // The ConfigStore constructor calls ensureConfigDirExists, so we need to
      // check if the directory was created (which it should be)
      expect(fs.existsSync(testConfigDir)).toBe(true);

      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
      };

      store.save(testConfig);

      expect(fs.existsSync(testConfigDir)).toBe(true);
    });

    it("should update in-memory config when saving", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
      };

      store.save(testConfig);

      const currentConfig = store.get();
      expect(currentConfig).toEqual(testConfig);
    });

    it("should throw error on invalid config", () => {
      const invalidConfig = {
        startMarker: "invalid",
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
      } as unknown as MarkerConfig;

      expect(() => store.save(invalidConfig)).toThrow();
    });
  });

  describe("get", () => {
    it("should return current in-memory config", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
        lisPort: 6000,
      };

      store.save(testConfig);

      const config = store.get();
      expect(config).toEqual(testConfig);
    });

    it("should return a copy, not reference", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
      };

      store.save(testConfig);

      const config1 = store.get();
      const config2 = store.get();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe("reset", () => {
    it("should reset config to defaults and remove file", () => {
      const testConfig: MarkerConfig = {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "192.168.1.100",
        lisIP: "192.168.1.200",
        lisPort: 6000,
      };

      store.save(testConfig);
      const configPath = path.join(testConfigDir, "marker-config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      store.reset();

      const config = store.get();
      expect(config).toEqual({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "",
        lisIP: "",
        lisPort: undefined,
      });
      expect(fs.existsSync(configPath)).toBe(false);
    });

    it("should not throw if config file doesn't exist", () => {
      expect(() => store.reset()).not.toThrow();
    });
  });

  describe("Interface Selection", () => {
    it("should return null when no interface selection file exists", () => {
      const interfaceName = store.loadSelectedInterfaceName();
      expect(interfaceName).toBeNull();
    });

    it("should save and load interface selection by name", () => {
      store.saveSelectedInterfaceName("eth0");

      const newStore = new ConfigStore();
      const interfaceName = newStore.loadSelectedInterfaceName();

      expect(interfaceName).toBe("eth0");
    });

    it("should handle null interface selection", () => {
      store.saveSelectedInterfaceName("eth0");
      store.saveSelectedInterfaceName(null);

      const interfaceName = store.loadSelectedInterfaceName();
      expect(interfaceName).toBeNull();
    });

    it("should remove interface selection file when saving null", () => {
      const interfaceFilePath = path.join(testConfigDir, "interface-selection.json");

      store.saveSelectedInterfaceName("eth0");
      expect(fs.existsSync(interfaceFilePath)).toBe(true);

      store.saveSelectedInterfaceName(null);
      expect(fs.existsSync(interfaceFilePath)).toBe(false);
    });

    it("should throw error on invalid interface name", () => {
      expect(() => store.saveSelectedInterfaceName("")).toThrow();
    });

    it("should return null if saved file is invalid JSON", () => {
      const interfaceFilePath = path.join(testConfigDir, "interface-selection.json");
      fs.writeFileSync(interfaceFilePath, "invalid json {");

      const interfaceName = store.loadSelectedInterfaceName();
      expect(interfaceName).toBeNull();
    });

    it("should return null if saved interface name is empty", () => {
      const interfaceFilePath = path.join(testConfigDir, "interface-selection.json");
      fs.writeFileSync(interfaceFilePath, JSON.stringify({ interfaceName: "" }));

      const interfaceName = store.loadSelectedInterfaceName();
      expect(interfaceName).toBeNull();
    });
  });
});
