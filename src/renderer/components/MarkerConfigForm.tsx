import React, { useState } from 'react'

type Props = Readonly<{
  initial?: string;
  onChange?: (value: string) => void;
}>;

export default function MarkerConfigForm({ initial = "", onChange }: Props): JSX.Element {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);

  const handleValidate = async () => {
    setError(null);
    try {
      // call preload IPC
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const ok = await (globalThis as any).electron.validateMarkerConfig({ markers: value });
      setValid(Boolean(ok));
      if (!ok) setError("Validation failed");
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setValid(false);
    }
  };

  return (
    <div className="marker-config-form">
      <label htmlFor="marker-bytes" className="block text-sm font-medium text-slate-700">
        Marker bytes
      </label>
      <input
        id="marker-bytes"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
          setValid(null);
          setError(null);
        }}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        placeholder="e.g. 0x0b,0x1c"
        aria-label="marker-bytes"
      />

      <div className="mt-2 flex gap-2">
        <button type="button" onClick={handleValidate} className="btn-primary">
          Validate
        </button>
        {valid && <span className="text-green-600">Valid</span>}
        {valid === false && <span className="text-red-600">Invalid</span>}
      </div>

      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
