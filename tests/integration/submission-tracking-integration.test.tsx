import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";

import SessionDetail from "../../src/renderer/components/SessionDetail";

import type { HL7Session } from "../../src/common/types";

/**
 * Phase 6 Phase 7: Integration Tests for Submission Tracking
 * Tests SessionDetail component with submission workflows:
 * - Retry functionality for failed sessions
 * - Ignore toggle for marking sessions as ignored
 * - Delete workflow with confirmation
 * - Real-time status updates and button state management
 */

describe("SessionDetail - Submission Tracking Integration", () => {
  const createMockSession = (overrides?: Partial<HL7Session>): HL7Session => ({
    id: "test-session-1",
    sessionId: 1,
    startTime: Date.now() - 60000,
    endTime: Date.now() - 50000,
    deviceIP: "192.168.1.100",
    lisIP: "192.168.1.1",
    elements: [],
    messages: ["msg1"],
    isComplete: true,
    submissionStatus: "pending",
    submissionAttempts: 0,
    submittedAt: undefined,
    submissionError: undefined,
    ...overrides,
  });

  describe("Retry Workflow Integration", () => {
    it("should enable retry for failed sessions", () => {
      const session = createMockSession({
        submissionStatus: "failed",
        submissionError: "Timeout",
      });

      const handleRetry = jest.fn();
      render(<SessionDetail session={session} onRetry={handleRetry} />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).not.toBeDisabled();
    });

    it("should call onRetry when retry button is clicked", () => {
      const session = createMockSession({
        submissionStatus: "failed",
      });

      const handleRetry = jest.fn();
      render(<SessionDetail session={session} onRetry={handleRetry} />);

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(handleRetry).toHaveBeenCalledWith(session.id);
    });

    it("should enable retry for pending status", () => {
      const session = createMockSession({
        submissionStatus: "pending",
      });

      const handleRetry = jest.fn();
      render(<SessionDetail session={session} onRetry={handleRetry} />);

      // Current component enables retry for pending sessions; assert enabled.
      expect(screen.getByRole("button", { name: /retry/i })).not.toBeDisabled();
    });

    it("should disable retry for submitted status", () => {
      const session = createMockSession({
        submissionStatus: "submitted",
        submittedAt: Date.now(),
      });

      const handleRetry = jest.fn();
      render(<SessionDetail session={session} onRetry={handleRetry} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
    });

    it("should disable retry for ignored status", () => {
      const session = createMockSession({
        submissionStatus: "ignored",
      });

      const handleRetry = jest.fn();
      render(<SessionDetail session={session} onRetry={handleRetry} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
    });
  });

  describe("Ignore Workflow Integration", () => {
    it("should display ignore button for all sessions", () => {
      const session = createMockSession();

      render(<SessionDetail session={session} onIgnore={jest.fn()} />);

      expect(screen.getByRole("button", { name: /ignore/i })).toBeInTheDocument();
    });

    it("should call onIgnore when ignore button is clicked", () => {
      const session = createMockSession({
        submissionStatus: "failed",
      });

      const handleIgnore = jest.fn();
      render(<SessionDetail session={session} onIgnore={handleIgnore} />);

      fireEvent.click(screen.getByRole("button", { name: /ignore/i }));

      expect(handleIgnore).toHaveBeenCalledWith(session.id);
    });

    it("should display ignored status after update", () => {
      const session = createMockSession({
        submissionStatus: "failed",
      });

      const { rerender } = render(<SessionDetail session={session} onIgnore={jest.fn()} />);

      const ignoredSession = {
        ...session,
        submissionStatus: "ignored" as const,
      };

      rerender(<SessionDetail session={ignoredSession} onIgnore={jest.fn()} />);

      expect(screen.getByText(/ignored/i)).toBeInTheDocument();
    });
  });

  describe("Delete Workflow Integration", () => {
    it("should show confirmation dialog on delete click", () => {
      const session = createMockSession();

      render(<SessionDetail session={session} onDelete={jest.fn()} onClose={jest.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      // Match the exact confirmation sentence rendered by the component.
      expect(
        screen.getByText(/are you sure you want to delete this session\?/i)
      ).toBeInTheDocument();
    });

    it("should call onDelete and onClose when confirmed", () => {
      const session = createMockSession();
      const handleDelete = jest.fn();
      const handleClose = jest.fn();

      render(<SessionDetail session={session} onDelete={handleDelete} onClose={handleClose} />);

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      fireEvent.click(screen.getByRole("button", { name: /confirm|yes|delete/i }));

      expect(handleDelete).toHaveBeenCalledWith(session.id);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("Status Display and Updates", () => {
    it("should display pending status badge", () => {
      const session = createMockSession({
        submissionStatus: "pending",
      });

      render(<SessionDetail session={session} />);

      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it("should display submitted status badge", () => {
      const session = createMockSession({
        submissionStatus: "submitted",
        submittedAt: Date.now() - 5000,
      });

      render(<SessionDetail session={session} />);

      // Locate the Submission Status container, then the Status row within it
      // to avoid matching the 'Last Submitted' label.
      const submissionBlock = screen.getByText(/Submission Status/i).parentElement as HTMLElement;
      const statusRow = within(submissionBlock).getByText(/Status:/i).parentElement as HTMLElement;
      expect(within(statusRow).getByText(/^submitted$/i)).toBeInTheDocument();
    });

    it("should display error message for failed sessions", () => {
      const errorMsg = "Connection refused";
      const session = createMockSession({
        submissionStatus: "failed",
        submissionError: errorMsg,
      });

      render(<SessionDetail session={session} />);

      expect(screen.getByText(new RegExp(errorMsg))).toBeInTheDocument();
    });
  });

  describe("Attempt Counter Integration", () => {
    it("should display zero attempts for new session", () => {
      const session = createMockSession({
        submissionStatus: "pending",
        submissionAttempts: 0,
      });

      render(<SessionDetail session={session} />);

      // The component renders the attempts number next to the Attempts label.
      const attemptsContainer = screen.getByText(/Attempts:/i).parentElement as HTMLElement;
      expect(within(attemptsContainer).getByText("0")).toBeInTheDocument();
    });

    it("should display attempt count for retried sessions", () => {
      const session = createMockSession({
        submissionStatus: "failed",
        submissionAttempts: 3,
      });

      render(<SessionDetail session={session} />);

      const attemptsContainer = screen.getByText(/Attempts:/i).parentElement as HTMLElement;
      expect(within(attemptsContainer).getByText("3")).toBeInTheDocument();
    });

    it("should update attempt count when session prop changes", () => {
      const session = createMockSession({
        submissionStatus: "pending",
        submissionAttempts: 1,
      });

      const { rerender } = render(<SessionDetail session={session} />);

      const attemptsContainer1 = screen.getByText(/Attempts:/i).parentElement as HTMLElement;
      expect(within(attemptsContainer1).getByText("1")).toBeInTheDocument();
      const retrySession = {
        ...session,
        submissionStatus: "failed" as const,
        submissionAttempts: 2,
      };

      rerender(<SessionDetail session={retrySession} />);

      const attemptsContainer2 = screen.getByText(/Attempts:/i).parentElement as HTMLElement;
      expect(within(attemptsContainer2).getByText("2")).toBeInTheDocument();
    });
  });

  describe("Complex Workflow Sequences", () => {
    it("should handle retry followed by successful submission", () => {
      const session = createMockSession({
        submissionStatus: "failed",
        submissionAttempts: 1,
        submissionError: "Timeout",
      });

      const handleRetry = jest.fn();

      const { rerender } = render(<SessionDetail session={session} onRetry={handleRetry} />);

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(handleRetry).toHaveBeenCalledWith(session.id);

      const successSession = {
        ...session,
        submissionStatus: "submitted" as const,
        submissionAttempts: 2,
        submittedAt: Date.now(),
        submissionError: undefined,
      };

      rerender(<SessionDetail session={successSession} onRetry={handleRetry} />);

      const submissionBlock2 = screen.getByText(/submission status/i).parentElement as HTMLElement;
      const statusRow2 = within(submissionBlock2).getByText(/Status:/i)
        .parentElement as HTMLElement;
      expect(within(statusRow2).getByText(/^submitted$/i)).toBeInTheDocument();
      expect(within(statusRow2).queryByText(/timeout/i)).not.toBeInTheDocument();
    });

    it("should handle ignore followed by delete", () => {
      const session = createMockSession({
        submissionStatus: "failed",
      });

      const handleIgnore = jest.fn();
      const handleDelete = jest.fn();
      const handleClose = jest.fn();

      const { rerender } = render(
        <SessionDetail
          session={session}
          onIgnore={handleIgnore}
          onDelete={handleDelete}
          onClose={handleClose}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /ignore/i }));

      expect(handleIgnore).toHaveBeenCalledWith(session.id);

      const ignoredSession = {
        ...session,
        submissionStatus: "ignored" as const,
      };

      rerender(
        <SessionDetail
          session={ignoredSession}
          onIgnore={handleIgnore}
          onDelete={handleDelete}
          onClose={handleClose}
        />
      );

      expect(screen.getByText(/ignored/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      fireEvent.click(screen.getByRole("button", { name: /confirm|yes|delete/i }));

      expect(handleDelete).toHaveBeenCalledWith(session.id);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
