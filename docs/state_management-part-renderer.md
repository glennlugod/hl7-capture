# State Management — Renderer (part-renderer)

Summary:

- The renderer primarily uses React local component state (`useState`) and props propagation rather than a centralized state management library (e.g., Redux).
- Sessions list is maintained at the top-level `App` component as `sessions: HL7Session[]` and passed down to `SessionList` / `SessionDetail` as props.
- IPC-based event model drives state updates:
  - `window.electron.onSessionComplete` listener in `App.tsx` updates `sessions` via `setSessions`.
  - `window.electron.onCaptureStatus` updates `isCapturing` / `isPaused` state.
- Session submission updates use a mix of IPC events and local state updates (`onSubmissionResult` handler updates session `submissionStatus`), and local UI state (e.g., `selectedSession`).
- UI preference persistence uses `localStorage` for `autoScroll` preference (`hl7-capture-autoscroll`).
- No global or external store detected. Patterns that could be considered for future scale:
  1. Introduce a React `Context` (e.g., `SessionsContext`) to centralize session state and avoid prop drilling for larger apps.
  2. Use server-style cache or local IndexedDB for very large session storage to avoid memory pressure.
  3. For cross-component communication, consider a small event emitter or `zustand` for simplicity if global state becomes complex.

File and references:

- `src/renderer/App.tsx` — root app component, stores `sessions`, `selectedSession`, `isCapturing`, `isPaused`, and `markerConfig`.
- `src/renderer/components/*` — each component receives relevant state via props (e.g., `SessionList`, `SessionDetail`).
- `src/renderer/components/SessionList.tsx` — manages list-level filters and local view state (auto-scroll, statusFilter).

Recommendations / Next Steps:

- Consider creating a `SessionsContext` if more components need read/write access to `sessions` beyond top-level and child components.
- Add unit tests for event-driven session updates and ensure `onSessionComplete` adds sessions as expected.
