# Story: Session Persistence

Status: drafted

## Story

As a **product user**,
I want **the application to persist captured HL7 sessions for a configurable retention period**,
so that **I can retain and inspect past sessions across restarts and avoid losing important diagnostic data**.

## Acceptance Criteria

1. **AC #1: Persistence Location & Format**
   - Sessions are stored under `{project-root}/docs/sessions/` by default (configurable via `output_folder`).
   - Each session is saved as an individual JSON file named `{sessionId}.json`.
   - JSON schema includes all HL7Session fields plus version metadata for future schema migrations.

2. **AC #2: Retention Policy Configuration**
   - The app persists sessions up to N days, where N is configured in the application settings (integer > 0).
   - Each session file contains a `persistedUntil` unix-ms timestamp (set at save time as `now + (retentionDays * 86400000)`).
   - Default retention: 30 days.
   - Configuration is exposed in UI settings as `retentionDays` (integer input, range 1-365).

3. **AC #3: Atomic Writes & Crash-Safety**
   - Writes are atomic: a session file is either fully written or not present (use write-to-temp + rename pattern).
   - On startup, the app scans the sessions folder and recovers any valid session files (corrupt files skipped with error log).
   - Startup recovery adds recovered sessions to in-memory buffer (up to configured session count limit).

4. **AC #4: Async Persistence (Non-Blocking)**
   - Persistence occurs off the main capture loop (async operation) so that disk I/O does not block packet parsing or IPC.
   - When a session completes (0x04 received), it's queued for persistence but IPC update sent immediately.

5. **AC #5: Config Integration**
   - The UI settings dialog exposes:
     - `enablePersistence` (boolean toggle, default: enabled)
     - `retentionDays` (integer spinner, min: 1, max: 365, default: 30)
   - Settings changes apply on next save (no app restart required).

## Tasks / Subtasks

### Phase 1: Core Persistence Layer

- [ ] Create `src/main/session-store.ts` with file-backed session persistence:
  - [ ] Implement `saveSession(session: HL7Session, retentionDays: number): Promise<void>`
    - Validate session object and retentionDays
    - Calculate `persistedUntil = now + (retentionDays * 86400000)`
    - Write to temp file, then atomic rename to final path
    - Log successful save with session ID and file path
  - [ ] Implement `loadAllSessions(sessionsDir: string): Promise<HL7Session[]>`
    - Scan sessions directory recursively
    - Parse valid JSON files; skip corrupt files with error logging
    - Return array of HL7Session objects ordered by creation timestamp
  - [ ] Implement `deleteSession(sessionId: string, sessionsDir: string): Promise<void>`
    - Safely delete session file from disk
    - Handle missing file gracefully
  - [ ] Add schema version metadata to saved JSON (e.g., `{ _version: 1, _saved_at: timestamp, ...session }`)
  - (Estimated effort: 2 hours)

### Phase 2: Integration with HL7CaptureManager

- [ ] Update `src/main/hl7-capture.ts`:
  - [ ] Add `enablePersistence` and `retentionDays` config fields to `HL7CaptureManager`
  - [ ] On session complete (end marker received), queue session for async save:
    - [ ] Create async task: `sessionStore.saveSession(session, retentionDays)` (fire-and-forget)
    - [ ] Do NOT block session completion waiting for disk I/O
  - [ ] On app startup: call `sessionStore.loadAllSessions()` and restore sessions to buffer
  - (Estimated effort: 1.5 hours)

### Phase 3: Configuration & UI Wiring

- [ ] Add configuration options to settings:
  - [ ] Create settings state for `enablePersistence` and `retentionDays`
  - [ ] Wire UI settings inputs (toggle + spinner) to config store
  - [ ] Persist settings to config file on save
- [ ] Update `src/preload/index.ts` to expose IPC handlers:
  - [ ] `getPersistedSessions(): Promise<HL7Session[]>` — reads from disk
  - [ ] `deletePersistedSession(sessionId: string): Promise<void>` — deletes from disk
  - [ ] `getSessionsConfig(): Promise<{enablePersistence, retentionDays}>` — reads config
  - [ ] `updateSessionsConfig(config): Promise<void>` — writes config
  - (Estimated effort: 1 hour)

