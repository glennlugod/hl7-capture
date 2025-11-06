import React from 'react'

interface Props {
  isCapturing: boolean;
  isPaused: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onPauseCapture: () => void;
  onResumeCapture: () => void;
  onClearSessions: () => void;
}

export default function ControlPanel({
  isCapturing,
  isPaused,
  onStartCapture,
  onStopCapture,
  onPauseCapture,
  onResumeCapture,
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

      <button
        onClick={onPauseCapture}
        disabled={!isCapturing || isPaused}
        className="btn btn-warning"
      >
        Pause
      </button>

      <button
        onClick={onResumeCapture}
        disabled={!isCapturing || !isPaused}
        className="btn btn-info"
      >
        Resume
      </button>

      <button onClick={onClearSessions} disabled={isCapturing} className="btn btn-secondary">
        Clear Sessions
      </button>
    </div>
  );
}
