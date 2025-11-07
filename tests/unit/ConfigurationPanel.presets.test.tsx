import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import ConfigurationPanel from '../../src/renderer/components/ConfigurationPanel'

describe("ConfigurationPanel presets and start", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      getNetworkInterfaces: jest.fn().mockResolvedValue([{ name: "eth0" }]),
      startCapture: jest.fn().mockResolvedValue(undefined),
      saveMarkerConfig: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("calls startCapture when Start is clicked and saveMarkerConfig when Save is clicked", async () => {
    render(<ConfigurationPanel />);

    // wait for interfaces to load and button to be enabled
    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    const startBtn = screen.getByText("Start Capture");
    fireEvent.click(startBtn);

    await waitFor(() => expect((globalThis as any).electron.startCapture).toHaveBeenCalled());

    const input = screen.getByLabelText("preset-name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "my-preset" } });

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => expect((globalThis as any).electron.saveMarkerConfig).toHaveBeenCalled());
  });
});
