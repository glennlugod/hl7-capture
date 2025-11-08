import { EventEmitter } from "node:events";

import { DumpcapAdapter } from "../../src/main/dumpcap-adapter";
import { HL7CaptureManager } from "../../src/main/hl7-capture";

describe("DumpcapAdapter -> HL7CaptureManager end-to-end (synthetic)", () => {
  test("adapter emits normalized packet and manager emits elements", async () => {
    const fakeStdout = new EventEmitter() as any;
    fakeStdout.pause = () => {};
    fakeStdout.resume = () => {};

    const fakeProc = {
      stdout: fakeStdout,
      stderr: new EventEmitter(),
      kill: jest.fn(),
    } as any;

    const child = require("node:child_process");
    const originalSpawn = child.spawn;
    (child as any).spawn = jest.fn(() => fakeProc);
    (DumpcapAdapter.prototype as any).findDumpcap = jest.fn(() => "dumpcap");

    const adapter = new DumpcapAdapter({ interface: "lo" });
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
    const payload = Buffer.from([0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x04]);
    const rawFrame = Buffer.concat([eth, ip, tcp, payload]);

    const parserEE = new EventEmitter();
    jest.doMock("pcap-parser", () => ({ parse: (_: any) => parserEE }), { virtual: true });

    await expect(adapter.start()).resolves.toBeUndefined();

    await manager.startCapture("lo", {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      sourceIP: "10.0.0.1",
      destinationIP: "10.0.0.2",
    });

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

    await new Promise((r) => setTimeout(r, 10));

    const types = emittedElements.map((e) => e.type);
    expect(types).toContain("start");
    expect(types).toContain("end");

    await adapter.stop();
    (child as any).spawn = originalSpawn;
  }, 20000);
});
