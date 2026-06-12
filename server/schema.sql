PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_identity (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lecturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  institution TEXT,
  department TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lecturer_sessions (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rosters (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  course_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS roster_registration_tokens (
  token TEXT PRIMARY KEY,
  roster_id TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roster_pending_registrations (
  id TEXT PRIMARY KEY,
  roster_id TEXT NOT NULL,
  token TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE,
  FOREIGN KEY (token) REFERENCES roster_registration_tokens(token) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  title TEXT NOT NULL,
  course_code TEXT,
  exam_date TEXT,
  roster_id TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 3600,
  passing_score INTEGER NOT NULL,
  shuffle_questions INTEGER NOT NULL DEFAULT 1,
  fullscreen_required INTEGER NOT NULL DEFAULT 1,
  tab_monitoring_enabled INTEGER NOT NULL DEFAULT 1,
  show_score_to_student INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  options_json TEXT,
  correct_answer TEXT,
  points INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  source TEXT NOT NULL DEFAULT 'manual',
  review_status TEXT NOT NULL DEFAULT 'Pending',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT,
  exam_id TEXT,
  source_type TEXT NOT NULL,
  source_name TEXT,
  source_text_hash TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Intermediate',
  requested_count INTEGER NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exam_runs (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  roster_id TEXT NOT NULL,
  status TEXT NOT NULL,
  join_code TEXT UNIQUE,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,
  last_seen_at TEXT,
  submitted_at TEXT,
  revoked_at TEXT,
  expires_at TEXT,
  ends_at TEXT NOT NULL,
  extra_time_seconds INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(run_id, student_id),
  UNIQUE(token_hash),
  FOREIGN KEY (run_id) REFERENCES exam_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES roster_students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  student_session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response_text TEXT,
  selected_option TEXT,
  saved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_session_id, question_id),
  FOREIGN KEY (student_session_id) REFERENCES student_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_session_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload_json TEXT,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES exam_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_session_id) REFERENCES student_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  student_session_id TEXT NOT NULL,
  objective_score INTEGER NOT NULL DEFAULT 0,
  essay_score INTEGER,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  graded_at TEXT NOT NULL,
  UNIQUE(run_id, student_session_id),
  FOREIGN KEY (run_id) REFERENCES exam_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_session_id) REFERENCES student_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_jobs (
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

-- Legacy tables kept for currently mounted UI routes while migration completes.
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

CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_roster_id ON exams(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_students_roster_id ON roster_students(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_registration_tokens_roster_id ON roster_registration_tokens(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_registration_tokens_status ON roster_registration_tokens(status);
CREATE INDEX IF NOT EXISTS idx_roster_pending_registrations_roster_id ON roster_pending_registrations(roster_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id_order ON questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_exam_id ON ai_generation_jobs(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_runs_exam_status ON exam_runs(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_runs_join_code ON exam_runs(join_code);
CREATE INDEX IF NOT EXISTS idx_student_sessions_run_status ON student_sessions(run_id, status);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_answers_student_session_id ON answers(student_session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_session_events_run_id ON session_events(run_id);
CREATE INDEX IF NOT EXISTS idx_session_events_student_session_id ON session_events(student_session_id);
CREATE INDEX IF NOT EXISTS idx_results_run_id ON results(run_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity ON sync_jobs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id_status ON exam_sessions(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
