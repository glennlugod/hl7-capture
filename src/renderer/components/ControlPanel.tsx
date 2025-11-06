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
    <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 p-4">
      <button
        onClick={onStartCapture}
        disabled={isCapturing}
        className="h-11 w-full rounded bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:bg-gray-300 focus:outline-2 focus:outline-teal-500 focus:outline-offset-0"
        aria-label="Start packet capture (Ctrl+S)"
      >
        Start Capture
      </button>

      <button
        onClick={onStopCapture}
        disabled={!isCapturing}
        className="h-11 w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-gray-300 focus:outline-2 focus:outline-teal-500 focus:outline-offset-0"
        aria-label="Stop packet capture"
      >
        Stop Capture
      </button>

      <button
        onClick={onPauseCapture}
        disabled={!isCapturing || isPaused}
        className="h-11 w-full rounded bg-yellow-600 px-4 py-2 font-medium text-white hover:bg-yellow-700 disabled:bg-gray-300 focus:outline-2 focus:outline-teal-500 focus:outline-offset-0"
        aria-label="Pause capture"
      >
        Pause
      </button>

      <button
        onClick={onResumeCapture}
        disabled={!isCapturing || !isPaused}
        className="h-11 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 focus:outline-2 focus:outline-teal-500 focus:outline-offset-0"
        aria-label="Resume capture"
      >
        Resume
      </button>

      <button
        onClick={onClearSessions}
        disabled={isCapturing}
        className="h-11 w-full rounded bg-gray-500 px-4 py-2 font-medium text-white hover:bg-gray-600 disabled:bg-gray-300 focus:outline-2 focus:outline-teal-500 focus:outline-offset-0"
        aria-label="Clear all captured sessions (Ctrl+K)"
      >
        Clear Sessions
      </button>
    </div>
  );
}
