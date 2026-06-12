import { apiError, unauthorized } from "../http";
import {
  createLecturerSession,
  findLecturerById,
  revokeSessionByTokenHash,
  type LecturerProfile
} from "../repositories/lecturers";
import { db } from "../db";

const SESSION_TTL_HOURS = 24;

function addHours(iso: string, hours: number): string {
  const date = new Date(iso);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function createSessionToken(lecturerId: string): Promise<string> {
  const token = `mudu_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const tokenHash = await Bun.password.hash(token);
  const now = new Date().toISOString();
  const expiresAt = addHours(now, SESSION_TTL_HOURS);
  createLecturerSession(lecturerId, tokenHash, expiresAt);
  return token;
}

export async function findLecturerFromBearerToken(token: string): Promise<LecturerProfile | null> {
  // Query all active sessions and verify against each hash.
  // This preserves secure hashing with current schema.
  const all = db
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
      WHERE status = 'active'`
    )
    .all() as Array<{
    id: string;
    lecturerId: string;
    tokenHash: string;
    status: "active" | "revoked";
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  }>;

  for (const session of all) {
    const isMatch = await Bun.password.verify(token, session.tokenHash);
    if (!isMatch) {
      continue;
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const lecturer = findLecturerById(session.lecturerId);
    if (!lecturer) {
      return null;
    }

    return {
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      institution: lecturer.institution,
      department: lecturer.department,
      createdAt: lecturer.createdAt,
      updatedAt: lecturer.updatedAt
    };
  }

  return null;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function requireLecturer(request: Request): Promise<{ profile: LecturerProfile } | Response> {
  const token = getBearerToken(request);
  if (!token) {
    return unauthorized("Missing or invalid lecturer token.");
  }

  const profile = await findLecturerFromBearerToken(token);
  if (!profile) {
    return apiError(401, "INVALID_LECTURER_TOKEN", "Missing or invalid lecturer token.");
  }

  return { profile };
}

export async function revokeToken(token: string): Promise<void> {
  // Compare against active sessions and revoke the matched one.
  const all = db
    .query("SELECT token_hash AS tokenHash FROM lecturer_sessions WHERE status = 'active'")
    .all() as Array<{ tokenHash: string }>;

  for (const row of all) {
    const isMatch = await Bun.password.verify(token, row.tokenHash);
    if (isMatch) {
      revokeSessionByTokenHash(row.tokenHash);
      return;
    }
  }
}
