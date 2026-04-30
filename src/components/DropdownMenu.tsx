import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconMoreVertical } from "./Icons";

type MenuItem = {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  divider?: boolean;
  onClick: () => void;
};

export function DropdownMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="menu-trigger" onClick={() => setOpen(!open)}>
        <IconMoreVertical />
      </button>
      {open && (
        <div className="dropdown-menu">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="dropdown-divider" />
            ) : (
              <button
                key={i}
                className={`dropdown-item${item.danger ? " danger" : ""}`}
                onClick={() => { item.onClick(); setOpen(false); }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
