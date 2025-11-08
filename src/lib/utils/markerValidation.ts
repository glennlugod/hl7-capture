/**
 * Marker validation and normalization utilities for HL7 configuration
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Normalize hex string to 0xNN format
 * Accepts: "05", "0x05", "5" → returns "0x05"
 */
export function normalizeHexMarker(input: string): string | null {
  const trimmed = input.trim();

  // Handle empty
  if (!trimmed) return null;

  // Remove 0x prefix if present
  let hex = trimmed.toLowerCase().replace(/^0x/, "");

  // Validate hex characters
  if (!/^[0-9a-f]{1,2}$/.test(hex)) {
    return null;
  }

  // Pad single digit with leading zero
  if (hex.length === 1) {
    hex = "0" + hex;
  }

  return "0x" + hex;
}

/**
 * Convert hex string to number
 * Accepts: "05", "0x05", "5" → returns 0x05 (5)
 */
export function hexStringToNumber(input: string): number | null {
  const normalized = normalizeHexMarker(input);
  if (!normalized) return null;
  return parseInt(normalized, 16);
}

/**
 * Validate marker configuration
 */
export function validateMarkerConfig(config: {
  startMarker: number | string;
  acknowledgeMarker: number | string;
  endMarker: number | string;
  sourceIP?: string;
  destinationIP?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Normalize and validate markers
  const start =
    typeof config.startMarker === "string"
      ? hexStringToNumber(config.startMarker)
      : config.startMarker;

  const ack =
    typeof config.acknowledgeMarker === "string"
      ? hexStringToNumber(config.acknowledgeMarker)
      : config.acknowledgeMarker;

  const end =
    typeof config.endMarker === "string" ? hexStringToNumber(config.endMarker) : config.endMarker;

  // Validate markers are valid hex
  if (start === null) {
    errors.push("Start marker must be a valid hex byte (0x00-0xFF)");
  } else if (start < 0 || start > 255) {
    errors.push("Start marker must be in range 0x00-0xFF");
  }

  if (ack === null) {
    errors.push("Acknowledge marker must be a valid hex byte (0x00-0xFF)");
  } else if (ack < 0 || ack > 255) {
    errors.push("Acknowledge marker must be in range 0x00-0xFF");
  }

  if (end === null) {
    errors.push("End marker must be a valid hex byte (0x00-0xFF)");
  } else if (end < 0 || end > 255) {
    errors.push("End marker must be in range 0x00-0xFF");
  }

  // Validate uniqueness
  if (start !== null && ack !== null && start === ack) {
    errors.push("Start and Acknowledge markers must be different");
  }
  if (start !== null && end !== null && start === end) {
    errors.push("Start and End markers must be different");
  }
  if (ack !== null && end !== null && ack === end) {
    errors.push("Acknowledge and End markers must be different");
  }

  // Validate IPs if provided
  if (config.sourceIP && !isValidIPv4(config.sourceIP)) {
    errors.push("Source IP must be a valid IPv4 address");
  }

  if (config.destinationIP && !isValidIPv4(config.destinationIP)) {
    errors.push("Destination IP must be a valid IPv4 address");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  return ipv4Regex.test(ip);
}

/**
 * Validate snaplen value
 */
export function isValidSnaplen(value: number): boolean {
  return Number.isInteger(value) && value >= 256 && value <= 65535;
}

/**
 * Validate buffer size
 */
export function isValidBufferSize(value: number): boolean {
  return Number.isInteger(value) && value >= 10 && value <= 5000;
}
