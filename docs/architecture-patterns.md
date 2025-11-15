# Architecture Patterns — hl7-capture

This document captures the architectural patterns used across the repository and summarizes the high-level design and data flow.

## High-Level Architecture

- Multi-process Electron app with three main runtime roles:
  - Main process (Node/Electron): owns system integrations and the capture manager
  - Preload process: secure IPC surface to expose typed APIs to renderer
  - Renderer process (React): UI and user interactions

## Data Flow

1. `Dumpcap` (external CLI) or alternative packet source produces a pcap data stream.
2. `DumpcapAdapter` reads stdout stream and uses `pcap-parser` to produce packet events.
3. `HL7CaptureManager` receives normalized packets and applies detection rules for HL7 markers, building sessions.
4. Session events are emitted from the main process to the renderer via IPC (preload bridges `ipcRenderer` to `window.electron`).
5. Renderer shows sessions and interacts back to the manager via the preload API for commands (start/stop/pause/resume, configure markers, etc.).

## Design Patterns Observed

- Adapter Pattern (DumpcapAdapter): Abstracts an external process (dumpcap) into a normalized `PacketSource` EventEmitter, allowing swapping test harnesses or other packet providers.
- Manager Pattern (HL7CaptureManager): Coordinates capture lifecycle, tracks sessions, and emits a unified event stream of elements.
- Worker Pattern: Background operations like cleanup and submissions are separated into `CleanupWorker` and `SubmissionWorker` to isolate responsibilities and enable concurrency.
- Repository/Store Pattern: `SessionStore` encapsulates persistence operations, ensuring session files are isolated and recoverable.
- Event-Driven / Observer Pattern: Use `EventEmitter` extensively to decouple producer/consumer logic and simplify unit testing.
- Defensive Parsing: Parser code intentionally avoids throwing by performing length checks, and emits 'raw-packet' vs 'normalized' events so the rest of system is robust to corrupted inputs.
- Single Responsibility + Separation of Concerns: Each major area (packet parsing, capture management, persistence, submission) has a focused module and file.

## Integration Points

- `dumpcap` spawn and stdout parsing (platform dependent; requires Npcap on Windows)
- `pcap-parser` for binary pcap parsing
- `ipcRenderer` & `contextBridge` for secure IPC to renderer
- `winston` for structured logging, configured to rotate logs

## Security Considerations

- Context Isolation enabled for preload; `contextBridge` used to expose typed APIs
- App interacts with network capture utilities: elevated permissions required; HIPAA/PHI considerations around captured data

## Scalability & Extensibility Observations

- Adapter pattern allows swapping capture provider for tests and alternative capture methods
- Background workers for cleanup and submission make it easy to plug in additional background tasks
- Using a central `common` types file helps maintain contract consistency across processes
