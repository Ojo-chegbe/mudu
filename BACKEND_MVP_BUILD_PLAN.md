# MUDU Backend MVP Build Plan

This plan is the backend source of truth for MUDU development. It translates the PRD, architecture document, and current React UI into an implementation plan for the backend.

The target is not a generic backend. The target is to make the current UI functional, define the backend systems that the UI does not expose yet, and preserve the product thesis: local-first exams, AI-assisted question creation, and cloud sync.

## MVP Position

AI generation and cloud sync are part of the MVP. They are not future extras.

The product wedge is:

- Lecturers can create exams faster using AI from uploaded or pasted course material.
- Lecturers can run a real exam locally over WiFi with no internet dependency.
- Results and scripts can sync to the cloud when internet is available.

The system must still treat the local Bun + SQLite runtime as the source of truth during a live local exam. Cloud sync should support backup, continuity, and reporting, but it must not be required for students to take an exam in local mode.

## Current Repo Reality

The active frontend is under `src/pages/*` and `src/routes/AppRoutes.tsx`.

The older prototype screens under `src/screens/*` are useful references, but they are not currently mounted by the router.

The current backend in `server/index.ts` is a scaffold. It has health/network endpoints, seeded dashboard/session/result reads, student login, and a few session actions. Most real behavior still lives in the Zustand store in `src/store/useAppStore.ts`.

The backend work should replace store-only behavior gradually with API-backed behavior, starting with the screens already exposed in the UI.

## Backend Responsibilities Not Yet Covered By UI

Some backend work is required even where the current UI has no complete screen yet. These systems should still be designed from the start because other visible features depend on them.

- Device identity: each installed desktop app should have a stable `device_id` so cloud sync can distinguish lecturer laptops.
- Local config: store app defaults such as autosave interval, recovery window, AI provider settings, sync settings, and exam defaults.
- Secure secret storage boundary: API keys and future encryption keys should not live in normal frontend state. In Tauri, secrets should move to OS keychain storage.
- Session tokens: student browsers should receive short-lived session tokens after matric verification. Matric number alone should not authorize every later request.
- Token revocation: force submit, exam end, and duplicate-login rejection should invalidate or restrict existing session tokens.
- Connectivity detection: the backend should track internet availability and expose it to sync UI and notifications.
- Background sync worker: sync should run outside page views so it continues even if the dashboard route changes.
- Sync audit log: every cloud push attempt should have status, attempt count, timestamp, and last error.
- Export pipeline: results should be exportable as CSV and later PDF, even before a full export UI exists.
- Backup and restore: the local database should support manual backup and eventual restore flows.
- Migration strategy: schema changes need a controlled migration process, not only `CREATE TABLE IF NOT EXISTS`.
- Data retention: exam scripts, flags, and student PII need lifecycle rules for archive/delete/export.
- Load and recovery tests: backend must be tested against concurrent autosaves and restart recovery, independent of the UI.
- Admin/debug endpoints for local dev: health, database stats, current run state, and sync queue state help development but should not expose sensitive data in production.
- Error taxonomy: API errors should use stable codes so the UI can show specific messages without parsing prose.

## Decisions That Differ From The Documents

These are intentional refinements to make the backend safer and easier to build.

- Introduce `exam_runs` as a first-class concept. An `exam` is the reusable definition; an `exam_run` is a live sitting of that exam.
- Use normalized `session_events` instead of making `flags_json` the main source of truth. A summarized flag count can still be stored for fast dashboard reads.
- Store timing anchors such as `started_at`, `ends_at`, and extension events. Do not rely on client-provided remaining time.
- Make AI a backend pipeline with validation and persistence, not a frontend-only model call.
- Keep Google AI Studio / Gemma access behind a backend adapter. The model id should be configured with `MUDU_AI_MODEL`, not hardcoded across the app.
- Start cloud sync as local-to-cloud push with idempotent upserts. Two-way sync can come later if cloud-side editing becomes a real requirement.
- Keep Tauri-specific packaging and secure key storage isolated from the core backend. The backend should run cleanly in local dev first, then be embedded into Tauri.
- Treat the existing UI as the delivery contract. Backend endpoints should be prioritized by mounted UI route, not by document order.

## Backend Module Layout

Recommended structure inside `server/`:

```text
server/
  index.ts
  config.ts
  db.ts
  schema.sql
  repositories/
    exams.ts
    rosters.ts
    runs.ts
    sessions.ts
    answers.ts
    sync.ts
  services/
    ai/
      index.ts
      googleGemmaProvider.ts
      prompts.ts
      validators.ts
      textExtraction.ts
    grading.ts
    monitoring.ts
    syncWorker.ts
    timers.ts
  routes/
    auth.ts
    exams.ts
    rosters.ts
    runs.ts
    student.ts
    results.ts
    ai.ts
    sync.ts
    config.ts
    device.ts
    backup.ts
  realtime/
    hub.ts
    lecturerSocket.ts
    studentSocket.ts
```

