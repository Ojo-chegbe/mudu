import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAppSettings, fetchLecturerProfile, logoutLecturer, updateAppSettings, updateLecturerProfile, type AppSettings } from "../api/client";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const navigate = useNavigate();
  const lecturerName = useAppStore((s) => s.lecturerName);
  const institution = useAppStore((s) => s.institution);
  const department = useAppStore((s) => s.department);
  const setProfile = useAppStore((s) => s.setProfile);
  const pushToast = useAppStore((s) => s.pushToast);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const logOut = useAppStore((s) => s.logOut);

  const [name, setName] = useState(lecturerName || "Dr. Chukwudi");
  const [inst, setInst] = useState(institution || "University of Nigeria");
  const [dept, setDept] = useState(department || "Computer Science");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([fetchLecturerProfile(), fetchAppSettings()])
      .then(([profile, app]) => {
        if (!mounted) return;
        if (profile) {
          setName(profile.name);
          setInst(profile.institution ?? "");
          setDept(profile.department ?? "");
        }
        setSettings(app);
      })
      .catch((err) => {
        if (!mounted) return;
        pushToast(err instanceof Error ? err.message : "Failed to load settings.", "error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setBusy(true);
      const [profile, app] = await Promise.all([
        updateLecturerProfile({
          name: name.trim(),
          institution: inst.trim(),
          department: dept.trim()
        }),
        updateAppSettings(settings)
      ]);
      setProfile(profile.name, profile.institution ?? "", profile.department ?? "");
      setSettings(app);
      pushToast("Settings saved successfully.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to save settings.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    askConfirm({
      title: "Log out?",
      description: "This will end your current app session on this device.",
      confirmLabel: "Log out",
      tone: "danger",
      onConfirm: async () => {
        if (loggingOutRef.current) {
          return;
        }
        loggingOutRef.current = true;
        setLoggingOut(true);
        try {
          await logoutLecturer();
          logOut();
          pushToast("Logged out successfully.", "success");
          navigate("/login");
        } catch (err) {
          pushToast(err instanceof Error ? err.message : "Failed to log out. Please try again.", "error");
        } finally {
          loggingOutRef.current = false;
          setLoggingOut(false);
        }
      }
    });
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <button className="btn btn-danger" disabled={loggingOut} onClick={handleLogout}>
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
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
            <input
              className="form-input"
              type="number"
              value={settings?.defaultExamDurationMinutes ?? 60}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, defaultExamDurationMinutes: Math.max(1, Number(e.target.value) || 60) }
                    : prev
                )
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Recovery Window (minutes)</label>
            <input
              className="form-input"
              type="number"
              value={settings?.recoveryWindowMinutes ?? 10}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, recoveryWindowMinutes: Math.max(1, Number(e.target.value) || 10) }
                    : prev
                )
              }
            />
          </div>
          <div className="stack gap-2">
            <div className="switch-row">
              <span>Fullscreen Enforcement</span>
              <button
                className={`switch-track ${settings?.fullscreenRequired ? "on" : ""}`}
                onClick={() => setSettings((prev) => (prev ? { ...prev, fullscreenRequired: !prev.fullscreenRequired } : prev))}
              >
                <span className="switch-knob" />
              </button>
            </div>
            <div className="switch-row">
              <span>Tab Monitoring</span>
              <button
                className={`switch-track ${settings?.tabMonitoringEnabled ? "on" : ""}`}
                onClick={() => setSettings((prev) => (prev ? { ...prev, tabMonitoringEnabled: !prev.tabMonitoringEnabled } : prev))}
              >
                <span className="switch-knob" />
              </button>
            </div>
            <div className="switch-row">
              <span>Shuffle Questions</span>
              <button
                className={`switch-track ${settings?.shuffleQuestions ? "on" : ""}`}
                onClick={() => setSettings((prev) => (prev ? { ...prev, shuffleQuestions: !prev.shuffleQuestions } : prev))}
              >
                <span className="switch-knob" />
              </button>
            </div>
          </div>
          <button className="btn btn-primary" disabled={!settings || busy} onClick={() => void handleSave()}>
            {busy ? "Saving..." : "Save Defaults"}
          </button>
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
