import {
  hexStringToNumber,
  isValidBufferSize,
  isValidIPv4,
  isValidSnaplen,
  normalizeHexMarker,
  validateMarkerConfig,
} from "../../src/lib/utils/markerValidation";

describe("markerValidation utilities", () => {
  describe("normalizeHexMarker", () => {
    it("should normalize hex without 0x prefix", () => {
      expect(normalizeHexMarker("05")).toBe("0x05");
      expect(normalizeHexMarker("1c")).toBe("0x1c");
      expect(normalizeHexMarker("FF")).toBe("0xff");
    });

    it("should normalize hex with 0x prefix", () => {
      expect(normalizeHexMarker("0x05")).toBe("0x05");
      expect(normalizeHexMarker("0xFF")).toBe("0xff");
    });

    it("should normalize single digit hex", () => {
      expect(normalizeHexMarker("5")).toBe("0x05");
      expect(normalizeHexMarker("F")).toBe("0x0f");
    });

    it("should handle case insensitivity", () => {
      expect(normalizeHexMarker("AB")).toBe("0xab");
      expect(normalizeHexMarker("aB")).toBe("0xab");
    });

    it("should return null for invalid hex", () => {
      expect(normalizeHexMarker("GG")).toBeNull();
      expect(normalizeHexMarker("12G")).toBeNull();
      expect(normalizeHexMarker("")).toBeNull();
    });

    it("should trim whitespace", () => {
      expect(normalizeHexMarker("  05  ")).toBe("0x05");
    });
  });

  describe("hexStringToNumber", () => {
    it("should convert normalized hex to number", () => {
      expect(hexStringToNumber("05")).toBe(5);
      expect(hexStringToNumber("0x05")).toBe(5);
      expect(hexStringToNumber("FF")).toBe(255);
      expect(hexStringToNumber("10")).toBe(16);
    });

    it("should return null for invalid input", () => {
      expect(hexStringToNumber("invalid")).toBeNull();
      expect(hexStringToNumber("")).toBeNull();
    });
  });

  describe("validateMarkerConfig", () => {
    it("should validate valid configuration", () => {
      const result = validateMarkerConfig({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect duplicate markers", () => {
      const result = validateMarkerConfig({
        startMarker: 0x05,
        acknowledgeMarker: 0x05,
        endMarker: 0x04,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Start and Acknowledge markers must be different");
    });

    it("should detect invalid hex markers", () => {
      const result = validateMarkerConfig({
        startMarker: "invalid",
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect out-of-range markers", () => {
      const result = validateMarkerConfig({
        startMarker: 300,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Start marker must be in range 0x00-0xFF");
    });

    it("should validate IPv4 addresses when provided", () => {
      const result = validateMarkerConfig({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "invalid-ip",
        lisIP: "192.168.1.1",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Device IP must be a valid IPv4 address");
    });

    it("should accept empty IPs", () => {
      const result = validateMarkerConfig({
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "",
        lisIP: "",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("isValidIPv4", () => {
    it("should validate correct IPv4 addresses", () => {
      expect(isValidIPv4("192.168.1.1")).toBe(true);
      expect(isValidIPv4("10.0.0.1")).toBe(true);
      expect(isValidIPv4("255.255.255.255")).toBe(true);
      expect(isValidIPv4("0.0.0.0")).toBe(true);
    });

    it("should reject invalid IPv4 addresses", () => {
      expect(isValidIPv4("256.1.1.1")).toBe(false);
      expect(isValidIPv4("192.168.1")).toBe(false);
      expect(isValidIPv4("192.168.1.1.1")).toBe(false);
      expect(isValidIPv4("invalid")).toBe(false);
    });
  });

  describe("isValidSnaplen", () => {
    it("should validate snaplen in valid range", () => {
      expect(isValidSnaplen(256)).toBe(true);
      expect(isValidSnaplen(65535)).toBe(true);
      expect(isValidSnaplen(1500)).toBe(true);
    });

    it("should reject snaplen outside valid range", () => {
      expect(isValidSnaplen(255)).toBe(false);
      expect(isValidSnaplen(65536)).toBe(false);
      expect(isValidSnaplen(-1)).toBe(false);
    });

    it("should reject non-integer values", () => {
      expect(isValidSnaplen(256.5)).toBe(false);
      expect(isValidSnaplen(Number.NaN)).toBe(false);
    });
  });

  describe("isValidBufferSize", () => {
    it("should validate buffer size in valid range", () => {
      expect(isValidBufferSize(10)).toBe(true);
      expect(isValidBufferSize(100)).toBe(true);
      expect(isValidBufferSize(5000)).toBe(true);
    });

    it("should reject buffer size outside valid range", () => {
      expect(isValidBufferSize(9)).toBe(false);
      expect(isValidBufferSize(5001)).toBe(false);
      expect(isValidBufferSize(0)).toBe(false);
    });

    it("should reject non-integer values", () => {
      expect(isValidBufferSize(100.5)).toBe(false);
      expect(isValidBufferSize(Number.NaN)).toBe(false);
    });
  });
});
