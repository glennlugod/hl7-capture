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
    const fakePacket = {
      header: { timestampSeconds: 1, timestampMicroseconds: 2 },
      data: Buffer.from([0x01, 0x02]),
    };
    parserEE.emit("packet", fakePacket);

    // End parsing
    parserEE.emit("end");

    await expect(startPromise).resolves.toBeUndefined();

    // Allow event loop to process
    await new Promise((r) => process.nextTick(r));

    expect(packets.length).toBeGreaterThanOrEqual(1);
    expect(packets[0]).toHaveProperty("data");
    expect(Buffer.isBuffer(packets[0].data)).toBe(true);
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
