import '@testing-library/jest-dom'

import React from 'react'

import { act, render, screen, waitFor } from '@testing-library/react'

import App from '../../src/renderer/App'

// Mock the electron API
const mockElectronAPI = {
  getNetworkInterfaces: jest.fn().mockResolvedValue([]),
  onNewElement: jest.fn(),
  onSessionComplete: jest.fn(),
  onCaptureStatus: jest.fn(),
  onError: jest.fn(),
  validateMarkerConfig: jest.fn(),
  saveMarkerConfig: jest.fn(),
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
    (globalThis as any).electron = mockElectronAPI;
  });

  afterEach(() => {
    delete (globalThis as any).electron;
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("renders MainLayout and components", async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled());

      expect(screen.getByText("Configuration Panel")).toBeInTheDocument();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getByText("Select a session to view details")).toBeInTheDocument();
    });

    it("renders correct layout structure", async () => {
      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText("Configuration Panel")).toBeInTheDocument();
      expect(screen.getByText("Sessions")).toBeInTheDocument();
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

      const collapseButton = screen.getByRole("button", {
        name: /collapse configuration panel/i,
      });
      expect(collapseButton).toBeInTheDocument();
    });

    it("initializes electron API listeners on mount", async () => {
      await act(async () => {
        render(<App />);
      });
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
      expect(mockElectronAPI.onNewElement).toHaveBeenCalled();
      expect(mockElectronAPI.onSessionComplete).toHaveBeenCalled();
      expect(mockElectronAPI.onCaptureStatus).toHaveBeenCalled();
      expect(mockElectronAPI.onError).toHaveBeenCalled();
      expect(mockElectronAPI.loadPresets).toHaveBeenCalled();
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
