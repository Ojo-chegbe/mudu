import { useEffect, useState } from "react";
import { IconGrid, IconList, IconFlag, IconHistoryClock, IconCheck, IconTrash } from "../components/Icons";
import { DropdownMenu } from "../components/DropdownMenu";
import { Button } from "../components/primitives";
import { useAppStore } from "../store/useAppStore";
import {
  endExamRunRequest,
  fetchExamsRequest,
  fetchRunSessionsRequest,
  postRunSessionActionRequest,
  type ExamRecord,
  type RunSessionRecord
} from "../api/client";

function statusColor(status: RunSessionRecord["status"]): string {
  switch (status) {
    case "Active": return "var(--color-success)";
    case "Connected": return "var(--blue-500)";
    case "Submitted": return "var(--gray-400)";
    case "Flagged": return "var(--color-warning)";
    case "Disconnected": return "var(--color-error)";
    default: return "var(--gray-400)";
  }
}

function statusBadge(status: RunSessionRecord["status"]): string {
  switch (status) {
    case "Active": return "badge-success";
    case "Connected": return "badge-info";
    case "Submitted": return "badge-neutral";
    case "Flagged": return "badge-warning";
    case "Disconnected": return "badge-error";
    default: return "badge-neutral";
  }
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MonitorPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [sessions, setSessions] = useState<RunSessionRecord[]>([]);
  const [endingRunId, setEndingRunId] = useState<string | null>(null);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const pushToast = useAppStore((s) => s.pushToast);

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendingMins, setExtendingMins] = useState("10");

  const loadExams = async () => {
    const items = await fetchExamsRequest();
    setExams(items);
    return items;
  };

  const loadSessions = async (runId: string | null) => {
    if (!runId) {
      setSessions([]);
      return;
    }
    try {
      const items = await fetchRunSessionsRequest(runId);
      setSessions(items);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to load sessions.", "error");
    }
  };

  useEffect(() => {
    let mounted = true;
    void loadExams()
      .then((items) => {
        if (!mounted) return;
        const preferred = items.find((item) => (item.status === "Running" || item.status === "Active") && item.activeRunId)?.id;
        const first = preferred ?? items[0]?.id ?? "";
        setSelectedExamId(first);
        if (first) {
          const exam = items.find((item) => item.id === first) ?? null;
          void loadSessions(exam?.activeRunId ?? null);
        }
      })
      .catch((err) => {
        pushToast(err instanceof Error ? err.message : "Failed to load exams.", "error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visible = flaggedOnly ? sessions.filter((s) => s.flags > 0) : sessions;
  const connected = sessions.filter((s) => s.status === "Connected" || s.status === "Active").length;
  const submitted = sessions.filter((s) => s.status === "Submitted").length;
  const flagged = sessions.filter((s) => s.flags > 0).length;
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null;
  const activeRunId = selectedExam?.activeRunId ?? null;

  const handleConfirmExtend = () => {
    const mins = Math.floor(Number(extendingMins));
    if (mins > 0 && extendingId && activeRunId) {
      const target = sessions.find((s) => s.id === extendingId);
      if (!target) return;
      void postRunSessionActionRequest(activeRunId, target.id, "extend_time", { minutes: mins })
        .then(() => loadSessions(activeRunId))
        .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to extend time.", "error"))
        .finally(() => setExtendingId(null));
    }
  };

  const handleForceSubmit = (id: string, name: string) => {
    if (!activeRunId) {
      pushToast("No active run is available for this action.", "error");
      return;
    }
    askConfirm({
      title: `Force submit ${name}?`,
      description: "This will end the exam for this student immediately.",
      confirmLabel: "Force Submit",
      tone: "danger",
      onConfirm: () => {
        const target = sessions.find((s) => s.id === id);
        if (!target) return;
        void postRunSessionActionRequest(activeRunId, target.id, "force_submit")
          .then(() => loadSessions(activeRunId))
          .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to force submit.", "error"));
      },
    });
  };

  const handleEndExam = () => {
    if (!selectedExam || !activeRunId) {
      pushToast("No running exam is available to end.", "error");
      return;
    }

    askConfirm({
      title: `End "${selectedExam.title}"?`,
      description: "This will close the current run and stop further student joins for this exam.",
      confirmLabel: "End Exam",
      tone: "danger",
      onConfirm: async () => {
        try {
          setEndingRunId(activeRunId);
          await endExamRunRequest(activeRunId);
          const items = await loadExams();
          const nextExamId = items.find((item) => (item.status === "Running" || item.status === "Active") && item.activeRunId)?.id ?? selectedExam.id;
          setSelectedExamId(nextExamId);
          const nextExam = items.find((item) => item.id === nextExamId) ?? null;
          await loadSessions(nextExam?.activeRunId ?? null);
          pushToast("Exam ended successfully.", "success");
        } catch (err) {
          pushToast(err instanceof Error ? err.message : "Failed to end exam.", "error");
        } finally {
          setEndingRunId(null);
        }
      }
    });
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Live Monitoring</h1>
      </div>

      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="row gap-3 row-wrap" style={{ justifyContent: "space-between" }}>
          <div className="row gap-3" style={{ flex: 1 }}>
          <label className="form-label" style={{ whiteSpace: "nowrap" }}>Exam:</label>
          <select
            className="form-select"
            style={{ flex: 1, maxWidth: "360px" }}
            value={selectedExamId}
            onChange={(e) => {
              const nextExamId = e.target.value;
              setSelectedExamId(nextExamId);
              const nextExam = exams.find((exam) => exam.id === nextExamId) ?? null;
              void loadSessions(nextExam?.activeRunId ?? null);
            }}
          >
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            {exams.length === 0 && <option value="">No exams</option>}
          </select>
          </div>
          <button
            className="btn btn-danger btn-sm"
            disabled={!activeRunId || endingRunId !== null}
            onClick={handleEndExam}
          >
            {endingRunId === activeRunId ? "Ending Exam..." : "End Exam"}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="card" style={{ padding: "12px 20px" }}>
        <div className="row-between row-wrap" style={{ gap: "12px" }}>
          <div className="row gap-4">
            <span className="badge badge-success">Connected: {connected}</span>
            <span className="badge badge-neutral">Submitted: {submitted}</span>
            <span className="badge badge-warning">Flagged: {flagged}</span>
          </div>
          <div className="row gap-2">
            <button className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("list")}><IconList /> List</button>
            <button className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("grid")}><IconGrid /> Grid</button>
            <button className={`btn btn-sm ${flaggedOnly ? "btn-danger" : "btn-secondary"}`} onClick={() => setFlaggedOnly(!flaggedOnly)}>
              <IconFlag /> {flaggedOnly ? "Show All" : "Flagged Only"}
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Matric</th><th>Status</th><th>Question</th><th>Flags</th><th>Time Left</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.matric}</td>
                  <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                  <td>Q{s.currentQuestion}</td>
                  <td>{s.flags > 0 ? <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>{s.flags}</span> : "0"}</td>
                  <td>{formatTime(s.timeRemaining)}</td>
                  <td>
                    <DropdownMenu items={[
                      { label: "Extend time", icon: <IconHistoryClock />, onClick: () => {
                        setExtendingId(s.id);
                        setExtendingMins("10");
                      } },
                      { label: "Dismiss flags", icon: <IconCheck />, onClick: () => {
                        if (!activeRunId) return;
                        void postRunSessionActionRequest(activeRunId, s.id, "dismiss_flags")
                          .then(() => loadSessions(activeRunId))
                          .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to dismiss flags.", "error"));
                      } },
                      { label: "", divider: true, onClick: () => {} },
                      { label: "Force submit", icon: <IconTrash />, danger: true, onClick: () => handleForceSubmit(s.id, s.name) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="status-grid">
          {visible.map((s) => (
            <div key={s.id} className="card" style={{ padding: "14px", cursor: "pointer" }} onClick={() => setSelectedId(s.id)}>
              <div className="row-between" style={{ marginBottom: "8px" }}>
                <strong style={{ fontSize: "14px" }}>{s.name}</strong>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: statusColor(s.status) }} />
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{s.matric}</div>
              <div className="row-between" style={{ marginTop: "8px", fontSize: "13px" }}>
                <span>Q{s.currentQuestion}</span>
                <span>{formatTime(s.timeRemaining)}</span>
              </div>
              {s.flags > 0 && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-warning)", fontWeight: 500 }}>
                  ⚠ {s.flags} flag(s)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Student Detail Drawer */}
      {selectedId && (() => {
        const student = sessions.find((s) => s.id === selectedId);
        if (!student) return null;
        return (
          <div className="modal-overlay" onClick={() => setSelectedId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
              <h3 className="modal-title">{student.name}</h3>
              <div className="stack gap-2" style={{ background: "var(--gray-50)", borderRadius: "8px", padding: "12px" }}>
                <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Matric</span><span>{student.matric}</span></div>
                <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Status</span><span className={`badge ${statusBadge(student.status)}`}>{student.status}</span></div>
                <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Question</span><span>Q{student.currentQuestion}</span></div>
                <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Flags</span><span>{student.flags}</span></div>
                <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Time Left</span><span>{formatTime(student.timeRemaining)}</span></div>
                {student.reconnectGapSeconds > 0 && (
                  <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Reconnect Gap</span><span>{student.reconnectGapSeconds}s</span></div>
                )}
              </div>
              <div className="row gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => { setExtendingId(student.id); setExtendingMins("10"); setSelectedId(null); }}>Extend Time</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!activeRunId) return;
                  void postRunSessionActionRequest(activeRunId, student.id, "dismiss_flags")
                    .then(() => loadSessions(activeRunId))
                    .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to dismiss flags.", "error"));
                  setSelectedId(null);
                }}>Dismiss Flags</button>
                <button className="btn btn-danger btn-sm" onClick={() => { handleForceSubmit(student.id, student.name); setSelectedId(null); }}>Force Submit</button>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </div>
        );
      })()}
      {/* Extend Time Modal */}
      {extendingId && (
        <div className="modal-overlay" onClick={() => setExtendingId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "340px" }}>
            <h3 className="modal-title">Extend Exam Time</h3>
            <div className="form-group">
              <label className="form-label">Enter minutes to extend</label>
              <input 
                className="form-input" 
                type="number" 
                autoFocus 
                value={extendingMins} 
                onChange={(e) => setExtendingMins(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleConfirmExtend()}
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setExtendingId(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmExtend}>Extend Time</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
