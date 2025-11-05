import React from 'react'

interface Props {
  isCapturing: boolean;
  interface: string;
  sessionCount: number;
}

export default function StatusBar({
  isCapturing,
  interface: interfaceName,
  sessionCount,
}: Readonly<Props>): JSX.Element {
  const statusText = isCapturing ? "Capturing" : "Idle";

  return (
    <footer className="status-bar">
      <div className="status-item">
        <span className="label">Status:</span>
        <span className={`status-value status-${statusText.toLowerCase()}`}>{statusText}</span>
      </div>
      <div className="status-item">
        <span className="label">Interface:</span>
        <span className="status-value">{interfaceName || "None"}</span>
      </div>
      <div className="status-item">
        <span className="label">Sessions:</span>
        <span className="status-value">{sessionCount}</span>
      </div>
    </footer>
  );
}
