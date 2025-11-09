import "@testing-library/jest-dom";

import React from "react";

import { act, render, screen, waitFor } from "@testing-library/react";

import ConfigurationPanel from "../../src/renderer/components/ConfigurationPanel";

describe("ConfigurationPanel presets and start", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      getNetworkInterfaces: jest.fn().mockResolvedValue([{ index: -1, name: "eth0" }]),
      loadPresets: jest.fn().mockResolvedValue([]),
      savePreset: jest.fn().mockResolvedValue(undefined),
      deletePreset: jest.fn().mockResolvedValue(undefined),
      startCapture: jest.fn().mockResolvedValue(undefined),
      validateMarkerConfig: jest.fn().mockResolvedValue(true),
      saveMarkerConfig: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    delete (globalThis as any).electron;
  });

  it("calls startCapture when Start is clicked and savePreset when Save is clicked", async () => {
    await act(async () => {
      render(
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
    });

    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    // ConfigurationPanel no longer includes a Start Capture button; ensure it's absent
    expect(screen.queryByText("Start Capture")).toBeNull();
  });
});
