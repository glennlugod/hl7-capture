# Story: Session Submission Tracking (UI)

Status: ready-for-dev

## Story

As a support engineer,
I want the application UI to show which persisted sessions have been submitted and which are pending or failed,
so that I can monitor submission progress and retry or inspect failed submissions.

## Acceptance Criteria

### AC 1: Submission Status Fields Display

- **Requirement:** Each persisted session record displays `submissionStatus` (pending|submitted|failed), `submissionAttempts` (count), and `submittedAt` (timestamp if available); status fields visible in main list and detail view
- **Test Approach:** Create sessions with all statuses, verify status fields rendered; verify timestamps formatted correctly; verify attempts count displays

### AC 2: UI List with Status Filters

- **Requirement:** Sessions view includes filter dropdown: `All | Pending | Submitted | Failed`; each filter updates list to show only sessions with matching status; filter state persists during session
- **Test Approach:** Click each filter, verify list updates; verify filter toggle; test filter state remains on page refresh

### AC 3: Status Badges and Visual Indicators

- **Requirement:** Each list entry shows a status badge (color-coded: pending=yellow, submitted=green, failed=red) with optional icon; last attempt timestamp displayed in human-readable format (e.g., "2 hours ago")
- **Test Approach:** Verify badge colors match status; verify timestamps human-readable; verify icon visibility

### AC 4: Retry and Manual Controls

- **Requirement:** User can select a failed session and trigger `retrySubmission(sessionId)` IPC handler; selected session shows retry button; user can mark session as `ignore` to prevent further submission attempts (sets `submissionStatus: ignored`)
- **Test Approach:** Select failed session, click retry, verify IPC handler called; verify submission attempted; verify ignore toggle prevents future submissions

### AC 5: Real-time Status Updates

- **Requirement:** Renderer listens to `onSubmissionProgress` (queue depth, in-flight count) and `onSubmissionResult` (per-session result) IPC events; UI updates in real-time without page refresh; progress indicator shows submission activity
- **Test Approach:** Trigger submission, listen to IPC events, verify UI updates immediately; verify progress bar/spinner shows during submission; verify results appear without page refresh

### AC 6: Session Detail View

- **Requirement:** Click session row to open detail panel showing full session metadata including: sessionId, capture timestamps, message count, submission history (status, attempts, timestamps, last error), and action buttons (retry, ignore, delete)
- **Test Approach:** Open detail view, verify all metadata visible; verify action buttons present; test retry/ignore/delete actions update detail view

## Tasks / Subtasks

### Phase 1: Session List Component Updates (1.5 hours)

- [ ] Update `src/renderer/components/SessionList.tsx`
  - [ ] Add submission status fields to session list item render
  - [ ] Add filter dropdown: All / Pending / Submitted / Failed
  - [ ] Implement filter state management (useState)
  - [ ] Add filter logic to display only matching sessions
  - [ ] Add status badge component (color-coded)
  - [ ] Format `submittedAt` timestamp to human-readable (use date-fns or similar)

### Phase 2: Session Detail Panel (1.5 hours)

- [ ] Create or update `src/renderer/components/SessionDetail.tsx`
  - [ ] Add submission metadata section: status, attempts, timestamps, last error
  - [ ] Add retry button (disabled if not failed or ignored)
  - [ ] Add ignore toggle button
  - [ ] Add delete button with confirmation
  - [ ] Implement button click handlers to call IPC

### Phase 3: IPC Integration (1.5 hours)

- [ ] Add `retrySubmission(sessionId)` IPC handler in `src/main/hl7-capture.ts`
  - [ ] Validates sessionId exists
  - [ ] Sets `submissionStatus: pending` and resets `submissionAttempts: 0`
  - [ ] Triggers submission worker immediately
  - [ ] Returns success/error
- [ ] Add `ignoreSession(sessionId)` IPC handler
  - [ ] Sets `submissionStatus: ignored`
  - [ ] Persists state to disk
- [ ] Add `deleteSession(sessionId)` IPC handler
  - [ ] Deletes session file and cleanup logs
  - [ ] Notifies cleanup worker to skip if needed

### Phase 4: Real-time Event Listeners (1 hour)

- [ ] In `src/renderer/pages/Sessions.tsx` (or parent container):
  - [ ] Add `useEffect` to listen to `onSubmissionProgress` event
    - [ ] Update component state: `{ inFlight, queueSize }`
    - [ ] Display progress indicator showing current progress
  - [ ] Add `useEffect` to listen to `onSubmissionResult` event
    - [ ] Find session in list and update status fields
    - [ ] Re-render list without full refresh
    - [ ] Show toast notification for completion

