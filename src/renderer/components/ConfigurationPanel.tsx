import React, { useEffect, useState } from 'react'

import InterfaceSelector from './InterfaceSelector'
import MarkerConfigForm from './MarkerConfigForm'

import type { NetworkInterface } from "../../common/types";
export default function ConfigurationPanel(): JSX.Element {
  const [interfaces, setInterfaces] = useState<Array<{ name: string }>>([]);
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null);
  const [markerConfig, setMarkerConfig] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ifaces = await (globalThis as any).electron.getNetworkInterfaces();
        if (!mounted) return;
        setInterfaces(ifaces);
        if (ifaces.length > 0) setSelectedInterface(ifaces[0].name);
      } catch (e) {
        // log but do not crash tests
        // eslint-disable-next-line no-console
        console.error("Failed loading interfaces", e);
      }
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
          interfaces={interfaces as NetworkInterface[]}
          selectedInterface={selectedInterface ?? ""}
          onSelectInterface={(v: string) => setSelectedInterface(v)}
          isCapturing={false}
          markerConfig={{
            startMarker: 5,
            acknowledgeMarker: 6,
            endMarker: 4,
            sourceIP: "",
            destinationIP: "",
          }}
          onUpdateConfig={() => {}}
        />

        <MarkerConfigForm initial="" onChange={(v) => setMarkerConfig(v)} />

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
