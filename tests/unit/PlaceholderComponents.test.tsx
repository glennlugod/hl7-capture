import '@testing-library/jest-dom'

import React from 'react'

import { render } from '@testing-library/react'

import ConfigurationPanel from '../../src/renderer/components/ConfigurationPanel'
import MessageDetailViewer from '../../src/renderer/components/MessageDetailViewer'
import SessionList from '../../src/renderer/components/SessionList'

describe("Placeholder Components", () => {
  describe("AC #4: Placeholder Custom Component Creation", () => {
    describe("ConfigurationPanel", () => {
      it("should render placeholder without errors", () => {
        const { getByText } = render(<ConfigurationPanel />);
        expect(getByText("Configuration Panel Placeholder")).toBeInTheDocument();
      });
    });

    describe("SessionList", () => {
      it("should render placeholder without errors", () => {
        const { getByText } = render(<SessionList />);
        expect(getByText("Session List Placeholder")).toBeInTheDocument();
      });
    });

    describe("MessageDetailViewer", () => {
      it("should render placeholder without errors", () => {
        const { getByText } = render(<MessageDetailViewer />);
        expect(getByText("Message Detail Viewer Placeholder")).toBeInTheDocument();
      });
    });
  });

  describe("AC #5: Component Integration into Layout", () => {
    it("should render all placeholder components", () => {
      const { getByText } = render(
        <div>
          <ConfigurationPanel />
          <SessionList />
          <MessageDetailViewer />
        </div>
      );
      expect(getByText("Configuration Panel Placeholder")).toBeInTheDocument();
      expect(getByText("Session List Placeholder")).toBeInTheDocument();
      expect(getByText("Message Detail Viewer Placeholder")).toBeInTheDocument();
    });
  });
});
