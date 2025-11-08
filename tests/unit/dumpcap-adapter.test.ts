import { EventEmitter } from "node:events";

import { DumpcapAdapter } from "../../src/main/dumpcap-adapter";

describe("DumpcapAdapter (unit)", () => {
  let originalSpawn: any;

  beforeEach(() => {
    // Mock child_process.spawn to return a controllable stdout stream
    originalSpawn = (require as any)("child_process").spawn;
    // Ensure adapter's findDumpcap returns a usable value so start() proceeds
    (DumpcapAdapter.prototype as any).findDumpcap = jest.fn(() => "dumpcap");
  });

  afterEach(() => {
    (require as any)("child_process").spawn = originalSpawn;
    jest.resetAllMocks();
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
    (require as any)("child_process").spawn = jest.fn(() => fakeProc);

    // Mock pcap-parser to attach to the provided stream and emit a packet
    const parserEE = new EventEmitter();
    const mockPcapParser = {
      parse: (_stream: NodeJS.ReadableStream) => parserEE as any,
    };

    jest.mock("pcap-parser", () => mockPcapParser, { virtual: true });

    const adapter = new DumpcapAdapter({ interface: "lo" });

    const packets: any[] = [];
    adapter.on("packet", (p) => packets.push(p));

    // Start adapter (will use mocked spawn and mocked pcap-parser)
    const startPromise = adapter.start();

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

    await expect(startPromise).resolves.toBeUndefined();

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
    const adapter = new DumpcapAdapter({ interface: "lo" });

    // Monkey-patch findDumpcap to return null to simulate missing dumpcap
    // @ts-ignore
    adapter["findDumpcap"] = () => null;

    await expect(adapter.start()).rejects.toThrow(/dumpcap not found/i);
  });
});
