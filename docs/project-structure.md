# Project Structure — hl7-capture

Summary:

- Repository root: `d:\projects\hl7-capture`
- Classification: `monolith` (single repository with multiple runtime parts)
- Project type (detected): `desktop` (Electron + Renderer) based on key indicators: `package.json`, `src/main`, `src/renderer`, `vite.main.config.ts`, Electron devDependencies
- Scan level: `deep` (selected)

Detected top-level parts:

1. `main` — Electron main process
   - Path: `src/main`
   - Role: App lifecycle, system integrations, native adapters
   - Primary tech: TypeScript, Node.js, Electron
   - Notable files: `index.ts`, `hl7-capture.ts`, `dumpcap-adapter.ts`, `logger.ts`, `session-store.ts`

2. `preload` — Preload context bridge
   - Path: `src/preload`
   - Role: Exposing IPC surface to renderer (contextBridge) and shaping IPC contracts
   - Primary tech: TypeScript
   - Notable files: `index.ts`

3. `renderer` — UI (React)
   - Path: `src/renderer`
   - Role: Frontend, UI pages, components
   - Primary tech: React + TypeScript + Vite
   - Notable files: `App.tsx`, `index.tsx`, `components/`, `pages/`

4. `common` — Shared types and utilities
   - Path: `src/common`
   - Role: Cross-process types (`common/types.ts`), helpers used by main and renderer

5. `scripts` — Development utilities and tests
   - Path: `scripts`
   - Role: Utilities to simulate HL7 traffic and helpers such as `send-hl7.js`, `mllp-sim.js`, `setup-npcap.js` and other dev scripts.

Packaging and build:

- Electron + Vite integration: `@electron-forge/plugin-vite`, `vite.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`.
- Main entry from `package.json`: `.vite/build/main.js` (build outputs)

Other noteworthy folders:

- `docs/` — Workflow and design docs, output target for this workflow
- `tests/` — Unit and integration tests
- `public/` — Static assets for renderer
- `native/` — Platform-native helpers and c-bindings (ncpcap/dependencies)

Next steps: create `project-parts-metadata` with details for each part (files, docs, patterns).
