# Story: Session Persistence

Status: backlog

## Story

As a product user,
I want the application to persist captured HL7 sessions for a configurable retention period,
so that I can retain and inspect past sessions across restarts and avoid losing important diagnostic data.

## Acceptance Criteria

1. Persistence location
   - Sessions are stored under `{project-root}/docs/sessions/` by default (configurable `output_folder`).
   - Each session is saved as an individual JSON file named `{sessionId}.json`.

2. Retention policy
   - The app persists sessions up to N days, where N is configured in the application settings (integer > 0).
   - Each session file contains a `persistedUntil` unix-ms timestamp used to determine expiry.

3. Atomic writes & crash-safety
   - Writes are atomic: a session file is either fully written or not present (use write-to-temp + rename).
   - On startup, the app scans the sessions folder and recovers any valid session files.

4. Performance
   - Persistence occurs off the main capture loop so that disk I/O does not block packet parsing or IPC.

5. Config integration
   - The UI settings expose `retentionDays` and an optional toggle to enable/disable persistence.

## Tasks / Subtasks

- [ ] Create `src/main/session-store.ts` implementing a simple file-backed session store:
  - `saveSession(session: HL7Session): Promise<void>`
  - `loadAllSessions(): Promise<HL7Session[]>`
  - `deleteSession(sessionId: string): Promise<void>`
  - Use atomic write strategy (tmp file + rename)
- [ ] Add configuration handling for `retentionDays` and `enablePersistence`
- [ ] Wire session-store into `HL7CaptureManager` so completed sessions are persisted asynchronously
- [ ] Update `src/preload/index.ts` to expose `getPersistedSessions()` and `deletePersistedSession(sessionId)` IPC handlers
- [ ] Add unit tests for `session-store` (happy path, atomic write, corrupt file handling)
- [ ] Document persistence behavior in `README.md` and `docs/`

## Testing Notes

- Unit tests: mock filesystem, verify atomic writes and recovery on startup
- Integration test: capture a simulated session, persist, restart in test harness, verify session restored

## Developer Notes

- Keep file format stable: include version metadata on stored sessions to ease future migrations.
- Limit session file size (or compress payload) if sessions grow large; add a configurable `maxSessionSize` if needed.
