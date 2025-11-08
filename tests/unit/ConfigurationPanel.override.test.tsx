import "@testing-library/jest-dom";

import React from "react";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import ConfigurationPanel from "../../src/renderer/components/ConfigurationPanel";

describe("ConfigurationPanel override flow", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      getNetworkInterfaces: jest.fn().mockResolvedValue([{ name: "eth0" }]),
      validateMarkerConfig: jest.fn().mockResolvedValue(false), // invalid config
      saveMarkerConfig: jest.fn().mockResolvedValue(undefined),
      startCapture: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    delete (globalThis as any).electron;
  });

  it("shows override modal when validation fails and starts capture when confirmed", async () => {
    const mockStart = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <ConfigurationPanel
          selectedInterface="eth0"
          markerConfig={{
            startMarker: 0x05,
            acknowledgeMarker: 0x06,
            endMarker: 0x04,
            sourceIP: "",
            destinationIP: "",
          }}
          onInterfaceChange={jest.fn()}
          onConfigChange={jest.fn()}
          onStartCapture={mockStart}
        />
      );
    });

    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    const startBtn = screen.getByText("Start Capture");
    fireEvent.click(startBtn);

    // Wait for override modal to appear
    await waitFor(() =>
      expect(screen.getByText(/Start unfiltered capture\?/i)).toBeInTheDocument()
    );

    const confirmBtn = screen.getByRole("button", { name: /^Start unfiltered$/i });
    fireEvent.click(confirmBtn);

    // Confirm that saveMarkerConfig and onStartCapture were invoked
    await waitFor(() => expect((globalThis as any).electron.saveMarkerConfig).toHaveBeenCalled());
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
  });
});
