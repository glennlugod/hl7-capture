import React, { useState } from "react";

import AdvancedOptions from "./Configuration/AdvancedOptions";
import HL7MarkerConfig from "./Configuration/HL7MarkerConfig";

import type { MarkerConfig } from "../../common/types";

interface ConfigurationPanelProps {
  markerConfig: MarkerConfig;
  onConfigChange: (config: MarkerConfig) => void;
  isCapturing?: boolean;
}

export default function ConfigurationPanel({
  markerConfig,
  onConfigChange,
  isCapturing = false,
}: Readonly<ConfigurationPanelProps>): JSX.Element {
  const [advancedConfig, setAdvancedConfig] = useState({
    snaplen: 65535,
    bpfOverride: "",
    bufferSize: 100,
  });

  const isDisabled = isCapturing;

  return (
    <div className="space-y-6">
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
    </div>
  );
}
