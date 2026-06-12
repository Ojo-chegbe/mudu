import { json } from "../http";
import { getOrCreateDeviceIdentity } from "../repositories/device";

export function handleDeviceRoutes(pathname: string): Response | null {
  if (pathname === "/api/device") {
    return json(getOrCreateDeviceIdentity());
  }

  return null;
}
