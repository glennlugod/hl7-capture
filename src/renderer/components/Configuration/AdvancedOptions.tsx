import React, { useCallback, useEffect, useState } from 'react'

import { isValidBufferSize, isValidSnaplen } from '../../../lib/utils/markerValidation'

interface AdvancedConfig {
  snaplen: number;
  bpfOverride: string;
  bufferSize: number;
}

interface Props {
  value: AdvancedConfig;
  onChange: (config: AdvancedConfig) => void;
  disabled?: boolean;
}

export default function AdvancedOptions({
  value,
  onChange,
  disabled = false,
}: Readonly<Props>): JSX.Element {
  const [snaplen, setSnaplen] = useState(String(value.snaplen));
  const [bpfOverride, setBpfOverride] = useState(value.bpfOverride);
  const [bufferSize, setBufferSize] = useState(String(value.bufferSize));
  const [errors, setErrors] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Validate on every change
  useEffect(() => {
    const newErrors: string[] = [];

    const snaplenNum = parseInt(snaplen, 10);
    if (!isNaN(snaplenNum) && !isValidSnaplen(snaplenNum)) {
      newErrors.push("Snaplen must be between 256 and 65535");
    } else if (isNaN(snaplenNum)) {
      newErrors.push("Snaplen must be a valid number");
    }

    const bufferSizeNum = parseInt(bufferSize, 10);
    if (!isNaN(bufferSizeNum) && !isValidBufferSize(bufferSizeNum)) {
      newErrors.push("Buffer size must be between 10 and 5000");
    } else if (isNaN(bufferSizeNum)) {
      newErrors.push("Buffer size must be a valid number");
    }

    // Basic BPF validation (just check for obvious syntax errors)
    if (
      bpfOverride &&
      bpfOverride.trim() &&
      bpfOverride.includes("(") &&
      !bpfOverride.includes(")")
    ) {
      newErrors.push("BPF: unmatched parentheses");
    }

    setErrors(newErrors);

    // Update parent config if valid
    const snaplenNum2 = parseInt(snaplen, 10);
    const bufferSizeNum2 = parseInt(bufferSize, 10);
    if (
      !isNaN(snaplenNum2) &&
      isValidSnaplen(snaplenNum2) &&
      !isNaN(bufferSizeNum2) &&
      isValidBufferSize(bufferSizeNum2)
    ) {
      onChange({
        snaplen: snaplenNum2,
        bpfOverride,
        bufferSize: bufferSizeNum2,
      });
    }
  }, [snaplen, bpfOverride, bufferSize, onChange]);

  const handleResetAdvanced = useCallback(() => {
    setSnaplen("65535");
    setBufferSize("100");
    setBpfOverride("");
  }, []);

  const hasErrors = errors.length > 0;

  return (
    <div className="border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-expanded={expanded}
      >
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        Advanced Options
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 pl-4 border-l border-slate-200">
          {/* Snaplen */}
          <div>
            <label htmlFor="snaplen" className="block text-sm font-medium text-slate-700 mb-1">
              Snapshot Length (Snaplen)
            </label>
            <input
              id="snaplen"
              type="number"
              value={snaplen}
              onChange={(e) => setSnaplen(e.target.value)}
              disabled={disabled}
              placeholder="65535"
              min="256"
              max="65535"
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm disabled:bg-slate-100"
              aria-label="Snapshot length in bytes"
              aria-describedby="snaplen-help"
            />
            <p id="snaplen-help" className="text-xs text-slate-500 mt-1">
              Maximum bytes to capture per packet (256-65535). Default: 65535
            </p>
          </div>

          {/* BPF Override */}
          <div>
            <label htmlFor="bpf-override" className="block text-sm font-medium text-slate-700 mb-1">
              BPF Filter Override (Optional)
            </label>
            <textarea
              id="bpf-override"
              value={bpfOverride}
              onChange={(e) => setBpfOverride(e.target.value)}
              disabled={disabled}
              placeholder="e.g. tcp and host 192.168.1.100"
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono disabled:bg-slate-100 h-20"
              aria-label="Berkeley Packet Filter override"
              aria-describedby="bpf-help"
            />
            <p id="bpf-help" className="text-xs text-slate-500 mt-1">
              <span className="text-yellow-700 font-semibold">⚠️ Warning:</span> Custom BPF
              overrides the generated filter. Use carefully. Leave empty for default filtering.
            </p>
          </div>

          {/* Buffer Size */}
          <div>
            <label htmlFor="buffer-size" className="block text-sm font-medium text-slate-700 mb-1">
              Session Buffer Size
            </label>
            <input
              id="buffer-size"
              type="number"
              value={bufferSize}
              onChange={(e) => setBufferSize(e.target.value)}
              disabled={disabled}
              placeholder="100"
              min="10"
              max="5000"
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm disabled:bg-slate-100"
              aria-label="Maximum number of sessions to keep in memory"
              aria-describedby="buffer-help"
            />
            <p id="buffer-help" className="text-xs text-slate-500 mt-1">
              Maximum HL7 sessions to keep in memory (10-5000). Default: 100. Oldest sessions are
              dropped when limit reached.
            </p>
          </div>

          {/* Validation Errors */}
          {hasErrors && (
            <div role="alert" className="border border-red-200 bg-red-50 p-2 rounded">
              <p className="text-xs font-medium text-red-900 mb-1">Advanced Options Errors:</p>
              <ul className="text-xs text-red-800 list-disc list-inside space-y-0.5">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Reset Advanced Button */}
          <button
            type="button"
            onClick={handleResetAdvanced}
            disabled={disabled}
            className="w-full px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Reset advanced options to defaults"
          >
            Reset Advanced to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
