import React, { useCallback, useEffect, useRef, useState } from 'react'

import { HL7Session } from '../../common/types'

interface SessionListProps {
  sessions: HL7Session[];
  selectedSession: HL7Session | null;
  onSelectSession: (session: HL7Session) => void;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
}

export default function SessionList({
  sessions,
  selectedSession,
  onSelectSession,
  autoScroll,
  onAutoScrollChange,
}: SessionListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

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
      const item = listRef.current?.children[newIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [focusedIndex, sessions, onSelectSession]
  );

  return (
    <div
      ref={listRef}
      className="flex h-full flex-col overflow-y-auto bg-white"
      role="listbox"
      aria-label="Captured HL7 sessions"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Auto-scroll toggle */}
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => handleAutoScrollChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-2 focus:ring-teal-500"
            aria-label="Enable auto-scroll to new sessions"
          />
          <span className="text-sm font-medium text-gray-700">Auto-scroll</span>
        </label>
      </div>

      {/* Session list */}
      <div
        className="flex-1 divide-y divide-gray-200"
        role="presentation"
        aria-live="polite"
        aria-label="Session list content"
      >
        {sessions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">No sessions captured</p>
          </div>
        ) : (
          sessions.map((session, index) => (
            <button
              key={session.id}
              onClick={() => {
                onSelectSession(session);
                setFocusedIndex(index);
              }}
              onFocus={() => setFocusedIndex(index)}
              className={`w-full px-4 py-3 text-left transition-colors animate-fade-in ${
                selectedSession?.id === session.id
                  ? "bg-teal-50 ring-2 ring-teal-500"
                  : "bg-white hover:bg-gray-50"
              } focus:ring-2 focus:ring-teal-500 focus:ring-offset-0`}
              aria-selected={selectedSession?.id === session.id}
              role="option"
              aria-label={`Session ${session.sessionId} - ${new Date(session.startTime).toLocaleTimeString()}`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Session {session.sessionId}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(session.startTime).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{session.messages.length} messages</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Sentinel for auto-scroll detection */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
    </div>
  );
}
