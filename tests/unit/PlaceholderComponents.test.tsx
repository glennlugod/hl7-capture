import "@testing-library/jest-dom";

import React from "react";

import { render, screen } from "@testing-library/react";

import ConfigurationPanel from "../../src/renderer/components/ConfigurationPanel";
import MessageDetailViewer from "../../src/renderer/components/MessageDetailViewer";
import SessionList from "../../src/renderer/components/SessionList";

describe("Placeholder Components", () => {
  describe("AC #4: Placeholder Custom Component Creation", () => {
    describe("ConfigurationPanel", () => {
      it("should render with placeholder text", () => {
        render(<ConfigurationPanel />);
        expect(screen.getByText("ConfigurationPanel - Placeholder")).toBeInTheDocument();
      });

      it("should have proper styling classes", () => {
        const { container } = render(<ConfigurationPanel />);
        const placeholderDiv = container.firstChild as HTMLElement;
        expect(placeholderDiv).toHaveClass("flex", "h-full", "items-center", "justify-center");
      });

      it("should display text in gray-500 color", () => {
        render(<ConfigurationPanel />);
        const text = screen.getByText("ConfigurationPanel - Placeholder");
        expect(text).toHaveClass("text-gray-500");
      });
    });

    describe("SessionList", () => {
      it("should render with placeholder text", () => {
        render(<SessionList />);
        expect(screen.getByText("SessionList - Placeholder")).toBeInTheDocument();
      });

      it("should have proper styling classes", () => {
        const { container } = render(<SessionList />);
        const placeholderDiv = container.firstChild as HTMLElement;
        expect(placeholderDiv).toHaveClass("flex", "h-full", "items-center", "justify-center");
      });

      it("should display text in gray-500 color", () => {
        render(<SessionList />);
        const text = screen.getByText("SessionList - Placeholder");
        expect(text).toHaveClass("text-gray-500");
      });
    });

    describe("MessageDetailViewer", () => {
      it("should render with placeholder text", () => {
        render(<MessageDetailViewer />);
        expect(screen.getByText("MessageDetailViewer - Placeholder")).toBeInTheDocument();
      });

      it("should have proper styling classes", () => {
        const { container } = render(<MessageDetailViewer />);
        const placeholderDiv = container.firstChild as HTMLElement;
        expect(placeholderDiv).toHaveClass("flex", "h-full", "items-center", "justify-center");
      });

      it("should display text in gray-500 color", () => {
        render(<MessageDetailViewer />);
        const text = screen.getByText("MessageDetailViewer - Placeholder");
        expect(text).toHaveClass("text-gray-500");
      });
    });
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("should render placeholder components without errors", () => {
      // Test that all components render successfully
      const { rerender } = render(<ConfigurationPanel />);
      expect(screen.getByText("ConfigurationPanel - Placeholder")).toBeInTheDocument();

      rerender(<SessionList />);
      expect(screen.getByText("SessionList - Placeholder")).toBeInTheDocument();

      rerender(<MessageDetailViewer />);
      expect(screen.getByText("MessageDetailViewer - Placeholder")).toBeInTheDocument();
    });

    it("should have consistent placeholder styling across all components", () => {
      const { container: configContainer } = render(<ConfigurationPanel />);
      const { container: sessionContainer } = render(<SessionList />);
      const { container: detailContainer } = render(<MessageDetailViewer />);

      // All should have the same flex centering classes
      const configDiv = configContainer.firstChild as HTMLElement;
      const sessionDiv = sessionContainer.firstChild as HTMLElement;
      const detailDiv = detailContainer.firstChild as HTMLElement;

      expect(configDiv.className).toBe(sessionDiv.className);
      expect(sessionDiv.className).toBe(detailDiv.className);
    });
  });
});
