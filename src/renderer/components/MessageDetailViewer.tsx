import React, { useCallback, useRef, useState } from 'react'

import { HL7Session } from '../../common/types'

interface MessageDetailViewerProps {
  session: HL7Session | null;
  onNavigateMessage: (index: number) => void;
}

export default function MessageDetailViewer({
  session,
  onNavigateMessage,
}: MessageDetailViewerProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<"hex" | "decoded">("hex");
  const [selectedElementIndex, setSelectedElementIndex] = useState<number>(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Select a session to view details</p>
      </div>
    );
  }

  const elements = session.elements || [];
  const selectedElement = elements[selectedElementIndex];

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          setActiveTab(activeTab === "hex" ? "decoded" : "hex");
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSelectedElementIndex(Math.max(0, selectedElementIndex - 1));
          onNavigateMessage(Math.max(0, selectedElementIndex - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setSelectedElementIndex(Math.min(elements.length - 1, selectedElementIndex + 1));
          onNavigateMessage(Math.min(elements.length - 1, selectedElementIndex + 1));
          break;
        case "Home":
          e.preventDefault();
          setSelectedElementIndex(0);
          onNavigateMessage(0);
          break;
        case "End":
          e.preventDefault();
          setSelectedElementIndex(Math.max(0, elements.length - 1));
          onNavigateMessage(Math.max(0, elements.length - 1));
          break;
        default:
          return;
      }
    },
    [activeTab, selectedElementIndex, elements.length, onNavigateMessage]
  );

  // Tab keyboard navigation
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, tabName: "hex" | "decoded") => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setActiveTab("hex");
          (tabsRef.current?.querySelector('[data-tab="hex"]') as HTMLElement)?.focus();
          break;
        case "ArrowRight":
          e.preventDefault();
          setActiveTab("decoded");
          (tabsRef.current?.querySelector('[data-tab="decoded"]') as HTMLElement)?.focus();
          break;
        case "Home":
          e.preventDefault();
          setActiveTab("hex");
          (tabsRef.current?.querySelector('[data-tab="hex"]') as HTMLElement)?.focus();
          break;
        case "End":
          e.preventDefault();
          setActiveTab("decoded");
          (tabsRef.current?.querySelector('[data-tab="decoded"]') as HTMLElement)?.focus();
          break;
        default:
          return;
      }
    },
    []
  );

  return (
    <div className="flex h-full flex-col bg-white" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Session {session.sessionId}</h3>
        <p className="mt-1 text-xs text-gray-600">
          {elements.length} elements
          {selectedElement && ` • Element ${selectedElementIndex + 1}`}
        </p>
      </div>

      {/* Tabs */}
      <div
        ref={tabsRef}
        className="border-b border-gray-200"
        role="tablist"
        aria-label="Message view tabs"
      >
        <div className="flex gap-0">
          <button
            data-tab="hex"
            onClick={() => setActiveTab("hex")}
            onKeyDown={(e) => handleTabKeyDown(e, "hex")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "hex"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            } focus:ring-2 focus:ring-teal-500 focus:ring-offset-0`}
            role="tab"
            aria-selected={activeTab === "hex"}
            aria-controls="hex-panel"
          >
            Hex View
          </button>
          <button
            data-tab="decoded"
            onClick={() => setActiveTab("decoded")}
            onKeyDown={(e) => handleTabKeyDown(e, "decoded")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "decoded"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            } focus:ring-2 focus:ring-teal-500 focus:ring-offset-0`}
            role="tab"
            aria-selected={activeTab === "decoded"}
            aria-controls="decoded-panel"
          >
            Decoded View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "hex" ? (
          <div id="hex-panel" role="tabpanel" aria-labelledby="hex-tab">
            {selectedElement ? (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600">HEX DATA</p>
                <pre className="rounded bg-gray-100 p-3 font-mono text-xs text-gray-800">
                  {selectedElement.hexData}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No element selected</p>
            )}
          </div>
        ) : (
          <div id="decoded-panel" role="tabpanel" aria-labelledby="decoded-tab">
            {selectedElement ? (
              <div>
                <div className="mb-3 rounded border border-gray-200 bg-gray-50 p-2">
                  <p className="text-xs font-medium text-gray-600">
                    Type: <span className="font-mono text-gray-900">{selectedElement.type}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-600">
                    Direction:{" "}
                    <span className="font-mono text-gray-900">{selectedElement.direction}</span>
                  </p>
                </div>
                <p className="mb-2 text-xs font-medium text-gray-600">DECODED CONTENT</p>
                <pre className="break-words whitespace-pre-wrap rounded bg-gray-100 p-3 font-mono text-xs text-gray-800">
                  {selectedElement.decodedMessage || selectedElement.content || "(no content)"}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No element selected</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation info */}
      {elements.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-600">
            Use ← → arrows to navigate messages | Tab to switch views
          </p>
        </div>
      )}
    </div>
  );
}
