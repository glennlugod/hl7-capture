# Story: Session Submission Tracking (UI)

Status: backlog

## Story

As a support engineer,
I want the application UI to show which persisted sessions have been submitted and which are pending or failed,
so that I can monitor submission progress and retry or inspect failed submissions.

## Acceptance Criteria

1. Status fields
   - Each persisted session record displays `submissionStatus`, `submissionAttempts`, and `submittedAt` if available.

2. UI List & Filters
   - Add a Sessions view filter to show `All | Pending | Submitted | Failed`.
   - List entries show a short status badge and timestamp of last attempt.

3. Retry & Manual controls
   - User can select a failed session and trigger `retrySubmission(sessionId)` via the UI.
   - User can manually mark a session as `ignore` to prevent further submission attempts.

4. Real-time updates
   - Renderer listens to `onSubmissionProgress` and `onSubmissionResult` IPC events to update status in real time.

## Tasks / Subtasks

- [ ] Update session item UI component to include submission metadata and actions
- [ ] Add filter controls in the SessionList component
- [ ] Implement `retrySubmission` IPC handler in main process
- [ ] Add unit/integration tests for UI interactions and IPC flows

## Testing Notes

- Manual test: Simulate failing submissions and verify retry mechanism updates counts and timestamps correctly
- Automated test: Mock IPC events and verify UI updates
