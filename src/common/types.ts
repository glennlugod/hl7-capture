/**
 * Shared TypeScript types for HL7-Capture application
 * Used across main process, preload, and renderer
 */

/**
 * Network interface information
 */
export interface NetworkInterface {
  name: string;
  address: string;
  ip: string;
  mac: string;
}

/**
 * HL7 marker configuration
 * User can customize start, acknowledge, and end markers
 */
export interface MarkerConfig {
  startMarker: number; // Default: 0x05
  acknowledgeMarker: number; // Default: 0x06
  endMarker: number; // Default: 0x04
  sourceIP: string; // Medical device IP
  destinationIP: string; // LIS PC IP
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
  pcIP: string;
  elements: HL7Element[];
  messages: string[]; // Decoded HL7 messages only
  isComplete: boolean; // true when 0x04 received
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
  interface: string;
  sessionCount: number;
  packetCount: number;
  elementCount: number;
}
