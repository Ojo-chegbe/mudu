import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <div className="card stack gap-4" style={{ width: "100%", maxWidth: "460px" }}>
        <div className="stack gap-1">
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>{title}</h1>
          <p style={{ color: "var(--text-tertiary)" }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const logIn = useAppStore((s) => s.logIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <AuthShell title="Login" subtitle="Access your lecturer dashboard">
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <div className="badge badge-error" style={{ whiteSpace: "normal" }}>{error}</div> : null}
      <button
        className="btn btn-primary btn-lg"
        onClick={() => {
          const result = logIn(email, password);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setError("");
          navigate("/");
        }}
      >
        Login
      </button>
      <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
        No account? <Link to="/signup" style={{ color: "var(--color-primary)" }}>Create one</Link>
      </p>
    </AuthShell>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useAppStore((s) => s.signUp);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <AuthShell title="Sign Up" subtitle="Create your lecturer account">
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <div className="badge badge-error" style={{ whiteSpace: "normal" }}>{error}</div> : null}
      <button
        className="btn btn-primary btn-lg"
        onClick={() => {
          const result = signUp(name, email, password);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setError("");
          navigate("/");
        }}
      >
        Create Account
      </button>
      <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
        Already have an account? <Link to="/login" style={{ color: "var(--color-primary)" }}>Login</Link>
      </p>
    </AuthShell>
  );
}

