# Story: Core Layout & Custom Components

Status: ready-for-dev

## Story

As a **developer**,
I want **to implement the core three-panel application layout and create the initial custom components**,
so that **the application has a functional structure for displaying real-time session data and detailed message information**.

## Acceptance Criteria

1.  **AC #1: Three-Panel Layout Implementation**
    - Given: The application window is rendered.
    - When: The main view is displayed.
    - Then: A three-panel layout is present, consisting of a collapsible top Configuration Panel, a left Session List Panel, and a right Message Detail Panel.
    - Verified: The layout matches the structure defined in the `ux-design-specification.md`.

2.  **AC #2: Resizable Panels**
    - Given: The three-panel layout is visible.
    - When: The user drags the divider between the Session List and Message Detail panels.
    - Then: The width of the panels adjusts according to the user's input, adhering to the min/max widths defined in the UX spec (300px min, 600px max for Session List).
    - Verified: The panels resize smoothly without breaking the layout.

3.  **AC #3: Collapsible Configuration Panel**
    - Given: The Configuration Panel is visible at the top.
    - When: The user clicks the collapse toggle.
    - Then: The panel animates to its collapsed height, and the main content area expands to fill the available space.
    - Verified: The panel can be expanded and collapsed, and the layout adjusts correctly.

4.  **AC #4: Placeholder Custom Component Creation**
    - Given: The project structure is set up.
    - When: The developer creates the new component files.
    - Then: Placeholder files for `SessionList.tsx`, `MessageDetailViewer.tsx`, and `ConfigurationPanel.tsx` are created within the `src/renderer/components` directory.
    - Verified: Each component renders a basic placeholder (e.g., a `div` with the component name) in its designated panel.

5.  **AC #5: Component Integration into Layout**
    - Given: The placeholder components have been created.
    - When: The main application component is rendered.
    - Then: The `ConfigurationPanel`, `SessionList`, and `MessageDetailViewer` components are rendered within their respective layout panels.
    - Verified: The placeholder text for each component is visible in the correct location in the UI.

## Tasks / Subtasks

### Phase 1: Layout Scaffolding

- [ ] Create a new `MainLayout.tsx` component to house the three-panel structure.
- [ ] Use a library like `react-resizable-panels` to implement the resizable panel functionality.
- [ ] Add the collapsible functionality to the top Configuration Panel.
- [ ] Style the layout with basic colors and dividers from the design system.

### Phase 2: Custom Component Creation

- [ ] Create `src/renderer/components/ConfigurationPanel.tsx` with a basic placeholder.
- [ ] Create `src/renderer/components/SessionList.tsx` with a basic placeholder.
- [ ] Create `src/renderer/components/MessageDetailViewer.tsx` with a basic placeholder.

### Phase 3: Integration and Verification

- [ ] Import and place the three new components into the `MainLayout.tsx`.
- [ ] Render the `MainLayout` in the main `App.tsx`.
- [ ] Visually verify that the layout is functional and all placeholder components appear correctly.

## Dev Notes

### Technical Summary

This story builds upon the design system foundation to create the primary UI structure of the application. The three-panel layout is a critical piece of the core user experience, enabling users to monitor sessions and inspect details simultaneously. This implementation should focus on the structural integrity and responsiveness of the layout, using placeholder components that will be fully developed in subsequent stories.

### Learnings from Previous Story

- **Design System Ready**: The `ux-1-design-system-foundation` story established a complete `shadcn/ui` and Tailwind CSS theme. All layout styling (colors, spacing, borders) should use the utility classes and CSS variables from this system.
- **Component Structure**: New components should be created in the `src/renderer/components` directory, following the existing project architecture.
- **Styling Approach**: Avoid custom CSS files. All styling should be accomplished via Tailwind CSS utility classes to maintain consistency with the established design system.

### References

- **UX Design Specification:** [ux-design-specification.md](../ux-design-specification.md) - The single source of truth for the layout structure, dimensions, and component design.
