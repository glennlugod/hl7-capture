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
  onStartCapture: () => Promise<void>;
  isCapturing?: boolean;
}

export default function ConfigurationPanel({
  selectedInterface,
  markerConfig,
  onInterfaceChange,
  onConfigChange,
  onStartCapture,
  isCapturing = false,
}: Readonly<ConfigurationPanelProps>): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

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
      // Validate configuration before starting
      const isValid = await window.electron.validateMarkerConfig(markerConfig);
      if (!isValid) {
        setStatus("error");
        setErrorMessage("Invalid marker configuration. Please review errors above.");
        // Show explicit override modal to allow starting unfiltered if user confirms
        setShowOverrideModal(true);
        return;
      }

      // Save configuration
      await window.electron.saveMarkerConfig(markerConfig);

      // Start capture
      await onStartCapture();
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(`Failed to start capture: ${e?.message || String(e)}`);
      console.error("Start capture failed", e);
    }
  };

  const performStartCapture = async (): Promise<void> => {
    setStatus("loading");
    setErrorMessage("");
    try {
      await window.electron.saveMarkerConfig(markerConfig);
      await onStartCapture();
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(`Failed to start capture: ${e?.message || String(e)}`);
      console.error("Start capture failed", e);
    }
  };

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

      {/* HL7 Marker Configuration */}
      <HL7MarkerConfig value={markerConfig} onChange={onConfigChange} disabled={isDisabled} />

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

      {/* Override Modal */}
      {showOverrideModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="bg-white border rounded p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Start unfiltered capture?</h3>
            <p className="text-sm text-slate-700 mb-4">
              Marker validation failed. Starting an unfiltered capture may capture large amounts of
              unrelated traffic. Are you sure you want to proceed?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-2 bg-slate-200 rounded"
                aria-label="Cancel start unfiltered"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowOverrideModal(false);
                  await performStartCapture();
                }}
                className="px-3 py-2 bg-rose-600 text-white rounded"
                aria-label="Start unfiltered"
              >
                Start unfiltered
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedInterface && (
        <p className="text-xs text-slate-600 italic">Select an interface to enable Start Capture</p>
      )}
    </div>
  );
}
