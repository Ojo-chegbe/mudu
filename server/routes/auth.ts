import { apiError, badRequest, json } from "../http";
import {
  createLecturer,
  findLecturerByEmail,
  updateLecturerProfile
} from "../repositories/lecturers";
import {
  createSessionToken,
  getBearerToken,
  hashPassword,
  requireLecturer,
  revokeToken,
  verifyPassword
} from "../services/auth";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
  institution?: string;
  department?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type ProfilePatchBody = {
  name?: string;
  institution?: string;
  department?: string;
};

async function signup(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as SignupBody | null;
  const name = body?.name?.trim() ?? "";
  const email = normalizeEmail(body?.email ?? "");
  const password = body?.password?.trim() ?? "";

  if (!name || !email || !password) {
    return apiError(400, "MISSING_SIGNUP_FIELDS", "Name, email, and password are required.");
  }

  const existing = findLecturerByEmail(email);
  if (existing) {
    return apiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const profile = createLecturer({
    name,
    email,
    passwordHash,
    institution: body?.institution?.trim(),
    department: body?.department?.trim()
  });
  const token = await createSessionToken(profile.id);

  return json({ token, profile }, 201);
}

async function login(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const email = normalizeEmail(body?.email ?? "");
  const password = body?.password?.trim() ?? "";

  if (!email || !password) {
    return apiError(400, "MISSING_LOGIN_FIELDS", "Email and password are required.");
  }

  const lecturer = findLecturerByEmail(email);
  if (!lecturer) {
    return apiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const ok = await verifyPassword(password, lecturer.passwordHash);
  if (!ok) {
    return apiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const token = await createSessionToken(lecturer.id);
  return json({
    token,
    profile: {
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      institution: lecturer.institution,
      department: lecturer.department,
      createdAt: lecturer.createdAt,
      updatedAt: lecturer.updatedAt
    }
  });
}

async function logout(request: Request): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) {
    return apiError(401, "INVALID_LECTURER_TOKEN", "Missing or invalid lecturer token.");
  }

  await revokeToken(token);
  return json({ status: "ok" });
}

async function getProfile(request: Request): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  return json(auth.profile);
}

async function patchProfile(request: Request): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => null)) as ProfilePatchBody | null;
  if (!body) {
    return apiError(400, "INVALID_BODY", "Request body must be an object.");
  }

  const updated = updateLecturerProfile(auth.profile.id, {
    name: body.name?.trim(),
    institution: body.institution?.trim(),
    department: body.department?.trim()
  });

  if (!updated) {
    return apiError(404, "LECTURER_NOT_FOUND", "Lecturer not found.");
  }

  return json(updated);
}

export async function handleAuthRoutes(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/auth/signup" && request.method === "POST") {
    return signup(request);
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return login(request);
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return logout(request);
  }

  if (pathname === "/api/settings/profile" && request.method === "GET") {
    return getProfile(request);
  }

  if (pathname === "/api/settings/profile" && request.method === "PATCH") {
    return patchProfile(request);
  }

  return null;
}
