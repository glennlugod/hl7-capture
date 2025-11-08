// Mock Electron APIs for Jest tests
// This file is loaded via setupFilesAfterEnv in jest.config.js

// Ensure a global window object
if (typeof window === "undefined") {
  global.window = {};
}

window.electron = {
  getNetworkInterfaces: jest.fn().mockResolvedValue([]),
  loadPresets: jest.fn().mockResolvedValue([]),
  savePreset: jest.fn().mockResolvedValue(undefined),
  deletePreset: jest.fn().mockResolvedValue(undefined),
  startCapture: jest.fn().mockResolvedValue(undefined),
};
