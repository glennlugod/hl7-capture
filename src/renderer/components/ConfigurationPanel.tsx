import React, { useEffect, useState } from "react";

import AdvancedOptions from "./Configuration/AdvancedOptions";
import HL7MarkerConfig from "./Configuration/HL7MarkerConfig";
import InterfaceSelector from "./InterfaceSelector";

import type { NetworkInterface, MarkerConfig } from "../../common/types";

interface ConfigurationPanelProps {
  selectedInterface: string;
  markerConfig: MarkerConfig;
  onInterfaceChange: (name: string) => void;
  onConfigChange: (config: MarkerConfig) => void;
  isCapturing?: boolean;
}

export default function ConfigurationPanel({
  selectedInterface,
  markerConfig,
  onInterfaceChange,
  onConfigChange,
  isCapturing = false,
}: Readonly<ConfigurationPanelProps>): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [advancedConfig, setAdvancedConfig] = useState({
    snaplen: 65535,
    bpfOverride: "",
    bufferSize: 100,
  });

  // Load network interfaces on mount and refresh
  const loadInterfaces = async (): Promise<NetworkInterface[]> => {
    try {
      setLoadError(false);
      const electronApi = (
        globalThis as unknown as {
          electron: { getNetworkInterfaces: () => Promise<NetworkInterface[]> };
        }
      ).electron;
      const ifaces = await electronApi.getNetworkInterfaces();
      setInterfaces(ifaces);
      if (ifaces.length > 0 && !selectedInterface) {
        onInterfaceChange(ifaces[0].name);
      }
      return ifaces;
    } catch (e) {
      console.error("Failed loading interfaces", e);
      setLoadError(true);
      setErrorMessage("Failed to load network interfaces. Ensure pcap/npcap is installed.");
      return [];
    }
  };

  useEffect(() => {
    loadInterfaces();
  }, []);

  // Note: start-capture behavior moved to `ControlPanel`. ConfigurationPanel only manages
  // configuration, interfaces, and reset functionality.

  const handleReset = () => {
    const defaultConfig: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      sourceIP: "",
      destinationIP: "",
    };
    onConfigChange(defaultConfig);
    setAdvancedConfig({
      snaplen: 65535,
      bpfOverride: "",
      bufferSize: 100,
    });
  };

  const isDisabled = isCapturing;

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {loadError && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 rounded">
          <p className="text-sm text-red-900">⚠️ {errorMessage}</p>
        </div>
      )}

      {/* Status Messages */}
      {errorMessage && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 rounded">
          <p className="text-sm text-red-900">{errorMessage}</p>
        </div>
      )}

      {/* Interface Selector */}
      <InterfaceSelector
        interfaces={interfaces}
        selected={selectedInterface}
        onSelect={onInterfaceChange}
        onRefresh={loadInterfaces}
        disabled={isDisabled}
      />

      {/* HL7 Marker Configuration */}
      <HL7MarkerConfig value={markerConfig} onChange={onConfigChange} disabled={isDisabled} />

      {/* Advanced Options */}
      <AdvancedOptions value={advancedConfig} onChange={setAdvancedConfig} disabled={isDisabled} />

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-slate-200">
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className="px-4 py-2 bg-slate-200 text-slate-900 font-medium rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Reset all settings to defaults"
        >
          Reset
        </button>
      </div>

      {!selectedInterface && (
        <p className="text-xs text-slate-600 italic">Select an interface to enable capture</p>
      )}
    </div>
  );
}
