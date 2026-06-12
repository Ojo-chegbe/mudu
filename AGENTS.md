# Agent Rules For MUDU

These rules apply to any AI agent or developer working in this repository.

MUDU is a local-first exam management system. The backend must make the current UI functional while preserving the product direction: AI-assisted exam creation, local WiFi exam execution, server-side integrity, recovery, grading, and cloud sync.

## Required Reading Before Work

Before making code changes, read these files:

- `README.md`
- `BACKEND_MVP_BUILD_PLAN.md`
- `BACKEND_MVP_TASKS.md`
- `src/routes/AppRoutes.tsx`
- `src/store/useAppStore.ts`
- relevant `src/pages/*` files for the UI flow being changed
- relevant `server/*` files for the backend flow being changed

The `docs/` folder is intentionally local and ignored by git. Do not remove that ignore rule unless explicitly instructed by the project owner.

## Source Of Truth

- `BACKEND_MVP_BUILD_PLAN.md` is the backend architecture and implementation source of truth.
- `BACKEND_MVP_TASKS.md` is the execution checklist.
- Active UI routes are defined in `src/routes/AppRoutes.tsx`.
- Active UI screens are under `src/pages/*`.
- Files under `src/screens/*` are reference-only unless the router is changed to mount them.

## Task Discipline

- Work from `BACKEND_MVP_TASKS.md`.
- Mark a task as complete by changing `[ ]` to `[x]` only after the work is implemented and verified.
- If a task is partially complete, leave it as `[ ]` and add a short note below it only if the note is necessary.
- Do not skip ahead without preserving a working app state.
- Each milestone should leave at least one active UI flow more functional.
- If implementation reveals a missing task, add it to the correct group in `BACKEND_MVP_TASKS.md`.
- If the missing task does not fit an existing group, add it under a new heading named `Newly Discovered Tasks`.
- If a decision is made that is not already in the build plan, document it in `BACKEND_MVP_BUILD_PLAN.md` under a heading named `Decision Log Additions`.

## Scope Control

- Do not edit files outside the assigned task unless the change is required to make the task work.
- Do not refactor unrelated code.
- Do not reformat unrelated files.
- Do not remove existing user work.
- Do not delete files unless the task explicitly requires it.
- Do not change public UI behavior unless the task requires frontend integration.
- Do not introduce new frameworks, databases, auth systems, or cloud providers without documenting the decision first.

## Backend Priorities

Backend work should follow this order unless the project owner gives a newer instruction:

1. Runtime baseline and config.
2. Backend structure refactor.
3. Error response standards.
4. Database schema and repositories.
5. Auth, app config, and device identity.
6. Roster and exam CRUD.
7. AI generation with Google AI Studio / Gemma provider adapter.
8. Exam run lifecycle.
9. Student join, autosave, recovery, and submit.
10. Server-side timer.
11. Lecturer monitoring and WebSockets.
12. Grading and results.
13. Supabase cloud sync.
14. Backup, export, maintenance, security, reliability, and load testing.

## AI And Cloud Sync Requirements

- AI generation is part of MVP.
- Cloud sync is part of MVP.
- AI must be backend-owned. The frontend must not call Google AI APIs directly.
- Keep the Google AI model configurable through environment/config values such as `MUDU_AI_MODEL`.
- Cloud sync must not be required for a live local exam to run.
- Local Bun + SQLite is the source of truth during active local exam sessions.
- Supabase sync should be idempotent and retryable.

## UI Integration Rules

- The goal is to make the current UI functional, not to build backend features in isolation.
- Preserve the current design and route structure unless a task explicitly requires UI changes.
- Replace Zustand mock behavior gradually with API-backed behavior.
- Keep Zustand for UI-only state such as toasts, modals, sidebar state, form drafts, and temporary student exam UI.
- When connecting a screen to the backend, add loading, empty, and error states where needed.
- Use stable backend error codes for UI branching.

## Data And Security Rules

- Do not expose correct answers to student endpoints.
- Do not expose the full roster to student browsers.
- Student requests after matric verification must use a session token.
- Store only token hashes in SQLite.
- Server time is authoritative for exam timing.
- Do not trust client-submitted remaining time.
- Log malpractice and recovery events as session events.
- The system should flag suspicious behavior but not automatically penalize students.
- Keep API keys and cloud credentials out of frontend code.
- Do not commit `.env`, local databases, logs, or private planning docs.

## Verification Rules

Before marking a task complete:

- Run the smallest relevant verification command.
- For TypeScript/frontend-impacting work, run `npm.cmd run build`.
- For backend runtime work, start the Bun server and check `/api/health`.
- For API work, test the changed endpoint manually or with a small script.
- For database work, verify the schema initializes from a clean database.
- For UI integration work, verify the affected route in the browser when practical.

If verification cannot be run, document the reason in the final response and do not mark the task complete unless the project owner explicitly accepts it.

## Documentation Rules

- Update `BACKEND_MVP_TASKS.md` when work is completed.
- Update `BACKEND_MVP_BUILD_PLAN.md` when an architectural decision changes.
- Keep local/private planning docs inside `docs/`.
- Keep `docs/` ignored in `.gitignore`.
- Do not add README links to ignored private docs because the public repo would contain broken references.
- If a new backend feature is built that was not planned, add both a task entry and a decision note.

## Git And File Hygiene

- Check `git status --short` before and after substantial work.
- Be aware that the worktree may already contain changes from the project owner.
- Never use destructive git commands such as `git reset --hard` or `git checkout --` unless explicitly instructed.
- Never revert changes you did not make.
- Do not commit generated runtime files such as SQLite WAL/SHM files, logs, or build artifacts unless explicitly instructed.

## Agent Handoff

At the end of work, report:

- What was changed.
- Which checklist tasks were marked `[x]`.
- Which verification commands were run.
- Any tasks added because they were missing.
- Any decisions added because they were not in the original plan.
- Any known blockers or risks.

