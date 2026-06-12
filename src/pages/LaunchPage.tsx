import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconWifi, IconRefresh } from "../components/Icons";
import {
  fetchExamsRequest,
  createExamRunRequest,
  openExamRunLobbyRequest,
  startExamRunRequest,
  type ExamRecord,
  type ExamRun
} from "../api/client";
import { useAppStore } from "../store/useAppStore";

export function LaunchPage() {
  const network = useAppStore((s) => s.network);
  const loadNetwork = useAppStore((s) => s.loadNetwork);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [serverState, setServerState] = useState<"starting" | "ready" | "error">("starting");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [currentRun, setCurrentRun] = useState<ExamRun | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<"open-lobby" | "start" | null>(null);
  const [publishedExams, setPublishedExams] = useState<ExamRecord[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const lifecycleBusyRef = useRef(false);

  useEffect(() => {
    loadNetwork().then(() => setServerState("ready")).catch(() => setServerState("error"));
  }, [loadNetwork]);

  useEffect(() => {
    let mounted = true;
    setExamsLoading(true);
    void fetchExamsRequest({ status: "Published" })
      .then((items) => {
        if (!mounted) return;
        setPublishedExams(items);
      })
      .catch((err) => {
        if (!mounted) return;
        setPublishedExams([]);
        pushToast(err instanceof Error ? err.message : "Failed to load published exams.", "error");
      })
      .finally(() => {
        if (!mounted) return;
        setExamsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pushToast]);

  const selectedExamId = publishedExams[0]?.id ?? "";

  const handleOpenLobby = async () => {
    if (lifecycleBusyRef.current) return;
    if (examsLoading) {
      pushToast("Published exams are still loading.", "error");
      return;
    }
    if (!selectedExamId) {
      pushToast("No published exam is available to launch.", "error");
      return;
    }

    lifecycleBusyRef.current = true;
    setLifecycleBusy("open-lobby");
    try {
      const createdRun = await createExamRunRequest(selectedExamId);
      const lobbyRun = await openExamRunLobbyRequest(createdRun.id);
      setCurrentRun(lobbyRun);
      setLobbyOpen(true);
      pushToast("Lobby opened successfully.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to launch exam.", "error");
    } finally {
      lifecycleBusyRef.current = false;
      setLifecycleBusy(null);
    }
  };

  const connectedCount = 0;
  const totalCount = 0;

  const handleStartExam = () => {
    if (lifecycleBusyRef.current) return;
    askConfirm({
      title: "Start Exam?",
      description: `${connectedCount} of ${totalCount} students connected. Start anyway?`,
      confirmLabel: "Start Exam",
      onConfirm: async () => {
        if (lifecycleBusyRef.current) return;
        if (!currentRun || currentRun.status !== "Lobby") {
          pushToast("Exam lobby is not ready to start.", "error");
          return;
        }

        lifecycleBusyRef.current = true;
        setLifecycleBusy("start");
        try {
          const runningRun = await startExamRunRequest(currentRun.id);
          setCurrentRun(runningRun);
          pushToast("Exam started successfully.", "success");
          navigate("/monitor");
        } catch (err) {
          pushToast(err instanceof Error ? err.message : "Failed to start exam.", "error");
        } finally {
          lifecycleBusyRef.current = false;
          setLifecycleBusy(null);
        }
      }
    });
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Exam Launch</h1>
      </div>

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
            <button className="btn btn-primary btn-lg" onClick={() => void handleOpenLobby()} disabled={examsLoading || lifecycleBusy !== null}>
              {examsLoading ? "Loading Exams..." : lifecycleBusy === "open-lobby" ? "Opening Lobby..." : "Open Lobby"}
            </button>
          </div>
        </div>
      )}

      {serverState === "ready" && lobbyOpen && (
        <div className="stack gap-4">
          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Waiting for students...</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{connectedCount} / {totalCount} connected</div>
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  Join code: <strong>{currentRun?.joinCode ?? "—"}</strong>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleStartExam} disabled={lifecycleBusy !== null || currentRun?.status !== "Lobby"}>
                {lifecycleBusy === "start" ? "Starting Exam..." : "Start Exam"}
              </button>
            </div>
          </div>

          <div className="status-grid">
            <div className="card" style={{ padding: "12px" }}>
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                Student lobby presence will appear in monitoring once session endpoints are wired to the runs domain.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
