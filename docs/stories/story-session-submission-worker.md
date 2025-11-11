# Story: Session Submission Worker (REST)

Status: backlog

## Story

As a systems integrator,
I want the application to POST persisted HL7 sessions to a configurable REST API endpoint using a background worker,
so that captured sessions can be centrally collected for auditing or automated processing.

## Acceptance Criteria

1. Submission queue
   - Persisted sessions with `submissionStatus: pending` are queued for submission by the worker.

2. Configurable endpoint & auth
   - The app settings expose `submissionEndpoint` (URL) and optional `submissionAuthHeader` (string) for authentication.

3. Concurrency & retry
   - The worker supports a configurable concurrency level (default: 2) and retry policy with exponential backoff (configurable attempts, default 3 attempts).

4. Non-blocking
   - Submission operates off the main capture loop. Failures do not affect capture or persistence.

5. Idempotency & audit
   - Each session POST includes a session id to allow server-side deduplication.
   - On success, `submissionStatus` becomes `submitted` and `submittedAt` is set. On permanent failure, `submissionStatus` becomes `failed` and attempts count is recorded.

6. Observability
   - Expose IPC events `onSubmissionProgress` and `onSubmissionResult` with details for renderer display.

## Tasks / Subtasks

- [ ] Implement `src/main/submission-worker.ts` using `node-fetch` or `axios` (configurable) for HTTP calls
- [ ] Add queue management with concurrency and retry/backoff
- [ ] Add IPC events for progress and results
- [ ] Add unit tests simulating HTTP 200/400/500 responses and retry logic
- [ ] Document submission configuration in settings and README

## Testing Notes

- Integration test: Start worker against a local HTTP test server, verify successful submissions and retry behavior
- Test idempotency by simulating duplicate submission attempts and confirming server-side dedup handling (mocked)
