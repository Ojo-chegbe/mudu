import { db, nowIso } from "../db";

export type RosterStudent = {
  id: string;
  matric: string;
  name: string;
};

export type Roster = {
  id: string;
  name: string;
  description: string | null;
  courseCode: string | null;
  lastUsedAt: string;
  students: RosterStudent[];
};

type RosterRow = {
  id: string;
  name: string;
  description: string | null;
  courseCode: string | null;
  updatedAt: string;
};

function getRosterStudents(rosterId: string): RosterStudent[] {
  return db
    .query(
      `SELECT id, matric_number AS matric, full_name AS name
       FROM roster_students
       WHERE roster_id = ?
       ORDER BY full_name ASC`
    )
    .all(rosterId) as RosterStudent[];
}

export function findRosterStudentByMatric(rosterId: string, matricNumber: string): RosterStudent | null {
  const normalizedRosterId = rosterId.trim();
  const normalizedMatricNumber = matricNumber.trim();
  if (!normalizedRosterId || !normalizedMatricNumber) {
    return null;
  }

  const row = db
    .query(
      `SELECT id, matric_number AS matric, full_name AS name
       FROM roster_students
       WHERE roster_id = ?
         AND matric_number = ?
       LIMIT 1`
    )
    .get(normalizedRosterId, normalizedMatricNumber) as RosterStudent | null;

  return row;
}

function mapRoster(row: RosterRow): Roster {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    courseCode: row.courseCode,
    lastUsedAt: row.updatedAt,
    students: getRosterStudents(row.id)
  };
}

export function listRosters(): Roster[] {
  const rows = db
    .query(
      `SELECT
        id,
        name,
        description,
        course_code AS courseCode,
        updated_at AS updatedAt
      FROM rosters
      ORDER BY updated_at DESC`
    )
    .all() as RosterRow[];

  return rows.map(mapRoster);
}

export function findRosterById(rosterId: string): Roster | null {
  const row = db
    .query(
      `SELECT
        id,
        name,
        description,
        course_code AS courseCode,
        updated_at AS updatedAt
      FROM rosters
      WHERE id = ?
      LIMIT 1`
    )
    .get(rosterId) as RosterRow | null;

  return row ? mapRoster(row) : null;
}

export function createRoster(input: { name: string; description?: string; courseCode?: string }): Roster {
  const now = nowIso();
  const id = `roster_${crypto.randomUUID()}`;
  db.query(
    "INSERT INTO rosters (id, name, description, course_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, input.name, input.description ?? null, input.courseCode ?? null, now, now);

  return findRosterById(id)!;
}

export function updateRoster(
  rosterId: string,
  updates: { name?: string; description?: string | null; courseCode?: string | null }
): Roster | null {
  const existing = findRosterById(rosterId);
  if (!existing) {
    return null;
  }

  const now = nowIso();
  db.query(
    `UPDATE rosters
     SET name = ?, description = ?, course_code = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.name ?? existing.name,
    updates.description === undefined ? existing.description : updates.description,
    updates.courseCode === undefined ? existing.courseCode : updates.courseCode,
    now,
    rosterId
  );

  return findRosterById(rosterId);
}

export function deleteRoster(rosterId: string): boolean {
  const result = db.query("DELETE FROM rosters WHERE id = ?").run(rosterId);
  return Number(result.changes ?? 0) > 0;
}

export function addRosterStudent(rosterId: string, input: { matric: string; name: string }): RosterStudent {
  const now = nowIso();
  const id = `st_${crypto.randomUUID()}`;
  db.query(
    `INSERT INTO roster_students (id, roster_id, matric_number, full_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, rosterId, input.matric, input.name, now, now);
  db.query("UPDATE rosters SET updated_at = ? WHERE id = ?").run(now, rosterId);

  return { id, matric: input.matric, name: input.name };
}

export function updateRosterStudent(
  studentId: string,
  updates: { matric?: string; name?: string }
): RosterStudent | null {
  const row = db
    .query(
      `SELECT id, roster_id AS rosterId, matric_number AS matric, full_name AS name
       FROM roster_students
       WHERE id = ?
       LIMIT 1`
    )
    .get(studentId) as { id: string; rosterId: string; matric: string; name: string } | null;

  if (!row) {
    return null;
  }

  const nextMatric = updates.matric ?? row.matric;
  const nextName = updates.name ?? row.name;
  const now = nowIso();
  db.query(
    `UPDATE roster_students
     SET matric_number = ?, full_name = ?, updated_at = ?
     WHERE id = ?`
  ).run(nextMatric, nextName, now, studentId);
  db.query("UPDATE rosters SET updated_at = ? WHERE id = ?").run(now, row.rosterId);

  return { id: row.id, matric: nextMatric, name: nextName };
}

export function deleteRosterStudent(studentId: string): boolean {
  const row = db
    .query("SELECT roster_id AS rosterId FROM roster_students WHERE id = ? LIMIT 1")
    .get(studentId) as { rosterId: string } | null;
  if (!row) {
    return false;
  }

  const result = db.query("DELETE FROM roster_students WHERE id = ?").run(studentId);
  if (Number(result.changes ?? 0) < 1) {
    return false;
  }

  db.query("UPDATE rosters SET updated_at = ? WHERE id = ?").run(nowIso(), row.rosterId);
  return true;
}

export function importRosterStudentsFromCsv(
  rosterId: string,
  csvText: string
): { created: number; duplicates: number; invalid: number } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { created: 0, duplicates: 0, invalid: 0 };
  }

  const existingStudents = getRosterStudents(rosterId);
  const existingMatric = new Set(existingStudents.map((s) => s.matric.toLowerCase()));
  const seenInFile = new Set<string>();
  let created = 0;
  let duplicates = 0;
  let invalid = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const [matricRaw, nameRaw] = lines[i].split(",");
    const matric = (matricRaw ?? "").trim();
    const name = (nameRaw ?? "").trim();

    if (!matric || !name) {
      invalid += 1;
      continue;
    }

    const key = matric.toLowerCase();
    if (existingMatric.has(key) || seenInFile.has(key)) {
      duplicates += 1;
      continue;
    }

    addRosterStudent(rosterId, { matric, name });
    seenInFile.add(key);
    created += 1;
  }

  return { created, duplicates, invalid };
}

