# Component Documentation — Renderer

This document collects component-level details, public props, events/callbacks, and recommended tests for the renderer UI components.

Summary of key components:

1. `App` — `src/renderer/App.tsx`
   - Role: Top-level application component; orchestrates IPC, manages high-level state (`sessions`, `isCapturing`, `selectedSession`) and wires event listeners (`onNewElement`, `onSessionComplete`, `onCaptureStatus`, `onError`).
   - Props/State: No external props (root), uses `window.electron` API for IPC. Stores `sessions`, `selectedSession`, `isCapturing`, `isPaused`, `interfaces`, and `markerConfig`.
   - Recommendations: Add unit tests for IPC listeners and optimistic UI updates during `startCapture`/`stopCapture`.

2. `ConfigurationPanel` — `src/renderer/components/ConfigurationPanel.tsx`
   - Role: Container for configuration settings: marker config, app settings, submission config, advanced options.
   - Props:
     - `markerConfig: MarkerConfig` — current marker configuration
     - `onConfigChange: (config: MarkerConfig) => void` — callback
     - `isCapturing?: boolean` — disables inputs if capturing
   - Subcomponents: `HL7MarkerConfig`, `AppSettings`, `SubmissionConfig`, `AdvancedOptions`

3. `InterfaceSelector` — `src/renderer/components/InterfaceSelector.tsx`
   - Role: Select active capture network interface
   - Props:
     - `interfaces: NetworkInterface[]`
     - `selected: NetworkInterface | null`
     - `onSelect: (iface: NetworkInterface | null) => void`
     - `onRefresh?: () => Promise<NetworkInterface[]> | void`
     - `disabled?: boolean`
   - Accessibility considerations: `select` element has `aria-label`, uses accessible markup.

4. `ControlPanel` — `src/renderer/components/ControlPanel.tsx`
   - Role: Start/Stop/Pause/Resume/Clear capture actions + buttons
   - Props:
     - `isCapturing: boolean`
     - `isPaused: boolean`
     - `onStartCapture: () => void`
     - `onStopCapture: () => void`
     - `onPauseCapture: () => void`
     - `onResumeCapture: () => void`
     - `onClearSessions: () => void`
   - Testing: button enable/disable states reflect UI `isCapturing` and `isPaused` flags. Keyboard shortcuts may be tested in integration tests.

5. `SessionList` — `src/renderer/components/SessionList.tsx`
   - Role: List captured sessions, filter by submission status, auto-scroll and keyboard navigation
   - Props:
     - `sessions: HL7Session[]`
     - `selectedSession: HL7Session | null`
     - `onSelectSession: (session: HL7Session) => void`
     - `autoScroll: boolean`
     - `onAutoScrollChange: (enabled: boolean) => void`
   - Key details: uses `React.memo` for list items; uses IntersectionObserver for auto-scroll.
   - Tests: rendering memoization, keyboard navigation, filter behavior, auto-scroll toggle persistence (localStorage), and submission status badges.

6. `SessionDetail` — `src/renderer/components/SessionDetail.tsx`
   - Role: Show session metadata, submission status, and actions (Retry/Ignore/Delete)
   - Props:
     - `session: HL7Session | null`
     - `onRetry?: (sessionId: string) => void`
     - `onIgnore?: (sessionId: string) => void`
     - `onDelete?: (sessionId: string) => void`
     - `onClose?: () => void`
   - Tests: Dependency on `submissionStatus` to enable/disable Retry/Ignore and display submission attempts and errors. Confirmation flow on Delete.

7. `MessageViewer` — `src/renderer/components/MessageViewer.tsx`
   - Role: Overlay viewer to present decoded HL7 messages, hex content, and session elements.
   - Props:
     - `session: HL7Session | null`
     - `onClose: () => void`
   - Accessibility: overlay should trap focus; consider a11y improvements (aria-modal, focus management) in future.

8. `PacketTable` — `src/renderer/components/PacketTable.tsx`
   - Role: Display detailed per-packet metadata in a table (timestamp, IPs, protocol, size)
   - Props:
     - `packets: CapturedPacket[]`
   - Tests: Verify formatting, zero-state message, and expected columns.

9. Config-related components (`HL7MarkerConfig`, `AdvancedOptions`, `SubmissionConfig`, `AppSettings`)
   - Role: Smaller, focused config panels within `ConfigurationPanel`
   - Props: Each component typically exposes `value`, `onChange`, and `disabled`.
   - Tests: Input validation, onChange callbacks, and disabled state behaviour.

## Component Testing & Documentation Standards

- Each component should export and document the props (React PropTypes / TypeScript interface) in a short block at the top of the file (done in most files). Include details in this docs file.
- Create Jest + React Testing Library tests for:
  - Prop-driven UI states (disabled/enabled)
  - Keyboard navigation and ARIA roles where relevant
  - Interactions causing IPC calls: mock `window.electron` to assert IPC calls triggered properly
- For larger components (e.g., `App`, `SessionList`), provide integration tests covering event sequences and state updates.

## How to use this doc

- This file should be used as a single source-of-truth when producing component PR documentation or when onboarding new UI contributors.
- Keep entries small and practical. If a component expands significantly, move to a dedicated `docs/components/<component>.md` file.
