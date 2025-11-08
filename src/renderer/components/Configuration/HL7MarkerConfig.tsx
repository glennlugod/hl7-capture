import React, { useCallback, useEffect, useState } from 'react'

import { normalizeHexMarker, validateMarkerConfig } from '../../../lib/utils/markerValidation'

import type { MarkerConfig } from "../../../common/types";

interface Props {
  value: MarkerConfig;
  onChange: (config: MarkerConfig) => void;
  disabled?: boolean;
}

export default function HL7MarkerConfig({
  value,
  onChange,
  disabled = false,
}: Readonly<Props>): JSX.Element {
  const [startMarkerInput, setStartMarkerInput] = useState(
    formatMarkerForDisplay(value.startMarker)
  );
  const [ackMarkerInput, setAckMarkerInput] = useState(
    formatMarkerForDisplay(value.acknowledgeMarker)
  );
  const [endMarkerInput, setEndMarkerInput] = useState(formatMarkerForDisplay(value.endMarker));
  const [sourceIP, setSourceIP] = useState(value.sourceIP);
  const [destinationIP, setDestinationIP] = useState(value.destinationIP);
  const [errors, setErrors] = useState<string[]>([]);

  // Validate on every change
  useEffect(() => {
    const validation = validateMarkerConfig({
      startMarker: startMarkerInput,
      acknowledgeMarker: ackMarkerInput,
      endMarker: endMarkerInput,
      sourceIP,
      destinationIP,
    });

    setErrors(validation.errors);
  }, [startMarkerInput, ackMarkerInput, endMarkerInput, sourceIP, destinationIP]);

  function formatMarkerForDisplay(marker: number): string {
    return `0x${marker.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  const handleMarkerChange = useCallback(
    (
      input: string,
      setInput: React.Dispatch<React.SetStateAction<string>>,
      field: "startMarker" | "acknowledgeMarker" | "endMarker"
    ) => {
      setInput(input);

      // Parse and normalize
      const normalized = normalizeHexMarker(input);
      if (normalized) {
        const numValue = parseInt(normalized, 16);
        onChange({
          ...value,
          [field]: numValue,
        });
      }
    },
    [value, onChange]
  );

  const handleIPChange = useCallback(
    (ip: string, field: "sourceIP" | "destinationIP") => {
      const newConfig = {
        ...value,
        [field]: ip,
      };
      onChange(newConfig);

      if (field === "sourceIP") {
        setSourceIP(ip);
      } else {
        setDestinationIP(ip);
      }
    },
    [value, onChange]
  );

  const handleReset = () => {
    const defaultConfig: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      sourceIP: "",
      destinationIP: "",
    };
    onChange(defaultConfig);
    setStartMarkerInput(formatMarkerForDisplay(0x05));
    setAckMarkerInput(formatMarkerForDisplay(0x06));
    setEndMarkerInput(formatMarkerForDisplay(0x04));
    setSourceIP("");
    setDestinationIP("");
  };

  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">HL7 Marker Configuration</h3>
        <p className="text-xs text-slate-600 mb-3">
          Configure the byte markers used to identify HL7 protocol messages. Default: Start=0x05,
          Ack=0x06, End=0x04
        </p>
      </div>

      {/* Marker Byte Inputs */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="start-marker" className="block text-sm font-medium text-slate-700 mb-1">
            Start Marker
          </label>
          <input
            id="start-marker"
            type="text"
            value={startMarkerInput}
            onChange={(e) => handleMarkerChange(e.target.value, setStartMarkerInput, "startMarker")}
            disabled={disabled}
            placeholder="0x05"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono disabled:bg-slate-100"
            aria-label="Start marker (hex byte)"
            aria-describedby="marker-help"
          />
          <p className="text-xs text-slate-500 mt-1">Device transmission start</p>
        </div>

        <div>
          <label htmlFor="ack-marker" className="block text-sm font-medium text-slate-700 mb-1">
            Acknowledge Marker
          </label>
          <input
            id="ack-marker"
            type="text"
            value={ackMarkerInput}
            onChange={(e) =>
              handleMarkerChange(e.target.value, setAckMarkerInput, "acknowledgeMarker")
            }
            disabled={disabled}
            placeholder="0x06"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono disabled:bg-slate-100"
            aria-label="Acknowledge marker (hex byte)"
          />
          <p className="text-xs text-slate-500 mt-1">PC acknowledgment</p>
        </div>

        <div>
          <label htmlFor="end-marker" className="block text-sm font-medium text-slate-700 mb-1">
            End Marker
          </label>
          <input
            id="end-marker"
            type="text"
            value={endMarkerInput}
            onChange={(e) => handleMarkerChange(e.target.value, setEndMarkerInput, "endMarker")}
            disabled={disabled}
            placeholder="0x04"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono disabled:bg-slate-100"
            aria-label="End marker (hex byte)"
          />
          <p className="text-xs text-slate-500 mt-1">Transmission end</p>
        </div>
      </div>

      {/* IP Filters */}
      <div className="border-t border-slate-200 pt-3">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Capture Filters (Optional)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="source-ip" className="block text-sm font-medium text-slate-700 mb-1">
              Source IP (Medical Device)
            </label>
            <input
              id="source-ip"
              type="text"
              value={sourceIP}
              onChange={(e) => handleIPChange(e.target.value, "sourceIP")}
              disabled={disabled}
              placeholder="e.g. 192.168.1.100"
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm disabled:bg-slate-100"
              aria-label="Source IP address"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to capture all sources</p>
          </div>

          <div>
            <label htmlFor="dest-ip" className="block text-sm font-medium text-slate-700 mb-1">
              Destination IP (LIS/PC)
            </label>
            <input
              id="dest-ip"
              type="text"
              value={destinationIP}
              onChange={(e) => handleIPChange(e.target.value, "destinationIP")}
              disabled={disabled}
              placeholder="e.g. 192.168.1.50"
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm disabled:bg-slate-100"
              aria-label="Destination IP address"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to capture all destinations</p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 rounded">
          <p className="text-sm font-medium text-red-900 mb-1">Validation Errors:</p>
          <ul className="text-sm text-red-800 list-disc list-inside space-y-0.5">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Indicator */}
      {!hasErrors && (
        <div className="border border-green-200 bg-green-50 p-2 rounded flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-800">Configuration is valid</span>
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={handleReset}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Reset markers to default values"
      >
        Reset to Defaults
      </button>

      <p id="marker-help" className="text-xs text-slate-600">
        Enter hex values as: <code className="bg-slate-100 px-1 rounded">05</code>,{" "}
        <code className="bg-slate-100 px-1 rounded">0x05</code>, or{" "}
        <code className="bg-slate-100 px-1 rounded">5</code>
      </p>
    </div>
  );
}
