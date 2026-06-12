import { notFound } from "../http";
import { handleAiRoutes } from "./ai";
import { handleAuthRoutes } from "./auth";
import { handleDashboardRoutes } from "./dashboard";
import { handleDeviceRoutes } from "./device";
import { handleExamCrudRoutes } from "./examCrud";
import { handleExamRoutes } from "./exams";
import { handleMaintenanceRoutes } from "./maintenance";
import { handleResultRoutes } from "./results";
import { handleRosterRoutes } from "./rosters";
import { handleRunRoutes } from "./runs";
import { handleSettingsRoutes } from "./settings";
import { handleStudentRoutes } from "./student";
import { handleSyncRoutes } from "./sync";
import { handleSystemRoutes } from "./system";

export async function handleApiRequest(request: Request, url: URL): Promise<Response> {
  const { pathname } = url;

  const systemResponse = handleSystemRoutes(pathname);
  if (systemResponse) {
    return systemResponse;
  }

  const dashboardResponse = handleDashboardRoutes(pathname);
  if (dashboardResponse) {
    return dashboardResponse;
  }

  const deviceResponse = handleDeviceRoutes(pathname);
  if (deviceResponse) {
    return deviceResponse;
  }

  // Domain registration order: auth, exams, rosters, runs, student, results, ai, sync, settings, maintenance.
  const authResponse = await handleAuthRoutes(request, pathname);
  if (authResponse) return authResponse;

  const examCrudResponse = await handleExamCrudRoutes(request, pathname, url);
  if (examCrudResponse) return examCrudResponse;

  const examResponse = await handleExamRoutes(request, pathname);
  if (examResponse) return examResponse;

  const rosterResponse = await handleRosterRoutes(request, pathname);
  if (rosterResponse) return rosterResponse;

  const runResponse = await handleRunRoutes(request, pathname);
  if (runResponse) return runResponse;

  const studentResponse = await handleStudentRoutes(request, pathname);
  if (studentResponse) return studentResponse;

  const resultResponse = await handleResultRoutes(request, pathname);
  if (resultResponse) return resultResponse;

  const aiResponse = await handleAiRoutes(request, pathname);
  if (aiResponse) return aiResponse;

  const syncResponse = handleSyncRoutes(request, pathname);
  if (syncResponse) return syncResponse;

  const settingsResponse = await handleSettingsRoutes(request, pathname);
  if (settingsResponse) return settingsResponse;

  const maintenanceResponse = await handleMaintenanceRoutes(request, pathname);
  if (maintenanceResponse) return maintenanceResponse;

  return notFound("API route not found.");
}
