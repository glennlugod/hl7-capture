#!/usr/bin/env node
// Lightweight HL7 sender utility
// Usage: node scripts/send-hl7.js --host 127.0.0.1 --port 5000 --message-file ./msg.hl7 --count 1 --proto tcp

const fs = require("fs");
const net = require("net");
const dgram = require("dgram");

function printHelp() {
  console.log(`send-hl7.js - send HL7 payloads over TCP or UDP

Usage:
  node scripts/send-hl7.js --host <host> --port <port> [options]

Options:
  --host <host>            Target host or IP (default: 127.0.0.1)
  --port <port>            Target port (required)
  --proto <tcp|udp>        Transport protocol (default: tcp)
  --message <string>       HL7 message as literal string
  --message-file <path>    Read HL7 message from file
  --count <n>              Number of messages to send (default: 1)
  --interval <ms>          Milliseconds between messages (default: 0)
  --frame <stx|mllp|none|custom>  Framing style (default: stx)
  --start <hex,...>        Custom start marker bytes, e.g. 0x02 or 0x0B
  --end <hex,...>          Custom end marker bytes, e.g. 0x0D or 0x1C,0x0D
  --local-address <addr>   Local address to bind for TCP connect / UDP send
  --local-port <port>      Local port to bind for UDP (or TCP localPort)
  --listen                 Start a local server on the target host:port before sending (for integration tests)
  --reply-message <text>   Reply with this message from the server when a client connects (or sends UDP)
  --reply-file <path>      Read reply payload from file
  --reply-frame <stx|mllp|none|custom>  Frame the reply using same options as send
  --help                   Show this help

Examples:
  # Send a single STX-framed HL7 message to localhost:5000
  node scripts/send-hl7.js --host 127.0.0.1 --port 5000 --message "MSH|^~\\\\&|..." --frame stx

  # Send using MLLP framing from a file, 5 times with 500ms between
  node scripts/send-hl7.js --host 192.168.1.100 --port 2575 --message-file ./msg.hl7 --frame mllp --count 5 --interval 500
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case "--help":
        out.help = true;
        break;
      case "--host":
        out.host = args[++i];
        break;
      case "--port":
        out.port = Number(args[++i]);
        break;
      case "--proto":
        out.proto = args[++i];
        break;
      case "--message":
        out.message = args[++i];
        break;
      case "--message-file":
        out.messageFile = args[++i];
        break;
      case "--count":
        out.count = Number(args[++i]);
        break;
      case "--interval":
        out.interval = Number(args[++i]);
        break;
      case "--frame":
        out.frame = args[++i];
        break;
      case "--start":
        out.start = args[++i];
        break;
      case "--end":
        out.end = args[++i];
        break;
      case "--local-address":
        out.localAddress = args[++i];
        break;
      case "--local-port":
        out.localPort = Number(args[++i]);
        break;
      case "--listen":
        out.listen = true;
        break;
      case "--reply-message":
        out.replyMessage = args[++i];
        break;
      case "--reply-file":
        out.replyFile = args[++i];
        break;
      case "--reply-frame":
        out.replyFrame = args[++i];
        break;
      default:
        console.error("Unknown arg", a);
        out.unknown = true;
        break;
    }
  }
  return out;
}

function hexListToBuffer(s) {
  // s: "0x02,0x1c,0x0d" or "0x02"
  if (!s) return Buffer.alloc(0);
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const bytes = parts.map((p) => {
    if (p.startsWith("0x") || p.startsWith("0X")) return parseInt(p, 16);
    return parseInt(p, 10);
  });
  return Buffer.from(bytes);
}

function buildFrame(payloadBuf, opts) {
  const frame = opts.frame || "stx";
  if (frame === "none") return payloadBuf;
  if (frame === "mllp") {
    const start = Buffer.from([0x0b]); // VT
    const end = Buffer.from([0x1c, 0x0d]); // FS CR
    return Buffer.concat([start, payloadBuf, end]);
  }
  if (frame === "stx") {
    // STX (0x02) ... CR LF by default (0x0D 0x0A). Many devices use STX/ETX/CR or STX...CRLF
    const start = Buffer.from([0x02]);
    const end = Buffer.from([0x0d, 0x0a]);
    return Buffer.concat([start, payloadBuf, end]);
  }
  if (frame === "custom") {
    const start = hexListToBuffer(opts.start);
    const end = hexListToBuffer(opts.end);
    return Buffer.concat([start, payloadBuf, end]);
  }
  // default fallback
  return payloadBuf;
}

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function sendTcp(opts, frameBuf) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.on("error", (err) => {
      reject(err);
    });
    socket.connect(
      {
        host: opts.host,
        port: opts.port,
        localAddress: opts.localAddress,
        localPort: opts.localPort,
      },
      async () => {
        try {
          socket.write(frameBuf);
          // give a small delay for network
          await sleep(20);
          socket.end();
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

async function sendUdp(opts, frameBuf) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");
    sock.on("error", (err) => {
      sock.close();
      reject(err);
    });
    if (opts.localAddress || opts.localPort) {
      try {
        sock.bind(opts.localPort || 0, opts.localAddress || undefined, () => {
          sock.send(frameBuf, 0, frameBuf.length, opts.port, opts.host, (err) => {
            sock.close();
            if (err) return reject(err);
            resolve();
          });
        });
      } catch (err) {
        reject(err);
      }
    } else {
      sock.send(frameBuf, 0, frameBuf.length, opts.port, opts.host, (err) => {
        sock.close();
        if (err) return reject(err);
        resolve();
      });
    }
  });
}

function createTcpTestServer(host, port, replyBuf) {
  const server = net.createServer((sock) => {
    console.log("Test server: client connected", sock.remoteAddress + ":" + sock.remotePort);
    sock.on("data", (data) => {
      console.log("Test server received bytes=", data.length);
      if (replyBuf && replyBuf.length) {
        sock.write(replyBuf);
        console.log("Test server sent reply bytes=", replyBuf.length);
      }
    });
    sock.on("close", () => console.log("Test server: client closed"));
    sock.on("error", (err) => console.error("Test server socket error", err));
  });
  server.on("error", (err) => console.error("Test server error", err));
  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      console.log(`Test TCP server listening ${host}:${port}`);
      resolve(server);
    });
    server.once("error", reject);
  });
}

function createUdpTestServer(host, port, replyBuf) {
  const srv = dgram.createSocket("udp4");
  srv.on("error", (err) => console.error("UDP test server error", err));
  srv.on("message", (msg, rinfo) => {
    console.log(`UDP test server received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
    if (replyBuf && replyBuf.length) {
      srv.send(replyBuf, 0, replyBuf.length, rinfo.port, rinfo.address, (err) => {
        if (err) console.error("UDP test server reply error", err);
        else console.log("UDP test server sent reply bytes=", replyBuf.length);
      });
    }
  });
  return new Promise((resolve, reject) => {
    srv.bind(port, host, () => {
      console.log(`UDP test server listening ${host}:${port}`);
      resolve(srv);
    });
    srv.once("error", reject);
  });
}