### Phase 4: Error Handling & Robustness

- [ ] Add error handling in session-store:
  - [ ] Handle disk space errors (log warning, skip save if needed)
  - [ ] Handle permission errors (log error, notify renderer if critical)
  - [ ] Handle corrupt JSON on load (log error, skip file)
- [ ] Add validation in HL7CaptureManager:
  - [ ] Verify `retentionDays` is in valid range (1-365) before use
  - [ ] Verify `enablePersistence` toggle is honored
  - (Estimated effort: 0.5 hours)

### Phase 5: Unit Tests

- [ ] Create `tests/unit/session-store.test.ts`:
  - [ ] Test `saveSession()`: happy path (file created), atomic write (temp file exists briefly), invalid session (error)
  - [ ] Test `loadAllSessions()`: empty dir, single file, multiple files, corrupt file (skipped)
  - [ ] Test `deleteSession()`: file exists (deleted), file missing (no error)
  - [ ] Test schema versioning: save and load with version metadata
  - [ ] Use mock filesystem (e.g., `memfs` or Jest mocks)
  - (Estimated effort: 1.5 hours)

- [ ] Create integration test in `tests/integration/session-persistence.test.ts`:
  - [ ] Mock HL7CaptureManager, simulate session completion
  - [ ] Verify session persisted to disk with `persistedUntil` set correctly
  - [ ] Simulate app restart, verify sessions reloaded
  - [ ] (Estimated effort: 1 hour)

### Phase 6: Documentation

- [ ] Update `README.md`:
  - [ ] Add section: "Session Persistence" explaining retention policy and configuration
  - [ ] Document default session storage location
  - [ ] Link to session management settings
- [ ] Add inline code comments in `session-store.ts` for atomic write pattern
- [ ] Update `DEVELOPMENT.md` if applicable
- [ ] (Estimated effort: 0.5 hours)

## Dev Notes

### Architecture & Constraints

**Persistence Strategy:** File-backed JSON storage in `{output_folder}/sessions/` directory. [Source: tech-spec.md#Session-Persistence-and-Submission]

- Simple, no external DB dependency
- Scales to thousands of sessions (each ~10-100KB)
- Atomic writes prevent corruption on crash

**Async Pattern:** Session persistence happens off the main packet parsing loop to avoid blocking capture.

**Configuration:** Settings are stored in the app config (location TBD in this story; assume main process config module handles it).

### Existing Code to Reference

- `src/main/hl7-capture.ts` — HL7CaptureManager where session completion event fires (line ~TBD; search for `isComplete: true`)
- `src/common/types.ts` — HL7Session interface definition
- `src/preload/index.ts` — IPC bridge (add new handlers here)

### Testing Standards

- Unit tests: Jest with mocked filesystem (memfs or fs mocks)
- Integration: Jest with actual temp filesystem
- Follow existing test patterns in `tests/unit/` and `tests/integration/`
- Target: 80%+ coverage on core session-store logic

### Development Constraints

- TypeScript strict mode enabled
- Use `Promise`-based async (no callbacks)
- Atomic write: write to `${filename}.tmp`, then `fs.renameSync()` to final path
- Handle ENOENT (file not found) gracefully on delete
- Do NOT use external DB libraries (only Node.js built-in `fs` module)

### Project Structure Notes

**Greenfield project** — all patterns are newly established. Follow existing code in `src/main/` for style and structure.

Expected new files:

- `src/main/session-store.ts` (core persistence layer)
- `tests/unit/session-store.test.ts` (unit tests)
- `tests/integration/session-persistence.test.ts` (integration tests)

### References

- [Source: tech-spec.md#Session-Persistence-and-Submission] - Comprehensive persistence architecture
- [Source: tech-spec.md#Implementation-Details] - HL7Session data structure and fields
- [Source: tech-spec.md#Development-Setup] - Project setup and prerequisites
- [Source: docs/sprint-status.yaml] - Story tracking and project level (Level 0, greenfield)
