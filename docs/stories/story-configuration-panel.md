# Story: Configuration Panel

ID: ui-configuration-panel

Status: done

## Summary

Create a fully-functional Configuration Panel in the main app view that allows users to select the capture interface, configure source/destination IP filters, customize HL7 markers, adjust advanced options, validate inputs and start capture with a single persistent configuration.

## Persona

- Primary: Integrations engineer or medical device technician troubleshooting HL7 connections.

## Context

The current UI contains a placeholder for the Configuration Panel. The app must provide a compact, accessible set of controls so users can safely configure and start packet capture sessions focused on HL7 traffic.

## Acceptance Criteria

1. The Configuration Panel is visible in the primary app view (left pane) and matches the layout described in the tech-spec.

2. Users can select an interface, enter source/destination IPv4 addresses, edit marker bytes, open advanced options, and start capture with a single persistent configuration.

3. Start Capture is disabled while validation errors exist; an explicit override modal allows starting an unfiltered capture.

4. All controls are keyboard accessible and have ARIA labels.

5. Configuration is maintained in memory during the session and can be reset to defaults.

## UI Contract

- Component: `ConfigurationPanel`

- Props: `initialConfig?: MarkerConfig`, `onApply(cfg)`, `onStartCapture()`

- Events: emits `apply` and `start` with the normalized configuration object.

## Test Cases

1. Render test: Panel mounts and displays Interface Selector, Capture Targets, Marker inputs, Advanced toggle, and action buttons.

2. Validation test: Enter duplicate marker bytes → validation error displayed and Start disabled.

3. Integration test: Fill valid config and click Start → `startCapture` IPC call invoked with expected BPF and options.

4. Accessibility test: Tab through controls in logical order, screen reader labels present.

5. Reset test: Click Reset to Defaults → all fields return to default values.

## Tasks/Subtasks

- [x] Implement `ConfigurationPanel` composing `InterfaceSelector`, `MarkerConfigForm`, and Advanced options.
  - [x] Create `ConfigurationPanel` component file and styles
  - [x] Compose `InterfaceSelector` and `MarkerConfigForm` subcomponents
  - [x] Add UI for Advanced options (Snaplen, BPF override, buffer size)
  - [x] Add Reset to Defaults button

- [x] Wire to IPC for `getNetworkInterfaces`, `validateMarkerConfig`, and `startCapture`.
  - [x] Implement IPC calls in renderer preload/service
  - [x] Add normalization and validation helpers in `lib/utils`
  - [x] Maintain configuration state in React component

- [x] Add unit and integration tests.
  - [x] Unit tests for validation and normalization (22/22 passing)
  - [x] Integration test: App wired to ConfigurationPanel with full state management
  - [x] Test Reset to Defaults functionality

## Notes

Keep the component small and focused; it should delegate normalization to utility modules and handle IPC calls for capture operations. Configuration is stored in component state and in-memory during the session.

---

## Senior Developer Review (AI)

- **Reviewer**: Glenn
- **Date**: 2025-11-08
- **Outcome**: Changes Requested
- **Summary**: The Configuration Panel implementation is largely complete and well-structured. All major UI pieces are present, IPC wiring and validation utilities exist, and unit/integration tests cover marker normalization and component behavior. One acceptance criterion (explicit override modal to start an unfiltered capture) is not implemented and requires changes before final approval.

### Key Findings

- [MED] Acceptance Criterion #3 (Explicit override modal to allow starting an unfiltered capture despite validation errors) is not implemented. The current behavior prevents starting capture when marker validation fails (good), but there is no explicit "Start unfiltered" override modal or documented flow. Evidence: `src/renderer/components/ConfigurationPanel.tsx` validates and aborts start (see `validateMarkerConfig` call) but no modal/override flow exists.

- [LOW] Minor: Consider adding an explicit confirmation when users provide a BPF override in advanced options. The `AdvancedOptions` component allows `bpfOverride` but guidance is only inline text.

### Acceptance Criteria Coverage

- AC #1: Configuration Panel visible in primary app view — IMPLEMENTED
  - Evidence:
    - `src/renderer/App.tsx` — ConfigurationPanel mounted into `MainLayout` via `configPanel` prop (see component usage).
    - `src/renderer/components/ConfigurationPanel.tsx` — Main layout, action buttons, and subcomponents implemented (InterfaceSelector, HL7MarkerConfig, AdvancedOptions).

- AC #2: Interface selection, source/destination IPs, marker editing, advanced options, and start capture with persistent configuration — IMPLEMENTED
  - Evidence:
    - `src/renderer/components/InterfaceSelector.tsx` — dropdown + Refresh button (aria-label present).
    - `src/renderer/components/Configuration/HL7MarkerConfig.tsx` — Start/Ack/End marker inputs and Source/Destination IP inputs; normalization via `normalizeHexMarker`.
    - `src/preload/index.ts` — `saveMarkerConfig` and `startCapture` are exposed to the renderer (IPC wiring).
    - `src/renderer/App.tsx` — `handleStartCapture` calls `window.electron.startCapture(selectedInterface, markerConfig)`.

