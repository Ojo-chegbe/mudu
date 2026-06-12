# MUDU Backend MVP Task Checklist

This checklist is the execution companion to `docs/BACKEND_MVP_BUILD_PLAN.md`. Tasks should be completed from top to bottom unless a task explicitly says it can run in parallel.

Use `[ ]` for pending tasks and `[x]` for completed tasks.

## 0. Project Control And Source Of Truth

- [x] Read `docs/BACKEND_MVP_BUILD_PLAN.md` before starting implementation work.
- [x] Keep this checklist updated as tasks are completed.
- [x] Keep `docs/` ignored so private planning material is never pushed to the public repo.
- [x] Keep `AGENTS.md` ignored so local agent rules are never pushed to the public repo.
- [x] Treat mounted files under `src/pages/*` and `src/routes/AppRoutes.tsx` as the active UI contract.
- [x] Treat `src/screens/*` as reference-only unless the router is changed to mount them.
- [x] Confirm every backend milestone leaves at least one active UI flow more functional.
- [x] Add stable backend error codes before frontend integration depends on response messages.
- [x] Avoid adding cloud or AI behavior directly to frontend components.
- [x] Keep local Bun + SQLite as the source of truth during live local exam sessions.

## 1. Repository And Runtime Baseline

- [x] Confirm `npm.cmd install` completes successfully on the current machine.
- [x] Confirm `npm.cmd run build` passes before backend refactors begin.
- [x] Confirm Bun is available with `bun --version` or the full path at `%USERPROFILE%\.bun\bin\bun.exe`.
- [x] Confirm `server/index.ts` starts and `/api/health` returns `{ "status": "ok" }`.
- [x] Confirm Vite dev proxy sends `/api/*` from `localhost:5173` to Bun on `localhost:3000`.
- [x] Add `.env.example` entries for backend config used by the MVP.
- [x] Add `MUDU_PORT` and `MUDU_HOST` defaults to backend config.
- [x] Add `MUDU_DB_PATH` support to backend config.
- [x] Add `MUDU_AI_PROVIDER`, `MUDU_AI_MODEL`, and `MUDU_GOOGLE_AI_API_KEY` to `.env.example`.
- [x] Add Supabase env placeholders to `.env.example`.
- [x] Document local run commands in README without linking private `docs/` files.

## 2. Backend Structure Refactor

- [x] Create `server/config.ts` for environment parsing and defaults.
- [x] Create `server/routes/` directory.
- [x] Create `server/repositories/` directory.
- [x] Create `server/services/` directory.
- [x] Create `server/realtime/` directory.
- [x] Move response helpers such as `json` and `notFound` into a shared server utility.
- [x] Refactor `server/index.ts` into a small bootstrap file.
- [x] Keep static frontend serving in the bootstrap layer.
- [x] Keep CORS and `OPTIONS` handling centralized.
- [x] Add route registration by domain: auth, exams, rosters, runs, student, results, ai, sync, settings, maintenance.
- [x] Ensure existing routes keep working while refactor is in progress.
- [x] Run `npm.cmd run build` after the refactor.

## 3. Error Handling And API Response Standards

- [x] Define standard API error shape with `code`, `message`, and optional `details`.
- [x] Create shared error helpers for `400`, `401`, `403`, `404`, `409`, and `500`.
- [x] Replace ad hoc `{ error: "..." }` responses with stable error codes.
- [x] Add validation errors for missing required fields.
- [x] Add conflict errors for duplicate matric numbers, duplicate active sessions, and invalid state transitions.
- [x] Add auth errors for missing or invalid lecturer session.
- [x] Add student token errors for expired, missing, or revoked student sessions.
- [x] Ensure frontend can branch on `code`, not message text.

## 4. Database Foundation And Migrations

