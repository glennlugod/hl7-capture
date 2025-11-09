import "./App.css";

import React, { useEffect, useState } from "react";

import ConfigurationPanel from "./components/ConfigurationPanel";
import { DesignSystemTestPage } from "./components/DesignSystemTestPage";
import MainLayout from "./components/MainLayout";
import MessageDetailViewer from "./components/MessageDetailViewer";
import SessionList from "./components/SessionList";

import type { NetworkInterface, HL7Session, CaptureStatus, MarkerConfig } from "../common/types";

// Set to true to view design system test page
const SHOW_DESIGN_SYSTEM_TEST = false;

export default function App(): JSX.Element {
  // Show design system test page for verification
  if (SHOW_DESIGN_SYSTEM_TEST) {
    return <DesignSystemTestPage />;
  }

  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
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
  const [sessionCount, setSessionCount] = useState(0);
  const [error, setError] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<HL7Session | null>(null);
  const [autoScroll, setAutoScroll] = useState(() => {
    const saved = localStorage.getItem("hl7-capture-autoscroll");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);

  // Load interfaces on mount
  useEffect(() => {
    const loadInterfaces = async () => {
      try {
        const ifaces = await window.electron.getNetworkInterfaces();
        setInterfaces(ifaces);
        if (ifaces.length > 0) {
          setSelectedInterface(ifaces[0].name);
        }
      } catch (err) {
        setError(`Failed to load interfaces: ${err}`);
      }
    };

    loadInterfaces();

    // Listen for new HL7 elements
    window.electron.onNewElement((_element: any) => {
      // Element received, will be part of session
    });

    // Listen for completed sessions
    window.electron.onSessionComplete((session: HL7Session) => {
      setSessions((prev) => [...prev, session]);
      setSessionCount((prev) => prev + 1);
    });

    // Listen for capture status updates
    window.electron.onCaptureStatus((status) => {
      setIsCapturing(status.isCapturing);
      setIsPaused(status.isPaused || false);
      setSessionCount(status.sessionCount);
    });

    // Listen for errors
    window.electron.onError((errorMsg: string) => {
      setError(errorMsg);
    });
  }, []);

  const handlePauseCapture = async () => {
    try {
      setError("");
      await window.electron.pauseCapture();
      setIsPaused(true);
    } catch (err) {
      setError(`Failed to pause capture: ${err}`);
    }
  };

  const handleResumeCapture = async () => {
    try {
      setError("");
      await window.electron.resumeCapture();
      setIsPaused(false);
    } catch (err) {
      setError(`Failed to resume capture: ${err}`);
    }
  };

  const handleStartCapture = async () => {
    try {
      setError("");

      // Validate configuration
      const isValid = await window.electron.validateMarkerConfig(markerConfig);
      if (!isValid) {
        setError("Invalid marker configuration");
        return;
      }

      // Save configuration and start capture
      await window.electron.saveMarkerConfig(markerConfig);
      // Optimistically update UI so buttons and panels reflect the requested state
      setIsCapturing(true);
      setIsPaused(false);
      setSessions([]);
      setSessionCount(0);
      try {
        await window.electron.startCapture(selectedInterface, markerConfig);
      } catch (startErr) {
        // Revert optimistic state on failure and surface error
        setIsCapturing(false);
        setError(`Failed to start capture: ${startErr}`);
        return;
      }
    } catch (err) {
      setError(`Failed to start capture: ${err}`);
    }
  };

  const handleStopCapture = async () => {
    try {
      setError("");
      // Optimistically update UI for immediate feedback
      setIsCapturing(false);
      setIsPaused(false);
      await window.electron.stopCapture();
    } catch (err) {
      setError(`Failed to stop capture: ${err}`);
    }
  };

  const handleClearSessions = async () => {
    try {
      setError("");
      await window.electron.clearSessions();
      setSessions([]);
      setSessionCount(0);
    } catch (err) {
      setError(`Failed to clear sessions: ${err}`);
    }
  };

  const updateMarkerConfig = (updates: Partial<MarkerConfig>) => {
    setMarkerConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleAutoScroll = () => {
    setAutoScroll((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem("hl7-capture-auto-scroll", JSON.stringify(newValue));
      return newValue;
    });
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

  return (
    <MainLayout
      configPanel={
        <ConfigurationPanel
          selectedInterface={selectedInterface}
          markerConfig={markerConfig}
          onInterfaceChange={setSelectedInterface}
          onConfigChange={updateMarkerConfig}
          onStartCapture={handleStartCapture}
          isCapturing={isCapturing}
        />
      }
      sessionList={
        <SessionList
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={handleSelectSession}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
        />
      }
      messageDetail={
        <MessageDetailViewer
          session={selectedSession}
          onNavigateMessage={setSelectedMessageIndex}
        />
      }
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
