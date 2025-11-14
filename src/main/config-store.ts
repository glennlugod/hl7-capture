/**
 * Configuration Store
 * Handles persisting and retrieving MarkerConfig from the file system
 */

import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

import type { MarkerConfig, AppConfig } from "../common/types";

/**
 * Default marker configuration
 */
const DEFAULT_MARKER_CONFIG: MarkerConfig = {
  startMarker: 0x05,
  acknowledgeMarker: 0x06,
  endMarker: 0x04,
  deviceIP: "",
  lisIP: "",
  lisPort: undefined,
};

// Default application-level configuration
const DEFAULT_APP_CONFIG: AppConfig = {
  autoStartCapture: false,
  startMinimized: false,
  autoStartApp: false,
  // Phase 3: Session Persistence defaults
  enablePersistence: true,
  retentionDays: 30,
  // Phase 4: Cleanup Worker defaults
  cleanupIntervalHours: 24,
  dryRunMode: false,
  // Phase 5: Submission Worker defaults
  submissionEndpoint: "",
  submissionAuthHeader: "",
  submissionConcurrency: 2,
  submissionMaxRetries: 3,
  submissionIntervalMinutes: 1,
  // Logging defaults
  logLevel: "info",
  logsDir: path.join(app.getPath("userData"), "logs"),
};

/**
 * Configuration Store for HL7 Capture
 * Persists and retrieves configuration from the application's user data directory
 */
export class ConfigStore {
  private readonly configDir: string;
  private readonly configPath: string;
  private readonly interfacePath: string;
  private readonly appConfigPath: string;
  private config: MarkerConfig;
  private selectedInterfaceName: string | null;
  private appConfig: AppConfig;

  constructor() {
    // Use app.getPath('userData') to store config in the user data directory
    this.configDir = path.join(app.getPath("userData"), "config");
    this.configPath = path.join(this.configDir, "marker-config.json");
    this.appConfigPath = path.join(this.configDir, "app-config.json");
    this.interfacePath = path.join(this.configDir, "interface-selection.json");
    this.config = { ...DEFAULT_MARKER_CONFIG };
    this.selectedInterfaceName = null;
    this.appConfig = { ...DEFAULT_APP_CONFIG };

    // Ensure config directory exists
    this.ensureConfigDirExists();
  }

  /**
   * Ensure the config directory exists, create if it doesn't
   */
  private ensureConfigDirExists(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Load configuration from disk
   * If file doesn't exist or is invalid, returns default configuration
   */
  public load(): MarkerConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const rawData = fs.readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(rawData) as Partial<MarkerConfig>;

        // Validate and merge with defaults to ensure all required fields exist
        this.config = {
          ...DEFAULT_MARKER_CONFIG,
          ...parsed,
        };

        return this.config;
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}:`, error);
      // Return default on error
    }

    return DEFAULT_MARKER_CONFIG;
  }

  /**
   * Load application-level configuration from disk. Returns defaults when missing.
   */
  public loadAppConfig(): AppConfig {
    try {
      if (fs.existsSync(this.appConfigPath)) {
        const raw = fs.readFileSync(this.appConfigPath, "utf-8");
        const parsed = JSON.parse(raw) as Partial<AppConfig>;
        this.appConfig = {
          ...DEFAULT_APP_CONFIG,
          ...parsed,
        };
        return this.appConfig;
      }
    } catch (error) {
      console.warn(`Failed to load app config from ${this.appConfigPath}:`, error);
    }

    return { ...DEFAULT_APP_CONFIG };
  }

  /**
   * Save application-level config to disk
   */
  public saveAppConfig(cfg: AppConfig): void {
    try {
      this.ensureConfigDirExists();

      if (
        typeof cfg.autoStartCapture !== "boolean" ||
        typeof cfg.startMinimized !== "boolean" ||
        typeof cfg.autoStartApp !== "boolean"
      ) {
        throw new TypeError("Invalid app config");
      }

      this.appConfig = { ...cfg };
      fs.writeFileSync(this.appConfigPath, JSON.stringify(this.appConfig, null, 2), "utf-8");
    } catch (error) {
      console.error(`Failed to save app config to ${this.appConfigPath}:`, error);
      throw new Error(`Failed to save app config: ${error}`);
    }
  }

  /**
   * Save configuration to disk
   */
  public save(config: MarkerConfig): void {
    try {
      this.ensureConfigDirExists();

      // Validate configuration before saving
      if (!this.isValidConfig(config)) {
        throw new Error("Invalid configuration provided");
      }

      // Update in-memory config
      this.config = { ...config };

      // Write to file
      const jsonData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, jsonData, "utf-8");
    } catch (error) {
      console.error(`Failed to save config to ${this.configPath}:`, error);
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Get current in-memory configuration
   */
  public get(): MarkerConfig {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults and remove from disk
   */
  public reset(): void {
    try {
      this.config = { ...DEFAULT_MARKER_CONFIG };
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
    } catch (error) {
      console.error("Failed to reset configuration:", error);
      throw new Error(`Failed to reset configuration: ${error}`);
    }
  }

  /**
   * Validate configuration structure
   */
  private isValidConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") {
      return false;
    }

    const cfg = config as Record<string, unknown>;

    // Check required fields
    if (
      typeof cfg.startMarker !== "number" ||
      typeof cfg.acknowledgeMarker !== "number" ||
      typeof cfg.endMarker !== "number"
    ) {
      return false;
    }

    if (typeof cfg.deviceIP !== "string" || typeof cfg.lisIP !== "string") {
      return false;
    }

    // lisPort is optional and can be number | undefined | null
    if (cfg.lisPort !== undefined && cfg.lisPort !== null && typeof cfg.lisPort !== "number") {
      return false;
    }

    // autoStartCapture is optional and if present must be boolean
    if (cfg.autoStartCapture !== undefined && typeof cfg.autoStartCapture !== "boolean") {
      return false;
    }

    return true;
  }

  /**
   * Load selected interface name from disk
   * Returns null if not set or file doesn't exist
   */
  public loadSelectedInterfaceName(): string | null {
    try {
      if (fs.existsSync(this.interfacePath)) {
        const rawData = fs.readFileSync(this.interfacePath, "utf-8");
        const parsed = JSON.parse(rawData) as { interfaceName: string };

        if (typeof parsed.interfaceName === "string" && parsed.interfaceName.length > 0) {
          this.selectedInterfaceName = parsed.interfaceName;
          return this.selectedInterfaceName;
        }
      }
    } catch (error) {
      console.warn(`Failed to load interface selection from ${this.interfacePath}:`, error);
    }

    return null;
  }

  /**
   * Save selected interface name to disk
   */
  public saveSelectedInterfaceName(interfaceName: string | null): void {
    try {
      this.ensureConfigDirExists();

      if (interfaceName === null) {
        // Remove the file if setting to null
        if (fs.existsSync(this.interfacePath)) {
          fs.unlinkSync(this.interfacePath);
        }
        this.selectedInterfaceName = null;
        return;
      }

      if (typeof interfaceName !== "string" || interfaceName.length === 0) {
        throw new Error("Invalid interface name");
      }

      this.selectedInterfaceName = interfaceName;

      // Write to file
      const jsonData = JSON.stringify({ interfaceName }, null, 2);
      fs.writeFileSync(this.interfacePath, jsonData, "utf-8");
    } catch (error) {
      console.error(`Failed to save interface selection to ${this.interfacePath}:`, error);
      throw new Error(`Failed to save interface selection: ${error}`);
    }
  }
}

// Export singleton instance
export const configStore = new ConfigStore();
