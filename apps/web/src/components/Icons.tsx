import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const PlayIcon = () => (
  <Icon>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
  </Icon>
);

export const StopIcon = () => (
  <Icon>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
  </Icon>
);

/** Lightning bolt — "test connection". */
export const ZapIcon = () => (
  <Icon>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Icon>
);

export const EditIcon = () => (
  <Icon>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Icon>
);
