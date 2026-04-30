PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rosters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roster_students (
  id TEXT PRIMARY KEY,
  roster_id TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(roster_id, matric_number),
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  course_code TEXT,
  roster_id TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  passing_score INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_question INTEGER NOT NULL DEFAULT 1,
  flags_count INTEGER NOT NULL DEFAULT 0,
  reconnect_gap_seconds INTEGER NOT NULL DEFAULT 0,
  time_remaining_seconds INTEGER NOT NULL,
  last_autosave_at TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES roster_students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  question_ref TEXT NOT NULL,
  answer_value TEXT,
  autosaved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_flags (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS score_bands (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  label TEXT NOT NULL,
  count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_insights (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  question_ref TEXT NOT NULL,
  question_type TEXT NOT NULL,
  success_rate TEXT NOT NULL,
  issue TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_attempt_at TEXT,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);
