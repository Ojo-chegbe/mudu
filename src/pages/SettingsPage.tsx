import { useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const lecturerName = useAppStore((s) => s.lecturerName);
  const institution = useAppStore((s) => s.institution);
  const department = useAppStore((s) => s.department);
  const setProfile = useAppStore((s) => s.setProfile);
  const pushToast = useAppStore((s) => s.pushToast);

  const [name, setName] = useState(lecturerName || "Dr. Chukwudi");
  const [inst, setInst] = useState(institution || "University of Nigeria");
  const [dept, setDept] = useState(department || "Computer Science");

  const handleSave = () => {
    setProfile(name, inst, dept);
    pushToast("Profile saved successfully.", "success");
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="grid-2">
        {/* Profile */}
        <div className="card stack gap-4">
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Profile</h3>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Institution</label>
            <input className="form-input" value={inst} onChange={(e) => setInst(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={dept} onChange={(e) => setDept(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave}>Save Profile</button>
        </div>

        {/* Exam Defaults */}
        <div className="card stack gap-4">
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Exam Defaults</h3>
          <div className="form-group">
            <label className="form-label">Default Duration (minutes)</label>
            <input className="form-input" type="number" defaultValue={60} />
          </div>
          <div className="form-group">
            <label className="form-label">Recovery Window (minutes)</label>
            <input className="form-input" type="number" defaultValue={10} />
          </div>
          <div className="stack gap-2">
            <div className="switch-row"><span>Fullscreen Enforcement</span><button className="switch-track on"><span className="switch-knob" /></button></div>
            <div className="switch-row"><span>Tab Monitoring</span><button className="switch-track on"><span className="switch-knob" /></button></div>
            <div className="switch-row"><span>Shuffle Questions</span><button className="switch-track on"><span className="switch-knob" /></button></div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: "var(--red-100)" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-error)" }}>Danger Zone</h3>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px" }}>These actions are irreversible.</p>
        <div className="row gap-2">
          <button className="btn btn-danger">Clear All Data</button>
          <button className="btn btn-danger">Reset to Factory Defaults</button>
        </div>
      </div>
    </div>
  );
}
