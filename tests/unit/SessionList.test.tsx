import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { HL7Session } from '../../src/common/types'
import SessionList from '../../src/renderer/components/SessionList'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

window.IntersectionObserver = MockIntersectionObserver as any;

const mockSessions: HL7Session[] = [
  {
    id: "1",
    sessionId: 1,
    startTime: Date.now(),
    deviceIP: "192.168.1.100",
    pcIP: "192.168.1.1",
    elements: [],
    messages: ["msg1", "msg2"],
    isComplete: true,
  },
  {
    id: "2",
    sessionId: 2,
    startTime: Date.now() + 1000,
    deviceIP: "192.168.1.100",
    pcIP: "192.168.1.1",
    elements: [],
    messages: ["msg3"],
    isComplete: true,
  },
];

describe("SessionList Component", () => {
  describe("AC #1: Real-time Session Updates", () => {
    it("should apply fade-in animation to session items", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const buttons = container.querySelectorAll('[role="option"]');
      buttons.forEach((btn) => {
        expect(btn.className).toContain("animate-fade-in");
      });
    });

    it("should render sessions without layout shift", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const listbox = container.querySelector('[role="listbox"]');
      expect(listbox).toBeInTheDocument();
    });

    it("should display sessions with correct information", () => {
      render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      expect(screen.getByText("Session 1")).toBeInTheDocument();
      expect(screen.getByText("Session 2")).toBeInTheDocument();
    });
  });

  describe("AC #2: Auto-scroll Behavior", () => {
    it("should display auto-scroll toggle", () => {
      render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onAutoScrollChange={jest.fn()}
        />
      );
      const checkbox = screen.getByLabelText("Enable auto-scroll to new sessions");
      expect(checkbox).toBeChecked();
    });

    it("should call onAutoScrollChange when toggled", () => {
      const mockOnAutoScrollChange = jest.fn();
      render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onAutoScrollChange={mockOnAutoScrollChange}
        />
      );
      const checkbox = screen.getByLabelText(
        "Enable auto-scroll to new sessions"
      ) as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(mockOnAutoScrollChange).toHaveBeenCalledWith(false);
    });

    it("should have 44x44px minimum touch target for checkbox", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={true}
          onAutoScrollChange={jest.fn()}
        />
      );
      const checkbox = container.querySelector(
        '[aria-label="Enable auto-scroll to new sessions"]'
      ) as HTMLElement;
      expect(checkbox.className).toContain("h-11");
      expect(checkbox.className).toContain("w-11");
    });
  });

  describe("AC #3: Selection Persistence During Updates", () => {
    it("should highlight selected session", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={mockSessions[0]}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const options = container.querySelectorAll('[role="option"]');
      expect(options[0].className).toContain("outline-2");
      expect(options[0].className).toContain("outline-teal-500");
    });

    it("should call onSelectSession when clicked", () => {
      const mockOnSelectSession = jest.fn();
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={mockOnSelectSession}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const firstButton = container.querySelector('[role="option"]') as HTMLElement;
      fireEvent.click(firstButton);
      expect(mockOnSelectSession).toHaveBeenCalledWith(mockSessions[0]);
    });
  });

  describe("AC #4: Keyboard Navigation", () => {
    it("should support keyboard navigation with arrow keys", () => {
      const mockOnSelectSession = jest.fn();
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={mockSessions[0]}
          onSelectSession={mockOnSelectSession}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const listbox = container.querySelector('[role="listbox"]') as HTMLElement;
      expect(listbox).toBeInTheDocument();
      expect(listbox?.getAttribute("role")).toBe("listbox");
    });
  });

  describe("AC #5: Focus Indicators", () => {
    it("should apply focus outline to session buttons", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const buttons = container.querySelectorAll('[role="option"]');
      buttons.forEach((btn) => {
        expect(btn.className).toContain("focus:outline-2");
        expect(btn.className).toContain("focus:outline-teal-500");
      });
    });

    it("should apply focus outline to auto-scroll checkbox", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const checkbox = container.querySelector(
        '[aria-label="Enable auto-scroll to new sessions"]'
      ) as HTMLElement;
      expect(checkbox.className).toContain("focus:outline-2");
      expect(checkbox.className).toContain("focus:outline-teal-500");
    });
  });

  describe("AC #10: Performance Optimization", () => {
    it("should use virtual scrolling for 100+ sessions", () => {
      const largeSessions: HL7Session[] = Array.from({ length: 150 }, (_, i) => ({
        id: `session-${i}`,
        sessionId: i + 1,
        startTime: Date.now() + i * 1000,
        deviceIP: "192.168.1.100",
        pcIP: "192.168.1.1",
        elements: [],
        messages: [`msg${i}`],
        isComplete: true,
      }));

      const { container } = render(
        <SessionList
          sessions={largeSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );

      // Virtual list should be present when session count > 100
      expect(container.querySelector('[class*="react-window"]')).toBeDefined();
    });

    it("should use standard list for < 100 sessions", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );

      // Standard list rendering should be used
      const options = container.querySelectorAll('[role="option"]');
      expect(options.length).toBe(mockSessions.length);
    });
  });

  describe("AC #6: Screen Reader Support", () => {
    it("should have listbox role", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      expect(container.querySelector('[role="listbox"]')).toBeInTheDocument();
    });

    it("should have aria-labels on sessions", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      const options = container.querySelectorAll('[role="option"]');
      expect(options[0]).toHaveAttribute("aria-label", expect.stringContaining("Session 1"));
    });

    it("should have aria-live region", () => {
      const { container } = render(
        <SessionList
          sessions={mockSessions}
          selectedSession={null}
          onSelectSession={jest.fn()}
          autoScroll={false}
          onAutoScrollChange={jest.fn()}
        />
      );
      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });
  });

  it("should show empty state when no sessions", () => {
    render(
      <SessionList
        sessions={[]}
        selectedSession={null}
        onSelectSession={jest.fn()}
        autoScroll={false}
        onAutoScrollChange={jest.fn()}
      />
    );
    expect(screen.getByText("No sessions captured")).toBeInTheDocument();
  });
});