export function createRosterRegistrationToken(rosterId: string): { token: string; expiresAt: string } {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  db.query(
    `INSERT INTO roster_registration_tokens (token, roster_id, status, expires_at, created_at, updated_at)
     VALUES (?, ?, 'Active', ?, ?, ?)`
  ).run(token, rosterId, expiresAt, now, now);
  return { token, expiresAt };
}

export function findActiveRosterByRegistrationToken(token: string): { rosterId: string } | null {
  return db
    .query(
      `SELECT roster_id AS rosterId
       FROM roster_registration_tokens
       WHERE token = ? AND status = 'Active' AND expires_at > ?
       LIMIT 1`
    )
    .get(token, nowIso()) as { rosterId: string } | null;
}

export function addPendingRegistration(input: { rosterId: string; token: string; matric: string; name: string }): void {
  const now = nowIso();
  db.query(
    `INSERT INTO roster_pending_registrations
      (id, roster_id, token, matric_number, full_name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`
  ).run(`rpr_${crypto.randomUUID()}`, input.rosterId, input.token, input.matric, input.name, now, now);
}

export function confirmPendingRegistrations(rosterId: string): { confirmed: number; duplicates: number } {
  const pending = db
    .query(
      `SELECT id, matric_number AS matric, full_name AS name
       FROM roster_pending_registrations
       WHERE roster_id = ? AND status = 'Pending'
       ORDER BY created_at ASC`
    )
    .all(rosterId) as Array<{ id: string; matric: string; name: string }>;

  const existing = new Set(
    getRosterStudents(rosterId).map((student) => student.matric.toLowerCase())
  );

  let confirmed = 0;
  let duplicates = 0;
  const now = nowIso();

  for (const row of pending) {
    const key = row.matric.toLowerCase();
    if (existing.has(key)) {
      duplicates += 1;
      db.query("UPDATE roster_pending_registrations SET status = 'Rejected', updated_at = ? WHERE id = ?").run(now, row.id);
      continue;
    }

    addRosterStudent(rosterId, { matric: row.matric, name: row.name });
    existing.add(key);
    confirmed += 1;
    db.query("UPDATE roster_pending_registrations SET status = 'Confirmed', updated_at = ? WHERE id = ?").run(now, row.id);
  }

  return { confirmed, duplicates };
}
