import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { config } from "./config";

const dbPath = config.database.path;

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath, { create: true });

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function initDatabase(): void {
  const schemaPath = resolve(process.cwd(), "server", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  runCompatibilityMigrations();
  db.exec(schema);
}

function runCompatibilityMigrations(): void {
  // Keep existing local databases usable while schema evolves.
  const migrationSteps = [
    "ALTER TABLE rosters ADD COLUMN description TEXT",
    "ALTER TABLE rosters ADD COLUMN course_code TEXT",
    "ALTER TABLE rosters ADD COLUMN lecturer_id TEXT",
    "ALTER TABLE exams ADD COLUMN exam_date TEXT",
    "ALTER TABLE exams ADD COLUMN lecturer_id TEXT",
    "ALTER TABLE exams ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 3600",
    "ALTER TABLE exams ADD COLUMN shuffle_questions INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE exams ADD COLUMN fullscreen_required INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE exams ADD COLUMN tab_monitoring_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE exams ADD COLUMN show_score_to_student INTEGER NOT NULL DEFAULT 0",
    "CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL, options_json TEXT, correct_answer TEXT, points INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', source TEXT NOT NULL DEFAULT 'manual', review_status TEXT NOT NULL DEFAULT 'Pending', order_index INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE)",
    "ALTER TABLE questions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'",
    "ALTER TABLE questions ADD COLUMN review_status TEXT NOT NULL DEFAULT 'Pending'",
    "CREATE TABLE IF NOT EXISTS ai_generation_jobs (id TEXT PRIMARY KEY, lecturer_id TEXT, exam_id TEXT, source_type TEXT NOT NULL, source_name TEXT, source_text_hash TEXT, difficulty TEXT NOT NULL DEFAULT 'Intermediate', requested_count INTEGER NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS exam_runs (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, roster_id TEXT NOT NULL, status TEXT NOT NULL, join_code TEXT UNIQUE, started_at TEXT, ended_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS student_sessions (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, student_id TEXT NOT NULL, token_hash TEXT NOT NULL, status TEXT NOT NULL, current_question_index INTEGER NOT NULL DEFAULT 0, joined_at TEXT NOT NULL, last_seen_at TEXT, submitted_at TEXT, revoked_at TEXT, expires_at TEXT, ends_at TEXT NOT NULL, extra_time_seconds INTEGER NOT NULL DEFAULT 0, flag_count INTEGER NOT NULL DEFAULT 0, UNIQUE(run_id, student_id), UNIQUE(token_hash))",
    "DROP TABLE IF EXISTS answers",
    "CREATE TABLE IF NOT EXISTS answers (id TEXT PRIMARY KEY, student_session_id TEXT NOT NULL, question_id TEXT NOT NULL, response_text TEXT, selected_option TEXT, saved_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(student_session_id, question_id))",
    "CREATE TABLE IF NOT EXISTS session_events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, student_session_id TEXT, event_type TEXT NOT NULL, severity TEXT NOT NULL, payload_json TEXT, occurred_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, student_session_id TEXT NOT NULL, objective_score INTEGER NOT NULL DEFAULT 0, essay_score INTEGER, total_score INTEGER NOT NULL DEFAULT 0, max_score INTEGER NOT NULL DEFAULT 0, percentage REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Pending', graded_at TEXT NOT NULL, UNIQUE(run_id, student_session_id))",
    "CREATE TABLE IF NOT EXISTS sync_jobs (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, synced_at TEXT)"
    ,
    "CREATE TABLE IF NOT EXISTS roster_registration_tokens (token TEXT PRIMARY KEY, roster_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS roster_pending_registrations (id TEXT PRIMARY KEY, roster_id TEXT NOT NULL, token TEXT NOT NULL, matric_number TEXT NOT NULL, full_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
  ];

  for (const sql of migrationSteps) {
    try {
      db.exec(sql);
    } catch {
      // Ignore duplicate-column or already-applied migration errors.
    }
  }
}