async function main() {
  const args = parseArgs();
  if (args.help || args.unknown) {
    printHelp();
    if (args.unknown) process.exit(1);
    return;
  }
  const host = args.host || "127.0.0.1";
  const port = args.port;
  if (!port) {
    console.error("Missing --port");
    printHelp();
    process.exit(1);
  }
  const proto = (args.proto || "tcp").toLowerCase();
  const count = Number.isFinite(args.count) && args.count > 0 ? args.count : 1;
  const interval = Number.isFinite(args.interval) ? args.interval : 0;
  const frame = args.frame || "stx";
  let payload = "";
  if (args.messageFile) {
    try {
      payload = fs.readFileSync(args.messageFile, "utf8");
    } catch (err) {
      console.error("Failed to read message file", err.message);
      process.exit(1);
    }
  } else if (args.message) {
    payload = args.message;
  } else {
    console.error("Missing --message or --message-file");
    printHelp();
    process.exit(1);
  }

  const opts = {
    host,
    port,
    proto,
    frame,
    start: args.start,
    end: args.end,
    localAddress: args.localAddress,
    localPort: args.localPort,
  };

  const payloadBuf = Buffer.from(payload, "utf8");

  // If requested, start a test server on the target host:port that will reply
  let testServer = null;
  if (args.listen) {
    let replyPayload = "";
    if (args.replyFile) {
      try {
        replyPayload = fs.readFileSync(args.replyFile, "utf8");
      } catch (err) {
        console.error("Failed to read reply file", err.message);
        process.exit(1);
      }
    } else if (args.replyMessage) {
      replyPayload = args.replyMessage;
    }
    const replyBufRaw = Buffer.from(replyPayload || "", "utf8");
    const replyFrameStyle = args.replyFrame || frame || "stx";
    const replyBuf = buildFrame(replyBufRaw, {
      frame: replyFrameStyle,
      start: args.start,
      end: args.end,
    });

    try {
      if (proto === "tcp") {
        testServer = await createTcpTestServer(host, port, replyBuf);
      } else {
        testServer = await createUdpTestServer(host, port, replyBuf);
      }
    } catch (err) {
      console.error("Failed to start test server:", err && err.message ? err.message : err);
      process.exit(1);
    }
  }

  for (let i = 0; i < count; i++) {
    const frameBuf = buildFrame(payloadBuf, opts);
    console.log(
      `Sending (${i + 1}/${count}) ${proto.toUpperCase()} ${host}:${port} bytes=${frameBuf.length} frame=${frame}`
    );
    try {
      if (proto === "tcp") await sendTcp(opts, frameBuf);
      else await sendUdp(opts, frameBuf);
    } catch (err) {
      console.error("Send failed:", err.message || err);
      process.exitCode = 2;
      break;
    }
    if (i < count - 1 && interval > 0) await sleep(interval);
  }

  // teardown test server if started
  if (args.listen && testServer) {
    try {
      if (proto === "tcp") {
        await new Promise((res) => testServer.close(() => res()));
        console.log("Test TCP server closed");
      } else {
        testServer.close();
        console.log("Test UDP server closed");
      }
    } catch (err) {
      console.error("Error closing test server", err);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
