import React, { useEffect, useState } from 'react'

import MarkerConfigForm from './Configuration/MarkerConfigForm'
import InterfaceSelector from './InterfaceSelector'

import type { NetworkInterface, Marker } from "../../common/types";

export default function ConfigurationPanel(): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loadError, setLoadError] = useState<boolean>(false);

  // Marker presets
  const [presets, setPresets] = useState<Marker[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [currentMarker, setCurrentMarker] = useState<Marker>({
    id: "",
    name: "",
    type: "string",
    pattern: "",
    caseSensitive: false,
    active: true,
  });

  // Load network interfaces
  const loadInterfaces = async (): Promise<NetworkInterface[]> => {
    try {
      const ifaces: NetworkInterface[] = await (window as any).electron.getNetworkInterfaces();
      setLoadError(false);
      setInterfaces(ifaces);
      if (ifaces.length > 0) setSelectedInterface(ifaces[0].name);
      return ifaces;
    } catch (e) {
      console.error("Failed loading interfaces", e);
      setLoadError(true);
      return [];
    }
  };

  // Load marker presets from persistence
  const loadPresets = async (): Promise<void> => {
    try {
      const p: Marker[] = await (window as any).electron.loadPresets();
      setPresets(p);
      if (p.length > 0) {
        const first = p[0];
        setSelectedPresetId(first.id);
        setCurrentMarker(first);
      }
    } catch (e) {
      console.error("Failed loading presets", e);
    }
  };

  useEffect(() => {
    loadInterfaces();
    loadPresets();
  }, []);

  // Handle saving a marker preset
  const handleSaveMarker = async (marker: Marker): Promise<void> => {
    try {
      await (window as any).electron.savePreset(marker);
      setStatus("preset-saved");
      await loadPresets();
    } catch (e) {
      console.error("savePreset failed", e);
      setStatus("error");
    }
  };

  // Handle deleting a marker preset
  const handleDeleteMarker = async (id: string): Promise<void> => {
    try {
      await (window as any).electron.deletePreset(id);
      setStatus("preset-deleted");
      await loadPresets();
    } catch (e) {
      console.error("deletePreset failed", e);
      setStatus("error");
    }
  };

  // Handle preset selection
  const handlePresetSelect = (id: string): void => {
    setSelectedPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setCurrentMarker(preset);
    }
  };

  // Start capture action
  const handleStart = async (): Promise<void> => {
    setStatus("starting");
    try {
      await (window as any).electron.startCapture(selectedInterface, { markers: currentMarker });
      setStatus("started");
    } catch (e: any) {
      console.error("startCapture failed", e);
      setStatus("error");
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Configuration Panel</h3>
      <div className="space-y-4">
        {loadError && (
          <div role="alert" className="text-red-600">
            Failed to load network interfaces. Please ensure pcap is installed.
          </div>
        )}
        <InterfaceSelector
          interfaces={interfaces}
          selected={selectedInterface}
          onSelect={(v) => setSelectedInterface(Array.isArray(v) ? v[0] : v)}
          onRefresh={loadInterfaces}
          disabled={false}
        />
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Marker Presets</label>
          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="w-full rounded border px-2 py-1"
          >
            <option value="">-- New Marker --</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <MarkerConfigForm
          marker={currentMarker}
          onChange={setCurrentMarker}
          onSave={handleSaveMarker}
          onDelete={currentMarker.id ? handleDeleteMarker : undefined}
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
      </div>
    </div>
  );
}
