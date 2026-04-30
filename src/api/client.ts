import type { NetworkInfo } from "../types";

const API_ROOT = "/api";

export async function fetchNetwork(): Promise<NetworkInfo> {
  const fallback: NetworkInfo = {
    host: "0.0.0.0",
    port: 3000,
    localIp: "127.0.0.1",
    joinUrl: "http://127.0.0.1:3000",
    note: "Students should connect from browser on same WiFi as lecturer laptop."
  };

  try {
    const response = await fetch(`${API_ROOT}/network`);
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as NetworkInfo;
  } catch {
    return fallback;
  }
}
