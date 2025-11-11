# Story: Session Cleanup Worker

Status: backlog

## Story

As an operations engineer,
I want the application to periodically remove persisted sessions that have expired according to retention policy,
so that storage usage is bounded and old diagnostic data is automatically purged.

## Acceptance Criteria

1. Periodic cleanup
   - A background cleanup worker runs on a configurable interval (default: 24 hours) and deletes session files whose `persistedUntil` timestamp is in the past.

2. Safe deletion
   - Deletions are atomic and logged. Files are moved to a temp/trash folder before permanent deletion to allow short-term recovery if needed.

3. Configurable interval and dry-run
   - Settings expose `cleanupIntervalHours` and a `dryRun` mode to preview deletions without performing them.

4. IPC & Observability
   - The main process exposes an IPC handler `runCleanupNow()` to trigger on-demand cleanup.
   - The cleanup worker reports summary metrics via IPC events (filesDeleted, bytesFreed)

## Tasks / Subtasks

- [ ] Implement `src/main/cleanup-worker.ts` with a timer-based scheduler and on-demand run API
- [ ] Add `runCleanupNow` IPC handler and `onCleanupSummary` event emission
- [ ] Ensure worker respects `enablePersistence` toggle and retentionDays config
- [ ] Add unit tests for deletion logic and dry-run mode
- [ ] Add integration test that creates expired session files and verifies deletion

## Testing Notes

- Test deletion order and atomicity (move to trash then delete)
- Validate IPC summary contains accurate counts and sizes
