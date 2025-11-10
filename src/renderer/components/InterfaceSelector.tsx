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
    let name = iface.name;
    const parenMatch = /\((.*)\)/.exec(iface.name);
    if (parenMatch) {
      name = parenMatch[1];
    }
    const idx = iface.index !== undefined && iface.index >= 0 ? `${iface.index}.` : "";
    return idx ? `${idx} ${name}` : name;
  };

  return (
    <div className="flex items-center gap-2">
      <select
        id="interface-select"
        className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