`server/index.ts` should become a small bootstrap file that loads config, initializes the database, mounts routes, starts WebSocket handling, and serves the frontend build in production mode.

## Local SQLite Schema

The current schema should be expanded into these core tables.

```sql
lecturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  institution TEXT,
  department TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

rosters (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  name TEXT NOT NULL,
  course_code TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

roster_students (
  id TEXT PRIMARY KEY,
  roster_id TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(roster_id, matric_number)
);

exams (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  roster_id TEXT,
  title TEXT NOT NULL,
  course_code TEXT,
  status TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  passing_score INTEGER NOT NULL,
  shuffle_questions INTEGER NOT NULL DEFAULT 1,
  fullscreen_required INTEGER NOT NULL DEFAULT 1,
  tab_monitoring_enabled INTEGER NOT NULL DEFAULT 1,
  show_score_to_student INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  options_json TEXT,
  correct_answer TEXT,
  points INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  source TEXT NOT NULL,
  review_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ai_generation_jobs (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  exam_id TEXT,
  source_type TEXT NOT NULL,
  source_name TEXT,
  source_text_hash TEXT,
  difficulty TEXT NOT NULL,
  requested_count INTEGER NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

exam_runs (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  roster_id TEXT NOT NULL,
  status TEXT NOT NULL,
  join_code TEXT UNIQUE,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

student_sessions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,
  last_seen_at TEXT,
  submitted_at TEXT,
  ends_at TEXT NOT NULL,
  extra_time_seconds INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(run_id, student_id)
);

answers (
  id TEXT PRIMARY KEY,
  student_session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response_text TEXT,
  selected_option TEXT,
  saved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_session_id, question_id)
);

session_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_session_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload_json TEXT,
  occurred_at TEXT NOT NULL
);

results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_session_id TEXT NOT NULL,
  objective_score INTEGER NOT NULL,
  essay_score INTEGER,
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage REAL NOT NULL,
  status TEXT NOT NULL,
  graded_at TEXT NOT NULL
);

sync_jobs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);
```

SQLCipher should be added after the behavior is stable. Keep database access behind repositories so the encryption change does not spread through route code.

## Supabase Schema

The Supabase schema should mirror the local entities with these additions:

- `cloud_id` or stable ids matching local ids.
- `lecturer_id` on every synced entity.
- `local_device_id` to identify the lecturer laptop.
- `synced_at` timestamps.
- Row Level Security policies scoped by lecturer.

For MVP, sync direction is local to cloud. The cloud should accept idempotent upserts so retrying the same sync job cannot duplicate exams, students, answers, or results.

## API Contracts

All API errors should use this shape:

```json
{
  "code": "STABLE_ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

The UI should branch on `code`, not on `message`.

### Auth And Settings

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/settings/profile`
- `PATCH /api/settings/profile`
- `GET /api/settings/app`
- `PATCH /api/settings/app`
- `GET /api/device`

The current frontend auth is local-only. For MVP, this can remain simple locally, but cloud sync will require a real lecturer identity.

### Home Dashboard

- `GET /api/dashboard`
- `GET /api/exams?status=&q=`
- `DELETE /api/exams/:examId`
- `POST /api/exams/:examId/archive`
- `POST /api/exams/:examId/duplicate`

Used by `HomePage`, notifications, and top-level metrics.

### Exam Creation

- `POST /api/exams`
- `GET /api/exams/:examId`
- `PATCH /api/exams/:examId`
- `POST /api/exams/:examId/questions`
- `PATCH /api/questions/:questionId`
- `DELETE /api/questions/:questionId`
- `POST /api/exams/:examId/publish`

This replaces the current `createDraftExam`, manual question editing, and publish logic in Zustand.

### AI Generation

- `POST /api/ai/generate-from-text`
- `POST /api/ai/generate-from-file`
- `GET /api/ai/jobs/:jobId`
- `POST /api/ai/jobs/:jobId/approve-question`
- `POST /api/ai/jobs/:jobId/discard-question`

The provider should use a Google API adapter. Required environment variables:

```text
MUDU_AI_PROVIDER=google
MUDU_AI_MODEL=gemma-4
MUDU_GOOGLE_AI_API_KEY=...
```

The exact model id should remain configurable because provider model naming can change.

### Rosters And Students

- `GET /api/rosters`
- `POST /api/rosters`
- `GET /api/rosters/:rosterId`
- `PATCH /api/rosters/:rosterId`
- `POST /api/rosters/:rosterId/students`
- `POST /api/rosters/:rosterId/import-csv`
- `POST /api/rosters/:rosterId/registration-link`
- `POST /api/registration/:token`
- `POST /api/rosters/:rosterId/confirm-registrations`

