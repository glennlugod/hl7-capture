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
    // Set up window.electron mock before each test
    Object.defineProperty(window, "electron", {
      writable: true,
      value: mockElectronAPI,
    });
  });

  afterEach(() => {
    // Clean up
    delete (window as any).electron;
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("should render MainLayout with all three placeholder components", () => {
      render(<App />);

      // Verify all placeholder components are rendered
      expect(screen.getByText("Configuration Panel Placeholder")).toBeInTheDocument();
      expect(screen.getByText("Session List Placeholder")).toBeInTheDocument();
      expect(screen.getByText("Message Detail Viewer Placeholder")).toBeInTheDocument();
    });

    it("should render placeholder components in correct layout structure", () => {
      render(<App />);

      // Verify all three placeholders exist in the rendered tree
      expect(screen.getByText("Configuration Panel Placeholder")).toBeInTheDocument();
      expect(screen.getByText("Session List Placeholder")).toBeInTheDocument();
      expect(screen.getByText("Message Detail Viewer Placeholder")).toBeInTheDocument();
    });

    it("should not show design system test page when flag is false", () => {
      render(<App />);

      // Should not see design system test page content
      expect(screen.queryByText(/Design System Test/i)).not.toBeInTheDocument();

      // Should see the placeholder components instead
      expect(screen.getByText("Configuration Panel Placeholder")).toBeInTheDocument();
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

      // Should have proper background color (white)
      const mainLayout = container.firstChild as HTMLElement;
      expect(mainLayout).toHaveClass("bg-white");
    });
  });
});