- [x] Decide whether to keep bootstrap-only schema for MVP phase 1 or add a migration runner immediately.
- [x] Add `schema_version` table if using a migration runner.
- [x] Redesign `server/schema.sql` around the MVP schema in the build plan.
- [x] Add `lecturers` table.
- [x] Add improved `rosters` table.
- [x] Add improved `roster_students` table.
- [x] Add improved `exams` table.
- [x] Add `questions` table.
- [x] Add `ai_generation_jobs` table.
- [x] Add `exam_runs` table.
- [x] Add `student_sessions` table.
- [x] Add improved `answers` table.
- [x] Add `session_events` table.
- [x] Add `results` table.
- [x] Add `sync_jobs` table.
- [x] Add `app_config` table for local settings.
- [x] Add `device_identity` table or equivalent persisted config.
- [x] Add indexes for common dashboard, monitor, join, sync, and results queries.
- [x] Add foreign keys and cascade rules deliberately.
- [x] Update `server/db.ts` to initialize the new schema.
- [x] Update seed data to match the new schema.
- [x] Confirm seed data supports Home, Launch, Monitor, Student Portal, and Results screens.

## 5. Repository Layer

- [x] Create `repositories/exams.ts`.
- [x] Add exam create, read, update, delete, archive, duplicate, publish queries.
- [x] Add question create, update, delete, reorder, approve, discard queries.
- [x] Create `repositories/rosters.ts`.
- [x] Add roster create, read, update, delete queries.
- [x] Add student add, update, delete, dedupe, and CSV import support queries.
- [x] Create `repositories/runs.ts`.
- [x] Add exam run create, open lobby, start, end, and state transition queries.
- [x] Create `repositories/sessions.ts`.
- [x] Add join, recover, find by token, update status, extend time, submit queries.
- [x] Create `repositories/answers.ts`.
- [x] Add answer upsert and answer list queries.
- [x] Create `repositories/results.ts`.
- [x] Add result insert, update essay score, fetch run results, score band, and insight queries.
- [x] Create `repositories/sync.ts`.
- [x] Add sync job create, list, mark syncing, mark synced, mark failed, retry queries.
- [x] Create `repositories/config.ts`.
- [x] Add app config read/update queries.
- [x] Create `repositories/device.ts`.
- [x] Add stable device identity create/read queries.

## 6. Device Identity And App Config

- [x] Generate a stable local `device_id` on first server start.
- [x] Persist `device_id` locally.
- [x] Expose `GET /api/device`.
- [x] Add app config defaults for autosave interval.
- [x] Add app config defaults for recovery window.
- [x] Add app config defaults for exam settings.
- [x] Add app config defaults for AI provider and model.
- [x] Add app config defaults for sync behavior.
- [x] Expose `GET /api/settings/app`.
- [x] Expose `PATCH /api/settings/app`.
- [x] Connect Settings UI to app config where relevant.

## 7. Lecturer Auth And Profile

- [x] Decide MVP local auth strategy for lecturer account.
- [x] Implement `POST /api/auth/signup`.
- [x] Implement `POST /api/auth/login`.
- [x] Implement `POST /api/auth/logout`.
- [x] Add session cookie or local auth token handling.
- [x] Hash lecturer passwords if passwords remain part of local auth.
- [x] Implement `GET /api/settings/profile`.
- [x] Implement `PATCH /api/settings/profile`.
- [x] Replace local-only `signUp` store behavior with API-backed signup.
- [x] Replace local-only `logIn` store behavior with API-backed login.
- [x] Replace local-only `logOut` store behavior with API-backed logout.
- [x] Preserve current login/signup UI flow while moving data to backend.

## 8. Dashboard And Exam List

- [x] Implement `GET /api/dashboard`.
- [x] Return published exam count.
- [x] Return connected student count.
- [x] Return unsynced item count.
- [x] Return auto-save health summary.
- [x] Implement `GET /api/exams?status=&q=`.
- [x] Include roster name, question count, submission count, sync status, and status.
- [x] Implement `DELETE /api/exams/:examId`.
- [x] Implement `POST /api/exams/:examId/archive`.
- [x] Implement `POST /api/exams/:examId/duplicate`.
- [x] Connect `HomePage` exam listing to API.
- [x] Connect Home delete action to API.
- [x] Connect Home archive action to API.
- [x] Connect Home duplicate action to API.
- [x] Keep Home search/filter functional.

## 9. Roster Management

