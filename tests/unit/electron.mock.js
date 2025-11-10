// Mock Electron APIs for Jest tests
// This file is loaded via setupFilesAfterEnv in jest.config.js

// Ensure a global window object
if (typeof window === "undefined") {
  global.window = {};
}

// Set electron API on globalThis for compatibility
globalThis.electron = {
  getNetworkInterfaces: jest.fn().mockResolvedValue([]),
  loadPresets: jest.fn().mockResolvedValue([]),
  savePreset: jest.fn().mockResolvedValue(undefined),
  deletePreset: jest.fn().mockResolvedValue(undefined),
  startCapture: jest.fn().mockResolvedValue(undefined),
  loadAppConfig: jest.fn().mockResolvedValue({ autoStartCapture: false, startMinimized: false }),
  saveAppConfig: jest.fn().mockResolvedValue(undefined),
};
