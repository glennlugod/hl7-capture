import React from "react";

interface Props {
  isCapturing: boolean;
  isPaused: boolean;
  interface: string;
  packetCount: number;
}

export default function StatusBar({
  isCapturing,
  isPaused,
  interface: interfaceName,
  packetCount,
}: Readonly<Props>): JSX.Element {
  let statusText: string;
  if (isCapturing) {
    statusText = isPaused ? "Paused" : "Capturing";
  } else {
    statusText = "Idle";
  }

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
        <span className="label">Packets:</span>
        <span className="status-value">{packetCount}</span>
      </div>
    </footer>
  );
}