- [x] Implement `GET /api/rosters`.
- [x] Implement `POST /api/rosters`.
- [x] Implement `GET /api/rosters/:rosterId`.
- [x] Implement `PATCH /api/rosters/:rosterId`.
- [x] Implement `DELETE /api/rosters/:rosterId` if needed by UI.
- [x] Implement `POST /api/rosters/:rosterId/students`.
- [x] Implement student update and delete endpoints if needed by UI.
- [x] Implement `POST /api/rosters/:rosterId/import-csv`.
- [x] Validate CSV headers and required fields.
- [x] Detect duplicate matric numbers within uploaded CSV.
- [x] Detect duplicate matric numbers already in the selected roster.
- [x] Return import summary with created, duplicates, and invalid rows.
- [x] Implement `POST /api/rosters/:rosterId/registration-link`.
- [x] Implement `POST /api/registration/:token`.
- [x] Implement `POST /api/rosters/:rosterId/confirm-registrations`.
- [x] Connect `RostersPage` to roster APIs.
- [x] Replace `importRosterFromCsv` store-only behavior.
- [x] Replace `createRoster` store-only behavior.
- [x] Replace `addManualStudent` store-only behavior.

## 10. Exam Creation And Question Management

- [x] Implement `POST /api/exams`.
- [x] Implement `GET /api/exams/:examId`.
- [x] Implement `PATCH /api/exams/:examId`.
- [x] Implement `POST /api/exams/:examId/questions`.
- [x] Implement `PATCH /api/questions/:questionId`.
- [x] Implement `DELETE /api/questions/:questionId`.
- [x] Implement question reorder endpoint or include order updates in patch.
- [x] Implement `POST /api/exams/:examId/publish`.
- [x] Validate exam has title, duration, roster, and at least one approved question before publish.
- [x] Persist manual MCQ questions with options and correct answer.
- [x] Persist fill-in-the-blank questions with correct answer.
- [x] Persist essay questions with points.
- [x] Connect `ExamCreatePage` step 1 to `POST /api/exams`.
- [x] Connect manual question editor to question APIs.
- [x] Connect exam publish action to backend.
- [x] Replace `createDraftExam` store-only behavior.
- [x] Replace `publishBuilderExam` store-only behavior.
- [x] Keep local form draft state in Zustand where useful.

## 11. Question Bank

- [x] Implement `GET /api/questions?status=&course=&type=&q=`.
- [x] Implement reusable question metadata if required.
- [x] Implement `PATCH /api/questions/:questionId` for question bank edits.
- [x] Implement duplicate or add-to-exam behavior if the UI needs it.
- [x] Connect `QuestionBankPage` to backend.
- [x] Replace `updateBankQuestion` store-only behavior.
- [x] Ensure approved AI and manual questions appear in the bank.

## 12. AI Text Extraction Pipeline

- [ ] Create `services/ai/textExtraction.ts`.
- [ ] Support pasted raw text.
- [ ] Support `.txt` upload extraction.
- [ ] Add `.docx` extraction.
- [ ] Add `.pdf` extraction.
- [ ] Add file size limits.
- [ ] Add allowed MIME/type validation.
- [ ] Normalize whitespace before prompt construction.
- [ ] Store source text hash, not full source text unless product policy allows storing it.
- [ ] Return useful extraction errors for unsupported or unreadable files.
- [ ] Add tests or fixtures for TXT, DOCX, and PDF extraction.

## 13. AI Provider Integration

- [ ] Create `services/ai/index.ts`.
- [ ] Create `services/ai/googleGemmaProvider.ts`.
- [ ] Read provider config from `MUDU_AI_PROVIDER`.
- [ ] Read model id from `MUDU_AI_MODEL`.
- [ ] Read Google API key from `MUDU_GOOGLE_AI_API_KEY` in local dev.
- [ ] Keep provider implementation hidden behind a stable internal interface.
- [ ] Add timeout handling for AI requests.
- [ ] Add retry policy for transient provider failures.
- [ ] Add rate limit or usage guard for MVP.
- [ ] Add structured logging for AI job failures without logging sensitive document content.
- [ ] Ensure frontend never calls Google AI API directly.

## 14. AI Prompting And Validation

- [ ] Create `services/ai/prompts.ts`.
- [ ] Define prompt for MCQ, fill-in-the-blank, and essay generation.
- [ ] Include difficulty option in prompt.
- [ ] Include requested question count in prompt.
- [ ] Include question mix preference in prompt.
- [ ] Require strict JSON response format.
- [ ] Create `services/ai/validators.ts`.
- [ ] Validate returned JSON shape.
- [ ] Validate question type values.
- [ ] Validate MCQ has enough options and a valid correct answer.
- [ ] Validate points are positive.
- [ ] Normalize model output into local `questions` rows.
- [ ] Reject or quarantine invalid generated questions.
- [ ] Store AI generation job status as pending, running, complete, or failed.

