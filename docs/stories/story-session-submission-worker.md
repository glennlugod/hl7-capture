# Story: Session Submission Worker (REST)

Status: drafted

## Story

As a systems integrator,
I want the application to POST persisted HL7 sessions to a configurable REST API endpoint using a background worker,
so that captured sessions can be centrally collected for auditing or automated processing.

## Acceptance Criteria

### AC 1: Submission Queue Management

- **Requirement:** Background worker discovers sessions with `submissionStatus: pending` from sessions directory; queues them for submission in FIFO order
- **Test Approach:** Create multiple sessions with pending status, verify queue order; simulate in-progress submission, verify pending sessions still available for next cycle

### AC 2: Configurable Endpoint and Authentication

- **Requirement:** Settings expose `submissionEndpoint` (URL string) and optional `submissionAuthHeader` (string for Bearer token or basic auth); worker reads config on startup and on config changes
- **Test Approach:** Verify settings render in UI; change endpoint URL and verify next submission uses new URL; test with/without auth header

### AC 3: Concurrency and Retry Policy

- **Requirement:** Worker supports configurable concurrency level (default: 2, range 1-10) with exponential backoff retry (default: 3 attempts, 1/2/4 second delays); respects global concurrency limits
- **Test Approach:** Mock HTTP responses (200, 500), verify backoff delays; verify max 2 concurrent requests; verify 3 total attempts with exponential spacing

### AC 4: Non-Blocking Submission

- **Requirement:** Submission worker runs on timer (default: every 5 minutes) and off main capture loop; failures do not block capture, persistence, or cleanup workers
- **Test Approach:** Measure main loop latency during large submission; verify capture continues unaffected; verify capture loop timing independent of submission latency

### AC 5: Idempotency and Audit Trail

- **Requirement:** Each session POST includes `sessionId` for server-side deduplication; on success: `submissionStatus=submitted`, `submittedAt=now`; on permanent failure: `submissionStatus=failed`, `submissionAttempts` incremented; all state persisted immediately
- **Test Approach:** POST same session twice, verify server can deduplicate by sessionId; verify state fields updated correctly; verify state persists across app restart

### AC 6: Observability and IPC Events

- **Requirement:** Expose IPC events `onSubmissionProgress` (in-flight count, queue size) and `onSubmissionResult` (success/failure with sessionId, attempt count, error message); renderer can display submission status
- **Test Approach:** Listen to IPC events; verify progress events during submission; verify result events contain all required fields; verify event timing

## Tasks / Subtasks

### Phase 1: HTTP Client and Queue Structure (2 hours)

- [ ] Create `src/main/submission-worker.ts` with class-based design
  - [ ] Constructor accepts config: `{ sessionsDir, endpoint, authHeader, concurrency, maxRetries, submissionIntervalMinutes }`
  - [ ] Implement `start()` method to initialize timer
  - [ ] Implement `stop()` method to drain queue and clear timers
  - [ ] Implement private `_discoverPendingSessions()` method that lists sessions with `submissionStatus: pending`
  - [ ] Implement private `_submitSession(session)` method using node `fetch` API with timeout handling

### Phase 2: Queue and Concurrency Management (1.5 hours)

- [ ] Implement FIFO queue data structure for pending sessions
- [ ] Implement concurrency limiter (e.g., p-limit or custom Promise.all logic)
- [ ] Implement exponential backoff logic: retry delays [1s, 2s, 4s] for attempts [1, 2, 3]
- [ ] Track in-flight submissions and queue size for observability

### Phase 3: Session State Updates and Persistence (1.5 hours)

- [ ] Implement atomic session state update after submission result
  - [ ] On HTTP 200: set `submissionStatus: submitted`, `submittedAt: now()`, save to disk
  - [ ] On HTTP 4xx/5xx after max retries: set `submissionStatus: failed`, save to disk
  - [ ] On network error: increment `submissionAttempts`, do NOT set status yet (next cycle retries)
- [ ] Implement immediate file write after each status change (atomic with temp + rename)

### Phase 4: IPC Integration (1 hour)

- [ ] Add `onSubmissionProgress` event: `{ inFlight: number, queueSize: number, activeWorker: boolean }`
- [ ] Add `onSubmissionResult` event: `{ sessionId: string, success: boolean, submissionAttempts: number, error?: string, submittedAt?: number }`
- [ ] Wire events to preload bridge for renderer access
- [ ] Add `triggerSubmissionNow()` IPC handler for manual submission trigger

