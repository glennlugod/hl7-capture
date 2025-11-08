import "@testing-library/jest-dom";

import React from "react";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import ConfigurationPanel from "../../src/renderer/components/ConfigurationPanel";

describe("ConfigurationPanel override flow", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      getNetworkInterfaces: jest.fn().mockResolvedValue([{ name: "eth0" }]),
      startCapture: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    delete (globalThis as any).electron;
  });

  it("starts capture when Start is clicked", async () => {
    const mockStart = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <ConfigurationPanel
          selectedInterface="eth0"
          onInterfaceChange={jest.fn()}
          onStartCapture={mockStart}
        />
      );
    });

    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    const startBtn = screen.getByText("Start Capture");
    fireEvent.click(startBtn);

    // Confirm that onStartCapture was invoked
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
  });
});
