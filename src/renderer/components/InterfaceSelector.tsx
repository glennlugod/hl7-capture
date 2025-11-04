import React from "react";

import type { NetworkInterface } from "@common/types";

interface Props {
  interfaces: NetworkInterface[];
  selectedInterface: string;
  onSelectInterface: (name: string) => void;
  isCapturing: boolean;
}

export default function InterfaceSelector({
  interfaces,
  selectedInterface,
  onSelectInterface,
  isCapturing,
}: Readonly<Props>): JSX.Element {
  // Helper function to get friendly display name
  const getDisplayName = (iface: NetworkInterface): string => {
    // The 'mac' field now contains the description/friendly name
    const friendlyName = iface.mac;
    const ip = iface.ip;

    // Show description and IP address
    return `${friendlyName} (${ip})`;
  };

  return (
    <div className="interface-selector">
      <label htmlFor="interface-select">Network Interface:</label>
      <select
        id="interface-select"
        value={selectedInterface}
        onChange={(e) => onSelectInterface(e.target.value)}
        disabled={isCapturing}
      >
        {interfaces.map((iface) => (
          <option key={iface.name} value={iface.name}>
            {getDisplayName(iface)}
          </option>
        ))}
      </select>
    </div>
  );
}
