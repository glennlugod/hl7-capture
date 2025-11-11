# Story: Session Cleanup Worker

Status: ready-for-dev

## Story

As an operations engineer,
I want the application to periodically remove persisted sessions that have expired according to retention policy,
so that storage usage is bounded and old diagnostic data is automatically purged.

## Acceptance Criteria

### AC 1: Periodic Cleanup Execution

- **Requirement:** Background cleanup worker starts with app, runs on a configurable interval (default: 24 hours), and deletes session files whose `persistedUntil` timestamp is in the past
- **Test Approach:** Mock system clock, create session with past timestamp, verify deletion after interval; test custom interval configuration

### AC 2: Atomic and Safe Deletion

- **Requirement:** File deletions are atomic (move to trash then delete), failures are logged, and trash folder structure maintained for recovery
- **Test Approach:** Simulate disk full or permission errors during deletion, verify files moved to trash; verify log entries; cleanup of trash on subsequent runs

### AC 3: Configurable Interval and Dry-Run Mode

- **Requirement:** Settings expose `cleanupIntervalHours` (1-168 range) and `dryRunMode` toggle; dry-run previews deletions without performing them
- **Test Approach:** Enable dry-run, verify no files deleted but summary shows what would be deleted; disable dry-run and verify actual deletion

### AC 4: IPC Interface and Observability

- **Requirement:** Main process exposes `runCleanupNow()` IPC handler for on-demand cleanup; worker reports `onCleanupSummary` event with `{ filesDeleted, bytesFreed, filesInTrash, startTime, endTime }`
- **Test Approach:** Call IPC handler, verify cleanup executed immediately; verify summary event emitted with accurate metrics

### AC 5: Configuration Awareness

- **Requirement:** Worker respects `enablePersistence` toggle (skip if false) and reads `retentionDays` from config; updates retentionDays without restart
- **Test Approach:** Disable persistence, verify worker skips cleanup; change retentionDays, verify next cleanup uses new value

## Tasks / Subtasks

### Phase 1: Core Cleanup Logic (2 hours)

- [ ] Create `src/main/cleanup-worker.ts` with class-based scheduler
  - [ ] Constructor accepts config object: `{ sessionsDir, cleanupIntervalHours, retentionDays, dryRunMode, trashDir }`
  - [ ] Implement `start()` method to initialize timer and first run
  - [ ] Implement `stop()` method to clear timers
  - [ ] Implement private `_runCleanup()` method that:
    - [ ] Lists all JSON files in sessionsDir
    - [ ] Reads persistedUntil from each session JSON
    - [ ] Filters expired sessions (persistedUntil < now)
    - [ ] Counts files and size
    - [ ] In dry-run: logs what would be deleted; In normal: moves to trash then deletes

### Phase 2: Trash Management (1.5 hours)

- [ ] Implement trash folder structure: `{trashDir}/cleanup-{timestamp}/`
- [ ] Implement atomic move-to-trash with error handling
- [ ] Implement cleanup of trash folder (remove entries older than 7 days by default)
- [ ] Add logging for all trash operations (move, delete, error)

### Phase 3: IPC Integration (1 hour)

- [ ] Add `runCleanupNow()` IPC handler in `HL7CaptureManager`
- [ ] Emit `onCleanupSummary` event with metrics: `{ filesDeleted, bytesFreed, filesInTrash, startTime, endTime, dryRun }`
- [ ] Wire IPC event to preload bridge for renderer access

### Phase 4: Configuration Wiring (1 hour)

- [ ] Read `enablePersistence`, `retentionDays`, `cleanupIntervalHours` from config-store
- [ ] Subscribe to config changes and update worker intervals dynamically
- [ ] Validate interval range (1-168 hours) and retentionDays (1-365 days)

### Phase 5: Unit Tests (1.5 hours)

- [ ] Create `tests/unit/cleanup-worker.test.ts`
  - [ ] Test periodic execution with mocked timers
  - [ ] Test deletion logic (expired vs. non-expired)
  - [ ] Test dry-run mode (no actual deletion)
  - [ ] Test trash move with error handling
  - [ ] Test config changes trigger worker update
  - [ ] Test disabled persistence (worker skips)

### Phase 6: Integration Tests (1 hour)

- [ ] Create `tests/integration/cleanup-worker.integration.test.ts`
  - [ ] Create session files with past/future timestamps
  - [ ] Trigger cleanup and verify files deleted
  - [ ] Verify summary event with accurate counts
  - [ ] Test IPC handler integration

## Dev Notes

### Architecture & Integration Points

**Cleanup Worker Lifecycle:**

- Worker instance created in `HL7CaptureManager.constructor()`
- Started in `HL7CaptureManager.startup()`
- Stopped in `HL7CaptureManager.shutdown()`
- Configuration updates trigger worker reconfiguration (new interval, new retention days)

**Code References:**

- `src/main/hl7-capture.ts` → `HL7CaptureManager` class (instantiate and lifecycle management)
- `src/main/config-store.ts` → Configuration access for retention, interval, dry-run settings
- `src/common/types.ts` → `HL7Session` interface (persistedUntil field)
- `src/preload/index.ts` → IPC bridge for `runCleanupNow` and `onCleanupSummary`

**TypeScript Strict Mode:**

- All methods typed with explicit return types
- Config object fully typed; IPC event payload typed
- Promise-based async only (no callbacks)

**Error Handling:**

- Retry logic for trash operations (up to 3 retries with exponential backoff)
- Fallback to immediate delete if trash move fails
- All errors logged to console and stored in summary event

### Constraints & Dependencies

- **Dependency:** story-session-persistence (must be completed first; provides session storage layer)
- **Files per session:** Typically 1 JSON file per session (~5-50 KB depending on message count)
- **Performance:** Cleanup runs async off-main-loop; expect <100ms for 1000 sessions even with trash operations
- **No external DB:** Use fs module only (same as session persistence)
- **No process workers yet:** Single-threaded in main process (future: move to dedicated worker thread if needed)

### Testing Standards

- Unit tests use Jest with mocked filesystem (`memfs` optional for realistic fs simulation)
- Integration tests use actual temp directories
- Target 85%+ code coverage for cleanup-worker.ts
- All ACs verified by automated tests before ready-for-dev mark

## References

- `docs/tech-spec.md` — Section "Session Persistence & Submission": Architecture and retention policy design
- `docs/stories/story-session-persistence.md` — Session persistence implementation (prerequisite)
- `src/common/types.ts` → `HL7Session` interface
- `src/main/hl7-capture.ts` → `HL7CaptureManager` class

---

## Dev Agent Record

### Status

**Marked:** ready-for-dev  
**Generated:** 2025-11-12  
**Context Reference:** `docs/stories/story-session-cleanup-worker.context.xml`

This story has been fully drafted with all 5 acceptance criteria, 6 implementation phases (~6.5 hours total), and comprehensive dev notes. Developer pickup ready with complete technical context XML including code references, interfaces, constraints, and testing guidance.
