import { db, nowIso } from "../db";

export type TimerManagedSession = {
  id: string;
  examId: string;
  studentId: string;
  runId: string;
  status: string;
  currentQuestionIndex?: number;
  submittedAt: string | null;
  revokedAt: string | null;
  expiresAt?: string | null;
  endsAt: string;
  flagCount?: number;
};

export function computeSessionEndsAt(input: {
  runStartedAt: string | null;
  durationSeconds: number;
  extraTimeSeconds?: number;
  fallbackBase?: string;
}): string {
  const safeDurationSeconds = Math.max(0, Math.floor(input.durationSeconds));
  const safeExtraTimeSeconds = Math.max(0, Math.floor(input.extraTimeSeconds ?? 0));
  const base = input.runStartedAt ?? input.fallbackBase ?? nowIso();
  return new Date(Date.parse(base) + (safeDurationSeconds + safeExtraTimeSeconds) * 1000).toISOString();
}

export function deriveRemainingSeconds(endsAt: string): number {
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(endMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
}

export function hasTimerExpired(endsAt: string): boolean {
  return deriveRemainingSeconds(endsAt) <= 0;
}

export function syncManagedSessionTimer(session: TimerManagedSession): TimerManagedSession {
  if (session.submittedAt || session.revokedAt || session.status === "Submitted" || !hasTimerExpired(session.endsAt)) {
    return session;
  }

  const now = nowIso();
  db.query(
    `UPDATE student_sessions
     SET status = 'Submitted',
         submitted_at = ?,
         revoked_at = COALESCE(revoked_at, ?),
         last_seen_at = ?
     WHERE id = ?
       AND submitted_at IS NULL`
  ).run(now, now, now, session.id);

  db.query(
    `UPDATE exam_sessions
     SET status = 'Submitted',
         submitted_at = COALESCE(submitted_at, ?),
         time_remaining_seconds = 0,
         updated_at = ?
     WHERE exam_id = ? AND student_id = ?`
  ).run(now, now, session.examId, session.studentId);

  return {
    ...session,
    status: "Submitted",
    submittedAt: now,
    revokedAt: now
  };
}
