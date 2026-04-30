import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";

const defaultPath = resolve(process.cwd(), "data", "mudu.db");
const dbPath = resolve(process.cwd(), Bun.env.MUDU_DB_PATH ?? defaultPath);

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
  db.exec(schema);
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
