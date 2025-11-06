import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import MessageDetailViewer from "../../src/renderer/components/MessageDetailViewer";

import type { HL7Element, HL7Session } from "../../src/common/types";

const mockElement: HL7Element = {
  id: "element-1",
  timestamp: Date.now(),
  direction: "device-to-pc",
  type: "message",
  hexData: "4D53487C5E7E5C267C4E555E4E554C4C5E4E554C4C",
  content: "MSH|^~\\&|NU^NULL^NULL",
  decodedMessage: "MSH|^~\\&|NU^NULL^NULL",
  rawBytes: Buffer.from([]),
};

const mockSession: HL7Session = {
  id: "session-1",
  sessionId: 1,
  startTime: Date.now(),
  endTime: Date.now() + 1000,
  deviceIP: "192.168.1.100",
  pcIP: "192.168.1.200",
  elements: [mockElement],
  messages: ["MSH|^~\\&|NU^NULL^NULL", "PID|1||12345^^^MRN||DOE^JOHN"],
  isComplete: true,
};

describe("MessageDetailViewer Component", () => {
  describe("Empty State", () => {
    it("should show empty state when no session is selected", () => {
      render(<MessageDetailViewer session={null} />);

      expect(
        screen.getByText("Select a session from the list to view message details")
      ).toBeInTheDocument();
    });

    it("should have proper ARIA attributes in empty state", () => {
      render(<MessageDetailViewer session={null} />);

      const emptyState = screen.getByRole("status");
      expect(emptyState).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Session Display", () => {
    it("should display session header information", () => {
      render(<MessageDetailViewer session={mockSession} />);

      expect(screen.getByText("Message Details")).toBeInTheDocument();
      expect(screen.getByText(/Session #1/)).toBeInTheDocument();
      expect(screen.getByText(/2 messages/)).toBeInTheDocument();
    });

    it("should display single message count correctly", () => {
      const singleMessageSession = { ...mockSession, messages: ["MSH|^~\\&|NU^NULL^NULL"] };
      render(<MessageDetailViewer session={singleMessageSession} />);

      expect(screen.getByText(/1 message/)).toBeInTheDocument();
      expect(screen.queryByText(/messages/)).not.toBeInTheDocument();
    });
  });

  describe("AC #4: Keyboard Navigation - Tab key for view switching", () => {
    it("should display Decoded and Hex tabs", () => {
      render(<MessageDetailViewer session={mockSession} />);

      expect(screen.getByRole("tab", { name: /decoded/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /hex/i })).toBeInTheDocument();
    });

    it("should default to Decoded view", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      expect(decodedTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Hex view when Hex tab is clicked", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      fireEvent.click(hexTab);

      expect(hexTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Decoded view when Decoded tab is clicked", () => {
      render(<MessageDetailViewer session={mockSession} />);

      // Switch to Hex first
      const hexTab = screen.getByRole("tab", { name: /hex/i });
      fireEvent.click(hexTab);

      // Switch back to Decoded
      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      fireEvent.click(decodedTab);

      expect(decodedTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("AC #4: Keyboard Navigation - Arrow keys for message navigation", () => {
    it("should show message navigation controls for multiple messages", () => {
      render(<MessageDetailViewer session={mockSession} />);

      expect(screen.getByLabelText("Previous message")).toBeInTheDocument();
      expect(screen.getByLabelText("Next message")).toBeInTheDocument();
      expect(screen.getByText(/Message 1 of 2/)).toBeInTheDocument();
    });

    it("should not show message navigation for single message sessions", () => {
      const singleMessageSession = { ...mockSession, messages: ["MSH|^~\\&|NU^NULL^NULL"] };
      render(<MessageDetailViewer session={singleMessageSession} />);

      expect(screen.queryByLabelText("Previous message")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Next message")).not.toBeInTheDocument();
    });

    it("should navigate to next message when Next button is clicked", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const nextButton = screen.getByLabelText("Next message");
      fireEvent.click(nextButton);

      expect(screen.getByText(/Message 2 of 2/)).toBeInTheDocument();
    });

    it("should navigate to previous message when Prev button is clicked", () => {
      render(<MessageDetailViewer session={mockSession} />);

      // Go to message 2
      const nextButton = screen.getByLabelText("Next message");
      fireEvent.click(nextButton);

      // Go back to message 1
      const prevButton = screen.getByLabelText("Previous message");
      fireEvent.click(prevButton);

      expect(screen.getByText(/Message 1 of 2/)).toBeInTheDocument();
    });

    it("should wrap to last message when clicking Prev on first message", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const prevButton = screen.getByLabelText("Previous message");
      fireEvent.click(prevButton);

      expect(screen.getByText(/Message 2 of 2/)).toBeInTheDocument();
    });

    it("should wrap to first message when clicking Next on last message", () => {
      render(<MessageDetailViewer session={mockSession} />);

      // Go to last message
      const nextButton = screen.getByLabelText("Next message");
      fireEvent.click(nextButton);

      // Wrap to first
      fireEvent.click(nextButton);

      expect(screen.getByText(/Message 1 of 2/)).toBeInTheDocument();
    });
  });

  describe("AC #5: Focus Indicators", () => {
    it("should have focus ring on Decoded tab", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      expect(decodedTab).toHaveClass("focus:ring-2");
      expect(decodedTab).toHaveClass("focus:ring-teal-500");
    });

    it("should have focus ring on Hex tab", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      expect(hexTab).toHaveClass("focus:ring-2");
      expect(hexTab).toHaveClass("focus:ring-teal-500");
    });

    it("should have focus ring on navigation buttons", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const prevButton = screen.getByLabelText("Previous message");
      const nextButton = screen.getByLabelText("Next message");

      expect(prevButton).toHaveClass("focus:ring-2");
      expect(prevButton).toHaveClass("focus:ring-teal-500");
      expect(nextButton).toHaveClass("focus:ring-2");
      expect(nextButton).toHaveClass("focus:ring-teal-500");
    });
  });

  describe("AC #6: Screen Reader Support", () => {
    it("should have proper ARIA roles for tabs", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toHaveAttribute("aria-label", "Message view modes");

      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      expect(decodedTab).toHaveAttribute("aria-controls", "decoded-panel");

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      expect(hexTab).toHaveAttribute("aria-controls", "hex-panel");
    });

    it("should have proper ARIA attributes on tab panels", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const decodedPanel = screen.getByRole("tabpanel", { name: /decoded/i });
      expect(decodedPanel).toHaveAttribute("id", "decoded-panel");
      expect(decodedPanel).toHaveAttribute("aria-labelledby", "decoded-tab");
    });

    it("should have aria-selected on active tab", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      const hexTab = screen.getByRole("tab", { name: /hex/i });

      expect(decodedTab).toHaveAttribute("aria-selected", "true");
      expect(hexTab).toHaveAttribute("aria-selected", "false");
    });

    it("should update aria-selected when switching tabs", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      fireEvent.click(hexTab);

      expect(hexTab).toHaveAttribute("aria-selected", "true");

      const decodedTab = screen.getByRole("tab", { name: /decoded/i });
      expect(decodedTab).toHaveAttribute("aria-selected", "false");
    });

    it("should have descriptive aria-labels on navigation buttons", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const prevButton = screen.getByLabelText("Previous message");
      const nextButton = screen.getByLabelText("Next message");

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe("Message Content Display", () => {
    it("should display decoded message content", () => {
      render(<MessageDetailViewer session={mockSession} />);

      expect(screen.getByText(/MSH\|\^~\\\&\|NU\^NULL\^NULL/)).toBeInTheDocument();
    });

    it("should display hex data when Hex tab is selected", () => {
      render(<MessageDetailViewer session={mockSession} />);

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      fireEvent.click(hexTab);

      // Hex data should be displayed (formatted with offset, hex, and ASCII)
      const hexPanel = screen.getByRole("tabpanel", { name: /hex/i });
      expect(hexPanel).toBeInTheDocument();
    });

    it("should show placeholder when no message content is available", () => {
      const emptySession = { ...mockSession, messages: [] };
      render(<MessageDetailViewer session={emptySession} />);

      expect(screen.getByText("No message content available")).toBeInTheDocument();
    });

    it("should show placeholder when no hex data is available", () => {
      const noHexSession = { ...mockSession, elements: [] };
      render(<MessageDetailViewer session={noHexSession} />);

      const hexTab = screen.getByRole("tab", { name: /hex/i });
      fireEvent.click(hexTab);

      expect(screen.getByText("No hex data available")).toBeInTheDocument();
    });
  });

  describe("Keyboard Hints", () => {
    it("should display keyboard shortcuts hints", () => {
      render(<MessageDetailViewer session={mockSession} />);

      // Check for keyboard hint elements (they may have extra whitespace)
      expect(screen.getByText(/Switch view/)).toBeInTheDocument();
      expect(screen.getByText(/Navigate messages/)).toBeInTheDocument();
      expect(screen.getByText(/Navigate sessions/)).toBeInTheDocument();
    });

    it("should show message navigation hints only for multi-message sessions", () => {
      const singleMessageSession = { ...mockSession, messages: ["MSH|^~\\&|NU^NULL^NULL"] };
      render(<MessageDetailViewer session={singleMessageSession} />);

      expect(screen.getByText(/Switch view/)).toBeInTheDocument();
      expect(screen.queryByText(/Navigate messages/)).not.toBeInTheDocument();
    });
  });

  describe("Session Change Handling", () => {
    it("should reset to first message when session changes", () => {
      const { rerender } = render(<MessageDetailViewer session={mockSession} />);

      // Navigate to second message
      const nextButton = screen.getByLabelText("Next message");
      fireEvent.click(nextButton);
      expect(screen.getByText(/Message 2 of 2/)).toBeInTheDocument();

      // Change to different session
      const newSession = { ...mockSession, id: "session-2", sessionId: 2 };
      rerender(<MessageDetailViewer session={newSession} />);

      // Should reset to message 1
      expect(screen.getByText(/Message 1 of 2/)).toBeInTheDocument();
    });
  });
});