## 15. AI API Routes And UI Connection

- [ ] Implement `POST /api/ai/generate-from-text`.
- [ ] Implement `POST /api/ai/generate-from-file`.
- [ ] Implement `GET /api/ai/jobs/:jobId`.
- [ ] Implement approve generated question endpoint.
- [ ] Implement discard generated question endpoint.
- [ ] Connect upload mode in `ExamCreatePage` to AI file generation.
- [ ] Connect paste mode in `ExamCreatePage` to AI text generation.
- [ ] Replace `generateAiQuestions` store-only behavior.
- [ ] Persist generated questions as drafts with review status.
- [ ] Allow lecturer edits before approval.
- [ ] Ensure AI failure falls back cleanly to manual entry.

## 16. Exam Run Lifecycle

- [x] Implement `POST /api/exams/:examId/runs`.
- [x] Generate `run_id` and join code for each run.
- [x] Link run to exam and roster snapshot.
- [x] Implement `POST /api/runs/:runId/open-lobby`.
- [x] Implement `POST /api/runs/:runId/start`.
- [x] Set run `started_at` when exam starts.
- [x] Implement `POST /api/runs/:runId/end`.
- [x] Set run `ended_at` when exam ends.
- [x] Prevent starting an unpublished exam.
- [x] Prevent joining ended runs.
- [x] Prevent invalid state transitions.
- [x] Connect `LaunchPage` open lobby behavior to backend.
- [x] Connect `LaunchPage` start exam behavior to backend.

## 17. Student Join And Session Tokens

- [x] Implement `POST /api/runs/:runId/student/join`.
- [x] Verify matric number against run roster.
- [x] Reject unknown matric number.
- [x] Reject already submitted student.
- [x] Detect existing active session for recovery.
- [x] Generate short-lived student session token.
- [x] Store hashed token in `student_sessions`.
- [x] Return session token only to the joining browser.
- [x] Return student name, exam title, current question, and remaining time.
- [x] Never return full roster to student browser.
- [x] Replace `studentLogin` store-only behavior with API-backed join.
- [x] Remove UI test bypass before production behavior.

## 18. Student Exam Fetch And Recovery

- [x] Implement `GET /api/student/session`.
- [x] Validate student session token.
- [x] Return session status and remaining time.
- [x] Implement `GET /api/student/exam`.
- [x] Return only exam questions and options needed by the current student.
- [x] Do not return correct answers to the student browser.
- [x] Return previously saved answers on recovery.
- [x] Restore current question index.
- [x] Log reconnect events.
- [x] Enforce configurable recovery window.
- [x] Connect `StudentInstructionsPage` to real session/exam data.
- [x] Connect `StudentExamPage` to real questions and recovered answers.

## 19. Server-Side Timer

- [x] Create `services/timers.ts`.
- [x] Compute session `ends_at` from run start, duration, and extensions.
- [x] Derive `remaining_seconds` from server clock.
- [x] Ignore client-submitted remaining time.
- [x] Persist `ends_at` and extension events.
- [x] Auto-submit or lock sessions when time expires.
- [x] Return timer state from student session endpoints.
- [x] Connect student timer display to server time.

## 20. Autosave And Answer Persistence

- [x] Implement `POST /api/student/answers`.
- [x] Validate student session token.
- [x] Validate question belongs to the session exam.
- [x] Upsert answer by `student_session_id` and `question_id`.
- [x] Update session `last_seen_at`.
- [x] Update current question index.
- [x] Return saved timestamp.
- [x] Log autosave errors with stable error codes.
- [x] Replace `studentAnswer` store-only persistence with backend autosave.
- [x] Keep local browser state as temporary UI cache.
- [x] Respect autosave interval from app config.
- [x] Attempt final autosave on page unload using `sendBeacon` or `fetch` keepalive where supported.

## 21. Student Events And Malpractice Flags

