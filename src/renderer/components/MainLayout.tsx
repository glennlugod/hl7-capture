import React, { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import ControlPanel from "./ControlPanel";
import InterfaceSelector from "./InterfaceSelector";

import type { NetworkInterface } from "../../common/types";

interface MainLayoutProps {
  configPanel: React.ReactNode;
  sessionList: React.ReactNode;
  sessionDetail?: React.ReactNode;
  messageDetail?: React.ReactNode;
  /** Optional controlled active detail view. */
  activeDetail?: "session" | "message";
  /** Optional callback invoked when the active detail view changes */
  onActiveDetailChange?: (v: "session" | "message") => void;
  /** If a session is selected in the app, this enables the session/message toggle */
  isSessionSelected?: boolean;
  isCapturing: boolean;
  isPaused: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onPauseCapture: () => void;
  onResumeCapture: () => void;
  onClearSessions: () => void;
  interfaces: NetworkInterface[];
  selectedInterface: NetworkInterface | null;
  onInterfaceChange: (iface: NetworkInterface | null) => void;
  onRefreshInterfaces: () => Promise<NetworkInterface[]>;
}

export default function MainLayout({
  configPanel,
  sessionList,
  sessionDetail,
  messageDetail,
  activeDetail: controlledActive,
  onActiveDetailChange,
  isSessionSelected,
  isCapturing,
  isPaused,
  onStartCapture,
  onStopCapture,
  onPauseCapture,
  onResumeCapture,
  onClearSessions,
  interfaces,
  selectedInterface,
  onInterfaceChange,
  onRefreshInterfaces,
}: Readonly<MainLayoutProps>): JSX.Element {
  // Start collapsed so Sessions and Message Details are visible by default
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(true);
  // Which detail pane to show when a session is selected
  const [activeDetailInternal, setActiveDetailInternal] = useState<"session" | "message">(
    sessionDetail ? "session" : "message"
  );
  const activeDetail = controlledActive || activeDetailInternal;

  // Automatically collapse the configuration panel when capture starts.
  useEffect(() => {
    if (isCapturing) {
      setIsConfigCollapsed(true);
    }
  }, [isCapturing]);

  // Simple two-state labels/icons for the configuration toggle button
  const configButtonAria = isConfigCollapsed
    ? "Expand configuration panel"
    : "Collapse configuration panel";
  const configButtonIcon = isConfigCollapsed ? "▼" : "▲";
  const configButtonText = "Config";

  return (
    <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Control Panel - Modern gradient header (softer, brand-aligned) */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 py-4 shadow-sm">
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
        className={`border-b border-slate-200/60 bg-transparent transition-all duration-300 ease-in-out flex flex-col ${
          isConfigCollapsed ? "h-14" : "h-[calc(100vh-4rem)]"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 shadow-sm">
          <InterfaceSelector
            interfaces={interfaces}
            selected={selectedInterface}
            onSelect={onInterfaceChange}
            onRefresh={onRefreshInterfaces}
            disabled={isCapturing}
          />
          <div className="flex items-center">
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
          <div className="flex-1 overflow-y-auto p-6 bg-transparent">{configPanel}</div>
        )}
      </div>

      {/* Main Content Area - Modern glass-morphism panels */}
      {/* Show main content only when configuration panel is collapsed */}
      {isConfigCollapsed && (
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Session List Panel - Modern card style */}
            <Panel
              defaultSize={40}
              minSize={30}
              maxSize={60}
              className="flex flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <div className="flex h-14 items-center border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">Sessions</h2>
              </div>
              <div className="flex-1 overflow-auto">{sessionList}</div>
            </Panel>

            {/* Resize Handle - Modern gradient */}
            <PanelResizeHandle className="w-1.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 transition-all hover:w-2 hover:from-primary hover:via-primary hover:to-primary hover:shadow-lg active:from-primary/90 active:via-primary/90 active:to-primary/90" />

            {/* Message/Session Detail Panel - Modern glass effect */}
            <Panel
              defaultSize={60}
              minSize={50}
              className="flex flex-col bg-white/80 backdrop-blur-sm"
            >
              <div className="flex h-14 items-center border-b border-slate-200/50 bg-gradient-to-r from-blue-50/30 to-teal-50/20 px-6 shadow-sm">
                {/* When a session is selected we provide a simple toggle to switch views */}
                {isSessionSelected && sessionDetail && messageDetail ? (
                  <div className="flex items-center gap-3">
                    <div className="inline-flex rounded-lg bg-slate-100 p-1 shadow-sm">
                      <button
                        onClick={() => {
                          const newVal: "session" | "message" = "session";
                          setActiveDetailInternal(newVal);
                          onActiveDetailChange?.(newVal);
                        }}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 ${
                          activeDetail === "session"
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        } focus:outline-2 focus:outline-teal-500 focus:outline-offset-2`}
                        aria-pressed={activeDetail === "session"}
                      >
                        Session Details
                      </button>
                      <button
                        onClick={() => {
                          const newVal: "session" | "message" = "message";
                          setActiveDetailInternal(newVal);
                          onActiveDetailChange?.(newVal);
                        }}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 ${
                          activeDetail === "message"
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        } focus:outline-2 focus:outline-teal-500 focus:outline-offset-2`}
                        aria-pressed={activeDetail === "message"}
                      >
                        Message Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    {sessionDetail ? "Session Details" : "Message Details"}
                  </h2>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {activeDetail === "session"
                  ? sessionDetail || messageDetail
                  : messageDetail || sessionDetail}
              </div>
            </Panel>
          </PanelGroup>
        </div>
      )}
    </div>
  );
}
