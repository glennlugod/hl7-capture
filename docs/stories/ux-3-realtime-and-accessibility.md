# Story: Real-time Updates & Accessibility Polish

Status: ready-for-dev

## Story

As a **medical device engineer**,
I want **real-time session updates with complete accessibility support**,
so that **I can monitor live HL7 communication efficiently and all users can access the application regardless of ability**.

## Acceptance Criteria

1. **AC #1: Real-time Session Updates**
   - Given: Capture is active and HL7 traffic is flowing.
   - When: A new session is detected.
   - Then: The session appears in the Session List with a smooth fade-in animation (300ms).
   - Verified: Sessions append to the list without jarring insertions or layout shifts.

2. **AC #2: Auto-scroll Behavior**
   - Given: Auto-scroll is enabled in preferences.
   - When: A new session arrives while user is at or near the bottom of the Session List.
   - Then: The list automatically scrolls to show the newest session.
   - Verified: User can disable auto-scroll and maintain their current scroll position.

3. **AC #3: Selection Persistence During Updates**
   - Given: User has selected a session for inspection.
   - When: New sessions arrive and are added to the list.
   - Then: The currently selected session remains selected and visible.
   - Verified: Real-time updates do not disrupt the user's current focus.

4. **AC #4: Keyboard Navigation**
   - Given: The application is focused.
   - When: User presses keyboard shortcuts.
   - Then: Navigation works as specified:
     - `↑/↓`: Navigate between sessions in the list
     - `←/→`: Navigate messages in the timeline (when session selected)
     - `Tab`: Switch between Hex/Decoded views in detail panel
     - `Ctrl/Cmd + S`: Toggle Start/Stop capture
     - `Ctrl/Cmd + K`: Clear sessions (with confirmation if enabled)
     - `Esc`: Close modals, collapse panels
   - Verified: All keyboard shortcuts function correctly across all panels.

5. **AC #5: Focus Indicators**
   - Given: User is navigating with keyboard.
   - When: Focus moves to any interactive element.
   - Then: A clear 2px teal outline appears around the focused element.
   - Verified: Focus indicators are visible against all backgrounds and meet 3:1 contrast ratio.

6. **AC #6: Screen Reader Support**
   - Given: A screen reader is active (NVDA, JAWS, VoiceOver).
   - When: User navigates the interface.
   - Then:
     - All interactive elements have descriptive ARIA labels
     - New sessions trigger live region announcements ("New session captured")
     - Session selection announces session details
     - Form validation errors are announced
   - Verified: Screen reader can navigate and understand all interface elements.

7. **AC #7: Color Contrast Compliance**
   - Given: The application UI is rendered.
   - When: Contrast is measured between text and backgrounds.
   - Then:
     - Normal text: Minimum 4.5:1 contrast ratio (WCAG AA)
     - Large text (18px+): Minimum 3:1 contrast ratio
     - Interactive elements: 3:1 contrast with adjacent colors
   - Verified: All color combinations pass WCAG 2.1 Level AA contrast requirements.

8. **AC #8: Reduced Motion Support**
   - Given: User has enabled "prefers-reduced-motion" system setting.
   - When: The application performs animations.
   - Then: All non-essential animations are disabled or reduced significantly.
   - Verified: Users with motion sensitivity can use the app comfortably.

9. **AC #9: Touch Target Sizing**
   - Given: The application UI is rendered.
   - When: Interactive elements are measured.
   - Then: All buttons, clickable elements have minimum 44x44px touch target size.
   - Verified: Elements meet minimum size requirements with 8px spacing between adjacent targets.

10. **AC #10: Performance Optimization**
    - Given: More than 100 sessions are captured.
    - When: User scrolls through the Session List.
    - Then: Virtual scrolling is implemented to maintain smooth performance.
    - Verified: List scrolling remains smooth (60fps) even with hundreds of sessions.

## Tasks / Subtasks

### Phase 1: Real-time Update Implementation

