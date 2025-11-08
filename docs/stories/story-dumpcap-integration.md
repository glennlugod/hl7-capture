# Story 1.1: Integrate dumpcap for reliable network capture

**Status:** Draft

---

## User Story

As a developer,
I want the application to use `dumpcap` (Wireshark) for packet capture instead of the unreliable `cap` npm library,
So that HL7 messages are captured reliably across platforms and sessions are reconstructed accurately.

---

## Acceptance Criteria

**Given** dumpcap is installed and available on PATH
**When** the application starts a capture session using the Dumpcap backend
**Then** packets from the selected network interface are forwarded to `HL7CaptureManager` as packet events and HL7 elements (`start`, `message`, `ack`, `end`) are emitted per session

**And** the system falls back to the existing `cap` method if dumpcap is unavailable or the user selects the alternate backend

---

## Implementation Details

### Tasks / Subtasks

- Create `src/main/dumpcap-adapter.ts` to spawn `dumpcap` and stream pcap to the app
- Refactor `src/main/hl7-capture.ts` to accept external packet sources (EventEmitter) and decouple capture source from parsing
- Add unit tests for adapter parsing using pcap fixtures
- Add integration test using `scripts/mllp-sim.js` and a recorded pcap or live dumpcap in a CI-friendly environment
- Add README and docs for dumpcap installation and required privileges on Windows

### Technical Summary

Use Node's spawn API to start `dumpcap` with safe arguments. Parse pcap/pcapng from stdout using a streaming parser to extract IPv4/TCP payloads and forward payload Buffers to the capture manager via events.

### Project Structure Notes

- **Files to modify:** `src/main/hl7-capture.ts`, add `src/main/dumpcap-adapter.ts`
- **Expected test locations:** `tests/integration/hl7-capture.integration.test.ts`, `tests/unit/dumpcap-adapter.test.ts`
- **Estimated effort:** 2 story points (1-2 days)
- **Prerequisites:** `dumpcap` (Wireshark) installed and accessible; Npcap configured on Windows

### Key Code References

- `src/main/hl7-capture.ts` — HL7 capture manager
- `scripts/mllp-sim.js` — HL7 simulator used for testing

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md)

---

## Review Notes

Please review the adapter API and prefer secure spawn usage (no shell interpolation). Consider documenting a runtime toggle for backend selection.
