import "./App.css";

import { useEffect, useState } from "react";

import ConfigurationPanel from "./components/ConfigurationPanel";
import MainLayout from "./components/MainLayout";
import MessageDetailViewer from "./components/MessageDetailViewer";
import SessionList from "./components/SessionList";

import type { HL7Session, MarkerConfig, NetworkInterface } from "../common/types";

type ElectronAPI = {
  getNetworkInterfaces: () => Promise<NetworkInterface[]>;
  loadInterfaceSelection: () => Promise<string | null>;
  loadMarkerConfig: () => Promise<MarkerConfig>;
  saveInterfaceSelection: (name: string | null) => Promise<void>;
  pauseCapture: () => Promise<void>;
  resumeCapture: () => Promise<void>;
  validateMarkerConfig: (cfg: MarkerConfig) => Promise<boolean>;
  saveMarkerConfig: (cfg: MarkerConfig) => Promise<void>;
  startCapture: (iface: NetworkInterface, cfg: MarkerConfig) => Promise<void>;
  stopCapture: () => Promise<void>;
  clearSessions: () => Promise<void>;
  getCaptureStatus: () => Promise<{ isCapturing: boolean; isPaused?: boolean }>;
  onNewElement: (cb: () => void) => () => void;
  onSessionComplete: (cb: (s: HL7Session) => void) => () => void;
  onCaptureStatus: (
    cb: (status: {
      isCapturing: boolean;
      isPaused?: boolean;
      sessionCount?: number;
      elementCount?: number;
    }) => void
  ) => () => void;
  onError: (cb: (err: string) => void) => () => void;
};

export default function App(): JSX.Element {
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterface | null>(null);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [markerConfig, setMarkerConfig] = useState<MarkerConfig>({
    startMarker: 0x05,
    acknowledgeMarker: 0x06,
    endMarker: 0x04,
    deviceIP: "",
    lisIP: "",
    lisPort: undefined,
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
    const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
    const unsubNewElement = api.onNewElement(() => {
      // Element received, will be part of session
    });
    const unsubSessionComplete = api.onSessionComplete((session: HL7Session) => {
      setSessions((prev) => [...prev, session]);
    });
    const unsubCaptureStatus = api.onCaptureStatus((status) => {
      setIsCapturing(status.isCapturing);
      setIsPaused(status.isPaused || false);
    });

    const unsubError = api.onError((errorMsg: string) => {
      console.error("Capture error:", errorMsg);
    });

    return () => {
      // Cleanup IPC listeners to avoid duplicate callbacks (React StrictMode mounts twice in dev)
      try {
        unsubNewElement?.();
      } catch (e) {
        // Log but don't rethrow during cleanup
        // eslint-disable-next-line no-console
        console.warn("Failed to remove hl7-element-received listener:", e);
      }

      try {
        unsubSessionComplete?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to remove session-complete listener:", e);
      }

      try {
        unsubCaptureStatus?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to remove capture-status listener:", e);
      }

      try {
        unsubError?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to remove capture-error listener:", e);
      }
    };
  }, []);

  // Initialize capture status in case capture was auto-started by the main process
  useEffect(() => {
    (async () => {
      try {
        const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
        const status = await api.getCaptureStatus();
        setIsCapturing(status.isCapturing);
        setIsPaused(status.isPaused || false);
      } catch (err) {
        console.error("Failed to query capture status", err);
      }
    })();
  }, []);

  const loadInterfaces = async (): Promise<NetworkInterface[]> => {
    try {
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      const ifaces = await api.getNetworkInterfaces();
      setInterfaces(ifaces);

      // Load saved interface selection by name
      const savedInterfaceName = await api.loadInterfaceSelection();
      if (savedInterfaceName !== null) {
        const matchedInterface = ifaces.find((iface) => iface.name === savedInterfaceName);
        if (matchedInterface) {
          setSelectedInterface(matchedInterface);
        } else if (ifaces.length > 0) {
          // Fallback to first interface if saved one doesn't exist
          setSelectedInterface(ifaces[0]);
        }
      } else if (ifaces.length > 0 && !selectedInterface) {
        setSelectedInterface(ifaces[0]);
      }
      return ifaces;
    } catch (e) {
      console.error("Failed loading interfaces", e);
      return [];
    }
  };

  const loadMarkerConfig = async (): Promise<void> => {
    try {
      const savedConfig = await api.loadMarkerConfig();
      setMarkerConfig(savedConfig);
    } catch (e) {
      console.error("Failed to load saved marker configuration", e);
      // Continue with default config if load fails
    }
  };

  const handleInterfaceChange = async (newInterface: NetworkInterface | null) => {
    setSelectedInterface(newInterface);
    try {
      if (newInterface !== null) {
        await api.saveInterfaceSelection(newInterface.name);
      } else {
        await api.saveInterfaceSelection(null);
      }
    } catch (e) {
      console.error("Failed to save interface selection", e);
    }
  };

  useEffect(() => {
    loadInterfaces();
    loadMarkerConfig();
  }, []);

  const handlePauseCapture = async () => {
    try {
      await api.pauseCapture();
      setIsPaused(true);
    } catch (err) {
      console.error(`Failed to pause capture: ${err}`);
    }
  };

  const handleResumeCapture = async () => {
    try {
      await api.resumeCapture();
      setIsPaused(false);
    } catch (err) {
      console.error(`Failed to resume capture: ${err}`);
    }
  };

  const handleStartCapture = async () => {
    try {
      // Validate configuration
      const isValid = await api.validateMarkerConfig(markerConfig);
      if (!isValid) {
        console.error("Invalid marker configuration");
        return;
      }

      // Save configuration and start capture
      await api.saveMarkerConfig(markerConfig);
      // Optimistically update UI so buttons and panels reflect the requested state
      setIsCapturing(true);
      setIsPaused(false);
      setSessions([]);
      try {
        if (!selectedInterface) {
          console.error("No interface selected");
          setIsCapturing(false);
          return;
        }
        await api.startCapture(selectedInterface, markerConfig);
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
      await api.stopCapture();
    } catch (err) {
      console.error(`Failed to stop capture: ${err}`);
    }
  };

  const handleClearSessions = async () => {
    try {
      await api.clearSessions();
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
          if (
            (globalThis as unknown as { confirm: (s: string) => boolean }).confirm(
              "Clear all captured sessions?"
            )
          ) {
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

    (globalThis as unknown as { addEventListener: any }).addEventListener("keydown", handleKeyDown);
    return () =>
      (globalThis as unknown as { removeEventListener: any }).removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [sessions, selectedSession, isCapturing]);

  const renderConfigPanel = () => (
    <ConfigurationPanel
      markerConfig={markerConfig}
      onConfigChange={updateMarkerConfig}
      isCapturing={isCapturing}
    />
  );

  return (
    <MainLayout
      configPanel={renderConfigPanel()}
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
      interfaces={interfaces}
      selectedInterface={selectedInterface}
      onInterfaceChange={handleInterfaceChange}
      onRefreshInterfaces={loadInterfaces}
    />
  );
}
