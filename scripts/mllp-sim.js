#!/usr/bin/env node
"use strict";
// Simple MLLP client-server simulator
// Medical device (client) and LIS (server) run in the same process for demo.
const net = require("net");

const PORT = 6001; // local test port
const HOST = "127.0.0.1";

// Control bytes
const ENQ = Buffer.from([0x05]); // enquiry
const ACK = Buffer.from([0x06]); // acknowledge
const STX = Buffer.from([0x02]); // start of text
const ETX = Buffer.from([0x03]); // end of text (not used per-user but included)
const EOT = Buffer.from([0x04]); // end of transmission
const CRLF = Buffer.from("\r\n");

// Sample HL7 messages (simple strings, no file I/O)
const HL7_MESSAGES = [
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ADT^A01|MSG00001|P|2.3\rPID|1||12345^^^MRN||DOE^JOHN",
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ORM^O01|MSG00002|P|2.3\rPID|1||67890^^^MRN||SMITH^JANE",
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ORU^R01|MSG00003|P|2.3\rPID|1||13579^^^MRN||DOE^JIM",
];

function startServer() {
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
  return server;
}

function startClient(done) {
  const socket = new net.Socket();
  socket.connect(PORT, HOST, () => {
    console.log("[MD] Connected to LIS", HOST + ":" + PORT);
    // Step 1: send ENQ
    console.log("[MD] Sending ENQ (0x05)");
    socket.write(ENQ);
  });

  let stage = "waiting-for-enq-ack";
  let msgIndex = 0;

  socket.on("data", (data) => {
    // Server may send ACK or empty reply (zero-length handled in 'end')
    if (data.length === 0) {
      console.log("[MD] Received zero-length reply");
      return;
    }
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      if (b === 0x06) {
        console.log("[MD] Received ACK (0x06)");
        if (stage === "waiting-for-enq-ack") {
          stage = "sending-messages";
          sendNextMessage(socket, () => {
            // after all messages sent, send EOT
            console.log("[MD] All messages sent. Sending EOT (0x04)");
            socket.write(EOT);
            stage = "waiting-for-eot-reply";
          });
        } else if (stage === "sending-messages") {
          // ACK for a message, we'll send next
          sendNextMessage(socket, () => {
            console.log("[MD] All messages sent. Sending EOT (0x04)");
            socket.write(EOT);
            stage = "waiting-for-eot-reply";
          });
        }
      } else {
        console.log("[MD] Received unexpected byte 0x" + b.toString(16));
      }
    }
  });

  socket.on("end", () => {
    console.log("[MD] Connection ended by server");
    done && done();
  });

  socket.on("close", () => {
    console.log("[MD] Socket closed");
  });

  socket.on("error", (err) => console.error("[MD] Socket error", err));

  function sendNextMessage(sock, cbWhenDone) {
    if (msgIndex >= HL7_MESSAGES.length) {
      cbWhenDone && cbWhenDone();
      return;
    }
    const hl7 = HL7_MESSAGES[msgIndex++];
    // Wrap: STX (0x02) + text bytes + CRLF
    const payload = Buffer.concat([STX, Buffer.from(hl7, "utf8"), CRLF]);
    console.log("[MD] Sending HL7 message #" + msgIndex + " (STX...CRLF)");
    // write and wait a short moment then expect ACK
    sock.write(payload);
    // Do not call cb here; wait for ACK in data handler to continue sequence
  }
}

// Start server then client, wait to finish
const server = startServer();
startClient(() => {
  // Graceful shutdown of server
  setTimeout(() => {
    server.close(() => console.log("[MAIN] Server closed"));
  }, 200);
});
