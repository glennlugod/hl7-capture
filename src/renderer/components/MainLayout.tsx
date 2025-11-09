import React, { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import ControlPanel from "./ControlPanel";

interface MainLayoutProps {
  configPanel: React.ReactNode;
  sessionList: React.ReactNode;
  messageDetail: React.ReactNode;
  isCapturing: boolean;
  isPaused: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onPauseCapture: () => void;
  onResumeCapture: () => void;
  onClearSessions: () => void;
}

export default function MainLayout({
  configPanel,
  sessionList,
  messageDetail,
  isCapturing,
  isPaused,
  onStartCapture,
  onStopCapture,
  onPauseCapture,
  onResumeCapture,
  onClearSessions,
}: Readonly<MainLayoutProps>): JSX.Element {
  // Start collapsed so Sessions and Message Details are visible by default
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(true);

  // Simple two-state labels/icons for the configuration toggle button
  const configButtonAria = isConfigCollapsed
    ? "Expand configuration panel"
    : "Collapse configuration panel";
  const configButtonIcon = isConfigCollapsed ? "▼" : "▲";
  const configButtonText = isConfigCollapsed ? "Expand" : "Collapse";

  return (
    <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Control Panel - Modern gradient header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 shadow-lg">
        <ControlPanel
          isCapturing={isCapturing}
          isPaused={isPaused}
          onStartCapture={onStartCapture}
          onStopCapture={onStopCapture}
          onPauseCapture={onPauseCapture}
          onResumeCapture={onResumeCapture}
          onClearSessions={onClearSessions}
        />
      </div>

      {/* Configuration Panel - Modern collapsible with smooth animation */}
      <div
        className={`border-b border-slate-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 ease-in-out flex flex-col ${
          isConfigCollapsed ? "h-14" : "h-[calc(100vh-4rem)]"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Configuration</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigCollapsed((s) => !s)}
              className="group flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={configButtonAria}
              aria-expanded={!isConfigCollapsed}
            >
              <span className="transition-transform group-hover:scale-110">{configButtonIcon}</span>
              <span>{configButtonText}</span>
            </button>
          </div>
        </div>
        {!isConfigCollapsed && (
          // When expanded, allow the configuration panel to grow and hide the main panels below.
          <div className="flex-1 overflow-y-auto p-6 bg-white/50">{configPanel}</div>
        )}
      </div>

      {/* Main Content Area - Modern glass-morphism panels */}
      {/* Show main content only when configuration panel is collapsed */}
      {isConfigCollapsed && (
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Session List Panel - Modern card style */}
            <Panel
              defaultSize={400}
              minSize={300}
              maxSize={600}
              className="flex flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <div className="flex h-14 items-center border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">Sessions</h2>
              </div>
              <div className="flex-1 overflow-auto">{sessionList}</div>
            </Panel>

            {/* Resize Handle - Modern gradient */}
            <PanelResizeHandle className="w-1.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 transition-all hover:w-2 hover:from-primary hover:via-primary hover:to-primary hover:shadow-lg active:from-primary/90 active:via-primary/90 active:to-primary/90" />

            {/* Message Detail Panel - Modern glass effect */}
            <Panel
              defaultSize={70}
              minSize={50}
              className="flex flex-col bg-white/80 backdrop-blur-sm"
            >
              <div className="flex h-14 items-center border-b border-slate-200/50 bg-gradient-to-r from-blue-50/30 to-teal-50/20 px-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Message Details
                </h2>
              </div>
              <div className="flex-1 overflow-auto">{messageDetail}</div>
            </Panel>
          </PanelGroup>
        </div>
      )}
    </div>
  );
}
