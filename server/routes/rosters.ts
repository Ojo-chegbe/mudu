import { apiError, badRequest, json, notFound } from "../http";
import {
  addRosterStudent,
  addPendingRegistration,
  confirmPendingRegistrations,
  createRoster,
  createRosterRegistrationToken,
  deleteRoster,
  deleteRosterStudent,
  findActiveRosterByRegistrationToken,
  findRosterById,
  importRosterStudentsFromCsv,
  listRosters,
  updateRoster,
  updateRosterStudent
} from "../repositories/rosters";

type CreateRosterBody = {
  name?: string;
  description?: string;
  courseCode?: string;
};

type AddStudentBody = {
  matric?: string;
  name?: string;
};

type UpdateStudentBody = {
  matric?: string;
  name?: string;
};

type ImportCsvBody = {
  csvText?: string;
};

type UpdateRosterBody = {
  name?: string;
  description?: string | null;
  courseCode?: string | null;
};

export async function handleRosterRoutes(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/rosters" && request.method === "GET") {
    return json({ rosters: listRosters() });
  }

  if (pathname === "/api/rosters" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as CreateRosterBody | null;
    const name = body?.name?.trim() ?? "";
    if (!name) {
      return apiError(400, "MISSING_ROSTER_NAME", "Roster name is required.");
    }

    const roster = createRoster({
      name,
      description: body?.description?.trim(),
      courseCode: body?.courseCode?.trim()
    });
    return json({ roster }, 201);
  }

  const detailMatch = pathname.match(/^\/api\/rosters\/([^/]+)$/);
  if (detailMatch && request.method === "GET") {
    const rosterId = decodeURIComponent(detailMatch[1]);
    const roster = findRosterById(rosterId);
    if (!roster) {
      return notFound("Roster not found.");
    }
    return json({ roster });
  }

  if (detailMatch && request.method === "PATCH") {
    const rosterId = decodeURIComponent(detailMatch[1]);
    const body = (await request.json().catch(() => null)) as UpdateRosterBody | null;
    if (!body) {
      return apiError(400, "INVALID_BODY", "Request body must be an object.");
    }

    const updated = updateRoster(rosterId, {
      name: body.name?.trim(),
      description: body.description === null ? null : body.description?.trim(),
      courseCode: body.courseCode === null ? null : body.courseCode?.trim()
    });

    if (!updated) {
      return notFound("Roster not found.");
    }
    return json({ roster: updated });
  }

  if (detailMatch && request.method === "DELETE") {
    const rosterId = decodeURIComponent(detailMatch[1]);
    const ok = deleteRoster(rosterId);
    if (!ok) {
      return notFound("Roster not found.");
    }
    return json({ status: "ok" });
  }

  const addStudentMatch = pathname.match(/^\/api\/rosters\/([^/]+)\/students$/);
  if (addStudentMatch && request.method === "POST") {
    const rosterId = decodeURIComponent(addStudentMatch[1]);
    const roster = findRosterById(rosterId);
    if (!roster) {
      return notFound("Roster not found.");
    }

    const body = (await request.json().catch(() => null)) as AddStudentBody | null;
    const matric = body?.matric?.trim() ?? "";
    const name = body?.name?.trim() ?? "";
    if (!matric || !name) {
      return apiError(400, "MISSING_STUDENT_FIELDS", "Matric and student name are required.");
    }

    try {
      const student = addRosterStudent(rosterId, { matric, name });
      return json({ student }, 201);
    } catch {
      return apiError(409, "DUPLICATE_MATRIC", "This matric number already exists in the roster.");
    }
  }

  const studentMatch = pathname.match(/^\/api\/rosters\/students\/([^/]+)$/);
  if (studentMatch && request.method === "PATCH") {
    const studentId = decodeURIComponent(studentMatch[1]);
    const body = (await request.json().catch(() => null)) as UpdateStudentBody | null;
    if (!body) {
      return apiError(400, "INVALID_BODY", "Request body must be an object.");
    }

    const matric = body.matric?.trim();
    const name = body.name?.trim();
    if (!matric && !name) {
      return apiError(400, "NO_STUDENT_UPDATE_FIELDS", "At least one of matric or name is required.");
    }

    try {
      const updated = updateRosterStudent(studentId, { matric, name });
      if (!updated) {
        return notFound("Student not found.");
      }
      return json({ student: updated });
    } catch {
      return apiError(409, "DUPLICATE_MATRIC", "This matric number already exists in the roster.");
    }
  }

  if (studentMatch && request.method === "DELETE") {
    const studentId = decodeURIComponent(studentMatch[1]);
    const ok = deleteRosterStudent(studentId);
    if (!ok) {
      return notFound("Student not found.");
    }
    return json({ status: "ok" });
  }

  const importMatch = pathname.match(/^\/api\/rosters\/([^/]+)\/import-csv$/);
  if (importMatch && request.method === "POST") {
    const rosterId = decodeURIComponent(importMatch[1]);
    const roster = findRosterById(rosterId);
    if (!roster) {
      return notFound("Roster not found.");
    }

    const body = (await request.json().catch(() => null)) as ImportCsvBody | null;
    const csvText = body?.csvText ?? "";
    if (!csvText.trim()) {
      return apiError(400, "MISSING_CSV_TEXT", "CSV text is required.");
    }

    const result = importRosterStudentsFromCsv(rosterId, csvText);
    return json(result);
  }

  const registrationLinkMatch = pathname.match(/^\/api\/rosters\/([^/]+)\/registration-link$/);
  if (registrationLinkMatch && request.method === "POST") {
    const rosterId = decodeURIComponent(registrationLinkMatch[1]);
    const roster = findRosterById(rosterId);
    if (!roster) {
      return notFound("Roster not found.");
    }

    const created = createRosterRegistrationToken(rosterId);
    return json({
      token: created.token,
      expiresAt: created.expiresAt,
      link: `http://mudu.local/register/${created.token}`
    });
  }

  const registrationMatch = pathname.match(/^\/api\/registration\/([^/]+)$/);
  if (registrationMatch && request.method === "POST") {
    const token = decodeURIComponent(registrationMatch[1]);
    const link = findActiveRosterByRegistrationToken(token);
    if (!link) {
      return apiError(404, "INVALID_REGISTRATION_TOKEN", "Registration token is invalid or expired.");
    }

    const body = (await request.json().catch(() => null)) as AddStudentBody | null;
    const matric = body?.matric?.trim() ?? "";
    const name = body?.name?.trim() ?? "";
    if (!matric || !name) {
      return apiError(400, "MISSING_STUDENT_FIELDS", "Matric and student name are required.");
    }

    try {
      addPendingRegistration({ rosterId: link.rosterId, token, matric, name });
      return json({ status: "pending", rosterId: link.rosterId });
    } catch {
      return apiError(409, "DUPLICATE_MATRIC", "This matric number already exists in the roster.");
    }
  }

  const confirmMatch = pathname.match(/^\/api\/rosters\/([^/]+)\/confirm-registrations$/);
  if (confirmMatch && request.method === "POST") {
    const rosterId = decodeURIComponent(confirmMatch[1]);
    const roster = findRosterById(rosterId);
    if (!roster) {
      return notFound("Roster not found.");
    }

    const result = confirmPendingRegistrations(rosterId);
    return json({
      ...result,
      roster: findRosterById(rosterId)
    });
  }

  return null;
}