This supports CSV import, manual add, and self-registration.

### Launch And Monitoring

- `GET /api/network`
- `POST /api/exams/:examId/runs`
- `POST /api/runs/:runId/open-lobby`
- `POST /api/runs/:runId/start`
- `POST /api/runs/:runId/end`
- `GET /api/runs/:runId/sessions`
- `POST /api/runs/:runId/sessions/:sessionId/extend-time`
- `POST /api/runs/:runId/sessions/:sessionId/dismiss-flags`
- `POST /api/runs/:runId/sessions/:sessionId/force-submit`

This makes `LaunchPage` and `MonitorPage` real.

### Student Portal

- `POST /api/runs/:runId/student/join`
- `GET /api/student/session`
- `GET /api/student/exam`
- `POST /api/student/answers`
- `POST /api/student/events`
- `POST /api/student/submit`

Student requests should use a short-lived session token after join. The student browser should never receive the full roster.

### Results

- `POST /api/runs/:runId/grade`
- `GET /api/runs/:runId/results`
- `GET /api/runs/:runId/results/export`
- `PATCH /api/results/:resultId/essay-score`

Objective grading should run locally from stored questions and answers. Essay grading remains manual in MVP.

### Cloud Sync

- `GET /api/sync/status`
- `POST /api/sync/run`
- `POST /api/sync/jobs/:jobId/retry`
- `GET /api/sync/jobs`

Sync jobs should also run in the background when connectivity is available.

### Backup, Export, And Maintenance

- `POST /api/backups`
- `GET /api/backups`
- `POST /api/backups/:backupId/restore`
- `GET /api/exports/results/:runId.csv`
- `GET /api/maintenance/db-stats`
- `POST /api/maintenance/vacuum`

These endpoints do not need prominent UI in the first pass, but the backend should account for them because lecturers will need backup, export, and diagnostics once real exam data is involved.

## WebSocket Contracts

Use WebSockets after the HTTP lifecycle is stable.

Student socket:

- `timer.tick`
- `broadcast.message`
- `session.force_submit`
- `session.ended`
- `answer.saved`

Lecturer socket:

- `student.connected`
- `student.active`
- `student.disconnected`
- `student.reconnected`
- `student.submitted`
- `student.flagged`
- `timer.updated`
- `sync.status_changed`

The WebSocket payloads should be small event messages. Large state reads should stay HTTP-based.

## Current UI To Backend Mapping

| UI Area | Current File | Backend Work Needed |
| --- | --- | --- |
| Auth | `src/pages/AuthPages.tsx` | Replace local persisted users with real auth endpoints. |
| Home | `src/pages/HomePage.tsx` | Load exams, status, sync state, delete/archive/duplicate from API. |
| Exam creation | `src/pages/ExamCreatePage.tsx` | Persist draft exam, manual questions, AI drafts, roster link, publish. |
| Question bank | `src/pages/QuestionBankPage.tsx` | Fetch approved questions, update reusable questions, filter by course/type. |
| Courses | `src/pages/CoursesPage.tsx` | Decide whether courses are first-class or derived from exams/rosters. |
| Students/Rosters | `src/pages/RostersPage.tsx` | Create rosters, import CSV, add students, self-registration link. |
| Launch | `src/pages/LaunchPage.tsx` | Create/open/start exam run, display real join URL and lobby counts. |
| Monitor | `src/pages/MonitorPage.tsx` | Live sessions, flags, time extensions, force submit. |
| Results | `src/pages/ResultsPage.tsx` | Run grading, show results, score bands, question insights. |
| Settings | `src/pages/SettingsPage.tsx` | Profile, defaults, AI key/provider settings, sync settings. |
| Notifications | `src/pages/NotificationsPage.tsx` | Sync warnings, running exam notices, flagged events. |
| Student portal | `src/pages/StudentPortalPage.tsx` | Join, recover, fetch exam, autosave, submit, event logging. |

## Non-UI Backend Mapping

| Backend Area | Why It Exists | First Delivery |
| --- | --- | --- |
| Device identity | Required for cloud sync, support, and conflict tracing. | Generate and persist local `device_id`. |
| App config | Required for autosave interval, recovery window, AI provider, and sync defaults. | `GET/PATCH /api/settings/app`. |
| Secret management | Required for Google AI API keys and future encryption keys. | Environment variable in dev, Tauri keychain later. |
| Backup/export | Required for lecturer trust and institutional handoff. | CSV export first, DB backup next. |
| Migrations | Required once real users have local databases. | Versioned migration runner before major schema changes. |
| Sync worker | Required because sync must not depend on a visible page. | Background interval with manual trigger. |
| Observability | Required for debugging live exam issues. | Health, db stats, sync queue status, structured logs. |
| Load testing | Required for the 300+ student claim. | Scripted autosave/join/submit simulation. |

