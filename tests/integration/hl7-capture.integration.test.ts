import "@testing-library/jest-dom";

import { EventEmitter } from "node:events";

import { HL7CaptureManager } from "../../src/main/hl7-capture";

describe("HL7CaptureManager integration with external packet source", () => {
  test("receives packet events and emits elements", async () => {
    const manager = new HL7CaptureManager();
    // Prevent unhandled 'error' events from failing the test run
    manager.on("error", () => {});

    // Create a fake packet source that emits start marker, a message, then end marker
    const fakeSource = new EventEmitter();
    (fakeSource as any).start = jest.fn();
    (fakeSource as any).stop = jest.fn();
    // Some packet sources expose isRunning; provide a noop that returns true so
    // the manager doesn't detach the source when probing.
    (fakeSource as any).isRunning = jest.fn(() => true);

    manager.attachPacketSource(fakeSource as any);

    const emitted: any[] = [];
    manager.on("element", (el) => emitted.push(el));

    // Start capture
    await manager.startCapture(
      { index: -1, name: "lo" },
      {
        startMarker: 0x05,
        acknowledgeMarker: 0x06,
        endMarker: 0x04,
        deviceIP: "10.0.0.1",
        lisIP: "10.0.0.2",
      }
    );

    // Emit start marker packet
    fakeSource.emit("packet", {
      sourceIP: "10.0.0.1",
      destIP: "10.0.0.2",
      data: Buffer.from([0x05]),
    });

    // Emit an HL7 message (with CRLF)
    fakeSource.emit("packet", {
      sourceIP: "10.0.0.1",
      destIP: "10.0.0.2",
      data: Buffer.from("MSH|^~\\&\r\n"),
    });

    // Emit end marker
    fakeSource.emit("packet", {
      sourceIP: "10.0.0.1",
      destIP: "10.0.0.2",
      data: Buffer.from([0x04]),
    });

    // Allow events to process
    await new Promise((r) => process.nextTick(r));

    // We expect at least start, message, end elements
    const types = emitted.map((e) => e.type);
    expect(types).toContain("start");
    expect(types).toContain("message");
    expect(types).toContain("end");

    // Stop capture
    await manager.stopCapture();
  });
});
describe("HL7CaptureManager integration (mocked cap)", () => {
  it("starts capture, receives HL7 start/message/end markers and records a session", async () => {
    // Mock the os module before requiring HL7CaptureManager so internal imports use our mock
    jest.doMock("os", () => ({
      networkInterfaces: () => ({
        "Ethernet 1": [
          {
            address: "192.0.2.10",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "aa:bb:cc:dd:ee:ff",
            internal: false,
            cidr: "192.0.2.10/24",
          },
        ],
      }),
    }));

    // Import HL7CaptureManager after mocking os
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HL7CaptureManager } = require("../../src/main/hl7-capture") as any;

    const manager = new HL7CaptureManager();

    // Prevent unhandled 'error' events from failing the test run
    manager.on("error", () => {});

    const elements: any[] = [];

    manager.on("element", (el: any) => elements.push(el));

    const markers = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "192.0.2.10",
      lisIP: "192.0.2.20",
    };

    // Attach a fake packet source (EventEmitter) and emit 'packet' events that the manager will consume
    const fakeSource = new EventEmitter();
    manager.attachPacketSource(fakeSource);
    // Provide isRunning so manager's probe (if present) sees the source as running
    (fakeSource as any).isRunning = () => true;

    // Start capture (should attach to external source and return)
    await manager.startCapture({ index: -1, name: "Ethernet 1 - 192.0.2.10" }, markers);

    // Simulate receiving a single-byte start marker packet via packet events
    fakeSource.emit("packet", {
      sourceIP: markers.deviceIP,
      destIP: markers.lisIP,
      data: Buffer.from([markers.startMarker]),
    });

    // Now simulate a message payload followed by CRLF
    const message = Buffer.from("MSH|^~\\&|ABC|DEF|GHI|JKL|20251108||ADT^A01|123|P|2.5\r\n");
    fakeSource.emit("packet", {
      sourceIP: markers.deviceIP,
      destIP: markers.lisIP,
      data: message,
    });

    // Simulate end marker as its own single-byte TCP payload
    fakeSource.emit("packet", {
      sourceIP: markers.deviceIP,
      destIP: markers.lisIP,
      data: Buffer.from([markers.endMarker]),
    });

    // Give the event loop a tick for handlers to run
    await new Promise((r) => setTimeout(r, 0));

    // Validate we captured at least one session and elements by inspecting manager state
    const captured = manager.getSessions();
    expect(captured.length).toBeGreaterThanOrEqual(1);
    const session = captured[0];
    expect(session).toHaveProperty("elements");
    expect(session.elements.length).toBeGreaterThanOrEqual(3);

    // Validate that one of the elements contains the message content
    const messageElements = session.elements.filter((e: any) => e.type === "message");
    expect(messageElements.length).toBeGreaterThanOrEqual(1);
    expect(messageElements[0].content).toContain("MSH|");

    await manager.stopCapture();
  }, 20000);
});
