import "@testing-library/jest-dom";

import { EventEmitter } from "node:events";

import { HL7CaptureManager } from "../../src/main/hl7-capture";

interface FakePacketSource extends EventEmitter {
  start?: () => Promise<void>;
  stop?: () => Promise<void>;
  isRunning?: () => boolean;
}

describe("HL7CaptureManager auto-capture initialization", () => {
  test("prevents multiple concurrent startCapture calls", async () => {
    const manager = new HL7CaptureManager();
    manager.on("error", () => {}); // Suppress unhandled errors

    // Create a fake packet source
    const fakeSource: FakePacketSource = new EventEmitter();
    fakeSource.start = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          // Simulate slow startup to trigger race condition
          setTimeout(resolve, 50);
        })
    );
    fakeSource.stop = jest.fn().mockResolvedValue(undefined);
    fakeSource.isRunning = jest.fn(() => true);

    manager.attachPacketSource(fakeSource);

    const config = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "10.0.0.1",
      lisIP: "10.0.0.2",
    };

    const iface = { index: 1, name: "eth0" };

    // Start first capture
    const firstCapture = manager.startCapture(iface, config);

    // Immediately try to start a second capture (should fail with "already in progress")
    const secondCapture = manager.startCapture(iface, config).then(
      () => "SUCCESS",
      (err: Error) => err.message
    );

    // First capture should succeed
    await firstCapture;

    // Second capture should fail with the expected error
    const result = await secondCapture;
    expect(result).toBe("Capture already in progress");

    // Cleanup
    await manager.stopCapture();
  });
});
