import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import InterfaceSelector from '../../src/renderer/components/InterfaceSelector'

const mockIfaces = [
  { name: "eth0", ip: "192.168.1.10", mac: "aa:bb:cc:dd", address: "192.168.1.10" },
  { name: "wlan0", ip: "10.0.0.5", mac: "11:22:33:44", address: "10.0.0.5" },
];

describe("InterfaceSelector", () => {
  it("renders provided interfaces and calls onSelectInterface when changed", () => {
    const onSelect = jest.fn();
    const onRefresh = jest.fn();

    render(
      <InterfaceSelector
        interfaces={mockIfaces as any}
        selected={mockIfaces[0].name}
        onSelect={onSelect}
        onRefresh={onRefresh}
        disabled={false}
      />
    );

    // options present
    const select = screen.getByLabelText(/Network Interface:/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(2);

    // change selection
    fireEvent.change(select, { target: { value: "wlan0" } });
    expect(onSelect).toHaveBeenCalledWith("wlan0");
  });
});
