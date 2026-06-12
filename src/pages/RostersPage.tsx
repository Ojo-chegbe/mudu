import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addRosterStudentRequest,
  confirmRosterRegistrationsRequest,
  createRosterRegistrationLinkRequest,
  createRosterRequest,
  deleteRosterRequest,
  deleteRosterStudentRequest,
  fetchRosters,
  importRosterCsvRequest,
  updateRosterRequest,
  updateRosterStudentRequest,
  type RosterRecord
} from "../api/client";
import { DropdownMenu } from "../components/DropdownMenu";
import { IconPlus, IconEdit, IconTrash, IconDownload, IconCopy, IconUpload } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";

export function RostersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [loadingRosters, setLoadingRosters] = useState(true);
  const pushToast = useAppStore((s) => s.pushToast);

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [method, setMethod] = useState<"csv" | "self" | "manual">("csv");
  const [rosterName, setRosterName] = useState("New Roster");
  const [rosterDescription, setRosterDescription] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [matric, setMatric] = useState("");
  const [studentName, setStudentName] = useState("");
  const [importResult, setImportResult] = useState<{ duplicates: number; invalid: number } | null>(null);
  const [registrationLink, setRegistrationLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fromExamCreate = searchParams.get("from") === "exam-create";
  const returnTo = searchParams.get("returnTo");
  const selectedRoster = rosters.find((r) => r.id === selectedId);
  const activeRoster = rosters.find((r) => r.id === activeRosterId) ?? null;

  useEffect(() => {
    if (method !== "self" || !activeRosterId) return;
    void createRosterRegistrationLinkRequest(activeRosterId)
      .then((result) => setRegistrationLink(result.link))
      .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to create registration link.", "error"));
  }, [method, activeRosterId]);

  const loadRosters = async () => {
    try {
      setLoadingRosters(true);
      const items = await fetchRosters();
      setRosters(items);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to load rosters.", "error");
    } finally {
      setLoadingRosters(false);
    }
  };

  useEffect(() => {
    void loadRosters();
  }, []);

  useEffect(() => {
    if (searchParams.get("mode") === "create") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId && rosters[0]?.id) {
      setSelectedId(rosters[0].id);
    }
  }, [rosters, selectedId]);

  const navigateBackToExamCreate = (createdRosterId: string) => {
    const target = returnTo ?? "/exams/new?step=3";
    const separator = target.includes("?") ? "&" : "?";
    navigate(`${target}${separator}rosterId=${encodeURIComponent(createdRosterId)}`);
  };

  const openCreateModal = () => {
    setRosterName("New Roster");
    setRosterDescription("");
    setShowCreateModal(true);
  };

  const createRosterAndContinue = async () => {
    const cleanName = rosterName.trim();
    if (!cleanName) {
      pushToast("Roster name is required.", "warning");
      return;
    }

    try {
      const created = await createRosterRequest({
        name: cleanName,
        description: rosterDescription.trim()
      });
      await loadRosters();
      setActiveRosterId(created.id);
      setSelectedId(created.id);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to create roster.", "error");
      return;
    }

    setMethod("csv");
    setView("create");
    setShowCreateModal(false);
    pushToast("Roster created. Choose how to add students.", "success");
  };

  const handleImport = async () => {
    if (!csv.trim()) {
      pushToast("Upload a CSV file before importing.", "warning");
      return;
    }

    if (!activeRosterId) {
      pushToast("Create a roster first.", "warning");
      return;
    }

    try {
      const result = await importRosterCsvRequest(activeRosterId, csv);
      await loadRosters();
      setImportResult({ duplicates: result.duplicates, invalid: result.invalid });
      if (result.created > 0) {
        pushToast("Students imported successfully.", "success");
        if (fromExamCreate) {
          navigateBackToExamCreate(activeRosterId);
          return;
        }
        setSelectedId(activeRosterId);
        setView("detail");
      } else {
        pushToast("No new students imported.", "warning");
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Import failed.", "error");
    }
  };

  const handleCsvFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      pushToast("Please upload a .csv file.", "warning");
      event.currentTarget.value = "";
      return;
    }
    const content = await file.text();
    setCsv(content);
    setCsvFileName(file.name);
    setImportResult(null);
  };

  const handleDuplicateRoster = async (roster: RosterRecord) => {
    try {
      const duplicated = await createRosterRequest({
        name: `${roster.name} (Copy)`,
        description: roster.description ?? "",
        courseCode: roster.courseCode ?? ""
      });

      const copyStudents = roster.students.map((student) =>
        addRosterStudentRequest(duplicated.id, {
          matric: student.matric,
          name: student.name
        })
      );
      await Promise.allSettled(copyStudents);
      await loadRosters();
      pushToast("Roster duplicated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to duplicate roster.", "error");
    }
  };

  const exportRosterCsv = (roster: RosterRecord) => {
    const header = "matric,name";
    const rows = roster.students.map((s) => `${s.matric},${s.name.replace(/,/g, " ")}`);
    const csvText = [header, ...rows].join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${roster.name.replace(/[^a-z0-9-_ ]/gi, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renameRoster = async (roster: RosterRecord) => {
    const nextName = window.prompt("Enter new roster name", roster.name)?.trim();
    if (!nextName || nextName === roster.name) return;
    try {
      await updateRosterRequest(roster.id, { name: nextName });
      await loadRosters();
      pushToast("Roster name updated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to update roster.", "error");
    }
  };

  const removeRoster = async (roster: RosterRecord) => {
    const confirmed = window.confirm(`Delete "${roster.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteRosterRequest(roster.id);
      await loadRosters();
      if (selectedId === roster.id) {
        setSelectedId("");
      }
      pushToast("Roster deleted.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to delete roster.", "error");
    }
  };

  const editStudent = async (studentId: string, currentMatric: string, currentName: string) => {
    const nextMatric = window.prompt("Edit matric number", currentMatric)?.trim();
    if (!nextMatric) return;
    const nextName = window.prompt("Edit student name", currentName)?.trim();
    if (!nextName) return;
    try {
      await updateRosterStudentRequest(studentId, { matric: nextMatric, name: nextName });
      await loadRosters();
      pushToast("Student updated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to update student.", "error");
    }
  };

  const removeStudent = async (studentId: string, name: string) => {
    const confirmed = window.confirm(`Remove "${name}" from this roster?`);
    if (!confirmed) return;
    try {
      await deleteRosterStudentRequest(studentId);
      await loadRosters();
      pushToast("Student removed.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to remove student.", "error");
    }
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Student Rosters</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <IconPlus /> New Roster
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New Roster</h3>
            <div className="stack gap-3" style={{ marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label">Roster Name</label>
                <input className="form-input" value={rosterName} onChange={(e) => setRosterName(e.target.value)} placeholder="e.g. CSC 400L 2026" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={rosterDescription} onChange={(e) => setRosterDescription(e.target.value)} placeholder="Optional details about the class/cohort" />
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: "12px" }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createRosterAndContinue}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          {loadingRosters ? (
            <div className="card" style={{ textAlign: "center", padding: "48px" }}>
              <p style={{ color: "var(--text-tertiary)" }}>Loading rosters...</p>
            </div>
          ) : rosters.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "48px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No rosters yet</h3>
              <p style={{ color: "var(--text-tertiary)", marginBottom: "16px" }}>Create a roster to manage your students.</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                <IconPlus /> Create Roster
              </button>
            </div>
          ) : (
            <div className="stack gap-3">
              {rosters.map((roster) => (
                <div key={roster.id} className="card" style={{ cursor: "pointer" }} onClick={() => { setSelectedId(roster.id); setView("detail"); }}>
                  <div className="row-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "15px" }}>{roster.name}</div>
                      {roster.description ? <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{roster.description}</div> : null}
                      <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                        {roster.students.length} students - Last used {new Date(roster.lastUsedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu items={[
                        { label: "Edit name", icon: <IconEdit />, onClick: () => void renameRoster(roster) },
                        { label: "Duplicate", icon: <IconCopy />, onClick: () => void handleDuplicateRoster(roster) },
                        { label: "Export CSV", icon: <IconDownload />, onClick: () => exportRosterCsv(roster) },
                        { label: "", divider: true, onClick: () => {} },
                        { label: "Delete", icon: <IconTrash />, danger: true, onClick: () => void removeRoster(roster) },
                      ]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "create" && activeRoster && (
        <div className="stack gap-4">
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Add Students to {activeRoster.name}</h2>
          {activeRoster.description ? <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{activeRoster.description}</p> : null}

          <div className="segment-control">
            <button className={`segment-button ${method === "csv" ? "active" : ""}`} onClick={() => setMethod("csv")}>Import CSV</button>
            <button className={`segment-button ${method === "manual" ? "active" : ""}`} onClick={() => setMethod("manual")}>Manual entry</button>
            <button className={`segment-button ${method === "self" ? "active" : ""}`} onClick={() => setMethod("self")}>Self-Registration</button>
          </div>

          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {method === "csv" && "Upload a spreadsheet with student matric numbers and names."}
            {method === "manual" && "Type in student details one by one."}
            {method === "self" && "Share a link and let students register themselves."}
          </div>

          {method === "csv" && (
            <div className="card stack gap-3">
              <div className="drop-zone" style={{ padding: "40px" }} onClick={() => fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                />
                <div className="drop-zone-icon"><IconUpload /></div>
                <div className="drop-zone-text">
                  {csvFileName ? `Selected: ${csvFileName}` : "Drag & drop your file here, or click to browse"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>CSV file only</div>
              </div>
              {importResult && (
                <div className="badge badge-warning">Duplicates: {importResult.duplicates} | Invalid: {importResult.invalid}</div>
              )}
              <div className="row-between">
                <button className="btn btn-secondary" onClick={() => setView("list")}>Cancel</button>
                <button className="btn btn-primary" onClick={handleImport}>Import Students</button>
              </div>
            </div>
          )}

          {method === "manual" && (
            <div className="card stack gap-3">
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Use the roster details page to add students manually.</p>
              <div className="row-between">
                <button className="btn btn-secondary" onClick={() => setView("list")}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { setSelectedId(activeRoster.id); setView("detail"); }}>
                  Open Roster Details
                </button>
              </div>
            </div>
          )}

          {method === "self" && (
            <div className="card stack gap-3">
              <div className="connection-box">
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Share this link with students</div>
                <div className="connection-ip" style={{ fontSize: "20px" }}>{registrationLink || "Generating registration link..."}</div>
              </div>
              <div className="row gap-2" style={{ justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={async () => {
                  const link = registrationLink;
                  if (!link) return;
                  await navigator.clipboard.writeText(link);
                  pushToast("Registration link copied.", "success");
                }}>Copy Link</button>
                <button className="btn btn-secondary" onClick={() => {
                  const link = registrationLink;
                  if (!link) return;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Join roster: ${link}`)}`, "_blank", "noopener,noreferrer");
                }}>Share via WhatsApp</button>
              </div>
              {fromExamCreate && (
                <button className="btn btn-primary" onClick={() => {
                  pushToast("Roster ready. Returning to exam setup.", "success");
                  navigateBackToExamCreate(activeRoster.id);
                }}>
                  Use This and Return to Exam
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setView("list")}>{"<-"} Back to Rosters</button>
            </div>
          )}
        </div>
      )}

      {view === "detail" && selectedRoster && (
        <div className="stack gap-4">
          <div className="row-between">
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setView("list")}>{"<-"} Back</button>
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginTop: "8px" }}>{selectedRoster.name}</h2>
              {selectedRoster.description ? <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{selectedRoster.description}</p> : null}
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{selectedRoster.students.length} students</p>
            </div>
          </div>

          <div className="card">
            <div className="row gap-2">
              <input className="form-input" style={{ flex: 1 }} placeholder="Matric number" value={matric} onChange={(e) => setMatric(e.target.value)} />
              <input className="form-input" style={{ flex: 1 }} placeholder="Full name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              <button className="btn btn-primary" onClick={async () => {
                if (!matric || !studentName) return;
                try {
                  await addRosterStudentRequest(selectedRoster.id, { matric, name: studentName });
                  await loadRosters();
                  setMatric("");
                  setStudentName("");
                } catch (err) {
                  pushToast(err instanceof Error ? err.message : "Failed to add student.", "error");
                }
              }}>Add</button>
            </div>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const result = await confirmRosterRegistrationsRequest(selectedRoster.id);
                  await loadRosters();
                  pushToast(`Confirmed ${result.roster.students.length} total students in roster.`, "success");
                } catch (err) {
                  pushToast(err instanceof Error ? err.message : "Failed to confirm registrations.", "error");
                }
              }}
            >
              Confirm Registrations
            </button>
          </div>

          <div className="card">
            <table className="table">
              <thead><tr><th>Matric Number</th><th>Full Name</th><th></th></tr></thead>
              <tbody>
                {selectedRoster.students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.matric}</td>
                    <td>{s.name}</td>
                    <td style={{ width: "40px" }}>
                      <DropdownMenu items={[
                        { label: "Edit", icon: <IconEdit />, onClick: () => void editStudent(s.id, s.matric, s.name) },
                        { label: "Remove", icon: <IconTrash />, danger: true, onClick: () => void removeStudent(s.id, s.name) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
