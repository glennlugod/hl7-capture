import React, { useCallback, useEffect, useRef, useState } from "react";

import { HL7Session } from "../../common/types";

type SubmissionStatusFilter = "all" | "pending" | "submitted" | "failed" | "ignored";

interface SessionListProps {
  sessions: HL7Session[];
  selectedSession: HL7Session | null;
  onSelectSession: (session: HL7Session) => void;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
}

/**
 * Phase 6, AC 3: Status badge component for submission status display
 */
const StatusBadge: React.FC<{ status?: string; attempts?: number; submittedAt?: number }> = ({
  status,
  attempts = 0,
  submittedAt,
}) => {
  const getBadgeColor = (): string => {
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

  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return "";
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

  if (!status) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()}`}
      >
        {status}
      </span>
      {status !== "pending" && submittedAt && (
        <span className="text-xs text-slate-500">{formatRelativeTime(submittedAt)}</span>
      )}
      {attempts > 0 && status === "failed" && (
        <span className="text-xs text-slate-500">({attempts}x)</span>
      )}
    </div>
  );
};

// Performance optimization: memoized session item to prevent unnecessary re-renders
const SessionItem = React.memo(
  ({
    session,
    isSelected,
    index,
    onSelectSession,
    setFocusedIndex,
  }: {
    session: HL7Session;
    isSelected: boolean;
    index: number;
    onSelectSession: (session: HL7Session) => void;
    setFocusedIndex: (index: number) => void;
  }) => (
    <button
      onClick={() => {
        onSelectSession(session);
        setFocusedIndex(index);
      }}
      onFocus={() => setFocusedIndex(index)}
      className={`group relative w-full px-5 py-4 text-left transition-all duration-200 animate-fade-in ${
        isSelected
          ? "bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 shadow-md shadow-teal-500/20 border-l-4 border-teal-500"
          : "bg-white hover:bg-gradient-to-r hover:from-slate-50 hover:via-blue-50/30 hover:to-slate-50 hover:shadow-sm border-l-4 border-transparent"
      } focus:outline-2 focus:outline-teal-500 focus:outline-offset-0`}
      role="option"
      aria-selected={isSelected}
      aria-label={`Session ${session.sessionId} - ${new Date(session.startTime).toLocaleTimeString()}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full transition-all duration-200 ${
                isSelected
                  ? "bg-teal-500 shadow-lg shadow-teal-500/50"
                  : "bg-slate-300 group-hover:bg-slate-400"
              }`}
            />
            <span
              className={`font-semibold tracking-tight transition-colors ${
                isSelected ? "text-teal-900" : "text-slate-900"
              }`}
            >
              Session {session.sessionId}
            </span>
          </div>
          <span
            className={`text-xs font-medium transition-colors ${
              isSelected ? "text-teal-700" : "text-slate-500"
            }`}
          >
            {new Date(session.startTime).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-colors ${
                isSelected ? "text-teal-600" : "text-slate-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span
              className={`text-xs font-medium transition-colors ${
                isSelected ? "text-teal-700" : "text-slate-600"
              }`}
            >
              {session.messages.length} message{session.messages.length === 1 ? "" : "s"}
            </span>
          </div>
          {/* Phase 6, AC 1: Display submission status badge */}
          {session.submissionStatus && (
            <StatusBadge
              status={session.submissionStatus}
              attempts={session.submissionAttempts}
              submittedAt={session.submittedAt}
            />
          )}
        </div>
      </div>
    </button>
  )
);

SessionItem.displayName = "SessionItem";

export default function SessionList({
  sessions,
  selectedSession,
  onSelectSession,
  autoScroll,
  onAutoScrollChange,
}: Readonly<SessionListProps>): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  // Phase 6, AC 2: Filter state
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>("all");

  // Phase 6, AC 2: Filter sessions by submission status
  const filteredSessions = sessions.filter((session) => {
    if (statusFilter === "all") return true;
    return session.submissionStatus === statusFilter;
  });

  // Initialize auto-scroll preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("hl7-capture-autoscroll");
    if (stored !== null) {
      onAutoScrollChange(JSON.parse(stored));
    }
  }, [onAutoScrollChange]);

  // Auto-scroll using IntersectionObserver
  useEffect(() => {
    if (!autoScroll || sessions.length === 0 || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && listRef.current) {
          // Scroll to bottom
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      },
      { threshold: 0.8 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [autoScroll, sessions.length]);

  // Persist auto-scroll preference
  const handleAutoScrollChange = useCallback(
    (enabled: boolean) => {
      onAutoScrollChange(enabled);
      localStorage.setItem("hl7-capture-autoscroll", JSON.stringify(enabled));
    },
    [onAutoScrollChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (sessions.length === 0) return;

      let newIndex = focusedIndex;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, focusedIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(sessions.length - 1, focusedIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = sessions.length - 1;
          break;
        default:
          return;
      }

      setFocusedIndex(newIndex);
      onSelectSession(sessions[newIndex]);

      // Scroll focused item into view
      const item = listRef.current?.children[newIndex + 1] as HTMLElement; // +1 for header
      if (item) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [focusedIndex, sessions, onSelectSession]
  );

  return (
    <div
      ref={listRef}
      className="flex h-full flex-col overflow-hidden bg-white"
      role="listbox"
      aria-label="Captured HL7 sessions"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header with auto-scroll toggle and status filter */}
      <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3 shadow-sm space-y-3">
        {/* Auto-scroll toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => handleAutoScrollChange(e.target.checked)}
              className="sr-only peer"
              aria-label="Enable auto-scroll to new sessions"
            />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer-focus:ring-2 peer-focus:ring-teal-500 peer-focus:ring-offset-2 peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-cyan-500 transition-all duration-200 shadow-inner"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-md"></div>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-colors ${autoScroll ? "text-teal-600" : "text-slate-500"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            <span
              className={`text-sm font-medium transition-colors ${autoScroll ? "text-teal-900" : "text-slate-700"}`}
            >
              Auto-scroll
            </span>
          </div>
        </label>

        {/* Phase 6, AC 2: Status filter dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubmissionStatusFilter)}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
          >
            <option value="all">All Sessions</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="failed">Failed</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Session list with performance optimization via React.memo */}
      {sessions.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">No sessions captured</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">No sessions match the selected filter</p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-gray-200 overflow-y-auto" aria-live="polite">
          {filteredSessions.map((session, index) => (
            <SessionItem
              key={session.id}
              session={session}
              isSelected={selectedSession?.id === session.id}
              index={index}
              onSelectSession={onSelectSession}
              setFocusedIndex={setFocusedIndex}
            />
          ))}
        </div>
      )}

      {/* Sentinel for auto-scroll detection */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
    </div>
  );
}