- [x] Implement `POST /api/student/events`.
- [x] Accept `fullscreen_exit` event.
- [x] Accept `tab_hidden` or `visibility_lost` event.
- [x] Accept `tab_visible` or reconnect event.
- [x] Accept client disconnect signal where possible.
- [x] Store all events in `session_events`.
- [x] Increment summarized `flag_count` for relevant events.
- [x] Return warning state to student UI.
- [x] Show flags in lecturer monitoring.
- [x] Ensure system flags but does not auto-penalize.
- [x] Connect fullscreen and tab monitoring in `StudentPortalPage` to backend.

## 22. Submission Flow

- [x] Implement `POST /api/student/submit`.
- [x] Validate student session token.
- [x] Mark session submitted.
- [x] Store submitted timestamp.
- [x] Revoke or restrict token after submit.
- [x] Trigger grading for objective questions.
- [x] Return submission confirmation.
- [x] Reset student browser state after submission.
- [x] Replace `studentSubmit` store-only behavior.
- [x] Ensure shared laptop flow returns to student login.

## 23. Monitoring HTTP Endpoints

- [x] Implement `GET /api/runs/:runId/sessions`.
- [x] Return name, matric, status, current question, flags, reconnect gap, and time left.
- [x] Implement `POST /api/runs/:runId/sessions/:sessionId/extend-time`.
- [x] Implement `POST /api/runs/:runId/sessions/:sessionId/dismiss-flags`.
- [x] Implement `POST /api/runs/:runId/sessions/:sessionId/force-submit`.
- [x] Validate lecturer authorization for monitoring actions.
- [x] Log monitoring interventions in `session_events`.
- [x] Replace `setSessionsFromRoster` store-only behavior.
- [x] Replace `extendTime` store-only behavior.
- [x] Replace `dismissFlags` store-only behavior.
- [x] Replace `forceSubmit` store-only behavior.
- [x] Connect `MonitorPage` list and grid views to final run-based backend data.

## 24. WebSocket Realtime Hub

- [ ] Create `realtime/hub.ts`.
- [ ] Add lecturer socket endpoint.
- [ ] Add student socket endpoint.
- [ ] Authenticate lecturer socket.
- [ ] Authenticate student socket using session token.
- [ ] Track connected student sockets by run and session.
- [ ] Broadcast student connected event to lecturer.
- [ ] Broadcast student disconnected event to lecturer.
- [ ] Broadcast submitted event to lecturer.
- [ ] Broadcast flagged event to lecturer.
- [ ] Emit and broadcast timer updates to student.
- [ ] Broadcast force submit to student.
- [ ] Broadcast exam ended to students.
- [ ] Keep large state reads on HTTP endpoints.
- [ ] Add fallback polling path if WebSocket connection fails.

## 25. Grading Pipeline

- [ ] Create `services/grading.ts`.
- [ ] Implement MCQ grading.
- [ ] Implement fill-in-the-blank grading.
- [ ] Normalize fill-in answers for case and whitespace.
- [ ] Keep essay questions marked as manual.
- [ ] Calculate total score and max score.
- [ ] Calculate percentage.
- [ ] Store results in `results`.
- [ ] Implement `POST /api/runs/:runId/grade`.
- [ ] Trigger grading on submit or run end.
- [ ] Allow regrading after lecturer edits essay score.
- [ ] Add tests for objective grading.

## 26. Results And Analytics

- [ ] Implement `GET /api/runs/:runId/results`.
- [ ] Return student results table.
- [ ] Return average score.
- [ ] Return pass rate.
- [ ] Return score bands.
- [ ] Return question insights.
- [ ] Return flagged scripts count.
- [ ] Implement `PATCH /api/results/:resultId/essay-score`.
- [ ] Implement results CSV export.
- [ ] Connect `ResultsPage` to the final results pipeline. [BRIDGE: currently API-backed through legacy result tables.]
- [ ] Replace legacy seeded score bands and question insights with computed MVP pipeline data. [BRIDGE: current backend values still come from `score_bands` and `question_insights`.]

## 27. Cloud Sync Schema And Client

