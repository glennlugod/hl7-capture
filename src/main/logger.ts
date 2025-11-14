/**
 * Centralized logging service with rotating file support and configurable log levels
 * Uses Winston logger with daily rotating file transport
 */

import fs from "node:fs";
import path from "node:path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LoggerConfig {
  logLevel: LogLevel;
  logsDir: string;
}

/**
 * Logger service singleton
 */
class LoggerService {
  private logger: winston.Logger | null = null;
  private config: LoggerConfig;
  private initialized = false;

  constructor() {
    this.config = {
      logLevel: "info",
      logsDir: path.join(process.cwd(), "logs"),
    };
  }

  /**
   * Initialize the logger with configuration
   * @param config Logger configuration
   */
  public initialize(config: LoggerConfig): void {
    if (this.initialized && this.logger) {
      return;
    }

    this.config = config;

    // Ensure logs directory exists
    if (!fs.existsSync(this.config.logsDir)) {
      fs.mkdirSync(this.config.logsDir, { recursive: true });
    }

    // Create Winston logger with rotating file transport
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
        })
      ),
      defaultMeta: { service: "hl7-capture" },
      transports: [
        // Console transport (always output to console at all levels)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `[${timestamp}] ${level}: ${message}`;
            })
          ),
        }),

        // Daily rotating file transport for all logs
        new DailyRotateFile({
          filename: path.join(this.config.logsDir, "hl7-capture-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          utc: false,
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
            })
          ),
        }),

        // Error-specific rotating file transport
        new DailyRotateFile({
          level: "error",
          filename: path.join(this.config.logsDir, "hl7-capture-error-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          utc: false,
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
            })
          ),
        }),
      ],
    });

    this.initialized = true;
  }

  /**
   * Get or create the logger instance
   */
  private getLogger(): winston.Logger {
    if (!this.logger) {
      this.initialize(this.config);
    }
    return this.logger!;
  }

  /**
   * Update log level at runtime
   * @param level New log level
   */
  public setLogLevel(level: LogLevel): void {
    this.config.logLevel = level;
    if (this.logger) {
      this.logger.level = level;
    }
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.config.logLevel;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Log error message
   */
  public error(message: string, meta?: Record<string, unknown>): void {
    this.getLogger().error(message, meta);
  }

  /**
   * Log warning message
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.getLogger().warn(message, meta);
  }

  /**
   * Log info message
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.getLogger().info(message, meta);
  }

  /**
   * Log debug message
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.getLogger().debug(message, meta);
  }

  /**
   * Close the logger (cleanup)
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.logger) {
        this.logger.close();
      }
      this.initialized = false;
      this.logger = null;
      resolve();
    });
  }
}

// Export singleton instance
export const logger = new LoggerService();
