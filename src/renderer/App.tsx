import './App.css'

import React, { useEffect, useState } from 'react'

import ControlPanel from './components/ControlPanel'
import InterfaceSelector from './components/InterfaceSelector'
import PacketTable from './components/PacketTable'
import StatusBar from './components/StatusBar'

import type { NetworkInterface, CapturedPacket, CaptureStatus } from "@common/types";
declare global {
  interface Window {
    electron: {
      getNetworkInterfaces: () => Promise<NetworkInterface[]>;
      startCapture: (interfaceName: string) => Promise<void>;
      stopCapture: () => Promise<void>;
      pauseCapture: () => Promise<void>;
      resumeCapture: () => Promise<void>;
      getPackets: () => Promise<CapturedPacket[]>;
      clearPackets: () => Promise<void>;
      onNewPacket: (callback: (packet: CapturedPacket) => void) => void;
      onCaptureStatus: (callback: (status: CaptureStatus) => void) => void;
      onError: (callback: (error: string) => void) => void;
    };
  }
}

export default function App(): JSX.Element {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [packets, setPackets] = useState<CapturedPacket[]>([]);
  const [packetCount, setPacketCount] = useState(0);
  const [error, setError] = useState<string>("");

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

    // Listen for new packets
    window.electron.onNewPacket((packet: CapturedPacket) => {
      setPackets((prev) => [...prev, packet]);
      setPacketCount((prev) => prev + 1);
    });

    // Listen for capture status updates
    window.electron.onCaptureStatus((status: CaptureStatus) => {
      setIsCapturing(status.isCapturing);
      setIsPaused(status.isPaused);
      setPacketCount(status.packetCount);
    });

    // Listen for errors
    window.electron.onError((errorMsg: string) => {
      setError(errorMsg);
    });
  }, []);

  const handleStartCapture = async () => {
    try {
      setError("");
      await window.electron.startCapture(selectedInterface);
      setIsCapturing(true);
      setPackets([]);
      setPacketCount(0);
    } catch (err) {
      setError(`Failed to start capture: ${err}`);
    }
  };

  const handleStopCapture = async () => {
    try {
      setError("");
      await window.electron.stopCapture();
      setIsCapturing(false);
      setIsPaused(false);
    } catch (err) {
      setError(`Failed to stop capture: ${err}`);
    }
  };

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

  const handleClearPackets = async () => {
    try {
      setError("");
      await window.electron.clearPackets();
      setPackets([]);
      setPacketCount(0);
    } catch (err) {
      setError(`Failed to clear packets: ${err}`);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>hl7-capture - Network Traffic Analyzer</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="main-content">
        <InterfaceSelector
          interfaces={interfaces}
          selectedInterface={selectedInterface}
          onSelectInterface={setSelectedInterface}
          isCapturing={isCapturing}
        />

        <ControlPanel
          isCapturing={isCapturing}
          isPaused={isPaused}
          onStartCapture={handleStartCapture}
          onStopCapture={handleStopCapture}
          onPauseCapture={handlePauseCapture}
          onResumeCapture={handleResumeCapture}
          onClearPackets={handleClearPackets}
        />

        <PacketTable packets={packets} />
      </div>

      <StatusBar
        isCapturing={isCapturing}
        isPaused={isPaused}
        interface={selectedInterface}
        packetCount={packetCount}
      />
    </div>
  );
}
