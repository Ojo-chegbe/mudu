import { config } from "../config";
import { json } from "../http";
import { getLocalIPv4 } from "../network";

export function handleSystemRoutes(pathname: string): Response | null {
  if (pathname === "/api/health") {
    return json({ status: "ok" });
  }

  if (pathname === "/api/network") {
    const localIp = getLocalIPv4();
    const { host, port } = config.server;
    return json({
      host,
      port,
      localIp,
      joinUrl: `http://${localIp}:${port}`,
      note: "Students should connect from a browser on the same WiFi network as the lecturer laptop."
    });
  }

  return null;
}
