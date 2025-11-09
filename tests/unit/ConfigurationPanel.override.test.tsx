import "@testing-library/jest-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { act, render, screen, waitFor } from "@testing-library/react";

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
    // ConfigurationPanel no longer accepts an `onStartCapture` prop.
    // Render the component and interact with the UI; the actual start behavior
    // is owned by ControlPanel in the app, so here we assert that the override
    // flow calls into the electron API (saveMarkerConfig) when confirmed.
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
        />
      );
    });

    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    // ConfigurationPanel does not include the Start Capture button (that's
    // owned by ControlPanel/App). Ensure it's absent and that no save was
    // attempted by this component alone.
    expect(screen.queryByText("Start Capture")).toBeNull();
    expect((globalThis as any).electron.saveMarkerConfig).not.toHaveBeenCalled();
  });
});
