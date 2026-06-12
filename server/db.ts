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

type SeedContext = {
  rosterId: string;
  examId: string;
};

export function seedIfEmpty(): SeedContext {
  const examsCount = (db.query("SELECT COUNT(*) AS count FROM exams").get() as { count: number } | null)?.count ?? 0;
  const now = nowIso();

  if (examsCount > 0) {
    const existing = db.query("SELECT id, roster_id FROM exams ORDER BY created_at ASC LIMIT 1").get() as { id: string; roster_id: string };
    return { examId: existing.id, rosterId: existing.roster_id };
  }

  const rosterId = "roster_demo_2026";
  const examId = "exam_demo_midsem";

  db.query(
    "INSERT INTO rosters (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(rosterId, "CSC301 - 2026 Cohort", now, now);

  const students = [
    { id: "student_001", matric: "CSC/2021/098", name: "Amina Bello" },
    { id: "student_002", matric: "CSC/2021/011", name: "Ifeanyi Obi" },
    { id: "student_003", matric: "CSC/2021/072", name: "David Asha" },
    { id: "student_004", matric: "CSC/2021/030", name: "Mariam Yusuf" },
    { id: "student_005", matric: "CSC/2021/104", name: "Olu Adams" }
  ];

  const insertStudent = db.query(
    "INSERT INTO roster_students (id, roster_id, matric_number, full_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  students.forEach((student) => {
    insertStudent.run(student.id, rosterId, student.matric, student.name, now, now);
  });

  db.query(
    "INSERT INTO exams (id, title, course_code, roster_id, status, duration_minutes, passing_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(examId, "Mid-Semester Assessment", "CSC301", rosterId, "Running", 60, 50, now, now);

  db.query(
    "INSERT INTO exams (id, title, course_code, roster_id, status, duration_minutes, passing_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("exam_demo_published", "Final Revision Test", "CSC301", rosterId, "Published", 45, 50, now, now);

  db.query(
    "INSERT INTO exams (id, title, course_code, roster_id, status, duration_minutes, passing_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("exam_demo_draft", "Practice Quiz Draft", "CSC301", rosterId, "Draft", 30, 50, now, now);

  const insertQuestion = db.query(
    `INSERT INTO questions
      (id, exam_id, type, text, options_json, correct_answer, points, status, source, review_status, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertQuestion.run("q_demo_1", examId, "MCQ", "What is local-first exam delivery?", JSON.stringify(["Runs over local WiFi", "Runs only in cloud", "Requires external LMS", "No offline support"]), "Runs over local WiFi", 1, "Approved", "manual", "Approved", 0, now, now);
  insertQuestion.run("q_demo_2", examId, "FILL", "SQLite is a ______ database engine.", JSON.stringify([]), "embedded", 1, "Approved", "manual", "Approved", 1, now, now);
  insertQuestion.run("q_demo_3", examId, "ESSAY", "Explain why server-side timers improve exam integrity.", JSON.stringify([]), "", 5, "Approved", "manual", "Approved", 2, now, now);

  const runId = "run_demo_midsem";
  db.query(
    "INSERT INTO exam_runs (id, exam_id, roster_id, status, join_code, started_at, ended_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)"
  ).run(runId, examId, rosterId, "Running", "MIDSEM26", now, now, now);

  const sessionSeed = [
    { id: "sess_001", studentId: "student_001", status: "Active", question: 8, flags: 0, gap: 0, remaining: 1938 },
    { id: "sess_002", studentId: "student_002", status: "Connected", question: 1, flags: 0, gap: 0, remaining: 2100 },
    { id: "sess_003", studentId: "student_003", status: "Flagged", question: 6, flags: 3, gap: 17, remaining: 1800 },
    { id: "sess_004", studentId: "student_004", status: "Submitted", question: 30, flags: 0, gap: 0, remaining: 0 },
    { id: "sess_005", studentId: "student_005", status: "Disconnected", question: 4, flags: 1, gap: 134, remaining: 2010 }
  ];

  const insertSession = db.query(
    `INSERT INTO exam_sessions
      (id, exam_id, student_id, status, current_question, flags_count, reconnect_gap_seconds, time_remaining_seconds, last_autosave_at, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  sessionSeed.forEach((session) => {
    insertSession.run(
      session.id,
      examId,
      session.studentId,
      session.status,
      session.question,
      session.flags,
      session.gap,
      session.remaining,
      now,
      session.status === "Submitted" ? now : null,
      now,
      now
    );
  });

  const insertStudentSession = db.query(
    `INSERT INTO student_sessions
      (id, run_id, student_id, token_hash, status, current_question_index, joined_at, last_seen_at, submitted_at, revoked_at, expires_at, ends_at, extra_time_seconds, flag_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?)`
  );

  for (const session of sessionSeed) {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + Math.max(session.remaining, 1) * 1000).toISOString();
    const tokenHash = new Bun.CryptoHasher("sha256").update(`seed:${session.id}`).digest("hex");
    insertStudentSession.run(
      `ss_${session.id}`,
      runId,
      session.studentId,
      tokenHash,
      session.status,
      Math.max(0, session.question - 1),
      now,
      now,
      session.status === "Submitted" ? now : null,
      expiresAt,
      endsAt,
      session.flags
    );
  }

  const scoreBands = [
    { id: "band_1", label: "80-100", count: 28 },
    { id: "band_2", label: "70-79", count: 34 },
    { id: "band_3", label: "60-69", count: 26 },
    { id: "band_4", label: "50-59", count: 14 },
    { id: "band_5", label: "0-49", count: 10 }
  ];

  const insertBand = db.query("INSERT INTO score_bands (id, exam_id, label, count, created_at) VALUES (?, ?, ?, ?, ?)");
  scoreBands.forEach((band) => {
    insertBand.run(band.id, examId, band.label, band.count, now);
  });

  const insights = [
    { id: "ins_1", questionRef: "Q1", type: "MCQ", successRate: "89%", issue: "None" },
    { id: "ins_2", questionRef: "Q4", type: "Fill", successRate: "44%", issue: "Wording ambiguous" },
    { id: "ins_3", questionRef: "Q8", type: "Essay", successRate: "Manual", issue: "Long answers" }
  ];

  const insertInsight = db.query(
    "INSERT INTO question_insights (id, exam_id, question_ref, question_type, success_rate, issue, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insights.forEach((insight) => {
    insertInsight.run(insight.id, examId, insight.questionRef, insight.type, insight.successRate, insight.issue, now);
  });

  db.query(
    "INSERT INTO sync_queue (id, exam_id, status, error_message, created_at, updated_at, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("sync_1", examId, "Pending", null, now, now, null);

  return { examId, rosterId };
}
