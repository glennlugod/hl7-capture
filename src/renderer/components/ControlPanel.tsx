import { Button } from "./ui/button";

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
    <div className="flex items-center gap-3">
      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onStartCapture}
          disabled={isCapturing}
          size="lg"
          className="bg-gradient-to-r from-teal-600 to-cyan-600 font-semibold shadow-lg shadow-teal-500/30 hover:from-teal-700 hover:to-cyan-700 hover:shadow-xl hover:shadow-teal-500/40 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none transition-all duration-200"
          aria-label="Start packet capture (Ctrl+S)"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start Capture
        </Button>

        <Button
          onClick={onStopCapture}
          disabled={!isCapturing}
          size="lg"
          variant="destructive"
          className="font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200"
          aria-label="Stop packet capture"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
          Stop
        </Button>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-slate-600/30" />

      {/* Secondary Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onPauseCapture}
          disabled={!isCapturing || isPaused}
          size="lg"
          variant="outline"
          className="border-amber-400 bg-amber-50 font-semibold text-amber-900 hover:bg-amber-100 hover:border-amber-500 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
          aria-label="Pause capture"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Pause
        </Button>

        <Button
          onClick={onResumeCapture}
          disabled={!isCapturing || !isPaused}
          size="lg"
          variant="outline"
          className="border-blue-400 bg-blue-50 font-semibold text-blue-900 hover:bg-blue-100 hover:border-blue-500 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
          aria-label="Resume capture"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Resume
        </Button>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-slate-600/30" />

      {/* Utility Actions */}
      <Button
        onClick={onClearSessions}
        disabled={isCapturing}
        size="lg"
        variant="outline"
        className="border-slate-400 bg-slate-50 font-semibold text-slate-900 hover:bg-slate-100 hover:border-slate-500 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
        aria-label="Clear all captured sessions (Ctrl+K)"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Clear Sessions
      </Button>
    </div>
  );
}
