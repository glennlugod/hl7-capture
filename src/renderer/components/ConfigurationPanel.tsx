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

  const isDisabled = isCapturing;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300/40 bg-gradient-to-r from-red-50/80 to-orange-50/60 p-4 shadow-sm backdrop-blur-sm"
        >
          <p className="text-sm font-medium text-red-900">⚠️ {errorMessage}</p>
        </div>
      )}

      {/* Status Messages */}
      {errorMessage && !loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300/40 bg-gradient-to-r from-red-50/80 to-orange-50/60 p-4 shadow-sm backdrop-blur-sm"
        >
          <p className="text-sm text-red-900">{errorMessage}</p>
        </div>
      )}

      {/* Interface Selector */}
      <div className="rounded-lg border border-slate-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Network Interface</h3>
        <InterfaceSelector
          interfaces={interfaces}
          selected={selectedInterface}
          onSelect={onInterfaceChange}
          onRefresh={loadInterfaces}
          disabled={isDisabled}
        />
      </div>

      {/* HL7 Marker Configuration */}
      <div className="rounded-lg border border-slate-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">HL7 Markers</h3>
        <HL7MarkerConfig value={markerConfig} onChange={onConfigChange} disabled={isDisabled} />
      </div>

      {/* Advanced Options */}
      <div className="rounded-lg border border-slate-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
        <AdvancedOptions
          value={advancedConfig}
          onChange={setAdvancedConfig}
          disabled={isDisabled}
        />
      </div>

      {!selectedInterface && (
        <p className="text-xs text-slate-500">Select an interface to enable capture</p>
      )}
    </div>
  );
}
