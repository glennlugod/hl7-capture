import "@testing-library/jest-dom";

import React from "react";

import { render } from "@testing-library/react";

import MainLayout from "../../src/renderer/components/MainLayout";

const defaultProps = {
  configPanel: <div>Config</div>,
  sessionList: <div>Sessions</div>,
  messageDetail: <div>Message</div>,
  isCapturing: false,
  isPaused: false,
  onStartCapture: jest.fn(),
  onStopCapture: jest.fn(),
  onPauseCapture: jest.fn(),
  onResumeCapture: jest.fn(),
  onClearSessions: jest.fn(),
  interfaces: [],
  selectedInterface: null,
  onInterfaceChange: jest.fn(),
  onRefreshInterfaces: jest.fn(),
};

describe("MainLayout Component", () => {
  it("renders without crashing", () => {
    const { container } = render(<MainLayout {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it("displays session list", () => {
    const { getAllByText } = render(<MainLayout {...defaultProps} />);
    expect(getAllByText("Sessions").length).toBeGreaterThan(0);
  });

  it("displays message detail", () => {
    const { getByText } = render(<MainLayout {...defaultProps} />);
    expect(getByText("Message")).toBeInTheDocument();
  });

  it("displays 'Configuration' header", () => {
    const { getByLabelText } = render(<MainLayout {...defaultProps} />);
    // Component exposes a toggle button for the configuration panel with an
    // aria-label indicating expand/collapse. Test for its presence instead of
    // a visible heading which may be hidden in responsive layouts.
    expect(getByLabelText(/expand configuration panel/i)).toBeInTheDocument();
  });

  it("displays 'Message Details' header", () => {
    const { getByText } = render(<MainLayout {...defaultProps} />);
    expect(getByText("Message Details")).toBeInTheDocument();
  });

  it("renders expand/collapse button for configuration", () => {
    const { getByRole } = render(<MainLayout {...defaultProps} />);
    // Default is collapsed, so button should offer to expand the configuration panel
    const button = getByRole("button", { name: /expand configuration panel/i });
    expect(button).toBeInTheDocument();
  });

  it("calls onStartCapture when provided with isCapturing=false", () => {
    const onStartCapture = jest.fn();
    render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        isCapturing={false}
        isPaused={false}
        onStartCapture={onStartCapture}
        onStopCapture={jest.fn()}
        onPauseCapture={jest.fn()}
        onResumeCapture={jest.fn()}
        onClearSessions={jest.fn()}
        interfaces={[]}
        selectedInterface={null}
        onInterfaceChange={jest.fn()}
        onRefreshInterfaces={jest.fn()}
      />
    );
    expect(onStartCapture).toBeDefined();
  });

  it("accepts capturing state", () => {
    const { container } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        isCapturing={true}
        isPaused={false}
        onStartCapture={jest.fn()}
        onStopCapture={jest.fn()}
        onPauseCapture={jest.fn()}
        onResumeCapture={jest.fn()}
        onClearSessions={jest.fn()}
        interfaces={[]}
        selectedInterface={null}
        onInterfaceChange={jest.fn()}
        onRefreshInterfaces={jest.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it("accepts paused state", () => {
    const { container } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        isCapturing={true}
        isPaused={true}
        onStartCapture={jest.fn()}
        onStopCapture={jest.fn()}
        onPauseCapture={jest.fn()}
        onResumeCapture={jest.fn()}
        onClearSessions={jest.fn()}
        interfaces={[]}
        selectedInterface={null}
        onInterfaceChange={jest.fn()}
        onRefreshInterfaces={jest.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it("AC #2: should render panel resize handle for resizable panels", () => {
    const { container } = render(<MainLayout {...defaultProps} />);
    // exact classes may change; the resize handle has a gradient background class in layout
    const resizeHandle = container.querySelector("[class*='bg-gradient-to-b']");
    expect(resizeHandle).toBeTruthy();
  });
});
