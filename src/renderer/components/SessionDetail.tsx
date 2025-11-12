import React, { useState } from "react";

import type { HL7Session } from "../../common/types";

interface SessionDetailProps {
  session: HL7Session | null;
  onRetry?: (sessionId: string) => void;
  onIgnore?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onClose?: () => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  onRetry,
  onIgnore,
  onDelete,
  onClose,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isIgnored, setIsIgnored] = useState(session?.submissionStatus === "ignored");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-6">
        <p className="text-sm text-gray-500">Select a session to view details</p>
      </div>
    );
  }

  const handleIgnoreToggle = () => {
    if (onIgnore) {
      setIsIgnoring(true);
      try {
        onIgnore(session.id);
        setIsIgnored(!isIgnored);
      } finally {
        setIsIgnoring(false);
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        onDelete(session.id);
        setShowDeleteConfirm(false);
        onClose?.();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        onRetry(session.id);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return "N/A";
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-900";
      case "submitted":
        return "bg-green-100 text-green-900";
      case "failed":
        return "bg-red-100 text-red-900";
      case "ignored":
        return "bg-gray-100 text-gray-900";
      default:
        return "bg-slate-100 text-slate-900";
    }
  };

  const isRetryDisabled =
    !session.submissionStatus ||
    session.submissionStatus === "submitted" ||
    session.submissionStatus === "ignored" ||
    isRetrying;

  return (
    <div className="flex h-full flex-col bg-white transition-all duration-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-900">Session Details</h2>
            <p className="truncate text-sm text-slate-500">Session ID: {session.sessionId}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center flex-shrink-0 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Close detail panel"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Session Information</h3>
          <div className="space-y-2 rounded-lg bg-slate-50 p-4 transition-colors duration-150">
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Start Time:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {formatDate(session.startTime)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">End Time:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {formatDate(session.endTime)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Device IP:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {session.deviceIP}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">LIS IP:</span>
              <span className="text-sm font-medium text-slate-900 text-right">{session.lisIP}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Messages:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {session.messages?.length || 0}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Status:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {session.isComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Submission Status</h3>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4 transition-colors duration-150">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600">Status:</span>
              {session.submissionStatus ? (
                <div className="inline-flex items-center gap-2">
                  {isRetrying && (
                    <svg
                      className="h-4 w-4 animate-spin text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-label="Loading"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${getStatusColor(session.submissionStatus)}`}
                  >
                    {session.submissionStatus}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">Unknown</span>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Attempts:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {session.submissionAttempts || 0}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Last Submitted:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {formatRelativeTime(session.submittedAt)}
              </span>
            </div>
            {session.submissionError && (
              <div className="rounded bg-red-50 p-3 transition-colors duration-150 border border-red-200">
                <p className="text-xs font-medium text-red-900 mb-1">Last Error:</p>
                <p className="text-xs text-red-800 break-words">{session.submissionError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Retention</h3>
          <div className="rounded-lg bg-slate-50 p-4 transition-colors duration-150">
            <div className="flex justify-between gap-2">
              <span className="text-sm text-slate-600">Expires:</span>
              <span className="text-sm font-medium text-slate-900 text-right">
                {formatDate(session.persistedUntil)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="space-y-2">
          <button
            onClick={handleRetry}
            disabled={isRetryDisabled}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isRetryDisabled
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
            title={
              isRetryDisabled ? "Retry not available for this session status" : "Retry submission"
            }
            aria-busy={isRetrying}
          >
            {isRetrying && (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            Retry Submission
          </button>

          <button
            onClick={handleIgnoreToggle}
            disabled={isIgnoring}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isIgnored
                ? "bg-amber-100 text-amber-900 hover:bg-amber-200 active:bg-amber-300 focus:ring-amber-500 disabled:opacity-50"
                : "bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 focus:ring-slate-500 disabled:opacity-50"
            }`}
            aria-busy={isIgnoring}
          >
            {isIgnored ? "Unignore Session" : "Ignore Session"}
          </button>

          {showDeleteConfirm ? (
            <div className="space-y-2 rounded-lg bg-red-50 p-4 border border-red-200 transition-all duration-150">
              <p className="text-sm font-medium text-red-900">
                Are you sure you want to delete this session?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-1"
                  aria-busy={isDeleting}
                >
                  {isDeleting && (
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-400 active:bg-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-lg bg-red-100 px-4 py-2.5 text-sm font-medium text-red-900 hover:bg-red-200 active:bg-red-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
