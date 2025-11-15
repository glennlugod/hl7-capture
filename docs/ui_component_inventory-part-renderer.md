# UI Component Inventory — Renderer (part-renderer)

This list enumerates visible UI components and their responsibilities.

Component count: 13 (plus configuration subcomponents)

1. `ConfigurationPanel.tsx`
   - Path: `src/renderer/components/ConfigurationPanel.tsx`
   - Responsibility: Configuration controls and presentation of marker, submission, and app settings.
   - Subcomponents: `src/renderer/components/Configuration/*` (e.g., `HL7MarkerConfig`, `SubmissionConfig`)

2. `Configuration/HL7MarkerConfig.tsx`
   - Path: `src/renderer/components/Configuration/HL7MarkerConfig.tsx`
   - Responsibility: Marker hex input and validation UI for HL7 markers.

3. `Configuration/SubmissionConfig.tsx`
   - Path: `src/renderer/components/Configuration/SubmissionConfig.tsx`
   - Responsibility: Configure submission endpoint, auth headers and concurrency.

4. `Configuration/AdvancedOptions.tsx`
   - Path: `src/renderer/components/Configuration/AdvancedOptions.tsx`
   - Responsibility: Advanced capture options (snaplen, debug, etc.).

5. `MainLayout.tsx`
   - Path: `src/renderer/components/MainLayout.tsx`
   - Responsibility: Primary layout and shell for the application, includes header, sidebars, and main views.

6. `ControlPanel.tsx`
   - Path: `src/renderer/components/ControlPanel.tsx`
   - Responsibility: Start/stop/pause controls and capture interface selection.

7. `SessionList.tsx`
   - Path: `src/renderer/components/SessionList.tsx`
   - Responsibility: Shows a scrolling list of captured sessions, filter controls, and auto-scroll behavior.
   - Notable features: Performance-optimized item rendering (`React.memo`), keyboard navigation, submission status filter.

8. `SessionDetail.tsx`
   - Path: `src/renderer/components/SessionDetail.tsx`
   - Responsibility: Displays session-specific metadata and action buttons (retry, ignore, delete submission).

9. `MessageViewer.tsx` & `MessageDetailViewer.tsx`
   - Path: `src/renderer/components/MessageViewer.tsx`, `MessageDetailViewer.tsx`
   - Responsibility: Display decoded HL7 messages, hex and plain text, with selection and copy utilities.

10. `PacketTable.tsx`
    - Path: `src/renderer/components/PacketTable.tsx`
    - Responsibility: Grid/list view of individual packet raw bytes and metadata.

11. `StatusBar.tsx`
    - Path: `src/renderer/components/StatusBar.tsx`
    - Responsibility: Global status, capture statistics, and indicator badges.

12. `SubmissionStatusBadge.tsx`
    - Path: `src/renderer/components/SubmissionStatusBadge.tsx`
    - Responsibility: Small badge UI for submission status and tooltip information.

13. `InterfaceSelector.tsx`
    - Path: `src/renderer/components/InterfaceSelector.tsx`
    - Responsibility: Select network interface to capture (dropdown) and save selection.

Design / Component Patterns:

- UI components follow presentational + container patterns: `App.tsx` maintains state and passes props down to presentational components.
- Many components are small and focused, enabling granular testing and composability.
- Testing: `tests/unit/*` covers integration for App and components; PRDs include UI behavior validation.

Recommendations:

- Add an accessible `components/README.md` to document each component API and expected props,
  which aids in long-term maintainability and onboarding.
- Consider splitting large components into smaller ones for easier testing (already done for `Session` components).