- [ ] Define Supabase project schema.
- [ ] Add `lecturer_id` to every synced cloud table.
- [ ] Add `device_id` to cloud sync records.
- [ ] Add `synced_at` timestamps.
- [ ] Add Supabase RLS policies.
- [ ] Add Supabase client setup in backend.
- [ ] Keep Supabase credentials out of frontend.
- [ ] Add local-to-cloud idempotent upsert helpers.
- [ ] Add cloud tables for rosters.
- [ ] Add cloud tables for students.
- [ ] Add cloud tables for exams.
- [ ] Add cloud tables for questions.
- [ ] Add cloud tables for runs.
- [ ] Add cloud tables for sessions.
- [ ] Add cloud tables for answers.
- [ ] Add cloud tables for events.
- [ ] Add cloud tables for results.

## 28. Sync Queue And Worker

- [ ] Create `services/syncWorker.ts`.
- [ ] Create sync job whenever a synced entity changes.
- [ ] Deduplicate pending sync jobs for the same entity when safe.
- [ ] Implement background sync interval.
- [ ] Implement connectivity check.
- [ ] Implement `GET /api/sync/status`.
- [ ] Implement `GET /api/sync/jobs`.
- [ ] Implement `POST /api/sync/run`.
- [ ] Implement `POST /api/sync/jobs/:jobId/retry`.
- [ ] Mark jobs as syncing, synced, or failed.
- [ ] Store attempt count and last error.
- [ ] Keep sync non-blocking during live exams.
- [ ] Connect sync status to Home, Notifications, and Settings where present.
- [ ] Replace `runSyncAll` store-only behavior.

## 29. Backup, Export, And Maintenance

- [ ] Implement `POST /api/backups`.
- [ ] Store local DB backup with timestamped metadata.
- [ ] Implement `GET /api/backups`.
- [ ] Implement `POST /api/backups/:backupId/restore` with safety checks.
- [ ] Implement `GET /api/exports/results/:runId.csv`.
- [ ] Implement `GET /api/maintenance/db-stats`.
- [ ] Implement `POST /api/maintenance/vacuum`.
- [ ] Ensure backup/restore is disabled or protected during active exams.
- [ ] Add export button support where UI exposes it.

## 30. Notifications And System Status

- [ ] Define notification sources: sync failures, unsynced results, active exam, flagged students, low autosave health.
- [ ] Implement notification aggregation endpoint if current UI needs it.
- [x] Connect `NotificationsPage` to backend.
- [x] Ensure topbar notification count comes from real backend state or shared cached state.
- [ ] Add stable notification types and timestamps.

## 31. Courses

- [x] Decide whether `courses` are first-class entities or derived from exams and rosters.
- [ ] If first-class, add `courses` table.
- [ ] If derived, implement `GET /api/courses` from grouped exams/rosters.
- [x] Connect `CoursesPage` to backend data.
- [x] Ensure course code consistency across rosters, exams, and question bank.

## 32. Frontend Store Conversion

- [ ] Keep Zustand for UI-only state: modals, toasts, sidebar, form drafts, transient exam UI.
- [x] Add an API client module for backend calls beyond `fetchNetwork`.
- [x] Convert auth actions to API calls.
- [x] Convert exam actions to API calls.
- [x] Convert question actions to API calls.
- [x] Convert roster actions to API calls.
- [ ] Convert launch and monitor actions to API calls.
- [x] Convert student actions to API calls.
- [x] Convert results actions to API calls.
- [ ] Convert sync actions to API calls.
- [ ] Remove or clearly mark seed-only mock data.
- [ ] Add loading states for API-backed screens.
- [ ] Add error states using stable backend error codes.

## 33. Security Hardening

- [ ] Hash lecturer passwords if local password auth remains.
- [ ] Hash student session tokens in SQLite.
- [ ] Add token expiry.
- [ ] Add token revocation on submit, force submit, and exam end.
- [ ] Prevent student endpoints from exposing correct answers.
- [ ] Prevent student browser from receiving full roster.
- [ ] Validate local network binding behavior.
- [ ] Add request size limits.
- [ ] Add upload size limits.
- [ ] Add basic rate limits for join and AI generation endpoints.
- [ ] Add SQLCipher or equivalent encrypted local storage after core behavior stabilizes.
- [ ] Integrate Tauri secure key storage for secrets.
- [ ] Move sensitive keys out of `.env` for packaged builds.

## 34. Reliability And Recovery

