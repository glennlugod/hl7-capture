import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import InterfaceSelector from "../../src/renderer/components/InterfaceSelector";

const mockIfaces = [
  { index: -1, name: "eth0", ip: "192.168.1.10", mac: "aa:bb:cc:dd", address: "192.168.1.10" },
  { index: -1, name: "wlan0", ip: "10.0.0.5", mac: "11:22:33:44", address: "10.0.0.5" },
];

describe("InterfaceSelector", () => {
  it("renders provided interfaces and calls onSelectInterface when changed", () => {
    const onSelect = jest.fn();
    const onRefresh = jest.fn();

    render(
      <InterfaceSelector
        interfaces={mockIfaces as any}
        selected={mockIfaces[0]}
        onSelect={onSelect}
        onRefresh={onRefresh}
        disabled={false}
      />
    );

    // options present
    const select = screen.getByLabelText(/Network Interface:/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    // includes the placeholder option + provided interfaces
    expect(select.options.length).toBe(3);

    // change selection
    fireEvent.change(select, { target: { value: "wlan0" } });
    // onSelect receives the resolved interface object (or name); assert object
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "wlan0" }));
  });
});
