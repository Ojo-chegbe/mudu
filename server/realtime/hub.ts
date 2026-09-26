import { Server, WebSocketHandler, ServerWebSocket } from "bun";
import { findLecturerFromBearerToken } from "../services/auth";
import { getValidStudentSessionByToken } from "../routes/student";

type WebSocketData = {
  role: "lecturer" | "student";
  runId: string;
  sessionId?: string; // Only for students
  lecturerId?: string; // Only for lecturers
};

let serverInstance: Server<WebSocketData> | null = null;

export function setWebSocketServer(server: Server<WebSocketData>) {
  serverInstance = server;
}

export async function handleWebSocketUpgrade(request: Request, server: Server<WebSocketData>): Promise<Response | undefined> {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  const runId = url.searchParams.get("runId");

  if (!runId || (role !== "lecturer" && role !== "student")) {
    return new Response("Invalid role or missing runId", { status: 400 });
  }

  const data: WebSocketData = { role, runId };

  if (role === "lecturer") {
    // Authenticate lecturer via cookie or Authorization header
    // MUDU stores auth cookie as `mudu_auth`
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split("; ").map((c) => c.split("=")));
    const token = cookies["mudu_auth"] || request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const profile = await findLecturerFromBearerToken(token);
    if (!profile) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    data.lecturerId = profile.id;
  } else if (role === "student") {
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response("Missing student token", { status: 401 });
    }

    const sessionOrError = getValidStudentSessionByToken(token);
    if (sessionOrError instanceof Response) {
      return new Response("Invalid student token", { status: 401 });
    }

    data.sessionId = sessionOrError.id;
  }

  const success = server.upgrade(request, { data });
  if (success) {
    return undefined; // Bun handles the upgrade
  }
  return new Response("WebSocket upgrade failed", { status: 500 });
}

export const websocketConfig: WebSocketHandler<WebSocketData> = {
  open(ws: ServerWebSocket<WebSocketData>) {
    const { role, runId, sessionId } = ws.data;
    
    if (role === "lecturer") {
      ws.subscribe(`run:${runId}:lecturer`);
    } else if (role === "student" && sessionId) {
      ws.subscribe(`run:${runId}:students`);
      ws.subscribe(`session:${sessionId}`);
      broadcastStudentConnected(runId, sessionId);
    }
  },
  
  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    // Heartbeats or explicit disconnect intents could be handled here.
  },
  
  close(ws: ServerWebSocket<WebSocketData>, code: number, message: string) {
    const { role, runId, sessionId } = ws.data;
    if (role === "student" && sessionId) {
      broadcastStudentDisconnected(runId, sessionId);
    }
  }
};

// --- Broadcasting Methods ---

export function broadcastStudentConnected(runId: string, sessionId: string) {
  if (!serverInstance) return;
  serverInstance.publish(`run:${runId}:lecturer`, JSON.stringify({
    type: "student_connected",
    payload: { sessionId }
  }));
}

export function broadcastStudentDisconnected(runId: string, sessionId: string) {
  if (!serverInstance) return;
  serverInstance.publish(`run:${runId}:lecturer`, JSON.stringify({
    type: "student_disconnected",
    payload: { sessionId }
  }));
}

export function broadcastSessionSubmitted(runId: string, sessionId: string) {
  if (!serverInstance) return;
  serverInstance.publish(`run:${runId}:lecturer`, JSON.stringify({
    type: "session_submitted",
    payload: { sessionId }
  }));
}

export function broadcastSessionFlagged(runId: string, sessionId: string, flags: number) {
  if (!serverInstance) return;
  serverInstance.publish(`run:${runId}:lecturer`, JSON.stringify({
    type: "session_flagged",
    payload: { sessionId, flags }
  }));
}

export function broadcastForceSubmit(runId: string, sessionId: string) {
  if (!serverInstance) return;
  serverInstance.publish(`session:${sessionId}`, JSON.stringify({
    type: "force_submit",
    payload: {}
  }));
}

export function broadcastExamEnded(runId: string) {
  if (!serverInstance) return;
  serverInstance.publish(`run:${runId}:students`, JSON.stringify({
    type: "exam_ended",
    payload: {}
  }));
}
