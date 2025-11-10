#!/usr/bin/env node
"use strict";
// MLLP Client Simulator
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

// Sample HL7 messages (simple strings, no file I/O)
const HL7_MESSAGES = [
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ADT^A01|MSG00001|P|2.3\rPID|1||12345^^^MRN||DOE^JOHN",
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ORM^O01|MSG00002|P|2.3\rPID|1||67890^^^MRN||SMITH^JANE",
  "MSH|^~\\&|MDVC|DEVICE|LIS|HOSP|20251108||ORU^R01|MSG00003|P|2.3\rPID|1||13579^^^MRN||DOE^JIM",
];

rl.question("Enter server IP address (default 127.0.0.1): ", (ip) => {
  const HOST = ip || "127.0.0.1";
  rl.question("Enter server port (default 6001): ", (portStr) => {
    const PORT = parseInt(portStr) || 6001;
    rl.close();
    startClient(HOST, PORT);
  });
});

function startClient(HOST, PORT) {
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
    process.exit(0);
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
