# Story: Configuration Panel

ID: ui-configuration-panel

Status: Approved

## Summary

Create a fully-functional Configuration Panel in the main app view that allows users to select the capture interface, configure source/destination IP filters, customize HL7 markers, adjust advanced options, save/load named presets, validate inputs and start capture.

## Persona

- Primary: Integrations engineer or medical device technician troubleshooting HL7 connections.

## Context

The current UI contains a placeholder for the Configuration Panel. The app must provide a compact, accessible set of controls so users can safely configure and start packet capture sessions focused on HL7 traffic.

## Acceptance Criteria

1. The Configuration Panel is visible in the primary app view (left pane) and matches the layout described in the tech-spec.

2. Users can select an interface, enter source/destination IPv4 addresses, edit marker bytes, open advanced options, save/load presets, and start capture.

3. Start Capture is disabled while validation errors exist; an explicit override modal allows starting an unfiltered capture.

4. All controls are keyboard accessible and have ARIA labels.

## UI Contract

- Component: `ConfigurationPanel`

- Props: `initialConfig?: MarkerConfig`, `onApply(cfg)`, `onStartCapture()`

- Events: emits `apply` and `start` with the normalized configuration object.

## Test Cases

1. Render test: Panel mounts and displays Interface Selector, Capture Targets, Marker inputs, Advanced toggle, Presets list, and action buttons.

2. Validation test: Enter duplicate marker bytes → validation error displayed and Start disabled.

3. Integration test: Fill valid config and click Start → `startCapture` IPC call invoked with expected BPF and options.

4. Accessibility test: Tab through controls in logical order, screen reader labels present.

## Tasks/Subtasks

- [ ] Implement `ConfigurationPanel` composing `InterfaceSelector`, `MarkerConfigForm`, Advanced options and Presets.
  - [ ] Create `ConfigurationPanel` component file and styles
  - [ ] Compose `InterfaceSelector` and `MarkerConfigForm` subcomponents
  - [ ] Add UI for Advanced options and Presets list

- [ ] Wire to IPC for `getNetworkInterfaces`, `validateMarkerConfig`, save/load presets and `startCapture`.
  - [ ] Implement IPC calls in renderer preload/service
  - [ ] Add normalization and validation helpers in `lib/utils`

- [ ] Add unit and integration tests.
  - [ ] Unit tests for validation and normalization
  - [ ] Integration test: fill valid config and trigger startCapture IPC

## Notes

Keep the component small and focused; it should delegate normalization and file IO to utility modules and main-process handlers.
