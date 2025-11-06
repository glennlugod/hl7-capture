import React, { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

import ControlPanel from './ControlPanel'

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
}: MainLayoutProps): JSX.Element {
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col bg-white">
      {/* Control Panel - Capture buttons */}
      <div className="border-b border-gray-300 bg-gray-50 px-4 py-3">
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

      {/* Configuration Panel - Collapsible */}
      <div
        className={`border-b border-gray-300 bg-white transition-all duration-300 ${
          isConfigCollapsed ? "h-12" : "h-60"
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
          <h2 className="text-base font-semibold text-gray-900">Configuration</h2>
          <button
            onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
            className="rounded-sm px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label={
              isConfigCollapsed ? "Expand configuration panel" : "Collapse configuration panel"
            }
            aria-expanded={!isConfigCollapsed}
          >
            {isConfigCollapsed ? "▼ Expand" : "▲ Collapse"}
          </button>
        </div>
        {!isConfigCollapsed && (
          <div className="h-[calc(100%-3rem)] overflow-auto p-4">{configPanel}</div>
        )}
      </div>

      {/* Main Content Area - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Session List Panel */}
          <Panel
            defaultSize={400}
            minSize={300}
            maxSize={600}
            className="flex flex-col border-r border-gray-300 bg-white"
          >
            <div className="flex h-12 items-center border-b border-gray-200 px-4">
              <h2 className="text-base font-semibold text-gray-900">Sessions</h2>
            </div>
            <div className="flex-1 overflow-auto">{sessionList}</div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-200 transition-colors hover:bg-teal-500 active:bg-teal-600" />

          {/* Message Detail Panel */}
          <Panel defaultSize={70} minSize={50} className="flex flex-col bg-white">
            <div className="flex h-12 items-center border-b border-gray-200 px-4">
              <h2 className="text-base font-semibold text-gray-900">Message Details</h2>
            </div>
            <div className="flex-1 overflow-auto">{messageDetail}</div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
