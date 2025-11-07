# Story: Marker Configuration Form

## Summary

A compact form used inside the Configuration Panel that allows users to define, preview, and save packet/HL7 message markers. Markers are simple matching rules used to tag or highlight messages during capture (for filtering, tagging, or data extraction).

## Acceptance Criteria

1. User can create a new marker with fields: name, type (string|regex|hex), pattern, caseSensitive, active (boolean).
2. Shows an inline preview of the marker tested against a sample payload text area.
3. Allows editing and deleting existing markers with confirmation on delete.
4. Persist markers to local presets (via IPC) when user clicks Save.
5. Validation: regex compile errors are surfaced inline; hex input validates format.

## UI Contract (component)

Component: MarkerConfigForm

### Props

- marker?: Marker
- onChange(marker: Marker): void
- onSave: async function that accepts a Marker and returns a Promise (saves marker)
- onDelete: optional async function that accepts an id string and returns a Promise (deletes marker)

### Marker type

- id: string
- name: string
- type: 'string' | 'regex' | 'hex'
- pattern: string
- caseSensitive: boolean
- active: boolean

## IPC / Persistence

- Save: call the preload API `window.electron.savePreset(preset)` which returns a Promise
- Load presets: call the preload API `window.electron.loadPresets()` which returns a Promise resolving to an array of presets

## Edge cases

- Invalid regex: show error and disable Save until fixed.
- Large sample preview: limit preview size and indicate truncation.

## Tests (automated)

1. Unit: renders form fields and calls onChange with updated marker values.
2. Unit: validation blocks Save for bad regex and shows error message.
3. Integration: saving calls preload savePreset and persists state across reloads (mocked IPC).

## Tasks

1. Implement `MarkerConfigForm` component under `src/renderer/components/Configuration`.
2. Wire form to the ConfigurationPanel presets save/load flow.
3. Unit tests and accessibility checks.
