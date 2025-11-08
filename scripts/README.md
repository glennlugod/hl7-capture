HL7 Sender Utility

This lightweight Node.js script sends HL7 payloads over TCP or UDP. It supports common HL7 framings (STX, MLLP) and custom start/end markers.

Location: `scripts/send-hl7.js`

Quick examples

- Send a single STX-framed HL7 message:
  node scripts/send-hl7.js --host 127.0.0.1 --port 5000 --message "MSH|^~\\\\&|..." --frame stx

- Send using MLLP framing from a file, 10 messages with 200ms interval:
  node scripts/send-hl7.js --host 192.168.1.50 --port 2575 --message-file ./samples/msg.hl7 --frame mllp --count 10 --interval 200

- Send via UDP (unframed):
  node scripts/send-hl7.js --host 10.0.0.5 --port 12345 --message-file ./samples/msg.hl7 --proto udp --frame none

Notes

- On Windows, running tests or apps that listen on a port may require elevated privileges depending on firewall/antivirus.
- The script is intentionally small with minimal dependencies. It uses the built-in `net` and `dgram` modules.

If you want additional features (TLS, rate control, JSON input, or repeated sessions) I can extend the script.
