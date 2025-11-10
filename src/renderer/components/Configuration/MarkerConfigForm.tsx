import React, { useEffect, useState } from "react";

import type { Marker } from "@common/types";

type Props = {
  marker?: Marker;
  onChange: (marker: Marker) => void;
  onSave: (marker: Marker) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function MarkerConfigForm({
  marker,
  onChange,
  onSave,
  onDelete,
}: Props): JSX.Element {
  const [localMarker, setLocalMarker] = useState<Marker>(
    marker ?? {
      id: "",
      name: "",
      type: "string",
      pattern: "",
      caseSensitive: false,
      active: true,
    }
  );
  const [sample, setSample] = useState<string>("");
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChange(localMarker);
  }, [localMarker, onChange]);

  useEffect(() => {
    setError(null);
    let re: RegExp;
    if (localMarker.type === "hex") {
      if (localMarker.pattern && !/^[0-9A-Fa-f]+$/.test(localMarker.pattern)) {
        setError("Invalid hex format");
        setMatches([]);
        return;
      }
      const esc = localMarker.pattern.replace(/[.*+?^${}()|[\\\]\\]/g, "\\$&");
      re = new RegExp(esc, "gi");
    } else {
      try {
        if (localMarker.type === "regex") {
          re = new RegExp(localMarker.pattern, localMarker.caseSensitive ? "g" : "gi");
        } else {
          const esc = localMarker.pattern.replace(/[.*+?^${}()|[\\\]\\]/g, "\\$&");
          re = new RegExp(esc, localMarker.caseSensitive ? "g" : "gi");
        }
      } catch {
        setError("Invalid regex pattern");
        setMatches([]);
        return;
      }
    }
    const found = sample.match(re);
    setMatches(found ?? []);
  }, [sample, localMarker.pattern, localMarker.type, localMarker.caseSensitive]);

  const handleFieldChange = <K extends keyof Marker>(field: K, value: Marker[K]) => {
    setLocalMarker((prev: Marker) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="marker-config-form p-4 border rounded">
      <h4 className="font-semibold mb-2">Marker Configuration</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="marker-name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="marker-name"
            type="text"
            value={localMarker.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="marker-type" className="block text-sm font-medium">
            Type
          </label>
          <select
            id="marker-type"
            aria-label="Type"
            value={localMarker.type}
            onChange={(e) => handleFieldChange("type", e.target.value as Marker["type"])}
            className="w-full rounded border px-2 py-1"
          >
            <option value="string">String</option>
            <option value="regex">Regex</option>
            <option value="hex">Hex</option>
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="marker-pattern" className="block text-sm font-medium">
            Pattern
          </label>
          <input
            id="marker-pattern"
            aria-label="Pattern"
            type="text"
            value={localMarker.pattern}
            onChange={(e) => handleFieldChange("pattern", e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={localMarker.caseSensitive}
              onChange={(e) => handleFieldChange("caseSensitive", e.target.checked)}
              className="mr-2"
            />
            Case Sensitive
          </label>
        </div>
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={localMarker.active}
              onChange={(e) => handleFieldChange("active", e.target.checked)}
              className="mr-2"
            />
            Active
          </label>
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="marker-sample" className="block text-sm font-medium">
          Sample Payload for Preview
        </label>
        <textarea
          id="marker-sample"
          aria-label="Sample Payload for Preview"
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="w-full h-24 rounded border px-2 py-1"
        />
        {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
        <div className="mt-2 text-sm">
          <strong>Matches:</strong> {matches.length > 0 ? matches.join(", ") : "None"}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSave(localMarker)}
          disabled={Boolean(error)}
          className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
        >
          Save
        </button>
        {onDelete && localMarker.id && (
          <button
            onClick={() => onDelete(localMarker.id)}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
