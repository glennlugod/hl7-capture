// Top-level test module imports and mocks. We must register module mocks
// before importing the module under test so the module gets the mocked
// implementations during initialization.
jest.mock("node:child_process", () => ({ spawn: jest.fn() }));
jest.mock("../../src/main/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import * as child_process from "node:child_process";
import { EventEmitter } from "node:events";

import { DumpcapAdapter } from "../../src/main/dumpcap-adapter";

// We'll provide a parser EventEmitter instance which tests will emit into.
const parserEE = new EventEmitter();
jest.mock("pcap-parser", () => ({ parse: () => parserEE }), { virtual: true });

describe("DumpcapAdapter (unit)", () => {
  beforeEach(() => {
    // Ensure adapter's findDumpcap returns a usable value so start() proceeds
    (DumpcapAdapter.prototype as any).findDumpcap = jest.fn(() => "dumpcap");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    jest.resetModules();
  });

  test("parses packets from stdout and emits packet events", async () => {
    // Create fake proc with stdout EventEmitter
    const fakeStdout = new EventEmitter() as any;
    fakeStdout.pause = () => {};
    fakeStdout.resume = () => {};

    const fakeProc = {
      stdout: fakeStdout,
      stderr: new EventEmitter(),
      kill: jest.fn(),
    } as any;

    // Mock spawn to return fakeProc
    (child_process.spawn as unknown as jest.Mock).mockImplementation(() => fakeProc as any);

    const adapter = new DumpcapAdapter({ interface: { index: -1, name: "lo" } });

    const packets: any[] = [];
    adapter.on("packet", (p) => packets.push(p));

    // Start adapter (will use mocked spawn and mocked pcap-parser)
    const startPromise = adapter.start();

    await expect(startPromise).resolves.toBeUndefined();

    // Emit a fake packet from the parser
    // Create a synthetic Ethernet + IPv4 + TCP frame with a small payload
    const eth = Buffer.alloc(14);
    // Ethernet type = IPv4 (0x0800)
    eth.writeUInt16BE(0x0800, 12);
    const ip = Buffer.alloc(20);
    // Version/IHL = 0x45 (IPv4, IHL=5)
    ip.writeUInt8(0x45, 0);
    // Protocol = TCP (6)
    ip.writeUInt8(6, 9);
    // src IP 10.0.0.1
    ip.writeUInt8(10, 12);
    ip.writeUInt8(0, 13);
    ip.writeUInt8(0, 14);
    ip.writeUInt8(1, 15);
    // dst IP 10.0.0.2
    ip.writeUInt8(10, 16);
    ip.writeUInt8(0, 17);
    ip.writeUInt8(0, 18);
    ip.writeUInt8(2, 19);

    const tcp = Buffer.alloc(20);
    // Data offset = 5 (5 * 4 = 20 bytes)
    tcp.writeUInt8(5 << 4, 12);
    const payload = Buffer.from([0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x04]); // start marker + "Hello" + end marker

    const rawFrame = Buffer.concat([eth, ip, tcp, payload]);

    const fakePacket = {
      header: { timestampSeconds: 1, timestampMicroseconds: 2000 },
      data: rawFrame,
    };
    parserEE.emit("packet", fakePacket);

    // End parsing
    parserEE.emit("end");

    // Allow event loop to process
    await new Promise((r) => process.nextTick(r));

    expect(packets.length).toBeGreaterThanOrEqual(1);
    // Adapter should emit normalized packet with sourceIP/destIP/data/ts
    expect(packets[0]).toHaveProperty("sourceIP");
    expect(packets[0]).toHaveProperty("destIP");
    expect(packets[0]).toHaveProperty("data");
    expect(Buffer.isBuffer(packets[0].data)).toBe(true);
    expect(packets[0].sourceIP).toBe("10.0.0.1");
    expect(packets[0].destIP).toBe("10.0.0.2");
  });
});

describe("DumpcapAdapter (unit) - missing dumpcap", () => {
  test("start() should throw when dumpcap is not available", async () => {
    const adapter = new DumpcapAdapter({ interface: { index: -1, name: "lo" } });

    // Monkey-patch findDumpcap to return null to simulate missing dumpcap
    // override private method in test
    (adapter as any)["findDumpcap"] = () => null;

    await expect(adapter.start()).rejects.toThrow(/dumpcap not found/i);
  });
});
