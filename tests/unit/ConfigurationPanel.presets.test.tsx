import '@testing-library/jest-dom'

import React from 'react'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import ConfigurationPanel from '../../src/renderer/components/ConfigurationPanel'

describe("ConfigurationPanel presets and start", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      getNetworkInterfaces: jest.fn().mockResolvedValue([{ name: "eth0" }]),
      loadPresets: jest.fn().mockResolvedValue([]),
      savePreset: jest.fn().mockResolvedValue(undefined),
      deletePreset: jest.fn().mockResolvedValue(undefined),
      startCapture: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    delete (globalThis as any).electron;
  });

  it("calls startCapture when Start is clicked and savePreset when Save is clicked", async () => {
    await act(async () => {
      render(<ConfigurationPanel />);
    });

    await waitFor(() =>
      expect((globalThis as any).electron.getNetworkInterfaces).toHaveBeenCalled()
    );

    const startBtn = screen.getByText("Start Capture");
    fireEvent.click(startBtn);
    await waitFor(() =>
      expect((globalThis as any).electron.startCapture).toHaveBeenCalledWith("eth0", {
        markers: expect.any(Object),
      })
    );

    const presetInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(presetInput, { target: { value: "my-preset" } });

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);
    await waitFor(() =>
      expect((globalThis as any).electron.savePreset).toHaveBeenCalledWith(
        expect.objectContaining({ name: "my-preset" })
      )
    );
  });
});