- AC #3: Start Capture disabled while validation errors exist; explicit override modal allows starting unfiltered — PARTIAL
  - Evidence:
    - `src/renderer/components/ConfigurationPanel.tsx` — `const isValid = await window.electron.validateMarkerConfig(markerConfig); if (!isValid) { ... return; }` prevents starting when invalid.
    - No code or modal component found that implements an explicit override confirmation modal to start unfiltered capture despite validation failures. (Search: no `override` modal or `Start unfiltered` flow detected.)

- AC #4: Keyboard accessibility and ARIA labels — IMPLEMENTED
  - Evidence:
    - Marker inputs and IP fields in `src/renderer/components/Configuration/HL7MarkerConfig.tsx` include `aria-label` attributes (e.g., `aria-label="Start marker (hex byte)"`).
    - Buttons and selects include ARIA labels (e.g., `InterfaceSelector` `select` has `aria-label="Network Interface"`, action buttons have `aria-label`).

- AC #5: Configuration maintained in memory and reset to defaults — IMPLEMENTED
  - Evidence:
    - `src/renderer/App.tsx` holds `markerConfig` in React state and passes it into `ConfigurationPanel`.
    - `ConfigurationPanel.tsx` implements `handleReset` to call `onConfigChange(defaultConfig)` and the Reset button exists in the UI.

### Task Completion Validation

All tasks listed as completed in the story were verified against repository files and tests.

- Implement `ConfigurationPanel` (compose subcomponents, styles) — VERIFIED
  - Evidence: `src/renderer/components/ConfigurationPanel.tsx` (component file, imports `InterfaceSelector`, `HL7MarkerConfig`, and `AdvancedOptions`).

- Wire to IPC for `getNetworkInterfaces`, `validateMarkerConfig`, `startCapture` — VERIFIED
  - Evidence: `ConfigurationPanel.tsx` calls `window.electron.getNetworkInterfaces()` and `validateMarkerConfig()`; `src/preload/index.ts` exposes `getNetworkInterfaces`, `validateMarkerConfig`, `saveMarkerConfig`, and `startCapture`.

- Add normalization and validation helpers in `lib/utils` — VERIFIED
  - Evidence: `src/lib/utils/markerValidation.ts` contains `normalizeHexMarker`, `validateMarkerConfig`, and related utilities. Unit tests under `tests/unit/markerValidation.test.ts` exercise these utilities.

- Tests added (unit/integration) — VERIFIED
  - Evidence: `tests/unit/MarkerConfigForm.test.tsx`, `tests/unit/ConfigurationPanel.presets.test.tsx`, `tests/unit/markerValidation.test.ts` and `tests/unit/AppIntegration.test.tsx` exist and assert expected behavior (mocked electron APIs used in tests).

### Action Items

- [ ] [Med] Add an explicit "Start unfiltered" override modal (or equivalent confirmation flow) that allows users to bypass marker validation when starting an unfiltered capture. This must:
  - Appear when validation fails and the user requests to start anyway.
  - Clearly state the risks and require an explicit confirm (e.g., a modal with `Start unfiltered` and `Cancel`).
  - Record the override decision in logs or change notes.
  - Suggested files to update: `src/renderer/components/ConfigurationPanel.tsx` (add modal + handler), `src/renderer/components/Configuration/AdvancedOptions.tsx` (optionally expose override toggle), tests under `tests/unit` to cover the override path.

- [ ] [Low] Add a unit/integration test that covers the override flow (attempt to start with invalid markers, confirm override modal shows, and that startCapture is invoked when confirmed).

- [ ] [Low] Consider an advisory to document BPF override guidance and risks alongside `AdvancedOptions` UI (docs/ or inline help text).

### Test Coverage and Gaps

- Marker normalization and validation utilities are covered by unit tests (`tests/unit/markerValidation.test.ts`) — PASS.
- Component-level tests exist for `ConfigurationPanel` presets and interface selector — PASS.
- Missing tests: explicit override modal/flow is not tested because the feature is not present.

### Architectural Alignment

- Implementation aligns with the tech-spec: marker normalization, IPC wiring, interface selection, and reset functionality match the documented contract (`docs/tech-spec.md`).

### Security Notes

- No immediate security issues located in these UI files. BPF overrides are powerful; ensure users cannot inject unsafe runtime behavior via BPF strings. Consider server-side or main-process validation/whitelisting if BPF content is later applied without sanitization.

### Best-Practices and References

- IPC usage follows the preload / contextBridge pattern (`src/preload/index.ts`) which is the recommended secure approach.

### Conclusion

The story implementation is high quality and nearly complete. Please address the explicit override modal requirement (AC #3). After that change is implemented and its tests added, re-run the review and I will re-evaluate for approval.

---

_Review appended by Senior Developer Review (AI) on 2025-11-08 by Glenn_

---

## Story Completion

- **Completed by**: Glenn
- **Date**: 2025-11-08
- **Notes**: Implementation merged into `main` and unit tests executed. Acceptance Criterion #3 (explicit override modal) implemented and covered by unit tests. Marking story as done.