### Phase 5: Styling and UX Polish (1 hour)

- [ ] Add Tailwind classes for status badges (pending=yellow-100/yellow-900, submitted=green-100/green-900, failed=red-100/red-900, ignored=gray-100/gray-900)
- [ ] Add smooth transitions when status changes
- [ ] Add loading spinners during submission
- [ ] Ensure responsive design for all screen sizes
- [ ] Add hover states and accessibility attributes

### Phase 6: Unit Tests (1.5 hours)

- [ ] Create `tests/unit/submission-tracking.test.ts`
  - [ ] Test filter logic (each status filter shows correct sessions)
  - [ ] Test status badge rendering (correct colors and text)
  - [ ] Test timestamp formatting (human-readable)
  - [ ] Test IPC event listeners update state
  - [ ] Test retry button disabled when status not failed
  - [ ] Test ignore toggle toggles submission prevention

### Phase 7: Integration Tests (1 hour)

- [ ] Create `tests/integration/submission-tracking.integration.test.ts`
  - [ ] Create multiple sessions with all statuses
  - [ ] Render component and test filter functionality
  - [ ] Simulate IPC events and verify UI updates
  - [ ] Test retry submission flow end-to-end
  - [ ] Test detail view open/close

## Dev Notes

### Architecture & Integration Points

**Submission Tracking UI Lifecycle:**

- Component mounted in `src/renderer/pages/Sessions.tsx` (existing sessions page)
- IPC listeners setup in useEffect; cleanup on unmount
- State updates trigger re-renders; no page refresh needed
- Real-time updates via IPC events from submission-worker

**Code References:**

- `src/renderer/components/SessionList.tsx` → Session list item component (UPDATE)
- `src/renderer/components/SessionDetail.tsx` → Session detail panel (NEW or UPDATE)
- `src/main/hl7-capture.ts` → `HL7CaptureManager` class (add IPC handlers)
- `src/main/submission-worker.ts` → Submission worker (already emits events)
- `src/preload/index.ts` → IPC bridge for retry/ignore/delete handlers
- `src/common/types.ts` → `HL7Session` interface with submission fields
- Styling: Use Tailwind CSS classes for badges and UI components

**TypeScript Strict Mode:**

- All components typed with React.FC<Props> or React.ReactNode
- State types explicit (UseState<SessionStatus[]>, etc.)
- IPC event handlers fully typed
- Filter state type: enum or union of string literals

**Error Handling:**

- Invalid sessionId: show error toast
- IPC handler fails: show error toast, log to console
- Network timeout on retry: let submission-worker handle with backoff

### Constraints & Dependencies

- **Dependency:** story-session-persistence (provides session storage with submission fields)
- **Dependency:** story-session-submission-worker (provides IPC events and submission logic)
- **Dependency:** story-session-cleanup-worker (must handle ignored sessions)
- **UI Framework:** React with Tailwind CSS (existing project tech stack)
- **Date formatting:** Use date-fns or Intl.RelativeTimeFormat for human-readable timestamps
- **No external state management:** Use React hooks (useState, useEffect) only
- **TypeScript strict mode:** All code must pass `--strict` compilation
- **Responsive:** Must work on desktop and tablet sizes (sessions may be displayed on smaller screens)

### Testing Standards

- Unit tests use Jest with React Testing Library for component testing
- Integration tests render actual components with mocked IPC
- Target 80%+ code coverage for UI components
- All ACs verified by automated tests before ready-for-dev mark
- Manual testing: Trigger real submissions and verify UI updates

## References

- `docs/tech-spec.md` — Session Persistence & Submission architecture
- `docs/stories/story-session-persistence.md` — Session storage (prerequisite)
- `docs/stories/story-session-submission-worker.md` — Submission worker (prerequisite)
- `docs/stories/story-session-cleanup-worker.md` — Cleanup worker (complementary)
- `src/renderer/pages/Sessions.tsx` → Sessions page component
- `src/common/types.ts` → `HL7Session` interface
- `src/preload/index.ts` → IPC bridge

---

## Dev Agent Record

### Status

**Marked:** ready-for-dev  
**Generated:** 2025-11-12  
**Context Reference:** `docs/stories/story-session-submission-tracking.context.xml`

This story has been fully drafted with all 6 acceptance criteria, 7 implementation phases (~7.5 hours total), and comprehensive dev notes. Developer pickup ready with complete technical context XML including UI component architecture, React hooks patterns, IPC integration, and testing strategy for React Testing Library.
