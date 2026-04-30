import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconWifi, IconRefresh } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";

export function LaunchPage() {
  const network = useAppStore((s) => s.network);
  const loadNetwork = useAppStore((s) => s.loadNetwork);
  const sessions = useAppStore((s) => s.sessions);
  const setSessionsFromRoster = useAppStore((s) => s.setSessionsFromRoster);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const navigate = useNavigate();

  const [serverState, setServerState] = useState<"starting" | "ready" | "error">("starting");
  const [lobbyOpen, setLobbyOpen] = useState(false);

  useEffect(() => {
    loadNetwork().then(() => setServerState("ready")).catch(() => setServerState("error"));
  }, [loadNetwork]);

  const handleOpenLobby = () => {
    setSessionsFromRoster("exam_demo_midsem");
    setLobbyOpen(true);
  };

  const connectedCount = sessions.filter((s) => s.status === "Connected" || s.status === "Active").length;
  const totalCount = sessions.length;

  const handleStartExam = () => {
    askConfirm({
      title: "Start Exam?",
      description: `${connectedCount} of ${totalCount} students connected. Start anyway?`,
      confirmLabel: "Start Exam",
      onConfirm: () => navigate("/monitor"),
    });
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Exam Launch</h1>
      </div>

      {/* Server Status */}
      {serverState === "starting" && (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid var(--gray-200)", borderTopColor: "var(--color-primary)", borderRadius: "50%", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-tertiary)" }}>Starting local server...</p>
        </div>
      )}

      {serverState === "error" && (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <p style={{ color: "var(--color-error)", fontWeight: 600, marginBottom: "8px" }}>Server unavailable</p>
          <p style={{ color: "var(--text-tertiary)", marginBottom: "16px" }}>Port conflict or network error.</p>
          <button className="btn btn-primary" onClick={() => loadNetwork().then(() => setServerState("ready")).catch(() => setServerState("error"))}>
            <IconRefresh /> Retry
          </button>
        </div>
      )}

      {/* Connection Portal */}
      {serverState === "ready" && !lobbyOpen && (
        <div className="card stack gap-4">
          <div className="connection-box">
            <IconWifi />
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "8px" }}>Students open this in their browser</div>
            <div className="connection-ip">{network.localIp}:{network.port}</div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{network.joinUrl}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
            Project this screen in the exam hall. Students connect from any browser on the same WiFi network.
          </div>
          <div className="row" style={{ justifyContent: "center", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => loadNetwork()}>
              <IconRefresh /> Refresh IP
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleOpenLobby}>Open Lobby</button>
          </div>
        </div>
      )}

      {/* Pre-Exam Lobby */}
      {serverState === "ready" && lobbyOpen && (
        <div className="stack gap-4">
          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Waiting for students...</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{connectedCount} / {totalCount} connected</div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleStartExam}>Start Exam</button>
            </div>
          </div>

          <div className="status-grid">
            {sessions.map((s) => (
              <div key={s.id} className="card" style={{ padding: "12px" }}>
                <div className="row gap-2">
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: s.status === "Connected" || s.status === "Active" ? "var(--color-success)" : "var(--gray-300)",
                  }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "14px" }}>{s.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{s.matric}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
