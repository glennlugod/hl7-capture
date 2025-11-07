import React, { useEffect, useState } from 'react'

import InterfaceSelector from './InterfaceSelector'
import MarkerConfigForm from './MarkerConfigForm'

import type { NetworkInterface, MarkerConfig } from "../../common/types";
export default function ConfigurationPanel(): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null);
  const [markerConfig, setMarkerConfig] = useState<MarkerConfig>({
    startMarker: 5,
    acknowledgeMarker: 6,
    endMarker: 4,
    sourceIP: "",
    destinationIP: "",
  });
  const [status, setStatus] = useState<string>("");

  const loadInterfaces = async () => {
    try {
      const ifaces = await (globalThis as any).electron.getNetworkInterfaces();
      setInterfaces(ifaces);
      if (ifaces.length > 0) setSelectedInterface(ifaces[0].name);
      return ifaces;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed loading interfaces", e);
      return [] as NetworkInterface[];
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadInterfaces();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStart = async () => {
    setStatus("starting");
    try {
      await (globalThis as any).electron.startCapture(selectedInterface, { markers: markerConfig });
      setStatus("started");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("startCapture failed", e);
      setStatus("error");
    }
  };

  const [presetName, setPresetName] = useState("");

  const handleSavePreset = async () => {
    try {
      await (globalThis as any).electron.saveMarkerConfig({
        name: presetName,
        markers: markerConfig,
      });
      setStatus("preset-saved");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("savePreset failed", e);
      setStatus("error");
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Configuration Panel</h3>

      <div className="space-y-4">
        <InterfaceSelector
          interfaces={interfaces}
          selected={selectedInterface}
          onSelect={(v) => setSelectedInterface(Array.isArray(v) ? v[0] : v)}
          onRefresh={loadInterfaces}
          disabled={false}
        />

        <MarkerConfigForm
          initial=""
          onChange={(v) => {
            // MarkerConfigForm currently returns a string; keep it for now
            // If the form produces structured data, convert here
            setMarkerConfig((prev) => ({ ...prev, sourceIP: v }));
          }}
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleStart}
            disabled={!selectedInterface}
            className="inline-flex items-center px-4 py-2 rounded-md bg-teal-600 text-white"
          >
            Start Capture
          </button>
          <span aria-live="polite">{status}</span>
        </div>

        <div className="mt-4">
          <label htmlFor="preset-name" className="block text-sm font-medium">
            Preset name
          </label>
          <div className="flex gap-2 mt-1">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 rounded-md border px-2"
              placeholder="My HL7 Preset"
              aria-label="preset-name"
            />
            <button
              onClick={handleSavePreset}
              className="px-3 py-2 rounded-md bg-slate-700 text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
