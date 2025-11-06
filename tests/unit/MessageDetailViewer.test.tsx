import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { HL7Session } from '../../src/common/types'
import MessageDetailViewer from '../../src/renderer/components/MessageDetailViewer'

const mockSession: HL7Session = {
  id: "1",
  sessionId: 1,
  startTime: Date.now(),
  endTime: Date.now() + 5000,
  deviceIP: "192.168.1.100",
  pcIP: "192.168.1.1",
  elements: [
    {
      id: "e1",
      timestamp: Date.now(),
      direction: "device-to-pc",
      type: "start",
      hexData: "0x05",
      content: "Start marker",
      decodedMessage: "Session start",
      rawBytes: Buffer.from([0x05]),
    },
    {
      id: "e2",
      timestamp: Date.now() + 1000,
      direction: "device-to-pc",
      type: "message",
      hexData: "0x4d53483d...",
      content: "HL7 message",
      decodedMessage: "MSH|^~\\&|...",
      rawBytes: Buffer.from([]),
    },
  ],
  messages: ["MSH|^~\\&|..."],
  isComplete: true,
};

describe("MessageDetailViewer Component", () => {
  describe("AC #4: Keyboard Navigation", () => {
    it("should navigate messages with arrow left", () => {
      const mockOnNavigateMessage = jest.fn();
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={mockOnNavigateMessage} />
      );

      const viewer = container.firstChild as HTMLElement;
      fireEvent.keyDown(viewer, { key: "ArrowLeft" });

      expect(mockOnNavigateMessage).toHaveBeenCalled();
    });

    it("should navigate messages with arrow right", () => {
      const mockOnNavigateMessage = jest.fn();
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={mockOnNavigateMessage} />
      );

      const viewer = container.firstChild as HTMLElement;
      fireEvent.keyDown(viewer, { key: "ArrowRight" });

      expect(mockOnNavigateMessage).toHaveBeenCalled();
    });

    it("should switch tabs with Tab key", () => {
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />
      );

      const viewer = container.firstChild as HTMLElement;
      fireEvent.keyDown(viewer, { key: "Tab" });

      const decodedTab = container.querySelector('[data-tab="decoded"]') as HTMLElement;
      expect(decodedTab?.className).toContain("text-teal-600");
    });
  });

  describe("AC #5: Focus Indicators", () => {
    it("should apply focus ring to tab buttons", () => {
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      tabs.forEach((tab) => {
        expect(tab.className).toContain("focus:ring-teal-500");
      });
    });
  });

  describe("AC #6: Screen Reader Support", () => {
    it("should have tab roles", () => {
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it("should have aria-selected on tabs", () => {
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />
      );

      const hexTab = container.querySelector('[data-tab="hex"]');
      const decodedTab = container.querySelector('[data-tab="decoded"]');

      expect(hexTab).toHaveAttribute("aria-selected", "true");
      expect(decodedTab).toHaveAttribute("aria-selected", "false");
    });

    it("should have tablist role", () => {
      const { container } = render(
        <MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />
      );

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });
  });

  describe("General Functionality", () => {
    it("should display session information", () => {
      render(<MessageDetailViewer session={mockSession} onNavigateMessage={jest.fn()} />);

      expect(screen.getByText(`Session ${mockSession.sessionId}`)).toBeInTheDocument();
    });

    it("should show empty state when no session selected", () => {
      render(<MessageDetailViewer session={null} onNavigateMessage={jest.fn()} />);

      expect(screen.getByText("Select a session to view details")).toBeInTheDocument();
    });
  });
});
