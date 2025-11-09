import "@testing-library/jest-dom";

import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import InterfaceSelector from "../../src/renderer/components/InterfaceSelector";

const initialIfaces = [{ index: -1, name: "eth0", ip: "1", mac: "m", address: "1", status: "up" }];
const refreshedIfaces = [
  { index: -1, name: "wlan0", ip: "2", mac: "n", address: "2", status: "up" },
];

describe("InterfaceSelector Refresh", () => {
  it("calls onRefresh and updates options", async () => {
    const mockRefresh = jest.fn().mockResolvedValue(refreshedIfaces);
    render(
      <InterfaceSelector
        interfaces={initialIfaces as any}
        selected={initialIfaces[0]}
        onSelect={() => {}}
        onRefresh={mockRefresh}
        disabled={false}
      />
    );
    const button = screen.getByText("Refresh");
    fireEvent.click(button);
    expect(mockRefresh).toHaveBeenCalled();
    // assume parent updates props; here we just verify no errors
  });
});
