import type { GitInfo } from "@tuldep/shared";
import { GitBranchIcon } from "./Icons";

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function relativeTime(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  if (Number.isNaN(seconds)) return "";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function syncLines(git: GitInfo): string[] {
  if (!git.hasUpstream) return ["No upstream branch"];
  const lines: string[] = [];
  if (git.ahead) lines.push(`${git.ahead} commit to push`);
  if (git.behind) lines.push(`${git.behind} commit to pull`);
  return lines.length ? lines : ["Up to date with upstream"];
}

/** Branch pill. Hovering (or focusing) it reveals a popover with the local HEAD commit and sync state. */
export function GitBadge({ git }: { git: GitInfo }) {
  const { commit } = git;
  return (
    <span className="git-badge-wrap" tabIndex={0}>
      <span className="git-badge">
        <GitBranchIcon /> {git.branch}
        {git.dirty && <span className="git-badge-dirty">●</span>}
        {git.hasUpstream && !!git.ahead && <span className="git-badge-sync">↑{git.ahead}</span>}
        {git.hasUpstream && !!git.behind && <span className="git-badge-sync">↓{git.behind}</span>}
      </span>
      <span className="git-popover" role="tooltip">
        <span className="git-popover-card">
          {commit ? (
            <>
              <span className="git-popover-head">
                <span className="git-popover-hash">{commit.hash}</span>
                <span className="git-popover-when" title={new Date(commit.date).toLocaleString()}>
                  {relativeTime(commit.date)}
                </span>
              </span>
              <span className="git-popover-subject">{commit.subject}</span>
              {commit.body && <span className="git-popover-body">{commit.body}</span>}
              <span className="git-popover-author">{commit.author}</span>
            </>
          ) : (
            <span className="git-popover-empty">No commits yet</span>
          )}
          <span className="git-popover-status">
            {git.detached && <span>Detached HEAD</span>}
            {git.dirty && <span className="git-popover-dirty">Uncommitted changes</span>}
            {syncLines(git).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
