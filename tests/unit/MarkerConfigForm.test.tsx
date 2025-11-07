import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import MarkerConfigForm from '../../src/renderer/components/MarkerConfigForm'

describe("MarkerConfigForm", () => {
  beforeEach(() => {
    (globalThis as any).electron = {
      validateMarkerConfig: jest.fn(),
    };
  });

  it("shows Valid when validateMarkerConfig resolves true", async () => {
    (globalThis as any).electron.validateMarkerConfig.mockResolvedValue(true);
    render(<MarkerConfigForm />);

    const input = screen.getByLabelText("marker-bytes") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0x0b,0x1c" } });

    const btn = screen.getByText("Validate");
    fireEvent.click(btn);

    await waitFor(() => expect(screen.queryByText("Valid")).not.toBeNull());
  });

  it("shows Invalid when validateMarkerConfig resolves false", async () => {
    (globalThis as any).electron.validateMarkerConfig.mockResolvedValue(false);
    render(<MarkerConfigForm />);

    const input = screen.getByLabelText("marker-bytes") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bad" } });

    const btn = screen.getByText("Validate");
    fireEvent.click(btn);

    await waitFor(() => expect(screen.queryByText("Invalid")).not.toBeNull());
  });
});
