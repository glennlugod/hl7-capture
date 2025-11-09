// Ensure child_process.spawn is a mock we can control
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("node:child_process", () => ({ spawn: jest.fn() }));

import * as child_process from "node:child_process";
import { EventEmitter } from "node:events";

import { waitFor } from "@testing-library/react";

import { DumpcapAdapter } from "../../src/main/dumpcap-adapter";
import { HL7CaptureManager } from "../../src/main/hl7-capture";

// Parser emitter for tests
const parserEE = new EventEmitter();
jest.mock("pcap-parser", () => ({ parse: () => parserEE }), { virtual: true });

describe("DumpcapAdapter -> HL7CaptureManager end-to-end (synthetic)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    jest.resetModules();
  });

  test("adapter emits normalized packet and manager emits elements", async () => {
    const fakeStdout = new EventEmitter() as any;
    fakeStdout.pause = () => {};
    fakeStdout.resume = () => {};

    const fakeProc = {
      stdout: fakeStdout,
      stderr: new EventEmitter(),
      kill: jest.fn(),
    } as any;

    (child_process.spawn as unknown as jest.Mock).mockImplementation(() => fakeProc as any);

    (DumpcapAdapter.prototype as any).findDumpcap = jest.fn(() => "dumpcap");

    const adapter = new DumpcapAdapter({ interface: { index: -1, name: "lo" } });
    const manager = new HL7CaptureManager();

    const emittedElements: any[] = [];
    manager.on("element", (e) => emittedElements.push(e));

    manager.attachPacketSource(adapter as any);

    const eth = Buffer.alloc(14);
    eth.writeUInt16BE(0x0800, 12);
    const ip = Buffer.alloc(20);
    ip.writeUInt8(0x45, 0);
    ip.writeUInt8(6, 9);
    ip.writeUInt8(10, 12);
    ip.writeUInt8(0, 13);
    ip.writeUInt8(0, 14);
    ip.writeUInt8(1, 15);
    ip.writeUInt8(10, 16);
    ip.writeUInt8(0, 17);
    ip.writeUInt8(0, 18);
    ip.writeUInt8(2, 19);
    const tcp = Buffer.alloc(20);
    tcp.writeUInt8(5 << 4, 12);

    // parserEE is the mocked parser instance

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

    await expect(adapter.start()).resolves.toBeUndefined();

    // Emit three packets: start marker, message payload, end marker
    const startPayload = Buffer.from([0x05]);
    const msgPayload = Buffer.from("MSH|^~\\&\r\n");
    const endPayload = Buffer.from([0x04]);

    const rawStart = Buffer.concat([eth, ip, tcp, startPayload]);
    const rawMsg = Buffer.concat([eth, ip, tcp, msgPayload]);
    const rawEnd = Buffer.concat([eth, ip, tcp, endPayload]);

    process.nextTick(() => {
      parserEE.emit("packet", {
        header: { timestampSeconds: 1, timestampMicroseconds: 0 },
        data: rawStart,
      });
      parserEE.emit("packet", {
        header: { timestampSeconds: 1, timestampMicroseconds: 1000 },
        data: rawMsg,
      });
      parserEE.emit("packet", {
        header: { timestampSeconds: 1, timestampMicroseconds: 2000 },
        data: rawEnd,
      });
      parserEE.emit("end");
    });
    // Allow event loop time for the manager to process packets and emit elements
    await new Promise((r) => setTimeout(r, 50));

    // Wait for the manager to process packets and emit elements. Use waitFor to
    // avoid flaky timing assumptions; give a generous timeout for CI.
    await waitFor(
      () => {
        const types = emittedElements.map((e) => e.type);
        expect(types).toEqual(expect.arrayContaining(["start", "end"]));
      },
      { timeout: 2000 }
    );

    await adapter.stop();
  }, 20000);
});
