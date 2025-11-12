/**
 * Shared TypeScript types for HL7-Capture application
 * Used across main process, preload, and renderer
 */

/**
 * Network interface information
 */
export interface NetworkInterface {
  index: number;
  name: string;
}

/**
 * HL7 marker configuration
 * User can customize start, acknowledge, and end markers
 */
export interface MarkerConfig {
  startMarker: number; // Default: 0x05
  acknowledgeMarker: number; // Default: 0x06
  endMarker: number; // Default: 0x04
  deviceIP: string; // Medical device IP (was sourceIP)
  lisIP: string; // LIS / PC IP (was destinationIP)
  lisPort?: number; // Optional LIS port filter
}

// Marker-specific configuration should not contain application-level
// settings such as auto-start. Those live in AppConfig below.

/**
 * Application-level configuration stored separately from marker settings.
 */
export interface AppConfig {
  // If true, start network capture automatically after loading saved
  // configurations on application startup. Defaults to false.
  autoStartCapture: boolean;
  // If true, start the application window minimized. Defaults to false.
  startMinimized: boolean;
  // If true, automatically start the application when Windows starts (all users). Defaults to false.
  autoStartApp: boolean;
  // Phase 3: Session Persistence Configuration
  // If true, automatically persist completed sessions to disk. Defaults to true.
  enablePersistence?: boolean;
  // Retention period in days (1-365). Sessions older than this are deleted. Defaults to 30.
  retentionDays?: number;
  // Phase 4: Cleanup Worker Configuration
  // Interval in hours (1-168) for periodic cleanup execution. Defaults to 24.
  cleanupIntervalHours?: number;
  // If true, preview cleanup without actually deleting files. Defaults to false.
  dryRunMode?: boolean;
  // Phase 5: Submission Worker Configuration
  // REST API endpoint URL for session submission. Empty string disables submissions.
  submissionEndpoint?: string;
  // Optional authentication header (e.g., "Bearer token" or "Basic base64"). Empty string = no auth.
  submissionAuthHeader?: string;
  // Concurrency level for submission (1-10). Defaults to 2.
  submissionConcurrency?: number;
  // Maximum submission attempts with exponential backoff (1-10). Defaults to 3.
  submissionMaxRetries?: number;
  // Submission interval in minutes (1-60). Defaults to 5.
  submissionIntervalMinutes?: number;
}

/**
 * Submission worker configuration
 * Used for runtime submission settings and IPC communication
 */
export interface SubmissionConfig {
  submissionEndpoint: string;
  submissionAuthHeader: string;
  submissionConcurrency: number;
  submissionMaxRetries: number;
  submissionIntervalMinutes: number;
}

export interface Marker {
  id: string;
  name: string;
  type: "string" | "regex" | "hex";
  pattern: string;
  caseSensitive: boolean;
  active: boolean;
}

/**
 * Individual HL7 element (marker, message, ack, etc.)
 */
export interface HL7Element {
  id: string;
  timestamp: number;
  direction: "device-to-pc" | "pc-to-device";
  type: "start" | "message" | "ack" | "end";
  hexData: string; // Raw hex representation
  content?: string; // Decoded message content (for message type)
  decodedMessage?: string; // Decoded if valid HL7
  rawBytes: Buffer;
}

/**
 * Complete HL7 session (0x05 to 0x04 transmission)
 */
export interface HL7Session {
  id: string;
  sessionId: number; // Numeric session counter
  startTime: number;
  endTime?: number; // Timestamp when session completed
  deviceIP: string;
  lisIP: string;
  elements: HL7Element[];
  messages: string[]; // Decoded HL7 messages only
  isComplete: boolean; // true when 0x04 received

  // Session Persistence Fields (AC 1-5 from story-session-persistence)
  persistedUntil?: number; // Unix timestamp (ms) when session expires; calculated as startTime + (retentionDays * 86400000)

  // Session Submission Fields (for submission-worker and tracking stories)
  submissionStatus?: "pending" | "submitted" | "failed" | "ignored"; // Submission state
  submissionAttempts?: number; // Number of submission attempts made
  submittedAt?: number; // Unix timestamp (ms) of successful submission
  submissionError?: string; // Last submission error message if failed
}

/**
 * Raw captured packet data
 */
export interface CapturedPacket {
  id: string;
  timestamp: number;
  sourceIP: string;
  sourcePort?: number;
  destinationIP: string;
  destinationPort?: number;
  protocol: string;
  length: number;
}

/**
 * Capture status update
 */
export interface CaptureStatus {
  isCapturing: boolean;
  isPaused: boolean;
  interface: NetworkInterface;
  sessionCount: number;
  packetCount: number;
  elementCount: number;
}

/**
 * Types for pcap parser and normalized packet emitted by capture adapters
 */
export interface PcapPacketHeader {
  timestampSeconds?: number;
  timestampMicroseconds?: number;
  tsSec?: number;
  tsUsec?: number;
  capturedLength?: number;
  inclLen?: number;
  capLen?: number;
  originalLength?: number;
  origLen?: number;
}

export interface PcapPacket {
  header?: PcapPacketHeader;
  packetHeader?: PcapPacketHeader;
  data?: Buffer;
}

export interface PcapParser {
  on(event: "packet", cb: (p: PcapPacket) => void): this;
  on(event: "end", cb: () => void): this;
  on(event: "error", cb: (err: Error) => void): this;
}

export type NormalizedPacket = {
  sourceIP: string;
  destIP: string;
  data: Buffer;
  ts: number;
  header?: PcapPacketHeader & { inclLen?: number; origLen?: number };
};
