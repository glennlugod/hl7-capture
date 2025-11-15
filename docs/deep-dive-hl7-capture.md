# Deep Dive: HL7CaptureManager (src/main/hl7-capture.ts)

## Overview

- The `HL7CaptureManager` class is the core of the packet-capture and HL7 session lifecycle management. It:
  - Starts/stops capture (internal `DumpcapAdapter` or an external `PacketSource`),
  - Tracks sessions composed of HL7 elements (start, ack, message, end),
  - Emits granular events (`element`/`session-complete` / `status` / `error`),
  - Integrates persistence, cleanup, and background submission workers.

## Why this file matters

- All HL7 protocol detection and session building is implemented here, so the logic maps directly to the user-visible session UI and the persisted data (session JSON files).
- Key survival mechanisms (atomic writes, crash recovery) are integrated via `SessionStore`.

## API & Event Surface

- Public Methods (main API used by main process or test harness):
  - `getNetworkInterfaces()`
  - `validateMarkerConfig(config)`
  - `startCapture(networkInterface, config)`
  - `attachPacketSource(source)` / `detachPacketSource(stopFirst = true)`
  - `stopCapture()` / `pauseCapture()` / `resumeCapture()`
  - `getSessions()` / `getStatus()` / `clearSessions()`
  - Persistence APIs: `initializePersistence(sessionDir, enable, retentionDays)`, `getPersistedSessions()`, `deletePersistedSession(sessionId)`
  - Cleanup/Submission worker lifecycle & trigger APIs

- Events (EventEmitter):
  - `element` — Emitted for every new element detected (start, ack, message, end)
  - `session-complete` — Session ended (when end marker received)
  - `status` — current capture status (used for UI to show capturing/paused counts)
  - `error` — any recoverable/unrecoverable errors
  - `cleanup-summary`, `submission-progress`, `submission-result`, `logging-config-update`

## State Machine & Flow

High level session flow (simplified):

1. Start capture is called → manager creates `DumpcapAdapter` (or uses external source) and wires events
2. Packet events arrive (via `packet` events) → `processPacket` receives raw bytes or normalized objects
3. Single-byte packets (length === 1) are interpreted as HL7 markers:
   - 0x05: Start marker → `handleStartMarker` creates a new session; activeSessionKey set
   - 0x06: Acknowledge → `handleAckMarker` adds ack element to active session
   - 0x04: End marker → `handleEndMarker` marks session complete and persists it (if enabled)
4. Multi-byte payloads are considered HL7 message fragments → `handleMessage` gathers payload into `sessionBuffer` and extracts messages terminated by CR LF (`\r\n`)
5. On end marker, session is closed, emitted via `session-complete`, and optionally persisted.

## Edge Cases & Important Details

- Direction handling: The manager accepts normalized packets with `sourceIP`/`destIP`. It defaults to `device-to-pc` direction for all operations when IPs aren't available. If a normalized packet has IPs, it sets the direction appropriately for `start` elements (currently defaulting to `device-to-pc` in handlers; this could be improved by comparing IPs to `MarkerConfig.deviceIP` and `MarkerConfig.lisIP`).
- Buffering: HL7 messages may be split across multiple TCP packets. `sessionBuffer` is used to reassemble messages; the logic looks for CR LF (`\r\n`) to identify message boundaries. This will work for most devices but consider HL7 frames that use different terminators or multiple messages per packet.
- Session concurrency: The manager currently supports only sequential sessions: a single active session at a time (`activeSessionKey`). If there are simultaneous sessions coming from multiple device IPs, the current design may not support multiple open sessions concurrently — consider mapping active sessions by source/dest tuple if simultaneous sessions are a requirement.
- Max sessions: `maxSessions` default 100; oldest sessions are evicted without persistence unless persistence is enabled and store writes occur earlier.
- Persistence: `sessionStore.saveSession` runs asynchronously when a session completes. There's no immediate backpressure; if persistence fails the error is only logged.

