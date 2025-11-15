# Data Models — Main (part-main)

Summary:

- No traditional database schema or data migration frameworks were detected in the main process.
- `SessionStore` persists session objects as atomic JSON files on disk (file-based persistence), not a relational or NoSQL DB.
- Patterns used for persistence:
  - Atomic writes with temp file + rename (crash-safe)
  - Retention policy via persistedUntil metadata
  - Cleanup and migration helpers implemented in `SessionStore`

Files of interest:

- `src/main/session-store.ts` — session persistence, crash recovery, migration helpers
- `src/main/hl7-capture.ts` — HL7 session model and event-driven session tracking

Recommendation:

- No migration required for structured DB; if future work introduces a database, codify a migration strategy.
