import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreIcon } from "./Icons";

export interface CardMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}

interface CardMenuProps {
  items: CardMenuItem[];
  /** Shows a spinner on the trigger — for actions that keep running after the menu closes. */
  busy?: boolean;
  label?: string;
}

/** Three-dot dropdown for a card's secondary actions. Closes on outside click, Escape, or item pick. */
export function CardMenu({ items, busy, label = "More actions" }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="card-menu" data-open={open} ref={ref}>
      <button
        type="button"
        className="card-menu-trigger"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? <span className="spinner" /> : <MoreIcon />}
      </button>
      {open && (
        <div className="card-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? "card-menu-item card-menu-item--danger" : "card-menu-item"}
              title={item.title}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
