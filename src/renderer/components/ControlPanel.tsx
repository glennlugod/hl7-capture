import React from "react";

interface Props {
  isCapturing: boolean;
  isPaused: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onPauseCapture: () => void;
  onResumeCapture: () => void;
  onClearPackets: () => void;
}

export default function ControlPanel({
  isCapturing,
  isPaused,
  onStartCapture,
  onStopCapture,
  onPauseCapture,
  onResumeCapture,
  onClearPackets,
}: Readonly<Props>): JSX.Element {
  return (
    <div className="control-panel">
      <button onClick={onStartCapture} disabled={isCapturing} className="btn btn-primary">
        Start Capture
      </button>

      <button onClick={onStopCapture} disabled={!isCapturing} className="btn btn-danger">
        Stop Capture
      </button>

      <button
        onClick={isPaused ? onResumeCapture : onPauseCapture}
        disabled={!isCapturing}
        className="btn btn-warning"
      >
        {isPaused ? "Resume" : "Pause"}
      </button>

      <button onClick={onClearPackets} disabled={isCapturing} className="btn btn-secondary">
        Clear Packets
      </button>
    </div>
  );
}
