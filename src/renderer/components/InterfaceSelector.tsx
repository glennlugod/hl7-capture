import React from "react";

import type { NetworkInterface } from "@common/types";

interface Props {
  interfaces: NetworkInterface[];
  selected: NetworkInterface | null;
  onSelect: (iface: NetworkInterface | null) => void;
  onRefresh?: () => Promise<NetworkInterface[]> | void;
  disabled?: boolean;
}

export default function InterfaceSelector({
  interfaces,
  selected,
  onSelect,
  onRefresh,
  disabled = false,
}: Readonly<Props>): JSX.Element {
  const getDisplayName = (iface: NetworkInterface): string => {
    const idx = iface.index !== undefined && iface.index >= 0 ? `${iface.index}.` : "";
    return idx ? `${idx} ${iface.name}` : iface.name;
  };

  return (
    <div className="interface-selector">
      <div className="interface-selection">
        <label htmlFor="interface-select">Network Interface:</label>
        <div className="flex items-center gap-2">
          <select
            id="interface-select"
            value={selected?.name ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              const iface = interfaces.find((i) => i.name === name) || null;
              onSelect(iface);
            }}
            disabled={disabled}
            aria-label="Network Interface"
          >
            <option value="">Select an interface</option>
            {interfaces.map((iface) => (
              <option key={iface.name} value={iface.name}>
                {getDisplayName(iface)}
              </option>
            ))}
          </select>

          {onRefresh && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await onRefresh();
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error("Refresh failed", e);
                }
              }}
              className="ml-2 px-2 py-1 rounded bg-slate-200"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
