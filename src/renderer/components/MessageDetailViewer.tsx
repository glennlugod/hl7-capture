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
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/10">
        <svg
          className="w-20 h-20 text-slate-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-base font-medium text-slate-600">Select a session to view details</p>
        <p className="text-sm text-slate-400 mt-2">
          Choose a session from the list to see message details
        </p>
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
    <div className="flex h-full flex-col bg-white/50" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header - Modern gradient card style */}
      <div className="border-b border-slate-200/50 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/30">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Session {session.sessionId}
            </h3>
            <p className="text-xs font-medium text-slate-600">
              {elements.length} element{elements.length !== 1 ? "s" : ""}
              {selectedElement && (
                <>
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="text-teal-700">Element {selectedElementIndex + 1}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - Modern segmented control style */}
      <div
        ref={tabsRef}
        className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm px-4 py-3"
        role="tablist"
        aria-label="Message view tabs"
      >
        <div className="inline-flex rounded-lg bg-slate-100 p-1 shadow-sm">
          <button
            data-tab="hex"
            onClick={() => setActiveTab("hex")}
            onKeyDown={(e) => handleTabKeyDown(e, "hex")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              activeTab === "hex"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } focus:outline-2 focus:outline-teal-500 focus:outline-offset-2`}
            role="tab"
            aria-selected={activeTab === "hex"}
            aria-controls="hex-panel"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              Hex View
            </div>
          </button>
          <button
            data-tab="decoded"
            onClick={() => setActiveTab("decoded")}
            onKeyDown={(e) => handleTabKeyDown(e, "decoded")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              activeTab === "decoded"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } focus:outline-2 focus:outline-teal-500 focus:outline-offset-2`}
            role="tab"
            aria-selected={activeTab === "decoded"}
            aria-controls="decoded-panel"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Decoded View
            </div>
          </button>
        </div>
      </div>

      {/* Content - Modern card style */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "hex" ? (
          <div id="hex-panel" role="tabpanel" aria-labelledby="hex-tab">
            {selectedElement ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Hex Data
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 p-5 shadow-sm">
                  <pre className="font-mono text-xs leading-relaxed text-slate-800">
                    {selectedElement.hexData}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-slate-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">No element selected</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div id="decoded-panel" role="tabpanel" aria-labelledby="decoded-tab">
            {selectedElement ? (
              <div className="space-y-4">
                {/* Metadata Card */}
                <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                        Type
                      </p>
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {selectedElement.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                        Direction
                      </p>
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {selectedElement.direction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Decoded Content
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 p-5 shadow-sm">
                  <pre className="break-words whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                    {selectedElement.decodedMessage || selectedElement.content || "(no content)"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-slate-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">No element selected</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation info - Modern footer */}
      {elements.length > 0 && (
        <div className="border-t border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <svg
              className="w-4 h-4 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Use{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-mono text-xs shadow-sm">
                ←
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-mono text-xs shadow-sm">
                →
              </kbd>{" "}
              to navigate messages
            </span>
            <span className="text-slate-400">•</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-mono text-xs shadow-sm">
                Tab
              </kbd>{" "}
              to switch views
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