- [ ] **Task 1.1**: Implement smooth session insertion animation (AC #1)
  - [ ] Add fade-in CSS transition (300ms) for new session list items
  - [ ] Prevent layout shift during insertion using CSS containment
  - [ ] Test with rapid session arrival to ensure smooth rendering

- [ ] **Task 1.2**: Add auto-scroll functionality (AC #2)
  - [ ] Detect user's scroll position (is user at bottom?)
  - [ ] Auto-scroll to newest session when enabled and user is at bottom
  - [ ] Add toggle control in UI to enable/disable auto-scroll
  - [ ] Persist auto-scroll preference to localStorage

- [ ] **Task 1.3**: Maintain selection during updates (AC #3)
  - [ ] Track currently selected session ID across renders
  - [ ] Ensure selected session stays highlighted during list updates
  - [ ] Scroll selected session into view if it moves off-screen

### Phase 2: Keyboard Navigation & Focus Management

- [ ] **Task 2.1**: Implement keyboard shortcuts (AC #4)
  - [ ] Add event listeners for ↑/↓ arrow keys (session navigation)
  - [ ] Add event listeners for ←/→ arrow keys (timeline message navigation)
  - [ ] Add Tab key handler for Hex/Decoded view switching
  - [ ] Add Ctrl/Cmd+S handler for Start/Stop capture toggle
  - [ ] Add Ctrl/Cmd+K handler for Clear sessions
  - [ ] Add Esc key handler for modal/panel close

- [ ] **Task 2.2**: Style focus indicators (AC #5)
  - [ ] Apply 2px teal outline to all interactive elements on focus
  - [ ] Remove default browser focus outline
  - [ ] Ensure focus indicators visible on all background colors
  - [ ] Test focus visibility in light and dark areas

- [ ] **Task 2.3**: Implement focus management
  - [ ] Trap focus within open modals
  - [ ] Return focus to trigger element when modal closes
  - [ ] Manage focus order for logical tab navigation

### Phase 3: Screen Reader & ARIA Support

- [ ] **Task 3.1**: Add ARIA labels and roles (AC #6)
  - [ ] Add aria-label to all buttons and interactive elements
  - [ ] Add role="listbox" to Session List
  - [ ] Add role="tab" to Hex/Decoded tabs
  - [ ] Add aria-selected to selected session/tab
  - [ ] Add aria-live="polite" region for new session announcements

- [ ] **Task 3.2**: Test with screen readers
  - [ ] Test with NVDA (Windows)
  - [ ] Test with JAWS (Windows) if available
  - [ ] Test with VoiceOver (macOS)
  - [ ] Verify all interactive elements are announced correctly
  - [ ] Verify live region announcements work for new sessions

### Phase 4: Accessibility Compliance

- [ ] **Task 4.1**: Verify color contrast (AC #7)
  - [ ] Audit all text/background combinations
  - [ ] Use contrast checker tool (e.g., WebAIM)
  - [ ] Fix any combinations below 4.5:1 for normal text
  - [ ] Fix any combinations below 3:1 for large text

- [ ] **Task 4.2**: Implement reduced motion support (AC #8)
  - [ ] Add CSS media query for prefers-reduced-motion
  - [ ] Disable fade-in animations when reduced motion enabled
  - [ ] Disable scroll animations when reduced motion enabled
  - [ ] Test with system setting enabled

- [ ] **Task 4.3**: Verify touch target sizing (AC #9)
  - [ ] Measure all interactive element dimensions
  - [ ] Ensure buttons are at least 44x44px
  - [ ] Add padding if needed to meet minimum size
  - [ ] Verify 8px spacing between adjacent targets

### Phase 5: Performance Optimization

- [ ] **Task 5.1**: Implement virtual scrolling (AC #10)
  - [ ] Install and configure react-window or react-virtual library
  - [ ] Wrap Session List in virtual scroll container
  - [ ] Calculate item heights dynamically for sessions
  - [ ] Test with 100+ sessions to verify smooth scrolling (60fps)

- [ ] **Task 5.2**: Performance testing
  - [ ] Generate test data with 500+ sessions
  - [ ] Profile rendering performance with React DevTools
  - [ ] Optimize re-renders using React.memo where appropriate
  - [ ] Verify no memory leaks during long capture sessions

## Dev Notes

### Technical Summary

This story completes the UX implementation by adding real-time update handling and comprehensive accessibility support. Real-time updates must feel smooth and natural without disrupting user focus. Accessibility compliance (WCAG 2.1 Level AA) ensures the application is usable by all engineers, including those using assistive technologies.

### Key Implementation Areas

1. **Real-time Updates**:
   - Use CSS transitions for smooth animations (300ms fade-in)
   - Implement IntersectionObserver for auto-scroll detection
   - Use React state management to persist selection during updates

2. **Keyboard Navigation**:
   - Global keyboard event handlers with focus management
   - Prevent default browser behavior for custom shortcuts
   - Ensure keyboard shortcuts don't conflict with Electron defaults

3. **Screen Reader Support**:
   - ARIA live regions for dynamic content announcements
   - Semantic HTML with proper roles and labels
   - Focus trap implementation for modals

4. **Performance**:
   - Virtual scrolling for lists > 100 items
   - React.memo to prevent unnecessary re-renders
   - RequestAnimationFrame for smooth animations

### Learnings from Previous Story

**From Story ux-2-layout-and-components (Status: ready-for-dev)**

- **Layout Structure Ready**: The three-panel layout with resizable panels is implemented. Real-time updates will add content to the existing Session List panel.
- **Placeholder Components**: `SessionList.tsx`, `MessageDetailViewer.tsx`, and `ConfigurationPanel.tsx` are created. This story will add real-time update logic and accessibility attributes to these components.
- **Design System Available**: shadcn/ui and Tailwind CSS theme provide focus states, but custom focus indicators may need refinement for 2px teal outline requirement.
- **Component Architecture**: Components are in `src/renderer/components` directory. Follow the established pattern for any new components.

[Source: stories/ux-2-layout-and-components.md#Dev-Notes]

### Project Structure Notes

All work for this story will be within existing component files:

- `src/renderer/components/SessionList.tsx` - Add real-time update logic, animations, virtual scrolling
- `src/renderer/components/MessageDetailViewer.tsx` - Add keyboard navigation for Hex/Decoded tabs
- `src/renderer/components/ConfigurationPanel.tsx` - Add keyboard shortcuts for Start/Stop/Clear
- `src/renderer/App.tsx` - Add global keyboard event handlers, focus management

No new files needed, only enhancements to existing components.

### Accessibility Testing Checklist

- [ ] Test all keyboard shortcuts across panels
- [ ] Verify focus indicators visible on all backgrounds
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver (macOS if available)
- [ ] Verify color contrast with WebAIM Contrast Checker
- [ ] Test with prefers-reduced-motion enabled
- [ ] Verify touch target sizes (measure with browser dev tools)
- [ ] Test virtual scrolling with 100+ sessions

### References

- **UX Design Specification**: [ux-design-specification.md](../ux-design-specification.md#8-responsive-design--accessibility) - Section 8: Accessibility Strategy defines all WCAG requirements
- **UX Design Specification**: [ux-design-specification.md](../ux-design-specification.md#71-consistency-rules) - Section 7.1: Real-time update patterns and notification patterns
- **WCAG 2.1 Guidelines**: [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Official WCAG reference
- **Previous Story**: [ux-2-layout-and-components.md](./ux-2-layout-and-components.md) - Layout and component structure established

## Dev Agent Record

### Context Reference

- [ux-3-realtime-and-accessibility.context.xml](./ux-3-realtime-and-accessibility.context.xml)

### Agent Model Used

<!-- Will be populated by dev agent -->

### Debug Log References

<!-- Will be populated by dev agent during implementation -->

### Completion Notes List

<!-- Will be populated by dev agent after implementation -->

### File List

<!-- Will be populated by dev agent with NEW/MODIFIED/DELETED file markers -->
