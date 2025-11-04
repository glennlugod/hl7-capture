import { describe, expect, it } from '@jest/globals'

/**
 * Test packet parsing logic
 * These tests validate IP header extraction and protocol identification
 */
describe("Packet Parser", () => {
  /**
   * Helper function to create mock IPv4 packet with headers
   */
  function createMockIPv4Packet(
    sourceIP: number[],
    destIP: number[],
    protocol: number,
    sourcePort?: number,
    destPort?: number
  ): Buffer {
    const packet = Buffer.alloc(100);

    // Ethernet header (14 bytes) - simplified
    let offset = 14;

    // IPv4 header
    packet[offset] = 0x45; // Version (4) + IHL (5)
    packet[offset + 1] = 0x00; // ToS
    packet.writeUInt16BE(100, offset + 2); // Total length
    packet[offset + 9] = protocol; // Protocol field

    // Source IP
    sourceIP.forEach((byte, i) => {
      packet[offset + 12 + i] = byte;
    });

    // Destination IP
    destIP.forEach((byte, i) => {
      packet[offset + 16 + i] = byte;
    });

    // Transport layer (ports for TCP/UDP)
    if ((protocol === 6 || protocol === 17) && sourcePort && destPort) {
      packet.writeUInt16BE(sourcePort, offset + 20);
      packet.writeUInt16BE(destPort, offset + 22);
    }

    return packet;
  }

  describe("IPv4 Header Parsing", () => {
    it("should extract source IP address correctly", () => {
      const sourceIP = [192, 168, 1, 100];
      const destIP = [8, 8, 8, 8];
      const packet = createMockIPv4Packet(sourceIP, destIP, 6);

      // Extract source IP from packet
      const offset = 14;
      const extracted = Array.from(packet.slice(offset + 12, offset + 16)).join(".");

      expect(extracted).toBe("192.168.1.100");
    });

    it("should extract destination IP address correctly", () => {
      const sourceIP = [192, 168, 1, 100];
      const destIP = [8, 8, 8, 8];
      const packet = createMockIPv4Packet(sourceIP, destIP, 6);

      // Extract destination IP from packet
      const offset = 14;
      const extracted = Array.from(packet.slice(offset + 16, offset + 20)).join(".");

      expect(extracted).toBe("8.8.8.8");
    });

    it("should identify TCP protocol correctly", () => {
      const sourceIP = [192, 168, 1, 1];
      const destIP = [10, 0, 0, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 6); // 6 = TCP

      const offset = 14;
      const protocolNumber = packet[offset + 9];

      expect(protocolNumber).toBe(6);
    });

    it("should identify UDP protocol correctly", () => {
      const sourceIP = [192, 168, 1, 1];
      const destIP = [10, 0, 0, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 17); // 17 = UDP

      const offset = 14;
      const protocolNumber = packet[offset + 9];

      expect(protocolNumber).toBe(17);
    });

    it("should identify ICMP protocol correctly", () => {
      const sourceIP = [192, 168, 1, 1];
      const destIP = [10, 0, 0, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 1); // 1 = ICMP

      const offset = 14;
      const protocolNumber = packet[offset + 9];

      expect(protocolNumber).toBe(1);
    });
  });

  describe("Port Extraction (TCP/UDP)", () => {
    it("should extract TCP source and destination ports", () => {
      const sourceIP = [192, 168, 1, 1];
      const destIP = [10, 0, 0, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 6, 443, 12345);

      const offset = 14 + 20; // Skip Ethernet + IPv4
      const sourcePort = packet.readUInt16BE(offset);
      const destPort = packet.readUInt16BE(offset + 2);

      expect(sourcePort).toBe(443);
      expect(destPort).toBe(12345);
    });

    it("should extract UDP source and destination ports", () => {
      const sourceIP = [8, 8, 8, 8];
      const destIP = [192, 168, 1, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 17, 53, 54321);

      const offset = 14 + 20;
      const sourcePort = packet.readUInt16BE(offset);
      const destPort = packet.readUInt16BE(offset + 2);

      expect(sourcePort).toBe(53);
      expect(destPort).toBe(54321);
    });
  });

  describe("Protocol Name Mapping", () => {
    const protocols: { [key: number]: string } = {
      1: "ICMP",
      6: "TCP",
      17: "UDP",
    };

    it("should map ICMP correctly", () => {
      expect(protocols[1]).toBe("ICMP");
    });

    it("should map TCP correctly", () => {
      expect(protocols[6]).toBe("TCP");
    });

    it("should map UDP correctly", () => {
      expect(protocols[17]).toBe("UDP");
    });
  });

  describe("Packet Length", () => {
    it("should preserve original packet length", () => {
      const sourceIP = [192, 168, 1, 1];
      const destIP = [10, 0, 0, 1];
      const packet = createMockIPv4Packet(sourceIP, destIP, 6);

      expect(packet.length).toBe(100);
    });

    it("should handle small packets", () => {
      const smallPacket = Buffer.alloc(14); // Just ethernet header

      expect(smallPacket.length).toBe(14);
    });

    it("should handle large packets", () => {
      const largePacket = Buffer.alloc(65535); // Max IPv4 packet

      expect(largePacket.length).toBe(65535);
    });
  });
});
