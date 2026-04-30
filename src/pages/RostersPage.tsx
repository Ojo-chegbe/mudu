import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DropdownMenu } from "../components/DropdownMenu";
import { IconPlus, IconEdit, IconTrash, IconDownload, IconCopy, IconUpload } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";

export function RostersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rosters = useAppStore((s) => s.rosters);
  const importCsv = useAppStore((s) => s.importRosterFromCsv);
  const createRoster = useAppStore((s) => s.createRoster);
  const addStudent = useAppStore((s) => s.addManualStudent);
  const pushToast = useAppStore((s) => s.pushToast);

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [method, setMethod] = useState<"csv" | "self" | "manual">("csv");
  const [rosterName, setRosterName] = useState("New Roster");
  const [rosterDescription, setRosterDescription] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [selectedId, setSelectedId] = useState(rosters[0]?.id ?? "");
  const [matric, setMatric] = useState("");
  const [studentName, setStudentName] = useState("");
  const [importResult, setImportResult] = useState<{ duplicates: number; invalid: number } | null>(null);
  const [registrationToken] = useState(() => crypto.randomUUID().slice(0, 8));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fromExamCreate = searchParams.get("from") === "exam-create";
  const returnTo = searchParams.get("returnTo");
  const selectedRoster = rosters.find((r) => r.id === selectedId);
  const activeRoster = rosters.find((r) => r.id === activeRosterId) ?? null;

  useEffect(() => {
    if (searchParams.get("mode") === "create") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

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

  const createRosterAndContinue = () => {
    const createdId = createRoster(rosterName, rosterDescription);
    if (!createdId) {
      pushToast("Roster name is required.", "warning");
      return;
    }
    setActiveRosterId(createdId);
    setSelectedId(createdId);
    setMethod("csv");
    setView("create");
    setShowCreateModal(false);
    pushToast("Roster created. Choose how to add students.", "success");
  };

  const importIntoExistingRoster = (rosterId: string, csvText: string) => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return { created: false, duplicates: 0, invalid: 0 };
    }
    const target = useAppStore.getState().rosters.find((r) => r.id === rosterId);
    if (!target) {
      return { created: false, duplicates: 0, invalid: 0 };
    }

    const existing = new Set(target.students.map((s) => s.matric.toLowerCase()));
    let duplicates = 0;
    let invalid = 0;
    let added = 0;

    for (let i = 1; i < lines.length; i += 1) {
      const [matricRaw, nameRaw] = lines[i].split(",");
      const matricValue = (matricRaw ?? "").trim();
      const studentValue = (nameRaw ?? "").trim();
      if (!matricValue || !studentValue) {
        invalid += 1;
        continue;
      }
      const key = matricValue.toLowerCase();
      if (existing.has(key)) {
        duplicates += 1;
        continue;
      }
      existing.add(key);
      addStudent(rosterId, matricValue, studentValue);
      added += 1;
    }

    return { created: added > 0, duplicates, invalid };
  };

  const handleImport = () => {
    if (!csv.trim()) {
      pushToast("Upload a CSV file before importing.", "warning");
      return;
    }

    const result = activeRosterId
      ? importIntoExistingRoster(activeRosterId, csv)
      : importCsv(rosterName, csv);

    if (result.created) {
      pushToast("Students imported successfully.", "success");
      if (fromExamCreate && activeRosterId) {
        navigateBackToExamCreate(activeRosterId);
        return;
      }
      if (activeRosterId) {
        setSelectedId(activeRosterId);
        setView("detail");
        return;
      }
      setView("list");
    } else {
      setImportResult({ duplicates: result.duplicates, invalid: result.invalid });
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
          {rosters.length === 0 ? (
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
                        { label: "Edit name", icon: <IconEdit />, onClick: () => {} },
                        { label: "Duplicate", icon: <IconCopy />, onClick: () => {} },
                        { label: "Export CSV", icon: <IconDownload />, onClick: () => {} },
                        { label: "", divider: true, onClick: () => {} },
                        { label: "Delete", icon: <IconTrash />, danger: true, onClick: () => {} },
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
                <div className="connection-ip" style={{ fontSize: "20px" }}>{`http://mudu.local/register/${registrationToken}`}</div>
              </div>
              <div className="row gap-2" style={{ justifyContent: "center" }}>
                <button className="btn btn-secondary">Copy Link</button>
                <button className="btn btn-secondary">Share via WhatsApp</button>
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
              <button className="btn btn-primary" onClick={() => {
                if (!matric || !studentName) return;
                addStudent(selectedRoster.id, matric, studentName);
                setMatric("");
                setStudentName("");
              }}>Add</button>
            </div>
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
                        { label: "Edit", icon: <IconEdit />, onClick: () => {} },
                        { label: "Remove", icon: <IconTrash />, danger: true, onClick: () => {} },
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
