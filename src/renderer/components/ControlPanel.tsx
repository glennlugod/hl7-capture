import React from 'react'

interface Props {
  isCapturing: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onClearSessions: () => void;
}

export default function ControlPanel({
  isCapturing,
  onStartCapture,
  onStopCapture,
  onClearSessions,
}: Readonly<Props>): JSX.Element {
  return (
    <div className="control-panel">
      <button onClick={onStartCapture} disabled={isCapturing} className="btn btn-primary">
        Start Capture
      </button>

      <button onClick={onStopCapture} disabled={!isCapturing} className="btn btn-danger">
        Stop Capture
      </button>

      <button onClick={onClearSessions} disabled={isCapturing} className="btn btn-secondary">
        Clear Sessions
      </button>
    </div>
  );
}
