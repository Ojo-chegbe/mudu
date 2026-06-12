export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
};

export const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json"
    }
  });
}

export function apiError(status: number, code: ApiError["code"], message: string, details?: unknown): Response {
  const payload: ApiError = { code, message };
  if (details !== undefined) {
    payload.details = details;
  }
  return json(payload, status);
}

export function badRequest(message = "Bad request", details?: unknown): Response {
  return apiError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Unauthorized", details?: unknown): Response {
  return apiError(401, "UNAUTHORIZED", message, details);
}

export function forbidden(message = "Forbidden", details?: unknown): Response {
  return apiError(403, "FORBIDDEN", message, details);
}

export function notFound(message = "Not found", details?: unknown): Response {
  return apiError(404, "NOT_FOUND", message, details);
}

export function conflict(message = "Conflict", details?: unknown): Response {
  return apiError(409, "CONFLICT", message, details);
}

export function internalError(message = "Internal server error", details?: unknown): Response {
  return apiError(500, "INTERNAL_ERROR", message, details);
}
