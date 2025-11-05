import './App.css'

import React, { useEffect, useState } from 'react'

import ControlPanel from './components/ControlPanel'
import InterfaceSelector from './components/InterfaceSelector'
import MessageViewer from './components/MessageViewer'
import SessionList from './components/SessionList'
import StatusBar from './components/StatusBar'

import type { NetworkInterface, HL7Session, CaptureStatus, MarkerConfig } from "../common/types";

export default function App(): JSX.Element {
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
  const [sessions, setSessions] = useState<HL7Session[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [error, setError] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<HL7Session | null>(null);

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
      setSessionCount(status.sessionCount);
    });

    // Listen for errors
    window.electron.onError((errorMsg: string) => {
      setError(errorMsg);
    });
  }, []);

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
      await window.electron.startCapture(selectedInterface, markerConfig);
      setIsCapturing(true);
      setSessions([]);
      setSessionCount(0);
    } catch (err) {
      setError(`Failed to start capture: ${err}`);
    }
  };

  const handleStopCapture = async () => {
    try {
      setError("");
      await window.electron.stopCapture();
      setIsCapturing(false);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>hl7-capture - HL7 Medical Device Communication Analyzer</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="main-content">
        <InterfaceSelector
          interfaces={interfaces}
          selectedInterface={selectedInterface}
          onSelectInterface={setSelectedInterface}
          isCapturing={isCapturing}
          markerConfig={markerConfig}
          onUpdateConfig={updateMarkerConfig}
        />

        <ControlPanel
          isCapturing={isCapturing}
          onStartCapture={handleStartCapture}
          onStopCapture={handleStopCapture}
          onClearSessions={handleClearSessions}
        />

        <SessionList sessions={sessions} onSelectSession={setSelectedSession} />
      </div>

      <MessageViewer session={selectedSession} onClose={() => setSelectedSession(null)} />

      <StatusBar
        isCapturing={isCapturing}
        interface={selectedInterface}
        sessionCount={sessionCount}
      />
    </div>
  );
}
