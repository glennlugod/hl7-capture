import "@testing-library/jest-dom";

import React from "react";

import { act, render, screen, waitFor } from "@testing-library/react";

import App from "../../src/renderer/App";

// Provide a global `api` declaration so files that reference `api` without
// importing it (some versions of App.tsx) compile in the test environment.
// Use `any` so tests can call mocked methods on the global without TS errors.
declare const api: any;

// Mock the electron API
const mockElectronAPI = {
  getNetworkInterfaces: jest.fn().mockResolvedValue([]),
  onNewElement: jest.fn(),
  onSessionComplete: jest.fn(),
  onCaptureStatus: jest.fn(),
  onError: jest.fn(),
  validateMarkerConfig: jest.fn(),
  saveMarkerConfig: jest.fn(),
  loadMarkerConfig: jest.fn().mockResolvedValue({
    startMarker: 0x05,
    acknowledgeMarker: 0x06,
    endMarker: 0x04,
    deviceIP: "",
    lisIP: "",
    lisPort: undefined,
  }),
  // App-level config and status (new APIs)
  getCaptureStatus: jest.fn().mockResolvedValue({ isCapturing: false, isPaused: false }),
  loadAppConfig: jest.fn().mockResolvedValue({ autoStartCapture: false }),
  saveAppConfig: jest.fn().mockResolvedValue(undefined),
  saveInterfaceSelection: jest.fn().mockResolvedValue(undefined),
  loadInterfaceSelection: jest.fn().mockResolvedValue(null),
  startCapture: jest.fn(),
  stopCapture: jest.fn(),
  clearSessions: jest.fn(),
  // Presets API for ConfigurationPanel
  loadPresets: jest.fn().mockResolvedValue([]),
  savePreset: jest.fn().mockResolvedValue(undefined),
  deletePreset: jest.fn().mockResolvedValue(undefined),
};

describe("App Integration - Layout and Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as unknown as { electron: unknown }).electron = mockElectronAPI;
    // Also provide a runtime global named `api` for any direct references
    (globalThis as unknown as { api?: unknown }).api = mockElectronAPI;
  });

  afterEach(() => {
    delete (globalThis as unknown as { electron?: unknown }).electron;
    delete (globalThis as unknown as { api?: unknown }).api;
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("renders MainLayout and components", async () => {
      await act(async () => {
        render(<App />);
      });
      // Configuration panel is collapsed by default, so getNetworkInterfaces isn't called yet.
      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      expect(screen.getAllByText("Start Capture").length).toBeGreaterThan(0);
    });

    it("renders correct layout structure", async () => {
      await act(async () => {
        render(<App />);
      });

      expect(screen.getAllByText("Start Capture").length).toBeGreaterThan(0);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("does not show design system test page", async () => {
      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByText(/Design System Test/i)).not.toBeInTheDocument();
    });
  });

  describe("Layout Functionality", () => {
    it("renders collapse button", async () => {
      await act(async () => {
        render(<App />);
      });

      // Default is collapsed, so button should offer to Expand the configuration panel
      const expandButton = screen.getByRole("button", {
        name: /expand configuration panel/i,
      });
      expect(expandButton).toBeInTheDocument();
    });

    it("initializes electron API listeners on mount", async () => {
      await act(async () => {
        render(<App />);
      });
      // ConfigurationPanel currently loads interfaces on mount even when collapsed
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
      expect(mockElectronAPI.onNewElement).toHaveBeenCalled();
      expect(mockElectronAPI.onSessionComplete).toHaveBeenCalled();
      expect(mockElectronAPI.onCaptureStatus).toHaveBeenCalled();
      expect(mockElectronAPI.onError).toHaveBeenCalled();
    });
  });

  describe("Complete Layout Rendering", () => {
    it("renders full screen layout", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const result = render(<App />);
        container = result.container;
      });
      const mainLayout = container.firstChild as HTMLElement;
      expect(mainLayout).toHaveClass("h-screen");
      expect(mainLayout).toHaveClass("w-screen");
    });

    it("applies design system styling", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const result = render(<App />);
        container = result.container;
      });
      const mainLayout = container.firstChild as HTMLElement;
      const cls = mainLayout.className;
      expect(cls.includes("bg-white") || cls.includes("bg-gradient-to-br")).toBe(true);
    });
  });
});
