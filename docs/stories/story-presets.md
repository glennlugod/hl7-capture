# Story: Capture Presets

Status: done

## Summary

Presets are named configurations that bundle interface selection, markers, capture filters, and other settings. This feature allows users to save and re-load commonly used capture configurations.

## Acceptance Criteria

1. List existing presets with name, modified time, and brief preview of key fields.
2. Create new preset from current Configuration Panel settings.
3. Rename, duplicate, export (JSON), import (JSON), and delete presets.
4. Selecting a preset applies settings to the Configuration Panel and triggers an optional auto-apply confirmation.

## UI Contract (component)

Component: PresetsList

### Props

- presets: CapturePreset[]
- onApply: function that accepts an id string and applies the preset
- onExport: async function that accepts an id and returns a Promise which resolves to an exported JSON string
- onImport: async function that accepts a JSON string and returns a Promise which resolves when import is complete
- onDelete: async function that accepts an id and returns a Promise which resolves when delete is complete

### CapturePreset type

- id: string
- name: string
- description?: string
- createdAt: string
- updatedAt: string
- settings: object (interfaceId?, markers?, filters?)

## IPC / Persistence

- loadPresets: call preload `window.electron.loadPresets()` to get presets (returns a Promise)
- savePreset: call preload `window.electron.savePreset(preset)` to persist a preset (returns a Promise)
- exportPreset: call preload `window.electron.exportPreset(id)` to get a JSON string for export
- importPreset: call preload `window.electron.importPreset(json)` to import a preset from JSON

## Edge cases

- Import with conflicting ids: offer rename or merge options.
- Large number of presets: provide pagination or search.

## Tests (automated)

1. Unit: renders list with actions and calls onApply when Apply clicked.
2. Integration: mock preload persistence; creating a new preset adds it to the list.
3. Export/Import roundtrip test ensures settings restored exactly.

## Tasks

1. Implement `PresetsList` component under `src/renderer/components/Configuration`.
2. Implement preload/main handlers for save/load/export/import using file system under `docs/config-presets/` or app data.
3. Unit and integration tests.
