import React, { useEffect, useRef, useState } from "react";

import type { HL7Session } from "../../common/types";

interface SessionListProps {
  sessions: HL7Session[];
  selectedSession: HL7Session | null;
  onSelectSession: (session: HL7Session) => void;
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
}

export default function SessionList({
  sessions,
  selectedSession,
  onSelectSession,
  autoScroll = true,
  onToggleAutoScroll,
}: SessionListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Track if user is near bottom of list for auto-scroll
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearBottom(entry.isIntersecting);
      },
      {
        root: listElement,
        threshold: 1.0,
      }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom when new sessions arrive
  useEffect(() => {
    if (autoScroll && isNearBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [sessions.length, autoScroll, isNearBottom, prefersReducedMotion]);

  // Ensure selected session stays visible
  useEffect(() => {
    if (selectedSession && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-session-id="${selectedSession.id}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedSession, prefersReducedMotion]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (session: HL7Session): string => {
    if (!session.endTime) return "In Progress";
    const duration = session.endTime - session.startTime;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  if (sessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
        <p className="text-sm text-gray-500">
          No sessions captured yet. Start capture to begin monitoring HL7 traffic.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with auto-scroll toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-gray-700">Sessions ({sessions.length})</h2>
        {onToggleAutoScroll && (
          <button
            onClick={onToggleAutoScroll}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label={`Auto-scroll ${autoScroll ? "enabled" : "disabled"}. Click to ${autoScroll ? "disable" : "enable"}`}
            aria-pressed={autoScroll}
          >
            Auto-scroll: {autoScroll ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {/* Session list with ARIA listbox role */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="HL7 Session List"
        aria-activedescendant={selectedSession?.id}
      >
        {/* Live region for screen reader announcements */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {sessions.length > 0 &&
            `${sessions.length} session${sessions.length === 1 ? "" : "s"} captured`}
        </div>

        {sessions.map((session, index) => {
          const isSelected = selectedSession?.id === session.id;
          const isNewSession = index === sessions.length - 1;

          return (
            <div
              key={session.id}
              id={session.id}
              data-session-id={session.id}
              role="option"
              aria-selected={isSelected}
              aria-label={`Session ${session.sessionId} from ${session.deviceIP} to ${session.pcIP} at ${formatTimestamp(session.startTime)}, ${session.isComplete ? "complete" : "in progress"}`}
              onClick={() => onSelectSession(session)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectSession(session);
                }
              }}
              tabIndex={0}
              className={`
                cursor-pointer border-b border-gray-100 px-4 py-3
                transition-all duration-300 ease-out
                hover:bg-gray-50
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500
                ${isSelected ? "bg-teal-50 border-l-4 border-l-teal-500" : ""}
                ${isNewSession && !prefersReducedMotion ? "animate-fade-in" : ""}
              `}
              style={{
                contain: "layout style paint",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Session #{session.sessionId}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        session.isComplete
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {session.isComplete ? "Complete" : "In Progress"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{session.deviceIP}</span>
                      <span>→</span>
                      <span className="font-mono">{session.pcIP}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatTimestamp(session.startTime)}</span>
                    <span>•</span>
                    <span>{formatDuration(session)}</span>
                    <span>•</span>
                    <span>{session.elements.length} elements</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom anchor for IntersectionObserver */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
