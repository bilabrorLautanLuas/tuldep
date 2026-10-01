import type { ReactNode } from "react";

interface MascotProps {
  size?: number;
  /** Use the 128px asset for small renders, the 512px one for hero/empty-state use. */
  small?: boolean;
  className?: string;
}

export function Mascot({ size = 48, small = false, className = "" }: MascotProps) {
  return (
    <img
      className={`mascot ${className}`.trim()}
      src={small ? "/mascot-sm.png" : "/mascot.png"}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

interface EmptyStateProps {
  children: ReactNode;
  /** Smaller, inline variant for use inside modals/forms. */
  compact?: boolean;
}

/** Mascot with a speech bubble — replaces the plain-text empty states. */
export function EmptyState({ children, compact = false }: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <Mascot size={compact ? 56 : 104} small={compact} className="mascot--float" />
      <p className="empty-state-bubble">{children}</p>
    </div>
  );
}
