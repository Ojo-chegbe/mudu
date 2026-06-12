import { db, nowIso } from "../db";
import { apiError, json } from "../http";

function hasLiveExamActivity(): boolean {
  const runningExam = db
    .query("SELECT 1 AS ok FROM exams WHERE status IN ('Running', 'Active') LIMIT 1")
    .get() as { ok: number } | null;

  if (runningExam) {
    return true;
  }

  const activeSessions = db
    .query("SELECT 1 AS ok FROM exam_sessions WHERE status IN ('Connected', 'Active', 'Flagged') LIMIT 1")
    .get() as { ok: number } | null;

  return Boolean(activeSessions);
}

function syncPendingExams() {
  if (hasLiveExamActivity()) {
    return {
      status: "deferred",
      reason: "LOCAL_EXAM_ACTIVE",
      message: "Sync deferred during active local exam activity to preserve local source of truth."
    };
  }

  const now = nowIso();
  const result = db
    .query("UPDATE sync_queue SET status = 'Synced', error_message = NULL, updated_at = ?, last_attempt_at = ? WHERE status IN ('Pending','Error')")
    .run(now, now);

  return {
    status: "ok",
    syncedExams: Number(result.changes ?? 0)
  };
}

export function handleSyncRoutes(request: Request, pathname: string): Response | null {
  if (pathname === "/api/sync/status" && request.method === "GET") {
    const hasLiveActivity = hasLiveExamActivity();
    return json({
      localSourceOfTruth: true,
      cloudSyncDeferred: hasLiveActivity,
      reason: hasLiveActivity ? "LOCAL_EXAM_ACTIVE" : null
    });
  }

  if (pathname === "/api/sync" && request.method === "POST") {
    const result = syncPendingExams();
    if (result.status === "deferred") {
      return apiError(409, "SYNC_DEFERRED_ACTIVE_LOCAL_EXAM", result.message, { reason: result.reason });
    }
    return json(result);
  }

  return null;
}
