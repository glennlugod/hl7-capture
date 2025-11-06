import React, { useEffect, useState } from "react";

import type { HL7Session } from "../../common/types";

interface MessageDetailViewerProps {
  session: HL7Session | null;
}

type ViewMode = "hex" | "decoded";

export default function MessageDetailViewer({ session }: MessageDetailViewerProps): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>("decoded");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);

  // Reset view when session changes
  useEffect(() => {
    setSelectedMessageIndex(0);
  }, [session?.id]);

  // Keyboard navigation for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key: Switch between Hex/Decoded views (when message viewer is focused)
      if (e.key === "Tab" && session && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        const isInMessageViewer = activeElement?.closest('[data-component="message-viewer"]');

        if (isInMessageViewer) {
          e.preventDefault();
          setViewMode((prev) => (prev === "hex" ? "decoded" : "hex"));
        }
      }

      // Arrow Left/Right: Navigate between messages
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && session) {
        const activeElement = document.activeElement;
        const isInMessageViewer = activeElement?.closest('[data-component="message-viewer"]');

        if (isInMessageViewer && session.messages.length > 1) {
          e.preventDefault();
          if (e.key === "ArrowLeft") {
            setSelectedMessageIndex((prev) => (prev > 0 ? prev - 1 : session.messages.length - 1));
          } else {
            setSelectedMessageIndex((prev) => (prev < session.messages.length - 1 ? prev + 1 : 0));
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session]);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
        <p className="text-sm text-gray-500">
          Select a session from the list to view message details
        </p>
      </div>
    );
  }

  const formatHexData = (data: string): string => {
    // Format hex data in rows of 16 bytes
    const bytes = data.match(/.{1,2}/g) || [];
    const rows: string[] = [];

    for (let i = 0; i < bytes.length; i += 16) {
      const rowBytes = bytes.slice(i, i + 16);
      const hex = rowBytes.join(" ");
      const ascii = rowBytes
        .map((byte) => {
          const code = parseInt(byte, 16);
          return code >= 32 && code <= 126 ? String.fromCharCode(code) : ".";
        })
        .join("");

      rows.push(`${i.toString(16).padStart(4, "0")}  ${hex.padEnd(48, " ")}  ${ascii}`);
    }

    return rows.join("\n");
  };

  const currentMessage = session.messages[selectedMessageIndex] || "";
  const currentElement = session.elements.find(
    (e) => e.type === "message" && e.content === currentMessage
  );

  return (
    <div className="flex h-full flex-col" data-component="message-viewer" tabIndex={-1}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">Message Details</h2>
        <p className="mt-1 text-xs text-gray-500">
          Session #{session.sessionId} • {session.messages.length} message
          {session.messages.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Message navigation (if multiple messages) */}
      {session.messages.length > 1 && (
        <div className="border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Message {selectedMessageIndex + 1} of {session.messages.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedMessageIndex((prev) =>
                    prev > 0 ? prev - 1 : session.messages.length - 1
                  )
                }
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Previous message"
              >
                ← Prev
              </button>
              <button
                onClick={() =>
                  setSelectedMessageIndex((prev) =>
                    prev < session.messages.length - 1 ? prev + 1 : 0
                  )
                }
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Next message"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View mode tabs */}
      <div className="border-b border-gray-200 px-4" role="tablist" aria-label="Message view modes">
        <div className="flex gap-4">
          <button
            role="tab"
            aria-selected={viewMode === "decoded"}
            aria-controls="decoded-panel"
            id="decoded-tab"
            onClick={() => setViewMode("decoded")}
            className={`
              border-b-2 px-2 py-2 text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500
              ${
                viewMode === "decoded"
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }
            `}
          >
            Decoded
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "hex"}
            aria-controls="hex-panel"
            id="hex-tab"
            onClick={() => setViewMode("hex")}
            className={`
              border-b-2 px-2 py-2 text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500
              ${
                viewMode === "hex"
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }
            `}
          >
            Hex
          </button>
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "decoded" ? (
          <div
            role="tabpanel"
            id="decoded-panel"
            aria-labelledby="decoded-tab"
            className="h-full overflow-auto p-4"
          >
            {currentMessage ? (
              <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">
                {currentMessage}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">No message content available</p>
            )}
          </div>
        ) : (
          <div
            role="tabpanel"
            id="hex-panel"
            aria-labelledby="hex-tab"
            className="h-full overflow-auto p-4"
          >
            {currentElement?.hexData ? (
              <pre className="font-mono text-xs text-gray-800">
                {formatHexData(currentElement.hexData)}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">No hex data available</p>
            )}
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <p className="text-xs text-gray-600">
          <kbd className="rounded border border-gray-300 bg-white px-1 py-0.5">Tab</kbd> Switch view
          •{" "}
          {session.messages.length > 1 && (
            <>
              <kbd className="rounded border border-gray-300 bg-white px-1 py-0.5">←</kbd>
              <kbd className="rounded border border-gray-300 bg-white px-1 py-0.5">→</kbd> Navigate
              messages •{" "}
            </>
          )}
          <kbd className="rounded border border-gray-300 bg-white px-1 py-0.5">↑</kbd>
          <kbd className="rounded border border-gray-300 bg-white px-1 py-0.5">↓</kbd> Navigate
          sessions
        </p>
      </div>
    </div>
  );
}