## Store Methods To Replace With API Calls

The Zustand store should become UI state plus caching. These actions should move to backend-backed calls:

- `signUp`
- `logIn`
- `createDraftExam`
- `updateExamStatus`
- `deleteExam`
- `archiveExam`
- `generateAiQuestions`
- `setQuestionStatus`
- `updateQuestionText`
- `updateBankQuestion`
- `publishBuilderExam`
- `importRosterFromCsv`
- `createRoster`
- `addManualStudent`
- `setSessionsFromRoster`
- `extendTime`
- `dismissFlags`
- `forceSubmit`
- `runSyncAll`
- `studentLogin`
- `studentAnswer`
- `studentSubmit`

Keep local UI state in Zustand for form drafts, modal state, toasts, sidebar collapse, and transient student exam UI state.

## Implementation Milestones

### Milestone 1: Backend Foundation

- Split `server/index.ts` into config, routes, repositories, and services.
- Replace `schema.sql` with the MVP schema.
- Add database migrations or a controlled schema bootstrap.
- Keep existing `/api/health` and `/api/network`.
- Seed realistic demo data compatible with the new schema.
- Add stable error response shape.
- Add app config and device identity.

### Milestone 2: Roster And Exam CRUD

- Implement rosters, students, CSV import, exams, questions, and publish endpoints.
- Connect `RostersPage`, `ExamCreatePage`, `QuestionBankPage`, and `HomePage` to real APIs.
- Preserve the current UI where possible so frontend work can continue.

### Milestone 3: AI Question Generation

- Add file upload and pasted-text generation endpoints.
- Extract text from TXT first, then DOCX, then PDF.
- Integrate Google AI Studio / Gemma provider through `services/ai`.
- Validate model output before writing questions.
- Store generated questions as reviewable drafts.

### Milestone 4: Local Exam Runtime

- Implement exam runs, lobby, join, token issuance, exam fetch, autosave, recovery, submit.
- Implement server-side timer anchors.
- Connect `LaunchPage` and `StudentPortalPage` to backend.
- Reject duplicate active matric logins unless it is a valid recovery.

### Milestone 5: Live Monitoring

- Add WebSocket hub for lecturer and student events.
- Surface connected, active, disconnected, submitted, and flagged states.
- Implement time extension, dismiss flags, and force submit.
- Connect `MonitorPage` to live backend state.

### Milestone 6: Grading And Results

- Auto-grade MCQ and fill-in-the-blank questions.
- Keep essay scoring manual.
- Generate score bands and question insights.
- Connect `ResultsPage` to real result endpoints.

### Milestone 7: Cloud Sync

- Add Supabase client and schema.
- Add local sync queue processing.
- Sync rosters, exams, questions, runs, sessions, answers, events, and results.
- Add retry, visible sync status, and manual `Sync Now`.

### Milestone 8: Hardening

- Add SQLCipher or equivalent encrypted local storage.
- Add Tauri secure key storage integration.
- Add load testing for 300 concurrent student sessions.
- Add crash/restart recovery tests.
- Add export and backup flows.
- Add migration tests and backup/restore verification.

## Delivery Rule

Every milestone should leave the app more functional from the UI. Avoid backend-only work that cannot be exercised from the existing screens unless it is required infrastructure for the next screen-level feature.

## Decision Log Additions

- 2026-05-01: The first backend implementation pass keeps the legacy demo exam schema working while adding foundation tables such as `schema_version`, `app_config`, and `device_identity`. This avoids breaking the current UI before the full MVP schema migration is ready.
- 2026-05-05: MVP lecturer auth uses local email/password with hashed passwords and bearer tokens stored as hashed session entries in SQLite (`lecturer_sessions`). Token verification currently checks active session hashes sequentially. This is acceptable for early MVP scale and should later move to deterministic lookup (for example HMAC fingerprint) if session volume grows.
- 2026-05-29: Keep schema bootstrap + compatibility migrations in `server/db.ts` for MVP phase 1, while moving `server/schema.sql` to the target MVP structure (including `exam_runs`, `student_sessions`, `answers`, `session_events`, `results`, and `sync_jobs`). This keeps local installs upgradable without blocking current UI flows.
- 2026-05-30: Monitor and Results pages remain on legacy `exam_sessions`, `score_bands`, and `question_insights` tables as a temporary bridge. These will be migrated to the `exam_runs`, `student_sessions`, and `results` pipeline once the runs domain is complete. The bridge is intentional and does not block current UI development.
- 2026-06-12: Courses remain derived from exams and rosters for MVP instead of adding a first-class `courses` table. The active Courses page now reads backend exams/rosters and groups by `course_code`.
- 2026-06-12: Starting an exam run updates the linked exam status to `Running`, and ending a run updates it to `Completed`. This bridges the current UI/student login contract until all runtime screens are fully run-based.
