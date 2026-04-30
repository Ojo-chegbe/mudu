import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Button } from "./primitives";

export function ConfirmModal() {
  const confirm = useAppStore((state) => state.confirm);
  const closeConfirm = useAppStore((state) => state.closeConfirm);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConfirm();
      }
    };

    if (confirm) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }

    return undefined;
  }, [confirm, closeConfirm]);

  if (!confirm) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={closeConfirm}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="modal-title" id="confirm-title">{confirm.title}</h3>
        <p className="modal-text" id="confirm-description">{confirm.description}</p>
        <div className="modal-actions">
          <Button
            variant={confirm.tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              confirm.onConfirm();
              closeConfirm();
            }}
          >
            {confirm.confirmLabel}
          </Button>
          <Button onClick={closeConfirm}>Cancel</Button>
        </div>
      </section>
    </div>
  );
}

export function ToastRegion() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 4000)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [removeToast, toasts]);

  return (
    <div className="toast-region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
