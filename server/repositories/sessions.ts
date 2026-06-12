import { db, nowIso } from "../db";
import { computeSessionEndsAt } from "../services/timers";

export type StudentSessionStatus = "Connected" | "Active" | "Submitted" | "Flagged" | "Disconnected";

export type StudentSession = {
  id: string;
  runId: string;
  studentId: string;
  status: StudentSessionStatus;
  currentQuestionIndex: number;
  joinedAt: string;
  lastSeenAt: string | null;
  submittedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  endsAt: string;
  extraTimeSeconds: number;
  flagCount: number;
};

type StudentSessionRow = {
  id: string;
  runId: string;
  studentId: string;
  status: StudentSessionStatus;
  currentQuestionIndex: number;
  joinedAt: string;
  lastSeenAt: string | null;
  submittedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  endsAt: string;
  extraTimeSeconds: number;
  flagCount: number;
};

function mapSession(row: StudentSessionRow): StudentSession {
  return { ...row };
}

export function createStudentSession(input: {
  runId: string;
  studentId: string;
  tokenHash: string;
  status?: StudentSessionStatus;
  currentQuestionIndex?: number;
  endsAt: string;
  expiresAt?: string | null;
}): StudentSession {
  const id = `ss_${crypto.randomUUID()}`;
  const now = nowIso();
  db.query(
    `INSERT INTO student_sessions
      (id, run_id, student_id, token_hash, status, current_question_index, joined_at, last_seen_at, submitted_at, revoked_at, expires_at, ends_at, extra_time_seconds, flag_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 0, 0)`
  ).run(id, input.runId, input.studentId, input.tokenHash, input.status ?? "Connected", input.currentQuestionIndex ?? 0, now, now, input.expiresAt ?? null, input.endsAt);
  return findSessionById(id)!;
}

export function findSessionById(sessionId: string): StudentSession | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_id AS studentId,
        status,
        current_question_index AS currentQuestionIndex,
        joined_at AS joinedAt,
        last_seen_at AS lastSeenAt,
        submitted_at AS submittedAt,
        revoked_at AS revokedAt,
        expires_at AS expiresAt,
        ends_at AS endsAt,
        extra_time_seconds AS extraTimeSeconds,
        flag_count AS flagCount
       FROM student_sessions
       WHERE id = ?
       LIMIT 1`
    )
    .get(sessionId) as StudentSessionRow | null;
  return row ? mapSession(row) : null;
}

export function findSessionByTokenHash(tokenHash: string): StudentSession | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_id AS studentId,
        status,
        current_question_index AS currentQuestionIndex,
        joined_at AS joinedAt,
        last_seen_at AS lastSeenAt,
        submitted_at AS submittedAt,
        revoked_at AS revokedAt,
        expires_at AS expiresAt,
        ends_at AS endsAt,
        extra_time_seconds AS extraTimeSeconds,
        flag_count AS flagCount
       FROM student_sessions
       WHERE token_hash = ?
       LIMIT 1`
    )
    .get(tokenHash) as StudentSessionRow | null;
  return row ? mapSession(row) : null;
}

export function findActiveSessionByRunAndStudent(runId: string, studentId: string): StudentSession | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_id AS studentId,
        status,
        current_question_index AS currentQuestionIndex,
        joined_at AS joinedAt,
        last_seen_at AS lastSeenAt,
        submitted_at AS submittedAt,
        revoked_at AS revokedAt,
        expires_at AS expiresAt,
        ends_at AS endsAt,
        extra_time_seconds AS extraTimeSeconds,
        flag_count AS flagCount
       FROM student_sessions
       WHERE run_id = ?
         AND student_id = ?
         AND status IN ('Connected','Active','Flagged')
         AND submitted_at IS NULL
         AND revoked_at IS NULL
       LIMIT 1`
    )
    .get(runId, studentId) as StudentSessionRow | null;
  return row ? mapSession(row) : null;
}

export function findSessionByRunAndStudent(runId: string, studentId: string): StudentSession | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_id AS studentId,
        status,
        current_question_index AS currentQuestionIndex,
        joined_at AS joinedAt,
        last_seen_at AS lastSeenAt,
        submitted_at AS submittedAt,
        revoked_at AS revokedAt,
        expires_at AS expiresAt,
        ends_at AS endsAt,
        extra_time_seconds AS extraTimeSeconds,
        flag_count AS flagCount
       FROM student_sessions
       WHERE run_id = ?
         AND student_id = ?
       LIMIT 1`
    )
    .get(runId, studentId) as StudentSessionRow | null;
  return row ? mapSession(row) : null;
}

