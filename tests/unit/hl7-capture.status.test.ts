import { EventEmitter } from "node:events";

import { HL7CaptureManager } from "../../src/main/hl7-capture";

import type { NetworkInterface, MarkerConfig } from "../../src/common/types";

// Minimal mock PacketSource implementing EventEmitter with start/stop
class MockPacketSource extends EventEmitter {
  private running = false;
  start() {
    this.running = true;
    this.emit("start");
    return Promise.resolve();
  }
  stop() {
    this.running = false;
    this.emit("stop");
    return Promise.resolve();
  }
  isRunning() {
    return this.running;
  }
}

describe("HL7CaptureManager status and packet counting", () => {
  let mgr: HL7CaptureManager;
  const iface: NetworkInterface = { index: -1, name: "lo" };
  const config: MarkerConfig = {
    startMarker: 0x05,
    acknowledgeMarker: 0x06,
    endMarker: 0x04,
    deviceIP: "",
    lisIP: "",
    lisPort: undefined,
  };

  beforeEach(() => {
    mgr = new HL7CaptureManager();
  });

  afterEach(async () => {
    await mgr.stopCapture();
  });

  test("getStatus returns expected shape and packetCount increments on packets", async () => {
    const source = new MockPacketSource();
    // Cast to shape expected by attachPacketSource: EventEmitter with start/stop
    mgr.attachPacketSource(
      source as unknown as EventEmitter & {
        start?: () => Promise<void> | void;
        stop?: () => Promise<void> | void;
      }
    );

    // Start capture using manager.startCapture which will wire the attached source
    await mgr.startCapture(iface, config);

    const s1 = mgr.getStatus();
    expect(s1.isCapturing).toBe(true);
    expect(s1.packetCount).toBe(0);

    // Emit a packet event with some data
    const data1 = Buffer.from([0x01, 0x02, 0x03]);
    source.emit("packet", { data: data1 });

    // Allow event loop
    await new Promise((r) => process.nextTick(r));

    const s2 = mgr.getStatus();
    expect(s2.packetCount).toBeGreaterThanOrEqual(1);

    // Emit another packet
    source.emit("packet", { data: Buffer.from([0x04]) });
    await new Promise((r) => process.nextTick(r));

    const s3 = mgr.getStatus();
    expect(s3.packetCount).toBeGreaterThanOrEqual(s2.packetCount + 1);

    // Clear sessions resets packetCount
    mgr.clearSessions();
    const s4 = mgr.getStatus();
    expect(s4.sessionCount).toBe(0);
    expect(s4.packetCount).toBe(0);
  });
});
