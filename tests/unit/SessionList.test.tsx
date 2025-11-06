import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import SessionList from "../../src/renderer/components/SessionList";

import type { HL7Session } from "../../src/common/types";

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback) {}
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockSession: HL7Session = {
  id: "session-1",
  sessionId: 1,
  startTime: Date.now(),
  endTime: Date.now() + 1000,
  deviceIP: "192.168.1.100",
  pcIP: "192.168.1.200",
  elements: [],
  messages: ["Test HL7 Message"],
  isComplete: true,
};

describe("SessionList Component", () => {
  describe("AC #1: Real-time Session Updates", () => {
    it("should render sessions with fade-in animation for new sessions", () => {
      const { rerender } = render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const sessionElement = screen.getByText("Session #1");
      expect(sessionElement).toBeInTheDocument();

      // Add a new session
      const newSession = { ...mockSession, id: "session-2", sessionId: 2 };
      rerender(
        <SessionList
          sessions={[mockSession, newSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
        />
      );

      const newSessionElement = screen.getByText("Session #2");
      expect(newSessionElement).toBeInTheDocument();
      // Check the session list item has the animation class
      const newSessionItem = screen.getByRole("option", { name: /Session 2/i });
      expect(newSessionItem).toHaveClass("animate-fade-in");
    });

    it("should display sessions without jarring layout shifts", () => {
      const sessions = [mockSession];
      render(
        <SessionList sessions={sessions} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const sessionElement = screen.getByRole("option");
      expect(sessionElement).toHaveStyle({ contain: "layout style paint" });
    });
  });

  describe("AC #2: Auto-scroll Behavior", () => {
    it("should display auto-scroll toggle button", () => {
      const onToggleAutoScroll = jest.fn();
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onToggleAutoScroll={onToggleAutoScroll}
        />
      );

      const toggleButton = screen.getByRole("button", { name: /auto-scroll/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent("Auto-scroll: ON");
    });

    it("should toggle auto-scroll when button is clicked", () => {
      const onToggleAutoScroll = jest.fn();
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onToggleAutoScroll={onToggleAutoScroll}
        />
      );

      const toggleButton = screen.getByRole("button", { name: /auto-scroll/i });
      fireEvent.click(toggleButton);
      expect(onToggleAutoScroll).toHaveBeenCalledTimes(1);
    });

    it("should show auto-scroll as disabled when prop is false", () => {
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onToggleAutoScroll={jest.fn()}
        />
      );

      const toggleButton = screen.getByRole("button", { name: /auto-scroll/i });
      expect(toggleButton).toHaveTextContent("Auto-scroll: OFF");
    });
  });

  describe("AC #3: Selection Persistence During Updates", () => {
    it("should maintain selected session when new sessions are added", () => {
      const onSelectSession = jest.fn();
      const { rerender } = render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={mockSession}
          onSelectSession={onSelectSession}
        />
      );

      const selectedElement = screen.getByRole("option", { selected: true });
      expect(selectedElement).toHaveAttribute("aria-selected", "true");

      // Add new session
      const newSession = { ...mockSession, id: "session-2", sessionId: 2 };
      rerender(
        <SessionList
          sessions={[mockSession, newSession]}
          selectedSession={mockSession}
          onSelectSession={onSelectSession}
        />
      );

      // Original session should still be selected
      const stillSelected = screen.getByRole("option", {
        name: /Session 1.*complete/i,
      });
      expect(stillSelected).toHaveAttribute("aria-selected", "true");
    });

    it("should apply selected styling to selected session", () => {
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={mockSession}
          onSelectSession={jest.fn()}
        />
      );

      const selectedElement = screen.getByRole("option", { selected: true });
      expect(selectedElement).toHaveClass("bg-teal-50");
      expect(selectedElement).toHaveClass("border-l-4");
      expect(selectedElement).toHaveClass("border-l-teal-500");
    });
  });

  describe("AC #4: Keyboard Navigation", () => {
    it("should select session on Enter key press", () => {
      const onSelectSession = jest.fn();
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={onSelectSession}
        />
      );

      const sessionElement = screen.getByRole("option");
      fireEvent.keyDown(sessionElement, { key: "Enter" });
      expect(onSelectSession).toHaveBeenCalledWith(mockSession);
    });

    it("should select session on Space key press", () => {
      const onSelectSession = jest.fn();
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={onSelectSession}
        />
      );

      const sessionElement = screen.getByRole("option");
      fireEvent.keyDown(sessionElement, { key: " " });
      expect(onSelectSession).toHaveBeenCalledWith(mockSession);
    });

    it("should select session on click", () => {
      const onSelectSession = jest.fn();
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={onSelectSession}
        />
      );

      const sessionElement = screen.getByRole("option");
      fireEvent.click(sessionElement);
      expect(onSelectSession).toHaveBeenCalledWith(mockSession);
    });
  });

  describe("AC #5: Focus Indicators", () => {
    it("should have focus ring styles on session elements", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const sessionElement = screen.getByRole("option");
      expect(sessionElement).toHaveClass("focus:ring-2");
      expect(sessionElement).toHaveClass("focus:ring-teal-500");
    });

    it("should have focus ring on auto-scroll toggle button", () => {
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onToggleAutoScroll={jest.fn()}
        />
      );

      const toggleButton = screen.getByRole("button", { name: /auto-scroll/i });
      expect(toggleButton).toHaveClass("focus:ring-2");
      expect(toggleButton).toHaveClass("focus:ring-teal-500");
    });
  });

  describe("AC #6: Screen Reader Support", () => {
    it("should have proper ARIA role for session list", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("aria-label", "HL7 Session List");
    });

    it("should have proper ARIA labels on session items", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const sessionOption = screen.getByRole("option");
      expect(sessionOption).toHaveAttribute("aria-label");
      expect(sessionOption.getAttribute("aria-label")).toContain("Session 1");
      expect(sessionOption.getAttribute("aria-label")).toContain("192.168.1.100");
      expect(sessionOption.getAttribute("aria-label")).toContain("complete");
    });

    it("should have aria-selected attribute on sessions", () => {
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={mockSession}
          onSelectSession={jest.fn()}
        />
      );

      const selectedOption = screen.getByRole("option", { selected: true });
      expect(selectedOption).toHaveAttribute("aria-selected", "true");
    });

    it("should have aria-live region for session count announcements", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      const liveRegion = screen.getByText("1 session captured");
      // The text is inside a div with role="status", which has aria-live
      const statusContainer = liveRegion.closest('[role="status"]');
      expect(statusContainer).toHaveAttribute("aria-live", "polite");
      expect(statusContainer).toHaveAttribute("aria-atomic", "true");
    });

    it("should have descriptive aria-label on auto-scroll button", () => {
      render(
        <SessionList
          sessions={[mockSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onToggleAutoScroll={jest.fn()}
        />
      );

      const toggleButton = screen.getByRole("button", { name: /auto-scroll/i });
      expect(toggleButton).toHaveAttribute("aria-label");
      expect(toggleButton.getAttribute("aria-label")).toContain("enabled");
      expect(toggleButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("AC #8: Reduced Motion Support", () => {
    it("should detect prefers-reduced-motion setting", () => {
      const matchMediaMock = jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      window.matchMedia = matchMediaMock;

      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      expect(matchMediaMock).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    });
  });

  describe("Empty State", () => {
    it("should show empty state message when no sessions", () => {
      render(<SessionList sessions={[]} selectedSession={null} onSelectSession={jest.fn()} />);

      expect(
        screen.getByText(/No sessions captured yet. Start capture to begin monitoring HL7 traffic./)
      ).toBeInTheDocument();
    });

    it("should have proper ARIA attributes in empty state", () => {
      render(<SessionList sessions={[]} selectedSession={null} onSelectSession={jest.fn()} />);

      const emptyState = screen.getByRole("status");
      expect(emptyState).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Session Display", () => {
    it("should display session details correctly", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      expect(screen.getByText("Session #1")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
      expect(screen.getByText("192.168.1.100")).toBeInTheDocument();
      expect(screen.getByText("192.168.1.200")).toBeInTheDocument();
      expect(screen.getByText(/0 elements/)).toBeInTheDocument();
    });

    it("should show In Progress status for incomplete sessions", () => {
      const incompleteSession = { ...mockSession, isComplete: false, endTime: undefined };
      render(
        <SessionList
          sessions={[incompleteSession]}
          selectedSession={null}
          onSelectSession={jest.fn()}
        />
      );

      // "In Progress" appears twice - once in badge and once in duration field
      const inProgressElements = screen.getAllByText("In Progress");
      expect(inProgressElements.length).toBeGreaterThan(0);
    });

    it("should display session count in header", () => {
      render(
        <SessionList sessions={[mockSession]} selectedSession={null} onSelectSession={jest.fn()} />
      );

      expect(screen.getByText("Sessions (1)")).toBeInTheDocument();
    });
  });
});