export function rotateStudentSessionToken(
  sessionId: string,
  tokenHash: string,
  expiresAt?: string | null
): StudentSession | null {
  const now = nowIso();
  const result =
    expiresAt === undefined
      ? db
          .query("UPDATE student_sessions SET token_hash = ?, last_seen_at = ? WHERE id = ?")
          .run(tokenHash, now, sessionId)
      : db
          .query("UPDATE student_sessions SET token_hash = ?, last_seen_at = ?, expires_at = ? WHERE id = ?")
          .run(tokenHash, now, expiresAt, sessionId);
  if (Number(result.changes ?? 0) < 1) return null;
  return findSessionById(sessionId);
}

export function updateSessionStatus(sessionId: string, status: StudentSessionStatus): StudentSession | null {
  const result = db.query("UPDATE student_sessions SET status = ?, last_seen_at = ? WHERE id = ?").run(status, nowIso(), sessionId);
  if (Number(result.changes ?? 0) < 1) return null;
  return findSessionById(sessionId);
}

export function extendSessionTime(sessionId: string, extraSeconds: number): StudentSession | null {
  const normalizedExtraSeconds = Math.floor(Number(extraSeconds));
  if (!Number.isFinite(normalizedExtraSeconds) || normalizedExtraSeconds <= 0) {
    return null;
  }

  const current = findSessionById(sessionId);
  if (!current) {
    return null;
  }

  const run = db
    .query("SELECT started_at AS startedAt FROM exam_runs WHERE id = ? LIMIT 1")
    .get(current.runId) as { startedAt: string | null } | null;
  const exam = db
    .query("SELECT duration_minutes AS durationMinutes FROM exams WHERE id = (SELECT exam_id FROM exam_runs WHERE id = ? LIMIT 1)")
    .get(current.runId) as { durationMinutes: number } | null;
  if (!exam) {
    return null;
  }

  const totalExtraTimeSeconds = current.extraTimeSeconds + normalizedExtraSeconds;
  const endsAt = computeSessionEndsAt({
    runStartedAt: run?.startedAt ?? null,
    durationSeconds: exam.durationMinutes * 60,
    extraTimeSeconds: totalExtraTimeSeconds,
    fallbackBase: current.joinedAt
  });

  const now = nowIso();
  const result = db
    .query(
      `UPDATE student_sessions
       SET extra_time_seconds = extra_time_seconds + ?,
           ends_at = ?,
           expires_at = CASE
             WHEN expires_at IS NULL THEN NULL
             ELSE ?
           END,
           last_seen_at = ?
       WHERE id = ?`
    )
    .run(normalizedExtraSeconds, endsAt, endsAt, now, sessionId);
  if (Number(result.changes ?? 0) < 1) return null;
  return findSessionById(sessionId);
}

export function updateSessionProgress(sessionId: string, currentQuestionIndex: number): StudentSession | null {
  const now = nowIso();
  const result = db
    .query("UPDATE student_sessions SET current_question_index = ?, last_seen_at = ? WHERE id = ?")
    .run(currentQuestionIndex, now, sessionId);
  if (Number(result.changes ?? 0) < 1) return null;
  return findSessionById(sessionId);
}

export function submitSession(sessionId: string): StudentSession | null {
  const now = nowIso();
  const result = db
    .query("UPDATE student_sessions SET status = 'Submitted', submitted_at = ?, last_seen_at = ? WHERE id = ? AND submitted_at IS NULL")
    .run(now, now, sessionId);
  if (Number(result.changes ?? 0) < 1) return null;
  return findSessionById(sessionId);
}
