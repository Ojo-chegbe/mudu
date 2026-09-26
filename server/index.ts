import { config } from "./config";
import { initDatabase } from "./db";
import { serveFrontend } from "./frontend";
import { defaultHeaders } from "./http";
import { getLocalIPv4 } from "./network";
import { ensureAppConfigDefaults } from "./repositories/config";
import { getOrCreateDeviceIdentity } from "./repositories/device";
import { handleApiRequest } from "./routes";
import { setWebSocketServer, handleWebSocketUpgrade, websocketConfig } from "./realtime/hub";

const { host, port } = config.server;

initDatabase();
ensureAppConfigDefaults();
const device = getOrCreateDeviceIdentity();

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: defaultHeaders });
    }

    if (url.pathname === "/api/ws") {
      const upgradeResponse = await handleWebSocketUpgrade(request, server);
      if (upgradeResponse) {
        return upgradeResponse; // Returns error if failed, or undefined if success
      }
      return; // Upgrade successful
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, url);
    }

    return serveFrontend(url.pathname);
  },
  websocket: websocketConfig
});

setWebSocketServer(server);

console.log(`MUDU local server running on http://${getLocalIPv4()}:${server.port}`);
console.log(`Student browser entry: http://<lecturer-ip>:${server.port}`);
console.log(`Device id: ${device.id}`);
