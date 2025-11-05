import React from 'react'

import type { NetworkInterface, MarkerConfig } from "@common/types";

interface Props {
  interfaces: NetworkInterface[];
  selectedInterface: string;
  onSelectInterface: (name: string) => void;
  isCapturing: boolean;
  markerConfig: MarkerConfig;
  onUpdateConfig: (updates: Partial<MarkerConfig>) => void;
}

export default function InterfaceSelector({
  interfaces,
  selectedInterface,
  onSelectInterface,
  isCapturing,
  markerConfig,
  onUpdateConfig,
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
      <div className="interface-selection">
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

      <div className="marker-config">
        <h3>HL7 Marker Configuration</h3>
        <div className="config-row">
          <label htmlFor="start-marker">Start Marker (hex):</label>
          <input
            id="start-marker"
            type="text"
            value={`0x${markerConfig.startMarker.toString(16).padStart(2, "0")}`}
            onChange={(e) => {
              const value = parseInt(e.target.value, 16);
              if (!isNaN(value)) onUpdateConfig({ startMarker: value });
            }}
            disabled={isCapturing}
          />
        </div>
        <div className="config-row">
          <label htmlFor="ack-marker">Acknowledge Marker (hex):</label>
          <input
            id="ack-marker"
            type="text"
            value={`0x${markerConfig.acknowledgeMarker.toString(16).padStart(2, "0")}`}
            onChange={(e) => {
              const value = parseInt(e.target.value, 16);
              if (!isNaN(value)) onUpdateConfig({ acknowledgeMarker: value });
            }}
            disabled={isCapturing}
          />
        </div>
        <div className="config-row">
          <label htmlFor="end-marker">End Marker (hex):</label>
          <input
            id="end-marker"
            type="text"
            value={`0x${markerConfig.endMarker.toString(16).padStart(2, "0")}`}
            onChange={(e) => {
              const value = parseInt(e.target.value, 16);
              if (!isNaN(value)) onUpdateConfig({ endMarker: value });
            }}
            disabled={isCapturing}
          />
        </div>
        <div className="config-row">
          <label htmlFor="source-ip">Device IP:</label>
          <input
            id="source-ip"
            type="text"
            placeholder="192.168.1.100"
            value={markerConfig.sourceIP}
            onChange={(e) => onUpdateConfig({ sourceIP: e.target.value })}
            disabled={isCapturing}
          />
        </div>
        <div className="config-row">
          <label htmlFor="dest-ip">LIS PC IP:</label>
          <input
            id="dest-ip"
            type="text"
            placeholder="192.168.1.200"
            value={markerConfig.destinationIP}
            onChange={(e) => onUpdateConfig({ destinationIP: e.target.value })}
            disabled={isCapturing}
          />
        </div>
      </div>
    </div>
  );
}