## Notable Implementation Points

- `startCapture` — decides whether to use an external source. If the internal DumpcapAdapter fails to start, it tries to stop it safely to avoid orphan processes.
- `attachPacketSource` — subscribes to `packet`, `start`, `stop`, `error`, and `log` events, and forwards packet events to `processPacket`.
- `processPacket` — normalizes length checks; counts packets; prints debug logs; updates `packetCount` and sends `status` updates at important transitions.
- `handleMessage` — uses `Buffer.concat` to assemble messages and `indexOf(Buffer.from('\r\n'))` to find message boundaries.

## Potential Improvements & Recommendations

1. Multi-Session Concurrency: Extend session mapping to support multiple concurrent active sessions keyed by `sourceIP:destIP:port` so parallel device comms can be captured properly.
2. Direction Inference: Use `markerConfig.deviceIP` and `markerConfig.lisIP` to infer element direction (`device-to-pc` vs `pc-to-device`) consistently rather than defaulting to `device-to-pc`.
3. Marker Config Validation: Provide stricter validation, particularly ensuring no overlapping marker bytes or non-displayable values.
4. Optional frame terminator flexibility: Some devices may not use CRLF; consider `endSequence` config option for message terminators.
5. Buffer cutoff: Add a maximum message size/timeout to prevent unbounded `sessionBuffer` growth when receiving malformed data.
6. Persistence backpressure: Optionally write sessions before emitting `session-complete` to ensure disk persistence succeeded, or produce a retry strategy if the store operation fails.
7. Telemetry and metrics: Expose counters for `packetCount`, `sessionCount`, `elements`, `failedWrites` for observability.

## Suggested Unit Tests

1. Start/Stop Capture
   - Attach a fake `PacketSource` (EventEmitter) that emits `packet` events and ensure: startCapture -> `attachPacketSource`, `status` emitted, stopCapture -> `stop` called and `status` false.
2. Start Marker & Session Create
   - Mock a `NormalizedPacket` with `data = Buffer.from([0x05])` followed by message CRLF and `Buffer.from([0x04])` and assert `session` created, messages present, `session-complete` emitted.
3. Ack Marker
   - Ensure ack marker adds `ack` element to active session.
4. Chunked message reassembly
   - Emit message payload split across two `packet` events; assert the messages array receives a single message when CRLF arrives.
5. MaxSessions eviction
   - Create more than `maxSessions` sessions and check the oldest are evicted.
6. Persistence and crash recovery
   - Initialize `SessionStore` and persist; simulate crash via orphaned `.tmp` file; use `performCrashRecovery` to validate recovered stats.
7. Resilience to malformed packets
   - Send zero-length or non-TCP buffers and assert no crash and no session creation.

## Integration Test Recommendations

- Scripted strategy: Use `scripts/send-hl7.js` or `scripts/mllp-sim.js` to simulate devices and test real end-to-end flow using the `DumpcapAdapter` live process: generate HL7 messages and verify the manager emits expected `element` and `session-complete` events.
- Validate IPC mapping: Ensure preload and main process map event names consistently (preload listens for `hl7-element-received`, manager emits `element`). Verify `main/index.ts` forwards manager `element` events to the renderer under the IPC channel name `hl7-element-received`.

## Examples: Typical HL7 Session Sequence

1. Device -> PC (0x05) — manager creates session with `start` element.
2. Device -> PC (HL7 message + CRLF) — `message` element created.
3. PC -> Device (0x06) — `ack` element appended.
4. Device -> PC (0x04) — `end` element appended, manager sets `isComplete=true` and emits `session-complete`.

## Files & Locations of Interest

- `src/main/hl7-capture.ts` — manager class (this file)
- `src/main/dumpcap-adapter.ts` — adapter used by manager for live capture
- `src/main/session-store.ts` — persistence logic used by the manager
- `src/preload/index.ts` — IPC mapping (guarantee event names are consistent)
