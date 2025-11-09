import "./App.css";

import { useEffect, useState } from "react";

import ConfigurationPanel from "./components/ConfigurationPanel";
import MainLayout from "./components/MainLayout";
import MessageDetailViewer from "./components/MessageDetailViewer";
import SessionList from "./components/SessionList";

import type { HL7Session, MarkerConfig } from "../common/types";

export default function App(): JSX.Element {
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [markerConfig, setMarkerConfig] = useState<MarkerConfig>({
    startMarker: 0x05,
    acknowledgeMarker: 0x06,
    endMarker: 0x04,
    sourceIP: "",
    destinationIP: "",
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessions, setSessions] = useState<HL7Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<HL7Session | null>(null);
  const [autoScroll, setAutoScroll] = useState(() => {
    const saved = localStorage.getItem("hl7-capture-autoscroll");
    return saved ? JSON.parse(saved) : true;
  });

  // Listen for HL7 events and capture status
  useEffect(() => {
    // Listen for new HL7 elements
    window.electron.onNewElement(() => {
      // Element received, will be part of session
    });

    // Listen for completed sessions
    window.electron.onSessionComplete((session: HL7Session) => {
      setSessions((prev) => [...prev, session]);
    });

    // Listen for capture status updates
    window.electron.onCaptureStatus((status) => {
      setIsCapturing(status.isCapturing);
      setIsPaused(status.isPaused || false);
    });

    // Listen for errors
    window.electron.onError((errorMsg: string) => {
      console.error("Capture error:", errorMsg);
    });
  }, []);

  const handlePauseCapture = async () => {
    try {
      await window.electron.pauseCapture();
      setIsPaused(true);
    } catch (err) {
      console.error(`Failed to pause capture: ${err}`);
    }
  };

  const handleResumeCapture = async () => {
    try {
      await window.electron.resumeCapture();
      setIsPaused(false);
    } catch (err) {
      console.error(`Failed to resume capture: ${err}`);
    }
  };

  const handleStartCapture = async () => {
    try {
      // Validate configuration
      const isValid = await window.electron.validateMarkerConfig(markerConfig);
      if (!isValid) {
        console.error("Invalid marker configuration");
        return;
      }

      // Save configuration and start capture
      await window.electron.saveMarkerConfig(markerConfig);
      // Optimistically update UI so buttons and panels reflect the requested state
      setIsCapturing(true);
      setIsPaused(false);
      setSessions([]);
      try {
        await window.electron.startCapture(selectedInterface, markerConfig);
      } catch (error_) {
        // Revert optimistic state on failure and surface error
        setIsCapturing(false);
        console.error(`Failed to start capture: ${error_}`);
        return;
      }
    } catch (err) {
      console.error(`Failed to start capture: ${err}`);
    }
  };

  const handleStopCapture = async () => {
    try {
      // Optimistically update UI for immediate feedback
      setIsCapturing(false);
      setIsPaused(false);
      await window.electron.stopCapture();
    } catch (err) {
      console.error(`Failed to stop capture: ${err}`);
    }
  };

  const handleClearSessions = async () => {
    try {
      await window.electron.clearSessions();
      setSessions([]);
    } catch (err) {
      console.error(`Failed to clear sessions: ${err}`);
    }
  };

  const updateMarkerConfig = (updates: Partial<MarkerConfig>) => {
    setMarkerConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSelectSession = (session: HL7Session) => {
    setSelectedSession(session);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Toggle Start/Stop capture
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isCapturing) {
          handleStopCapture();
        } else {
          handleStartCapture();
        }
        return;
      }

      // Ctrl/Cmd + K: Clear sessions
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (sessions.length > 0) {
          if (window.confirm("Clear all captured sessions?")) {
            handleClearSessions();
          }
        }
        return;
      }

      // Escape: Close modals, collapse panels
      if (e.key === "Escape") {
        e.preventDefault();
        // Clear modal/panel state if any are open
        // This global handler prevents default browser behavior and allows parent components to handle modal closing
        return;
      }

      // Arrow Up/Down: Navigate sessions
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (sessions.length === 0) return;

        e.preventDefault();
        const currentIndex = selectedSession
          ? sessions.findIndex((s) => s.id === selectedSession.id)
          : -1;

        let newIndex: number;
        if (e.key === "ArrowUp") {
          newIndex = currentIndex <= 0 ? sessions.length - 1 : currentIndex - 1;
        } else {
          newIndex = currentIndex >= sessions.length - 1 ? 0 : currentIndex + 1;
        }

        setSelectedSession(sessions[newIndex]);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, selectedSession, isCapturing]);

  const renderConfigPanel = (collapsed: boolean) => (
    <ConfigurationPanel
      selectedInterface={selectedInterface}
      markerConfig={markerConfig}
      onInterfaceChange={setSelectedInterface}
      onConfigChange={updateMarkerConfig}
      isCapturing={isCapturing}
      collapsed={collapsed}
    />
  );

  return (
    <MainLayout
      configPanel={renderConfigPanel}
      sessionList={
        <SessionList
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={handleSelectSession}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
        />
      }
      messageDetail={<MessageDetailViewer session={selectedSession} onNavigateMessage={() => {}} />}
      isCapturing={isCapturing}
      isPaused={isPaused}
      onStartCapture={handleStartCapture}
      onStopCapture={handleStopCapture}
      onPauseCapture={handlePauseCapture}
      onResumeCapture={handleResumeCapture}
      onClearSessions={handleClearSessions}
    />
  );
}
