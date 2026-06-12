import { db, nowIso } from "../db";

export type Lecturer = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  institution: string | null;
  department: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LecturerProfile = Omit<Lecturer, "passwordHash">;

export type LecturerSession = {
  id: string;
  lecturerId: string;
  tokenHash: string;
  status: "active" | "revoked";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export function findLecturerByEmail(email: string): Lecturer | null {
  return db
    .query(
      `SELECT
        id,
        name,
        email,
        password_hash AS passwordHash,
        institution,
        department,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM lecturers
      WHERE email = ?
      LIMIT 1`
    )
    .get(email) as Lecturer | null;
}

export function findLecturerById(id: string): Lecturer | null {
  return db
    .query(
      `SELECT
        id,
        name,
        email,
        password_hash AS passwordHash,
        institution,
        department,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM lecturers
      WHERE id = ?
      LIMIT 1`
    )
    .get(id) as Lecturer | null;
}

export function createLecturer(input: {
  name: string;
  email: string;
  passwordHash: string;
  institution?: string;
  department?: string;
}): LecturerProfile {
  const now = nowIso();
  const id = `lec_${crypto.randomUUID()}`;
  db.query(
    `INSERT INTO lecturers (id, name, email, password_hash, institution, department, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.email,
    input.passwordHash,
    input.institution ?? null,
    input.department ?? null,
    now,
    now
  );

  return {
    id,
    name: input.name,
    email: input.email,
    institution: input.institution ?? null,
    department: input.department ?? null,
    createdAt: now,
    updatedAt: now
  };
}

export function updateLecturerProfile(
  lecturerId: string,
  updates: { name?: string; institution?: string; department?: string }
): LecturerProfile | null {
  const current = findLecturerById(lecturerId);
  if (!current) {
    return null;
  }

  const nextName = updates.name ?? current.name;
  const nextInstitution = updates.institution ?? current.institution;
  const nextDepartment = updates.department ?? current.department;
  const now = nowIso();

  db.query(
    `UPDATE lecturers
     SET name = ?, institution = ?, department = ?, updated_at = ?
     WHERE id = ?`
  ).run(nextName, nextInstitution, nextDepartment, now, lecturerId);

  return {
    id: current.id,
    name: nextName,
    email: current.email,
    institution: nextInstitution,
    department: nextDepartment,
    createdAt: current.createdAt,
    updatedAt: now
  };
}

export function createLecturerSession(lecturerId: string, tokenHash: string, expiresAt: string): LecturerSession {
  const now = nowIso();
  const id = `ls_${crypto.randomUUID()}`;
  db.query(
    `INSERT INTO lecturer_sessions (id, lecturer_id, token_hash, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`
  ).run(id, lecturerId, tokenHash, expiresAt, now, now);

  return {
    id,
    lecturerId,
    tokenHash,
    status: "active",
    expiresAt,
    createdAt: now,
    updatedAt: now
  };
}

export function findActiveSessionByTokenHash(tokenHash: string): LecturerSession | null {
  return db
    .query(
      `SELECT
        id,
        lecturer_id AS lecturerId,
        token_hash AS tokenHash,
        status,
        expires_at AS expiresAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM lecturer_sessions
      WHERE token_hash = ? AND status = 'active'
      LIMIT 1`
    )
    .get(tokenHash) as LecturerSession | null;
}

export function revokeSessionByTokenHash(tokenHash: string): void {
  const now = nowIso();
  db.query("UPDATE lecturer_sessions SET status = 'revoked', updated_at = ? WHERE token_hash = ?").run(now, tokenHash);
}
