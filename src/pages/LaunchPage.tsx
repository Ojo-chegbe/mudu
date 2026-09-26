import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconWifi, IconRefresh, IconCopy } from "../components/Icons";
import {
  fetchExamsRequest,
  fetchRunSessionsRequest,
  createExamRunRequest,
  openExamRunLobbyRequest,
  startExamRunRequest,
  fetchRosterRequest,
  confirmRosterRegistrationsRequest,
  type ExamRecord,
  type ExamRun,
  type RosterRecord,
  type RunSessionRecord
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
  const [activeRoster, setActiveRoster] = useState<RosterRecord | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<"open-lobby" | "start" | null>(null);
  const [publishedExams, setPublishedExams] = useState<ExamRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examsLoading, setExamsLoading] = useState(true);
  const [lobbySessions, setLobbySessions] = useState<RunSessionRecord[]>([]);
  const lifecycleBusyRef = useRef(false);

  /* ── Derive lobby counts from live session data ── */
  const connectedCount = lobbySessions.filter(
    (s) => s.status === "Connected" || s.status === "Active"
  ).length;
  const totalCount = lobbySessions.length;

  /* ── Load active roster & sessions while lobby is open ── */
  useEffect(() => {
    if (!lobbyOpen || !currentRun) return;

    const loadLobbyState = async () => {
      try {
        const [roster, sessions] = await Promise.all([
          currentRun.rosterId ? fetchRosterRequest(currentRun.rosterId) : Promise.resolve(null),
          fetchRunSessionsRequest(currentRun.id).catch(() => [] as RunSessionRecord[])
        ]);
        if (roster) setActiveRoster(roster);
        setLobbySessions(sessions);
      } catch {
        // ignore polling errors
      }
    };

    void loadLobbyState();
    const interval = setInterval(() => { void loadLobbyState(); }, 3000);
    return () => clearInterval(interval);
  }, [lobbyOpen, currentRun?.id, currentRun?.rosterId]);

  /* ── Fetch network info on mount ── */
  useEffect(() => {
    loadNetwork().then(() => setServerState("ready")).catch(() => setServerState("error"));
  }, [loadNetwork]);

  /* ── Fetch published exams ── */
  useEffect(() => {
    let mounted = true;
    setExamsLoading(true);
    void fetchExamsRequest({ status: "Published" })
      .then((items) => {
        if (!mounted) return;
        setPublishedExams(items);
        if (items.length > 0 && !selectedExamId) {
          setSelectedExamId(items[0].id);
        }
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

    return () => { mounted = false; };
  }, [pushToast]);

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
          navigate(`/monitor?runId=${runningRun.id}`);
        } catch (err) {
          pushToast(err instanceof Error ? err.message : "Failed to start exam.", "error");
        } finally {
          lifecycleBusyRef.current = false;
          setLifecycleBusy(null);
        }
      }
    });
  };

  const selectedExam = publishedExams.find((e) => e.id === selectedExamId) ?? null;

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
        <div className="stack gap-4">
          {/* Network info */}
          <div className="card stack gap-4">
            <div className="connection-box">
              <IconWifi />
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "8px" }}>Students open this in their browser</div>
              <div className="connection-ip row gap-2" style={{ alignItems: "center", justifyContent: "center" }}>
                {network.localIp}:{network.port}/student/login
                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${network.localIp}:${network.port}/student/login`);
                    pushToast("Link copied to clipboard", "success");
                  }}
                  title="Copy Link"
                >
                  <IconCopy />
                </button>
              </div>
              <div className="row gap-2" style={{ alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{network.joinUrl.endsWith("/student/login") ? network.joinUrl : `${network.joinUrl}/student/login`}</div>
                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => {
                    const url = network.joinUrl.endsWith("/student/login") ? network.joinUrl : `${network.joinUrl}/student/login`;
                    navigator.clipboard.writeText(url);
                    pushToast("Link copied to clipboard", "success");
                  }}
                  title="Copy Link"
                >
                  <IconCopy />
                </button>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
              Project this screen in the exam hall. Students connect from any browser on the same WiFi network.
            </div>
          </div>

          {/* Exam selector */}
          <div className="card stack gap-4">
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Select Exam to Launch</h3>
            {examsLoading ? (
              <div style={{ color: "var(--text-tertiary)", fontSize: "14px" }}>Loading published exams...</div>
            ) : publishedExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ color: "var(--text-tertiary)", marginBottom: "12px" }}>No published exams available.</p>
                <button className="btn btn-secondary" onClick={() => navigate("/exams/new")}>Create an Exam</button>
              </div>
            ) : (
              <>
                <select
                  className="form-select"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{ width: "100%" }}
                >
                  {publishedExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} — {exam.courseCode || "No course"} ({exam.questionCount ?? 0} questions, {exam.rosterStudentCount ?? 0} students)
                    </option>
                  ))}
                </select>
                {selectedExam && (
                  <div className="row gap-4" style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                    <span>Duration: {selectedExam.durationMinutes}min</span>
                    <span>•</span>
                    <span>Passing: {selectedExam.passingScore}%</span>
                    <span>•</span>
                    <span>Roster: {selectedExam.rosterName ?? "None"}</span>
                  </div>
                )}
              </>
            )}

            <div className="row" style={{ justifyContent: "center", gap: "12px" }}>
              <button className="btn btn-secondary" onClick={() => loadNetwork()}>
                <IconRefresh /> Refresh IP
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => void handleOpenLobby()}
                disabled={examsLoading || lifecycleBusy !== null || !selectedExamId}
              >
                {lifecycleBusy === "open-lobby" ? "Opening Lobby..." : "Open Lobby"}
              </button>
            </div>
          </div>
        </div>
      )}

      {serverState === "ready" && lobbyOpen && (
        <div className="stack gap-4">
          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                  {selectedExam?.title ?? "Exam"} — Lobby
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{connectedCount} / {totalCount} connected</div>
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  Join code: <strong>{currentRun?.joinCode ?? "—"}</strong>
                </div>
                {totalCount === 0 && (
                  <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                    Waiting for students to join...
                  </div>
                )}
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleStartExam} disabled={lifecycleBusy !== null || currentRun?.status !== "Lobby"}>
                {lifecycleBusy === "start" ? "Starting Exam..." : "Start Exam"}
              </button>
            </div>
          </div>

          {/* Lobby student list */}
          {lobbySessions.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Connected Students</h3>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead><tr><th>Name</th><th>Matric</th><th>Status</th></tr></thead>
                  <tbody>
                    {lobbySessions.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td>{s.matric}</td>
                        <td>
                          <span className={`badge ${s.status === "Connected" || s.status === "Active" ? "badge-success" : "badge-neutral"}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending registrations */}
          {activeRoster?.pendingRegistrations && activeRoster.pendingRegistrations.length > 0 && (
            <div className="card stack gap-3" style={{ background: "var(--color-warning-light)" }}>
              <div className="row-between">
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-warning-dark)", margin: 0 }}>Pending Registrations</h3>
                  <p style={{ fontSize: "13px", color: "var(--color-warning-dark)", marginTop: "4px" }}>
                    {activeRoster.pendingRegistrations.length} students registered last-minute. Approve them so they can join!
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!activeRoster) return;
                    try {
                      await confirmRosterRegistrationsRequest(activeRoster.id);
                      const r = await fetchRosterRequest(activeRoster.id);
                      setActiveRoster(r);
                      pushToast(`Approved ${activeRoster.pendingRegistrations!.length} registrations.`, "success");
                    } catch (err) {
                      pushToast(err instanceof Error ? err.message : "Failed to confirm registrations.", "error");
                    }
                  }}
                >
                  Approve All
                </button>
              </div>
              <div style={{ background: "white", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)", overflow: "hidden", maxHeight: "200px", overflowY: "auto" }}>
                <table className="table" style={{ margin: 0, border: "none" }}>
                  <thead><tr><th>Matric Number</th><th>Full Name</th></tr></thead>
                  <tbody>
                    {activeRoster.pendingRegistrations.map((s) => (
                      <tr key={s.id}>
                        <td>{s.matric}</td>
                        <td>{s.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
