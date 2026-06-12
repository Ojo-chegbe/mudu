import { db, nowIso } from "../db";

export type SyncJobStatus = "Pending" | "Syncing" | "Synced" | "Failed";

export type SyncJob = {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  status: SyncJobStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
};

type SyncJobRow = {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  status: SyncJobStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
};

function mapJob(row: SyncJobRow): SyncJob {
  return { ...row };
}

export function createSyncJob(input: {
  entityType: string;
  entityId: string;
  operation: string;
  status?: SyncJobStatus;
}): SyncJob {
  const id = `sync_${crypto.randomUUID()}`;
  const now = nowIso();
  db.query(
    `INSERT INTO sync_jobs
      (id, entity_type, entity_id, operation, status, attempts, last_error, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL)`
  ).run(id, input.entityType, input.entityId, input.operation, input.status ?? "Pending", now, now);
  return getSyncJobById(id)!;
}

export function listSyncJobs(filters?: { status?: SyncJobStatus; limit?: number }): SyncJob[] {
  const status = filters?.status;
  const limit = Math.max(1, Math.min(500, Number(filters?.limit ?? 100)));
  const rows = status
    ? (db
        .query(
          `SELECT
            id,
            entity_type AS entityType,
            entity_id AS entityId,
            operation,
            status,
            attempts,
            last_error AS lastError,
            created_at AS createdAt,
            updated_at AS updatedAt,
            synced_at AS syncedAt
           FROM sync_jobs
           WHERE status = ?
           ORDER BY updated_at DESC
           LIMIT ?`
        )
        .all(status, limit) as SyncJobRow[])
    : (db
        .query(
          `SELECT
            id,
            entity_type AS entityType,
            entity_id AS entityId,
            operation,
            status,
            attempts,
            last_error AS lastError,
            created_at AS createdAt,
            updated_at AS updatedAt,
            synced_at AS syncedAt
           FROM sync_jobs
           ORDER BY updated_at DESC
           LIMIT ?`
        )
        .all(limit) as SyncJobRow[]);

  return rows.map(mapJob);
}

export function getSyncJobById(jobId: string): SyncJob | null {
  const row = db
    .query(
      `SELECT
        id,
        entity_type AS entityType,
        entity_id AS entityId,
        operation,
        status,
        attempts,
        last_error AS lastError,
        created_at AS createdAt,
        updated_at AS updatedAt,
        synced_at AS syncedAt
       FROM sync_jobs
       WHERE id = ?
       LIMIT 1`
    )
    .get(jobId) as SyncJobRow | null;
  return row ? mapJob(row) : null;
}

export function markSyncJobSyncing(jobId: string): SyncJob | null {
  const now = nowIso();
  const result = db
    .query("UPDATE sync_jobs SET status = 'Syncing', attempts = attempts + 1, updated_at = ?, last_error = NULL WHERE id = ?")
    .run(now, jobId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getSyncJobById(jobId);
}

export function markSyncJobSynced(jobId: string): SyncJob | null {
  const now = nowIso();
  const result = db
    .query("UPDATE sync_jobs SET status = 'Synced', updated_at = ?, synced_at = ?, last_error = NULL WHERE id = ?")
    .run(now, now, jobId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getSyncJobById(jobId);
}

export function markSyncJobFailed(jobId: string, lastError: string): SyncJob | null {
  const now = nowIso();
  const result = db
    .query("UPDATE sync_jobs SET status = 'Failed', updated_at = ?, last_error = ? WHERE id = ?")
    .run(now, lastError, jobId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getSyncJobById(jobId);
}

export function retrySyncJob(jobId: string): SyncJob | null {
  const now = nowIso();
  const result = db
    .query("UPDATE sync_jobs SET status = 'Pending', updated_at = ?, last_error = NULL, synced_at = NULL WHERE id = ?")
    .run(now, jobId);
  if (Number(result.changes ?? 0) < 1) return null;
  return getSyncJobById(jobId);
}
