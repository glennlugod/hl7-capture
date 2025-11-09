## HL7-Capture — AI assistant instructions

Follow these concise, actionable rules when modifying or extending this repository.

- Big picture (what runs where): this is an Electron + React desktop app.
  - Main process: `src/main/*` — app lifecycle, creates `BrowserWindow`, owns `HL7CaptureManager`.
  - Preload: `src/preload/index.ts` — contextBridge API exposed as `window.electron` for the renderer.
  - Renderer: `src/renderer/*` — React UI (Vite dev server during development).
  - Packet capture backend: `src/main/hl7-capture.ts` + `src/main/dumpcap-adapter.ts` (uses external dumpcap when no embedded source).

- Quick dev commands (Windows dev environment):
  - Install deps: `npm install` (postinstall runs `electron-rebuild` and `scripts/setup-npcap.js`).
  - Start full app (main + renderer): `npm run dev` (uses electron-forge + vite plugin).
  - Start only renderer dev server: `npm run dev:renderer` (useful when iterating UI only).
  - Run tests: `npm test` / `npm run test:watch` / `npm run test:coverage`.

- Important files and symbols to reference when coding:
  - `src/main/hl7-capture.ts` — HL7CaptureManager: core state machine for markers, sessions, and event emissions.
  - `src/preload/index.ts` — IPC surface: methods (`getNetworkInterfaces`, `startCapture`, `stopCapture`, etc.) and event registration helpers.
  - `src/common/types.ts` — canonical types (MarkerConfig, HL7Element, HL7Session) used across processes. Use these for signatures.
  - `src/main/index.ts` — wiring of HL7CaptureManager → BrowserWindow (sends IPC messages like `session-complete` and `capture-status`).
  - `scripts/send-hl7.js` and `scripts/mllp-sim.js` — utilities to simulate HL7 traffic during tests/dev.

- IPC contract (use `src/preload/index.ts` as the source of truth):
  - Methods (invoke): `getNetworkInterfaces`, `startCapture(interface, config)`, `stopCapture`, `pauseCapture`, `resumeCapture`, `getSessions`, `clearSessions`, `saveMarkerConfig`, `validateMarkerConfig`.
  - Events (subscribe): helpers exposed as `onNewElement`, `onSessionComplete`, `onCaptureStatus`, `onError`.
  - Note: while implementing or fixing code, validate channel names — there is a discoverable mismatch in this codebase: the main process currently sends `new-element` but the preload listens for `hl7-element-received`. Prefer aligning code to the preload API (or fix both sides and include tests).

- HL7-specific behaviors to preserve:
  - Marker defaults: start=0x05, ack=0x06, end=0x04 — defined/used in `HL7CaptureManager` and `src/common/types.ts`.
  - Session lifecycle: start marker → optional ack → message(s) → end marker. Sessions are stored in-memory and limited by `maxSessions` in `HL7CaptureManager` (default 100).
  - Direction is determined by comparing packet source IP to configured `sourceIP` (MarkerConfig).

- Project conventions and gotchas:
  - Build outputs: Vite builds renderer to `.vite/renderer` and main/preload to `.vite/build` (see `vite.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`). Keep imports relative to those outputs.
  - Native capture dependencies: Windows requires Npcap; `npm run postinstall` runs setup steps. Tests/dev that touch native modules may need `electron-rebuild` and elevated permissions.
  - Types: `src/common/types.ts` is the single source of truth for cross-process data shapes. Update it when adding new IPC payload fields.
  - Event names: double-check the strings used for `ipcRenderer.on` vs `webContents.send` to avoid silent bugs (see the `new-element` vs `hl7-element-received` mismatch).

- Testing and simulation:
  - Use `scripts/send-hl7.js` and `scripts/mllp-sim.js` to generate HL7 traffic for integration tests.
  - Unit tests live under `tests/unit/`; integration tests under `tests/integration/`. Follow existing test patterns (Jest + jsdom for renderer pieces).

- Small, safe changes AI agents should do automatically:
  - When changing IPC payloads, update `src/common/types.ts`, `src/preload/index.ts`, `src/main/index.ts`, and add/update a unit/integration test that exercises the channel.
  - If you modify capture behavior, add a unit test for `HL7CaptureManager` covering start/ack/message/end flows and at least one integration test using `scripts/send-hl7.js` or a mocked packet source.

- When you need to run dumpcap locally for debugging:
  - Use the helper: `.
scripts\run-dumpcap-dev.ps1 -Interface <index> -Filter "tcp"` on Windows (PowerShell).
  - Ensure Npcap is installed and consider running PowerShell as Administrator if capture fails.

- When in doubt:
  - Read `src/preload/index.ts` for the renderer API contract.
  - Read `src/main/hl7-capture.ts` for capture state machine details.
  - Preserve existing event names or update them consistently in both main and preload.

If any of these sections are unclear or you want more examples (tests, small refactors, or an automated IPC-channel consistency check), say which area to expand and I will iterate.
