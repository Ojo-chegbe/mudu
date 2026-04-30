import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";
import type { Tone } from "../types";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "secondary", disabled = false, type = "button", children, ...buttonProps }: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} type={type} {...buttonProps}>
      {children}
    </button>
  );
}

type BadgeProps = {
  tone?: Tone;
};

export function Badge({ tone = "neutral", children }: PropsWithChildren<BadgeProps>) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

type FieldProps = {
  label: string;
  placeholder?: string;
  value?: string;
  hint?: string;
  state?: "default" | "error" | "success" | "disabled";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value">;

export function Field({ label, placeholder, value, hint, state = "default", ...inputProps }: FieldProps) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input className={`input ${state}`} placeholder={placeholder} defaultValue={value} disabled={state === "disabled"} {...inputProps} />
      {hint ? <span className={`field-hint ${state === "error" ? "error" : state === "success" ? "success" : ""}`}>{hint}</span> : null}
    </label>
  );
}

type SwitchProps = {
  label: string;
  checked?: boolean;
};

export function Switch({ label, checked = false }: SwitchProps) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <span className={`switch ${checked ? "on" : "off"}`}>
        <span className="switch-knob" />
      </span>
    </label>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <article className="card">{children}</article>;
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}
