#!/usr/bin/env node
"use strict";
// MLLP Server Simulator
const net = require("net");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Control bytes
const ENQ = Buffer.from([0x05]); // enquiry
const ACK = Buffer.from([0x06]); // acknowledge
const STX = Buffer.from([0x02]); // start of text
const ETX = Buffer.from([0x03]); // end of text (not used per-user but included)
const EOT = Buffer.from([0x04]); // end of transmission
const CRLF = Buffer.from("\r\n");

rl.question("Enter interface (optional): ", (iface) => {
  rl.question("Enter IP address to listen on (default 127.0.0.1): ", (ip) => {
    const HOST = ip || "127.0.0.1";
    rl.question("Enter port to listen on (default 6001): ", (portStr) => {
      const PORT = parseInt(portStr) || 6001;
      rl.close();
      console.log(`Server will listen on Interface: ${iface || "any"}, IP: ${HOST}, Port: ${PORT}`);
      startServer(HOST, PORT);
    });
  });
});

function startServer(HOST, PORT) {
  const server = net.createServer((socket) => {
    console.log("[LIS] Client connected", socket.remoteAddress + ":" + socket.remotePort);

    socket.on("data", (data) => {
      // The LIS protocol for this demo:
      // - When it receives ENQ (0x05) respond with ACK (0x06)
      // - When it receives STX...CRLF treat as one message and respond with ACK (0x06)
      // - When it receives EOT (0x04) respond with an empty TCP message (zero-length) and close
      let offset = 0;
      while (offset < data.length) {
        const byte = data[offset];
        if (byte === 0x05) {
          console.log("[LIS] Received ENQ (0x05)");
          socket.write(ACK);
          offset += 1;
          continue;
        }

        if (byte === 0x02) {
          // find CRLF (0x0D 0x0A) from offset to end
          const cr = 0x0d;
          const lf = 0x0a;
          let endIdx = -1;
          for (let i = offset + 1; i < data.length - 1; i++) {
            if (data[i] === cr && data[i + 1] === lf) {
              endIdx = i + 1; // include LF
              break;
            }
          }
          if (endIdx === -1) {
            // message not complete in this chunk; buffer it by saving remainder on socket
            // For this simple demo, assume messages arrive whole.
            console.log("[LIS] Incomplete message received (unexpected in demo)");
            endIdx = data.length - 1;
          }
          const msgBuf = data.slice(offset + 1, endIdx - 1 + 1); // slice between STX and CRLF
          // Convert to string keeping HL7 CRs inside if any
          const text = msgBuf.toString("utf8");
          console.log("[LIS] Received HL7 message:", text.replace(/\r/g, "\\r"));
          // Send ACK for each message
          socket.write(ACK);
          offset = endIdx + 1;
          continue;
        }

        if (byte === 0x04) {
          console.log("[LIS] Received EOT (0x04)");
          // Reply with an empty TCP message (zero-length)
          // In Node you can't send a true zero-length payload; we'll write an empty Buffer and then end.
          socket.write(Buffer.alloc(0), () => {
            console.log("[LIS] Sent empty TCP reply and closing connection");
            socket.end();
          });
          offset += 1;
          continue;
        }

        // Ignore other bytes
        console.log("[LIS] Ignoring byte 0x" + byte.toString(16));
        offset += 1;
      }
    });

    socket.on("close", () => console.log("[LIS] Client disconnected"));
    socket.on("error", (err) => console.error("[LIS] Socket error", err));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[LIS] Listening on ${HOST}:${PORT}`);
  });

  server.on("error", (err) => console.error("[LIS] Server error", err));
}
