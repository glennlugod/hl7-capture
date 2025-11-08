import "@testing-library/jest-dom";

import { EventEmitter } from "events";

// Use the jest mock for cap (tests/__mocks__/cap.js)
jest.mock("cap");

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

    // Import the mocked cap to inspect how it's used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const capModule = require("cap") as any;

    // We'll capture the packet handler installed via cap.on('packet', ...)
    let packetHandler: ((nbytes: number, truncated: boolean) => void) | null = null;

    // Provide an implementation for Cap() that records the 'on' callback and returns open->linkType
    capModule.Cap.mockImplementation(() => {
      const emitter = new EventEmitter();
      return {
        open: jest.fn(() => 1), // LINKTYPE_ETHERNET
        on: jest.fn((evt: string, cb: any) => {
          if (evt === "packet") packetHandler = cb;
          emitter.on(evt, cb);
        }),
        close: jest.fn(),
      };
    });

    // Mock decoders to return structures expected by hl7-capture
    capModule.decoders.Ethernet.mockImplementation((buffer: Buffer) => ({
      info: { type: capModule.decoders.PROTOCOL.ETHERNET.IPV4 },
      offset: 14,
    }));

    capModule.decoders.IPV4.mockImplementation((buffer: Buffer, offset: number) => ({
      info: {
        srcaddr: "192.0.2.10",
        dstaddr: "192.0.2.20",
        protocol: capModule.decoders.PROTOCOL.IP.TCP,
      },
      offset: offset + 20,
    }));

    capModule.decoders.TCP.mockImplementation((buffer: Buffer, offset: number) => ({
      offset: offset + 20,
    }));

    const manager = new HL7CaptureManager();

    const elements: any[] = [];

    manager.on("element", (el: any) => elements.push(el));

    const markers = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      sourceIP: "192.0.2.10",
      destinationIP: "192.0.2.20",
    };

    // Start capture (should call Cap.open and register packet handler)
    await manager.startCapture("Ethernet 1 - 192.0.2.10", markers);

    // Ensure packet handler was registered
    expect(packetHandler).not.toBeNull();
    // quick debug
    console.log("packetHandler set:", !!packetHandler);

    // Simulate receiving a single-byte start marker packet by writing into the manager's internal buffer
    const startBuf = Buffer.from([markers.startMarker]);
    const internalBuffer: Buffer = (manager as any).buffer;
    const writeOffset = 54; // matches offsets returned by our mock decoders (14 + 20 + 20)
    startBuf.copy(internalBuffer, writeOffset);
    packetHandler!(writeOffset + startBuf.length, false);
    // debug: check whether manager created sessions or elements
    console.log(
      "after start - sessions:",
      manager.getSessions().length,
      "elements:",
      elements.length
    );

    // Now simulate a message payload followed by CRLF
    const message = Buffer.from("MSH|^~\\&|ABC|DEF|GHI|JKL|20251108||ADT^A01|123|P|2.5\r\n");
    const msgOffset = writeOffset + 1;
    message.copy(internalBuffer, msgOffset);
    packetHandler!(msgOffset + message.length, false);
    console.log(
      "after message - sessions:",
      manager.getSessions().length,
      "elements:",
      elements.length
    );

    // Simulate end marker as its own single-byte TCP payload so it's detected as marker
    const endBuf = Buffer.from([markers.endMarker]);
    const endWriteOffset = msgOffset + message.length + 1;
    endBuf.copy(internalBuffer, endWriteOffset);
    // Call packet handler with nbytes such that data slice tcp.offset..nbytes is exactly 1 byte
    packetHandler!(endWriteOffset + endBuf.length, false);
    console.log(
      "after end - sessions:",
      manager.getSessions().length,
      "elements:",
      elements.length
    );

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
