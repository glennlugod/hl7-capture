import React, { useEffect, useState } from "react";

import AdvancedOptions from "./Configuration/AdvancedOptions";
import InterfaceSelector from "./InterfaceSelector";

import type { NetworkInterface } from "../../common/types";

interface ConfigurationPanelProps {
  selectedInterface: string;
  onInterfaceChange: (name: string) => void;
  onStartCapture: () => Promise<void>;
  isCapturing?: boolean;
}

export default function ConfigurationPanel({
  selectedInterface,
  onInterfaceChange,
  onStartCapture,
  isCapturing = false,
}: Readonly<ConfigurationPanelProps>): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
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
      const ifaces = await window.electron.getNetworkInterfaces();
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

  const handleStartCapture = async (): Promise<void> => {
    setStatus("loading");
    setErrorMessage("");
    try {
      // Start capture directly; marker customization is out of scope per spec
      await onStartCapture();
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(`Failed to start capture: ${e?.message || String(e)}`);
      console.error("Start capture failed", e);
    }
  };

  const handleReset = () => {
    // Reset only advanced options; marker customization removed from UI
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
      {errorMessage && status === "error" && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 rounded">
          <p className="text-sm text-red-900">{errorMessage}</p>
        </div>
      )}

      {status === "success" && (
        <div className="border border-green-200 bg-green-50 p-3 rounded">
          <p className="text-sm text-green-900">✓ Configuration saved and capture started</p>
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

      {/* Marker customization removed from UI per tech-spec */}

      {/* Advanced Options */}
      <AdvancedOptions value={advancedConfig} onChange={setAdvancedConfig} disabled={isDisabled} />

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-slate-200">
        <button
          onClick={handleStartCapture}
          disabled={isDisabled || !selectedInterface || status === "loading"}
          className="flex-1 px-4 py-2 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          aria-label="Start packet capture with current configuration"
        >
          {status === "loading" ? "Starting..." : "Start Capture"}
        </button>

        <button
          onClick={handleReset}
          disabled={isDisabled}
          className="px-4 py-2 bg-slate-200 text-slate-900 font-medium rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Reset all settings to defaults"
        >
          Reset
        </button>
      </div>

      {/* Marker validation and unfiltered override removed (no marker UI) */}

      {!selectedInterface && (
        <p className="text-xs text-slate-600 italic">Select an interface to enable Start Capture</p>
      )}
    </div>
  );
}
