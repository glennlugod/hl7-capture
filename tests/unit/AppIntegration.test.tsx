import '@testing-library/jest-dom'

import React from 'react'

import { render, screen } from '@testing-library/react'

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
};

describe("App Integration - Layout and Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up global electron mock before each test
    (globalThis as any).electron = mockElectronAPI;
  });

  afterEach(() => {
    // Clean up
    delete (globalThis as any).electron;
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("should render MainLayout with all three components", () => {
      const { container } = render(<App />);

      // Verify components are rendered
      expect(screen.getByText("Configuration Panel")).toBeTruthy();
      expect(container.querySelector('[role="listbox"]')).toBeInTheDocument();
      expect(screen.getByText("Select a session to view details")).toBeInTheDocument();
    });

    it("should render components in correct layout structure", () => {
      const { container } = render(<App />);

      // Verify all components exist in the rendered tree
      expect(screen.getByText("Configuration Panel")).toBeTruthy();
      expect(container.querySelector('[role="listbox"]')).toBeInTheDocument();
      expect(screen.getByText("Sessions")).toBeInTheDocument();
    });

    it("should not show design system test page when flag is false", () => {
      render(<App />);

      // Should not see design system test page content
      expect(screen.queryByText(/Design System Test/i)).not.toBeInTheDocument();

      // Should see the actual components instead
      expect(screen.getByText("Configuration Panel")).toBeTruthy();
    });
  });

  describe("Layout Functionality", () => {
    it("should render with collapsible configuration panel", () => {
      render(<App />);

      // Configuration panel should have collapse button
      const collapseButton = screen.getByRole("button", {
        name: /collapse configuration panel/i,
      });
      expect(collapseButton).toBeInTheDocument();
    });

    it("should initialize electron API listeners on mount", () => {
      render(<App />);

      // Verify electron API methods were called
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
      expect(mockElectronAPI.onNewElement).toHaveBeenCalled();
      expect(mockElectronAPI.onSessionComplete).toHaveBeenCalled();
      expect(mockElectronAPI.onCaptureStatus).toHaveBeenCalled();
      expect(mockElectronAPI.onError).toHaveBeenCalled();
    });
  });

  describe("Complete Layout Rendering", () => {
    it("should render full screen layout", () => {
      const { container } = render(<App />);
      const mainLayout = container.firstChild as HTMLElement;

      // Check for screen-sized container
      expect(mainLayout).toHaveClass("h-screen");
      expect(mainLayout).toHaveClass("w-screen");
    });

    it("should apply design system colors and styling", () => {
      const { container } = render(<App />);

      // Background style may be a solid white or a subtle gradient; accept either
      const mainLayout = container.firstChild as HTMLElement;
      const cls = mainLayout.className;
      expect(cls.includes("bg-white") || cls.includes("bg-gradient-to-br")).toBe(true);
    });
  });
});