- [ ] Ensure autosaved answers survive server restart.
- [ ] Ensure student sessions recover after browser refresh.
- [ ] Ensure student sessions recover after brief disconnect.
- [ ] Ensure run state survives lecturer dashboard refresh.
- [ ] Ensure run state survives Bun process restart if within recovery window.
- [ ] Ensure sync failures do not break local exam flow.
- [ ] Ensure AI failures do not block manual exam creation.
- [ ] Add startup recovery logic for runs left in active state.
- [ ] Add clear behavior for expired recovery windows.

## 35. Performance And Load Testing

- [ ] Create script to seed one exam with 300 students.
- [ ] Create script to simulate 300 student joins.
- [ ] Create script to simulate autosaves every 3-5 seconds.
- [ ] Create script to simulate submissions.
- [ ] Measure average response time for join.
- [ ] Measure average response time for autosave.
- [ ] Measure SQLite write performance under load.
- [ ] Measure memory usage during simulated exam.
- [ ] Measure WebSocket connection stability.
- [ ] Document realistic laptop requirements after testing.
- [ ] Tune indexes and write batching based on results.

## 36. Testing Strategy

- [ ] Add unit tests for repositories where practical.
- [ ] Add tests for AI output validation.
- [ ] Add tests for CSV import validation.
- [ ] Add tests for server-side timer calculations.
- [ ] Add tests for objective grading.
- [ ] Add tests for sync job state transitions.
- [ ] Add integration test for student join to submit flow.
- [ ] Add integration test for recovery flow.
- [ ] Add integration test for force submit.
- [ ] Add integration test for cloud sync retry.
- [ ] Run `npm.cmd run build` after each milestone.

## 37. AI Agent Work Allocation

Use AI agents only for bounded tasks with clear ownership. Every AI-generated change must be reviewed against this checklist and the build plan.

- [ ] Agent: Database Architect. Owns `server/schema.sql`, migrations, seed updates, and query indexes.
- [ ] Agent: API Builder. Owns route modules and stable response contracts.
- [ ] Agent: Repository Builder. Owns repository modules and database access patterns.
- [ ] Agent: AI Pipeline Builder. Owns text extraction, Google/Gemma provider adapter, prompts, and validators.
- [ ] Agent: Runtime Builder. Owns exam runs, student sessions, autosave, recovery, and timer service.
- [ ] Agent: Realtime Builder. Owns WebSocket hub and lecturer/student realtime event delivery.
- [ ] Agent: Sync Builder. Owns Supabase schema mapping, sync jobs, and background worker.
- [ ] Agent: Frontend Integrator. Owns replacing Zustand mock behaviors with API-backed flows while preserving the current UI.
- [ ] Agent: QA/Load Tester. Owns test scripts, integration tests, and 300-student simulation.
- [ ] Agent: Security Reviewer. Reviews token handling, AI key handling, upload handling, and student data exposure.

## 38. Completion Criteria

- [ ] Lecturer can sign up, log in, and manage profile from backend state.
- [ ] Lecturer can create an exam from the UI and persist it to SQLite.
- [ ] Lecturer can generate draft questions using Google AI Studio / Gemma API.
- [ ] Lecturer can review, edit, approve, and discard AI-generated questions.
- [ ] Lecturer can manually create MCQ, fill-in-the-blank, and essay questions.
- [ ] Lecturer can create and import rosters.
- [ ] Lecturer can publish an exam linked to a roster.
- [ ] Lecturer can open a lobby and start an exam run.
- [ ] Student can join with matric number only.
- [ ] Student can take an exam from the browser.
- [ ] Student answers autosave to SQLite.
- [ ] Student can recover after refresh or reconnect.
- [ ] Lecturer can monitor live session states.
- [ ] Lecturer can see malpractice flags.
- [ ] Lecturer can extend time, dismiss flags, and force submit.
- [ ] Student can submit successfully.
- [ ] Objective grading works locally.
- [ ] Results and analytics display real data.
- [ ] Results and scripts sync to Supabase when internet is available.
- [ ] Sync failures are visible and retryable.
- [ ] Local exam flow works without internet after exam content is prepared.
- [ ] Backend survives restart with recoverable exam state.
- [ ] Load testing supports the product's 300-student claim or documents the bottlenecks.
