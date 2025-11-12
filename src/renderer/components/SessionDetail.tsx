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

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-6">
        <p className="text-sm text-gray-500">Select a session to view details</p>
      </div>
    );
  }

  const handleIgnoreToggle = () => {
    if (onIgnore) {
      onIgnore(session.id);
      setIsIgnored(!isIgnored);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(session.id);
      setShowDeleteConfirm(false);
      onClose?.();
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
    session.submissionStatus === "ignored";

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Session Details</h2>
            <p className="text-sm text-slate-500">Session ID: {session.sessionId}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close detail panel"
            >
              X
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Session Information</h3>
          <div className="space-y-2 rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Start Time:</span>
              <span className="text-sm font-medium text-slate-900">
                {formatDate(session.startTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">End Time:</span>
              <span className="text-sm font-medium text-slate-900">
                {formatDate(session.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Device IP:</span>
              <span className="text-sm font-medium text-slate-900">{session.deviceIP}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">LIS IP:</span>
              <span className="text-sm font-medium text-slate-900">{session.lisIP}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Messages:</span>
              <span className="text-sm font-medium text-slate-900">
                {session.messages?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Status:</span>
              <span className="text-sm font-medium text-slate-900">
                {session.isComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Submission Status</h3>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status:</span>
              {session.submissionStatus && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.submissionStatus)}`}
                >
                  {session.submissionStatus}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Attempts:</span>
              <span className="text-sm font-medium text-slate-900">
                {session.submissionAttempts || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Last Submitted:</span>
              <span className="text-sm font-medium text-slate-900">
                {formatRelativeTime(session.submittedAt)}
              </span>
            </div>
            {session.submissionError && (
              <div className="rounded bg-red-50 p-3">
                <p className="text-xs font-medium text-red-900">Last Error:</p>
                <p className="mt-1 text-xs text-red-800">{session.submissionError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Retention</h3>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Expires:</span>
              <span className="text-sm font-medium text-slate-900">
                {formatDate(session.persistedUntil)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
        <div className="space-y-2">
          <button
            onClick={() => onRetry?.(session.id)}
            disabled={isRetryDisabled}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isRetryDisabled
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            title={
              isRetryDisabled ? "Retry not available for this session status" : "Retry submission"
            }
          >
            Retry Submission
          </button>

          <button
            onClick={handleIgnoreToggle}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isIgnored
                ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                : "bg-slate-200 text-slate-900 hover:bg-slate-300"
            }`}
          >
            {isIgnored ? "Unignore Session" : "Ignore Session"}
          </button>

          {showDeleteConfirm ? (
            <div className="space-y-2 rounded-lg bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">
                Are you sure you want to delete this session?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 transition-colors"
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
