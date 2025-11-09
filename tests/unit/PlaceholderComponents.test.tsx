import "@testing-library/jest-dom";

import React from "react";

import { render } from "@testing-library/react";

import ConfigurationPanel from "../../src/renderer/components/ConfigurationPanel";
import MessageDetailViewer from "../../src/renderer/components/MessageDetailViewer";
import SessionList from "../../src/renderer/components/SessionList";

describe("Placeholder Components", () => {
  describe("AC #4: Placeholder Custom Component Creation", () => {
    describe("ConfigurationPanel", () => {
      it("should render placeholder without errors", () => {
        const { getByText } = render(
          <ConfigurationPanel
            selectedInterface="eth0"
            markerConfig={{
              startMarker: 0x05,
              acknowledgeMarker: 0x06,
              endMarker: 0x04,
              deviceIP: "",
              lisIP: "",
            }}
            onInterfaceChange={jest.fn()}
            onConfigChange={jest.fn()}
          />
        );
        expect(getByText("Reset to Defaults")).toBeTruthy();
      });
    });

    describe("SessionList", () => {
      it("should render without errors with required props", () => {
        const { container } = render(
          <SessionList
            sessions={[]}
            selectedSession={null}
            onSelectSession={jest.fn()}
            autoScroll={false}
            onAutoScrollChange={jest.fn()}
          />
        );
        expect(container.querySelector("[role='listbox']")).toBeInTheDocument();
      });
    });

    describe("MessageDetailViewer", () => {
      it("should render without errors with required props", () => {
        const { container } = render(
          <MessageDetailViewer session={null} onNavigateMessage={jest.fn()} />
        );
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("should render all components together", () => {
      const { container, getByText } = render(
        <div>
          <ConfigurationPanel
            selectedInterface="eth0"
            markerConfig={{
              startMarker: 0x05,
              acknowledgeMarker: 0x06,
              endMarker: 0x04,
              deviceIP: "",
              lisIP: "",
            }}
            onInterfaceChange={jest.fn()}
            onConfigChange={jest.fn()}
          />
          <SessionList
            sessions={[]}
            selectedSession={null}
            onSelectSession={jest.fn()}
            autoScroll={false}
            onAutoScrollChange={jest.fn()}
          />
          <MessageDetailViewer session={null} onNavigateMessage={jest.fn()} />
        </div>
      );
      expect(getByText("Reset to Defaults")).toBeTruthy();
      expect(container.querySelector("[role='listbox']")).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });
});
