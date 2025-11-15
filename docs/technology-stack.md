# Technology Stack — hl7-capture

This document summarizes the detected technology stack for each repository part.

---

## Part: main (src/main)

- Role: Electron main process
- Languages/Targets: TypeScript (compiled to ES2020/ESNext), Node.js runtime
- Build: Vite (see `vite.main.config.ts`) — bundle as CommonJS, externalizes `electron`
- Primary Libraries:
  - `pcap-parser` — parse pcap stream emitted by dumpcap
  - `winston` + `winston-daily-rotate-file` — structured logging
  - `electron-squirrel-startup` — Windows installer integration
  - `child_process` (node builtin) — spawn `dumpcap` for capture
  - `fs`, `path`, `os` (node builtin)
- Key TypeScript files: `src/main/hl7-capture.ts`, `src/main/dumpcap-adapter.ts`, `src/main/session-store.ts`, `src/main/submission-worker.ts`, `src/main/logger.ts`
- Responsibilities:
  - Packet capture coordination (DumpcapAdapter) and normalization
  - HL7 session state machine and session persistence
  - Background workers (cleanup and submission)
  - IPC channel wiring back to renderer via preload

---

## Part: preload (src/preload)

- Role: Preload (Secure IPC) context bridging main process to renderer
- Languages/Targets: TypeScript compiled via Vite (see `vite.preload.config.ts`) as CommonJS `preload.js`
- Primary APIs: `contextBridge.exposeInMainWorld`, `ipcRenderer.invoke` and `ipcRenderer.on`
- Key TypeScript files: `src/preload/index.ts`
- Responsibilities:
  - Provide a typed, secure IPC surface (`window.electron`) to the renderer
  - Validate and expose capture, persistence, cleanup, and submission APIs

---

## Part: renderer (src/renderer)

- Role: GUI (React-based) for the application
- Languages/Targets: TypeScript + React 18, JSX: react-jsx
- Build: Vite (see `vite.config.ts`) producing files under `.vite/renderer`
- Primary Libraries:
  - `react`, `react-dom` — UI library
  - `@vitejs/plugin-react` — JSX and plugin support
  - `@radix-ui/react-slot`, `lucide-react`, `react-resizable-panels`, `react-window` — UI components and layout
  - `tailwindcss` + `postcss` — UI styling
- Key files: `src/renderer/index.tsx`, `src/renderer/App.tsx`, `src/renderer/components/*`
- State Management: Local React hooks (useState), small local context patterns may be present in components (no external state library like Redux detected)
- Testing: `jest`, `@testing-library/react`

---

## Part: common (src/common)

- Role: Shared types, interfaces, constants used across processes
- Key files: `src/common/types.ts`
- Notes: Central source of truth for cross-process types (MarkerConfig, HL7Element, HL7Session, etc.)

---

## Part: native (scripts & src/native)

- Role: Native capture support and helper scripts (Npcap setup, dumpcap dev helpers)
- Primary files and scripts:
  - `scripts/setup-npcap.js` — copies Npcap DLLs to `cap` module build folder on Windows
  - `scripts/run-dumpcap-dev.ps1` — helper to run dumpcap in developer scenarios
  - `src/native` (placeholder) — native bindings or platform-specific modules
- Notes: packet capture is performed using platform tools (dumpcap) rather than direct kernel drivers in the app; the repo includes helper scripts centered around Npcap/dumpcap

---

## Additional Notes

- TypeScript: TSConfig targets ES2020 and module resolution is Node, allowing modern JS features
- Multi-part repo: Renderer uses web-like patterns and passes messages to main via preloading; main process is Node/Electron-oriented.
