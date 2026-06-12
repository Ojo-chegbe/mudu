import { db } from "../db";
import { json } from "../http";

function getDashboard() {
  const published = (db.query("SELECT COUNT(*) AS count FROM exams WHERE status IN ('Published','Running','Completed')").get() as { count: number }).count;
  const connected = (db.query("SELECT COUNT(*) AS count FROM exam_sessions WHERE status IN ('Connected','Active')").get() as { count: number }).count;
  const unsyncedQueue = (db.query("SELECT COUNT(*) AS count FROM sync_queue WHERE status IN ('Pending','Error')").get() as { count: number }).count;
  const unsyncedJobs = (db.query("SELECT COUNT(*) AS count FROM sync_jobs WHERE status IN ('Pending','Syncing','Failed')").get() as { count: number }).count;
  const unsynced = unsyncedQueue + unsyncedJobs;

  const exams = db
    .query(
      `SELECT
          e.id,
          e.title,
          COALESCE(e.course_code, '') AS course,
          r.name AS rosterName,
          e.status,
          printf('%d / %d',
            (SELECT COUNT(*) FROM exam_sessions s WHERE s.exam_id = e.id AND s.status = 'Submitted'),
            (SELECT COUNT(*) FROM roster_students rs WHERE rs.roster_id = e.roster_id)
          ) AS submissions,
          COALESCE((SELECT sq.status FROM sync_queue sq WHERE sq.exam_id = e.id ORDER BY sq.updated_at DESC LIMIT 1), 'Synced') AS sync
       FROM exams e
       JOIN rosters r ON r.id = e.roster_id
       ORDER BY e.updated_at DESC`
    )
    .all() as Array<{ id: string; title: string; course: string; rosterName: string; status: string; submissions: string; sync: string }>;

  return {
    metrics: [
      { label: "Published Exams", value: String(published) },
      { label: "Connected Students", value: String(connected) },
      { label: "Auto-save Health", value: connected > 0 ? "Healthy" : "No active autosave sessions" },
      { label: "Unsynced Exams", value: String(unsynced) }
    ],
    exams
  };
}

export function handleDashboardRoutes(pathname: string): Response | null {
  if (pathname === "/api/dashboard") {
    return json(getDashboard());
  }

  return null;
}
