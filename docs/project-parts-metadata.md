# Project Parts Metadata — hl7-capture

This file enumerates the detected parts of the `hl7-capture` repository and extracts meta-information needed for documentation.

1. Part ID: `part-main`
   - Role: Electron main process
   - Root path: `src/main`
   - Project type: `desktop`
   - Primary technologies: TypeScript, Node.js, Electron
   - Required documentation areas (from documentation-requirements for `desktop`):
     - state_management: true
     - ui_components: true
     - deployment_config: true
   - Key files:
     - `src/main/index.ts`
     - `src/main/hl7-capture.ts` (core capture manager)
     - `src/main/dumpcap-adapter.ts`
     - `src/main/session-store.ts`
     - `src/main/submission-worker.ts`

2. Part ID: `part-preload`
   - Role: Preload context (bridge between main and renderer)
   - Root path: `src/preload`
   - Project type: `desktop`
   - Primary technologies: TypeScript, contextBridge, IPC
   - Required documentation areas:
     - state_management: false (preload exposes IPC surface)
     - ui_components: false
     - deployment_config: true (packaging, forge config integration)
   - Key files:
     - `src/preload/index.ts`

3. Part ID: `part-renderer`
   - Role: Renderer UI
   - Root path: `src/renderer`
   - Project type: `web` (renderer is React app within desktop)
   - Primary technologies: React, TypeScript, Vite
   - Required documentation areas:
     - state_management: true (React-based state patterns present)
     - ui_components: true
     - deployment_config: false (handled by main/forge)
   - Key files:
     - `src/renderer/index.tsx`
     - `src/renderer/App.tsx` and `src/renderer/components/`

4. Part ID: `part-common`
   - Role: Shared types and utilities between main/preload/renderer
   - Root path: `src/common`
   - Primary technologies: TypeScript
   - Key files:
     - `src/common/types.ts` (canonical cross-process types)
     - `src/common/*` utility modules

5. Part ID: `part-native`
   - Role: Native adapters, pcap dependencies
   - Root path: `src/native` (and `scripts` + `setup-npcap.js`)
   - Notes: Contains helper code for Npcap/dumpcap integration

Project classification summary:

- Repository type: `monolith` (single repo with multiple parts)
- Primary project type: `desktop` (Electron-based desktop app)
- Scan level: `deep` (we will read critical files for richer context in subsequent steps)

Suggested documentation files to generate next (high-level):

- `bmm-index.md` — top level index describing parts and overall architecture
- `api-contracts-part-renderer.md` — if the renderer exposes an API (unlikely)
- `data-models-part-main.md` — if any data model documentation is present
- `ui_component_inventory-part-renderer.md` — inventory of renderer components
- `state_management-part-renderer.md` — state management patterns for renderer
- `deployment_config.md` — packaging, build, and electron forge config
