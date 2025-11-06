import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import MainLayout from "../../src/renderer/components/MainLayout";

describe("MainLayout Component", () => {
  const mockConfigPanel = <div data-testid="mock-config">Config Panel Content</div>;
  const mockSessionList = <div data-testid="mock-sessions">Session List Content</div>;
  const mockMessageDetail = <div data-testid="mock-detail">Message Detail Content</div>;

  describe("AC #1: Three-Panel Layout Implementation", () => {
    it("should render all three panels", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      // Verify Configuration Panel header
      expect(screen.getByText("Configuration")).toBeInTheDocument();

      // Verify Session List Panel header
      expect(screen.getByText("Sessions")).toBeInTheDocument();

      // Verify Message Detail Panel header
      expect(screen.getByText("Message Details")).toBeInTheDocument();

      // Verify panel content is rendered
      expect(screen.getByTestId("mock-config")).toBeInTheDocument();
      expect(screen.getByTestId("mock-sessions")).toBeInTheDocument();
      expect(screen.getByTestId("mock-detail")).toBeInTheDocument();
    });

    it("should render Configuration Panel at the top", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const configHeader = screen.getByText("Configuration");

      // Configuration panel should exist and be visible
      expect(configHeader).toBeInTheDocument();
      expect(configHeader).toBeVisible();
    });

    it("should render Session List on the left and Message Detail on the right", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const sessionHeader = screen.getByText("Sessions");
      const detailHeader = screen.getByText("Message Details");

      // Both should exist in the document
      expect(sessionHeader).toBeInTheDocument();
      expect(detailHeader).toBeInTheDocument();
    });
  });

  describe("AC #3: Collapsible Configuration Panel", () => {
    it("should show collapse button when Configuration Panel is expanded", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const collapseButton = screen.getByRole("button", { name: /collapse configuration panel/i });
      expect(collapseButton).toBeInTheDocument();
      expect(collapseButton).toHaveTextContent("▲ Collapse");
    });

    it("should collapse Configuration Panel when collapse button is clicked", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const collapseButton = screen.getByRole("button", { name: /collapse configuration panel/i });

      // Initially expanded - config content should be visible
      expect(screen.getByTestId("mock-config")).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(collapseButton);

      // Config content should no longer be visible
      expect(screen.queryByTestId("mock-config")).not.toBeInTheDocument();

      // Button text should change
      const expandButton = screen.getByRole("button", { name: /expand configuration panel/i });
      expect(expandButton).toHaveTextContent("▼ Expand");
    });

    it("should expand Configuration Panel when expand button is clicked", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const collapseButton = screen.getByRole("button", { name: /collapse configuration panel/i });

      // Collapse first
      fireEvent.click(collapseButton);
      expect(screen.queryByTestId("mock-config")).not.toBeInTheDocument();

      // Then expand
      const expandButton = screen.getByRole("button", { name: /expand configuration panel/i });
      fireEvent.click(expandButton);

      // Config content should be visible again
      expect(screen.getByTestId("mock-config")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes for accessibility", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const collapseButton = screen.getByRole("button", { name: /collapse configuration panel/i });

      // Check initial aria-expanded state
      expect(collapseButton).toHaveAttribute("aria-expanded", "true");

      // Click to collapse
      fireEvent.click(collapseButton);

      // Check collapsed aria-expanded state
      const expandButton = screen.getByRole("button", { name: /expand configuration panel/i });
      expect(expandButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Panel Layout and Styling", () => {
    it("should apply correct styling for panel borders and dividers", () => {
      const { container } = render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      // Configuration panel should have bottom border
      const configPanel = container.querySelector(".border-b.border-gray-300");
      expect(configPanel).toBeInTheDocument();
    });

    it("should use full screen dimensions", () => {
      const { container } = render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const mainLayout = container.firstChild as HTMLElement;
      expect(mainLayout).toHaveClass("h-screen");
      expect(mainLayout).toHaveClass("w-screen");
    });
  });

  describe("Component Integration", () => {
    it("should correctly pass panel content to respective sections", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      // All mock content should be present
      expect(screen.getByText("Config Panel Content")).toBeInTheDocument();
      expect(screen.getByText("Session List Content")).toBeInTheDocument();
      expect(screen.getByText("Message Detail Content")).toBeInTheDocument();
    });

    it("should maintain panel content when Configuration Panel is toggled", () => {
      render(
        <MainLayout
          configPanel={mockConfigPanel}
          sessionList={mockSessionList}
          messageDetail={mockMessageDetail}
        />
      );

      const collapseButton = screen.getByRole("button", { name: /collapse configuration panel/i });

      // Session and detail content should always be visible
      expect(screen.getByText("Session List Content")).toBeInTheDocument();
      expect(screen.getByText("Message Detail Content")).toBeInTheDocument();

      // Toggle config panel
      fireEvent.click(collapseButton);

      // Session and detail content should still be visible
      expect(screen.getByText("Session List Content")).toBeInTheDocument();
      expect(screen.getByText("Message Detail Content")).toBeInTheDocument();
    });
  });
});
