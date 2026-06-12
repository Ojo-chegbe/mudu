import { apiError, badRequest, json } from "../http";
import { getAppConfig, updateAppConfig } from "../repositories/config";

export async function handleSettingsRoutes(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/settings/app" && request.method === "GET") {
    return json(getAppConfig());
  }

  if (pathname === "/api/settings/app" && request.method === "PATCH") {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || Array.isArray(payload)) {
      return apiError(400, "INVALID_BODY", "Request body must be an object.");
    }

    return json(updateAppConfig(payload as Parameters<typeof updateAppConfig>[0]));
  }

  return null;
}
