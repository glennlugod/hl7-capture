# Story: Marker Configuration Form

ID: ui-marker-config-form
Status: done

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

## Dev Agent Record

### Context Reference

- docs/stories/story-marker-config-form.context.xml

### Debug Log

- Initialized MarkerConfigForm component
- Added Marker interface and updated types

### Change Log

- Added new Configuration/MarkerConfigForm.tsx component
- Updated common types with Marker interface

### File List

- src/common/types.ts
- src/renderer/components/Configuration/MarkerConfigForm.tsx

### Status

- [ ] Tasks implemented and tested
- [ ] Story ready for review

3. Unit tests and accessibility checks.

## Senior Developer Review (AI)

# Ad-Hoc Code Review Report

**Review Type:** Ad-Hoc Code Review  
**Reviewer:** Glenn  
**Date:** 2025-11-07

**Files Reviewed:**

- src/common/types.ts
- src/renderer/components/Configuration/MarkerConfigForm.tsx

**Review Focus:** General quality and standards

---

## Summary

The MarkerConfigForm component and related types handle user-defined HL7 marker configurations. Overall, the implementation is clear and leverages React hooks effectively. A few improvements are recommended to align with quality standards and requested acceptance criteria.

---

## Key Findings

### High Severity

_None_

### Medium Severity

- **Validation Feedback Missing**
  - The component silently swallows regex errors (useEffect catch) without informing the user.
  - **Recommendation:** Surface compile errors inline next to the Pattern field; disable the Save button until the pattern is valid.

- **Hex Input Format Validation**
  - Hex patterns are treated as simple substring matches without verifying hex format.
  - **Recommendation:** Validate that input matches `/^[0-9A-Fa-f]+$/`; show error if invalid.

### Low Severity

- **Import Path Verbosity**
  - Uses relative import `../../../common/types`.
  - **Suggestion:** Consider configuring tsconfig path alias (e.g., `@common/types`) for clarity.

---

## Test Coverage and Gaps

- No explicit unit tests verify the inline validation behavior or error states for invalid patterns.
- **Suggestion:** Add tests for:
  - Blocking Save when the pattern is invalid (regex/hex).
  - Displaying error messages for invalid patterns.

---

## Architectural Alignment

- Component structure follows existing conventions.
- No architecture violations detected.

---

## Security Notes

- No injection or XSS risks found in the pattern matching logic.
- Pattern building uses escaped input for non-regex types, mitigating regex injection.

---

## Best-Practices and References

- React Hooks rules: onChange effect correctly depends on `onChange`.
- **Reference:** React docs on [conditional form validation](https://reactjs.org/docs/forms.html#validation).

---

## Action Items

### Code Changes Required

- [ ] [Med] Add inline error messages and disable Save when regex compile fails (MarkerConfigForm.tsx).
- [ ] [Med] Implement hex format validation and show errors for non-hex input (MarkerConfigForm.tsx).
- [ ] [Low] Refactor import paths to use tsconfig path aliases for shared types (MarkerConfigForm.tsx).

### Advisory Notes

- Note: Consider adding unit tests covering validation behavior for patterns.
- Note: Evaluate Buffer usage in `HL7Element.rawBytes`; ensure compatibility in renderer.