### Phase 5: Configuration and Lifecycle (1 hour)

- [ ] Read `submissionEndpoint`, `submissionAuthHeader`, `submissionConcurrency`, `submissionMaxRetries`, `submissionIntervalMinutes` from config-store
- [ ] Subscribe to config changes and update worker configuration dynamically
- [ ] Validate endpoint is valid URL; validate concurrency (1-10); validate interval (1-60 minutes)
- [ ] Skip submission if endpoint not configured (warn in logs)

### Phase 6: Unit Tests (2 hours)

- [ ] Create `tests/unit/submission-worker.test.ts`
  - [ ] Test queue discovery and FIFO ordering
  - [ ] Test HTTP 200 success path (state update, file write)
  - [ ] Test HTTP 500 and retry logic with exponential backoff
  - [ ] Test max retries exceeded (mark failed)
  - [ ] Test concurrency limits (max 2 in-flight)
  - [ ] Test IPC event emission with accurate counts
  - [ ] Test config changes trigger worker update
  - [ ] Test network timeout handling

### Phase 7: Integration Tests (1.5 hours)

- [ ] Create `tests/integration/submission-worker.integration.test.ts`
  - [ ] Mock HTTP server with `/submit` endpoint
  - [ ] Create multiple session files with pending status
  - [ ] Trigger worker and verify submissions received by mock server
  - [ ] Verify state changes persisted to disk
  - [ ] Verify retry behavior on simulated 500 response
  - [ ] Test idempotency (submit same session twice, verify deduplication by sessionId on server)

## Dev Notes

### Architecture & Integration Points

**Submission Worker Lifecycle:**

- Worker instance created in `HL7CaptureManager.constructor()`
- Started in `HL7CaptureManager.startup()`
- Stopped in `HL7CaptureManager.shutdown()`
- Configuration updates trigger worker reconfiguration dynamically

**Code References:**

- `src/main/hl7-capture.ts` → `HL7CaptureManager` class (instantiate and lifecycle)
- `src/main/config-store.ts` → Configuration access for endpoint, auth, concurrency, retry settings
- `src/common/types.ts` → `HL7Session` interface with `submissionStatus`, `submittedAt`, `submissionAttempts` fields
- `src/preload/index.ts` → IPC bridge for `onSubmissionProgress`, `onSubmissionResult`, `triggerSubmissionNow`
- `src/renderer/pages/Settings.tsx` → Submission configuration UI (endpoint URL, auth header, concurrency, retry policy)

**TypeScript Strict Mode:**

- All methods typed with explicit return types (void, Promise<T>, etc.)
- Config and state objects fully typed
- IPC event payloads fully typed
- Promise-based async only (no callbacks or custom promises)

**Error Handling:**

- HTTP timeout: 30 second default; retry if timeout
- Network errors (ECONNREFUSED, etc.): count as retryable; apply backoff
- Invalid URL: log warning; skip submission for this worker lifecycle
- Disk write failure: log error; mark session for retry in next cycle

### Constraints & Dependencies

- **Dependency:** story-session-persistence (must be completed first; provides session storage)
- **Dependency:** story-session-cleanup-worker (complementary; cleanup must handle submitted/failed status)
- **HTTP Client:** Use Node.js built-in `fetch()` (available in Node 18+) or axios if project requires
- **No external queue libraries:** Implement simple array-based FIFO queue
- **Performance:** Expect <100ms per submission (network dependent); concurrency limits prevent overwhelming server
- **Idempotency:** Server must deduplicate by sessionId; worker does NOT prevent duplicate submissions on network error
- **TypeScript strict mode:** All code must pass `--strict` compilation

### Testing Standards

- Unit tests use Jest with mocked HTTP client (mock-fetch or jest.mock)
- Integration tests use actual Node.js HTTP server (test-server module)
- Target 85%+ code coverage for submission-worker.ts
- All ACs verified by automated tests before ready-for-dev mark

## References

- `docs/tech-spec.md` — Section "Session Persistence & Submission": Submission worker design, POST endpoint format, retry policy
- `docs/stories/story-session-persistence.md` — Session persistence (prerequisite)
- `docs/stories/story-session-cleanup-worker.md` — Cleanup worker (complementary)
- `src/common/types.ts` → `HL7Session` interface
- `src/main/hl7-capture.ts` → `HL7CaptureManager` class
