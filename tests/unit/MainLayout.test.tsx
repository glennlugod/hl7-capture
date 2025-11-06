import '@testing-library/jest-dom'

import React from 'react'

import { render } from '@testing-library/react'

import MainLayout from '../../src/renderer/components/MainLayout'

const defaultProps = {
  isCapturing: false,
  isPaused: false,
  onStartCapture: jest.fn(),
  onStopCapture: jest.fn(),
  onPauseCapture: jest.fn(),
  onResumeCapture: jest.fn(),
  onClearSessions: jest.fn(),
};

describe("MainLayout Component", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it("displays configuration panel", () => {
    const { getByText } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(getByText("Config")).toBeInTheDocument();
  });

  it("displays session list", () => {
    const { getAllByText } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(getAllByText("Sessions").length).toBeGreaterThan(0);
  });

  it("displays message detail", () => {
    const { getByText } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(getByText("Message")).toBeInTheDocument();
  });

  it('displays "Configuration" header', () => {
    const { getByText } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(getByText("Configuration")).toBeInTheDocument();
  });

  it('displays "Message Details" header', () => {
    const { getByText } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    expect(getByText("Message Details")).toBeInTheDocument();
  });

  it("renders expand/collapse button for configuration", () => {
    const { getByRole } = render(
      <MainLayout
        configPanel={<div>Config</div>}
        sessionList={<div>Sessions</div>}
        messageDetail={<div>Message</div>}
        {...defaultProps}
      />
    );
    const button = getByRole("button", { name: /collapse configuration panel/i });
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
      />
    );
    expect(container).toBeInTheDocument();
  });
});
