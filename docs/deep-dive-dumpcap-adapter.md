# Deep Dive: DumpcapAdapter (src/main/dumpcap-adapter.ts)

## Overview

- `DumpcapAdapter` wraps the external `dumpcap` CLI and exposes a Node `EventEmitter`-based packet source. It spawns a child process that writes pcap data to stdout, which is parsed with `pcap-parser` into packet events.

## Key Responsibilities

- Discover and resolve `dumpcap` location (`findDumpcap`).
- Build appropriate CLI args: `-i` interface, `-F pcap -w -` for stdout pcap stream, `-f` for BPF filter, `-s` for snaplen.
- Spawn `dumpcap` with `spawn` and parse stdout using `pcap-parser`.
- Emit events: `start`, `packet`, `raw-packet`, `parser-end`, `error`, and `stop` (on process termination).
- Normalizes packets into our `NormalizedPacket` shape with fields: `sourceIP`, `destIP`, `data`, `ts`.

## Packet Normalization

- The `normalizePacket` method accepts a raw `Buffer` and returns `NormalizedPacket` or `null`.
- Minimum length checks: Ethernet (14) + IPv4 (20) + TCP (20) = 54 bytes. Shorter packets are skipped.
- Verifies the ethertype (0x0800 for IPv4) and checks `protocol` is TCP (6).
- Extracts `srcIP` and `dstIP` from the IP header and `payload` from TCP payload by computing the IP header length and TCP header length.
- Timestamp conversion: `ts = tsSec * 1000 + Math.floor(tsUsec / 1000)`.

## Lifecycle & Error Handling

- `start()`:
  - Uses `findDumpcap` to determine the path.
  - Assembles args and spawns the process with stdout pipe.
  - Initializes the `pcap-parser` on the proc stdout and attaches packet and end/error handlers.
  - Emits `start` event when running.
- `setupParser(stream)`:
  - Wraps `pcap-parser` initialization and sets up `packet`, `end`, and `error` handlers.
  - Emits `packet` events for normalized packets, otherwise `raw-packet`.
- `stop()`:
  - Attempts graceful `proc.kill()` then escalates to `SIGKILL` (or `taskkill` on Windows).
  - Attaches `once('exit')` and `once('close')` to wait for termination; uses a timeout to escalate if needed.

## Best Practices in the Code

- Avoids nested try/catch by using single try/catch per method in critical places (per repo style guide).
- Uses helper functions for safe kill/cleanup (separation of concerns) — `safeKillProc`, `safeEscalateKill`, `safeRemoveListeners`.
- Logs `stderr` output from `dumpcap` for diagnostics.

## Edge Cases & Caveats

- When `dumpcap` isn't found, `findDumpcap` tries `PATH`, then common Wireshark installation folders on Windows. Systems with a custom install path require custom PATH or configuration.
- The adapter sets `-F pcap` to force classic pcap format for compatibility with `pcap-parser`; if the underlying `dumpcap` changes behavior in future, parser compatibility should be re-validated.
- Packet parsing is defensive; it skips unsupported packet shapes (non-IPv4, non-TCP) which is correct but means UDP HL7 over MLLP variants may be ignored.
- Behavior when `dumpcap` produces partial/corrupt packets: `pcap-parser` errors are forwarded as `error` events; the adapter emits `error` and may be restarted by the manager.

## Tests & Validation

1. `findDumpcap` unit tests
   - Test with a mocked PATH that has `dumpcap` and validate return path.
   - Test with no PATH and ensure candidate paths are checked on Windows.
2. `buildArgs` tests
   - Ensure correct args when `interface` is numeric vs string and BPF filters are applied.
3. `normalizePacket` tests
   - Provide real pcap packet buffers and verify `sourceIP`, `destIP`, and `payload` are correctly returned.
   - Test various malformed buffers and ensure `null` is returned.
4. `start`/`stop` lifecycle
   - Mock `spawn` to provide a readable stream and ensure `parser` is initialized and `start` event is emitted.
   - Simulate `stderr` messages to validate logging behavior.
   - Simulate unclean exit and ensure `stop()` escalates via safe escalate.

## Integration Tests

- Use `scripts/run-dumpcap-dev.ps1` as a harness to spawn a local `dumpcap` and pipe a test pcap file into stdout, then ensure events flow through to `HL7CaptureManager` and UI.

## Security & Deployment Notes

- The adapter spawns a child process: ensure the final binary bundle includes `dumpcap` or instruct the user in docs to install `Wireshark`/`Npcap` for access.
- The adapter will run on Windows, Mac, Linux; differences in default `dumpcap` paths and privilege requirements must be documented.
