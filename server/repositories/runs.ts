import { db, nowIso } from "../db";
import { computeSessionEndsAt } from "../services/timers";

export type ExamRunStatus = "Draft" | "Lobby" | "Running" | "Ended";

export type ExamRun = {
  id: string;
  examId: string;
  rosterId: string;
  status: ExamRunStatus;
  joinCode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExamRunRow = {
  id: string;
  examId: string;
  rosterId: string;
  status: ExamRunStatus;
  joinCode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRun(row: ExamRunRow): ExamRun {
  return {
    id: row.id,
    examId: row.examId,
    rosterId: row.rosterId,
    status: row.status,
    joinCode: row.joinCode,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function getRunById(runId: string): ExamRun | null {
  const row = db
    .query(
      `SELECT
        id,
        exam_id AS examId,
        roster_id AS rosterId,
        status,
        join_code AS joinCode,
        started_at AS startedAt,
        ended_at AS endedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM exam_runs
       WHERE id = ?
       LIMIT 1`
    )
    .get(runId) as ExamRunRow | null;

  return row ? mapRun(row) : null;
}

export function createExamRun(input: { examId: string; rosterId: string; joinCode?: string }): ExamRun {
  const id = `run_${crypto.randomUUID()}`;
  const now = nowIso();
  db.query(
    `INSERT INTO exam_runs
      (id, exam_id, roster_id, status, join_code, started_at, ended_at, created_at, updated_at)
     VALUES (?, ?, ?, 'Draft', ?, NULL, NULL, ?, ?)`
  ).run(id, input.examId, input.rosterId, input.joinCode ?? null, now, now);
  return getRunById(id)!;
}

export function openRunLobby(runId: string): ExamRun | null {
  const now = nowIso();
  const result = db
    .query("UPDATE exam_runs SET status = 'Lobby', updated_at = ? WHERE id = ? AND status = 'Draft'")
    .run(now, runId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getRunById(runId);
}

export function startRun(runId: string, durationSeconds: number): ExamRun | null;
export function startRun(runId: string, durationSeconds?: number): ExamRun | null {
  const normalizedDuration = Math.floor(Number(durationSeconds));
  if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
    return null;
  }

  const transition = db.transaction((targetRunId: string, safeDuration: number) => {
    const startedAt = nowIso();
    const runUpdate = db
      .query("UPDATE exam_runs SET status = 'Running', started_at = ?, updated_at = ? WHERE id = ? AND status = 'Lobby'")
      .run(startedAt, startedAt, targetRunId);

    if (Number(runUpdate.changes ?? 0) < 1) {
      return null;
    }

    const baseEndsAt = new Date(Date.parse(startedAt) + safeDuration * 1000).toISOString();
    const activeSessions = db
      .query(
        `SELECT id, extra_time_seconds AS extraTimeSeconds
         FROM student_sessions
         WHERE run_id = ?
           AND submitted_at IS NULL
           AND revoked_at IS NULL
           AND status != 'Submitted'`
      )
      .all(targetRunId) as Array<{ id: string; extraTimeSeconds: number }>;
    const updateSession = db.query(
      "UPDATE student_sessions SET ends_at = ?, expires_at = ? WHERE id = ?"
    );

    for (const session of activeSessions) {
      const endsAt = computeSessionEndsAt({
        runStartedAt: startedAt,
        durationSeconds: safeDuration,
        extraTimeSeconds: session.extraTimeSeconds
      });
      updateSession.run(endsAt, endsAt, session.id);
    }

    return getRunById(targetRunId);
  });

  return transition(runId, normalizedDuration);
}

export function endRun(runId: string): ExamRun | null {
  const now = nowIso();
  const result = db
    .query("UPDATE exam_runs SET status = 'Ended', ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE id = ? AND status = 'Running'")
    .run(now, now, runId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getRunById(runId);
}
