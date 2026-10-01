import type { GitInfo, ProjectWithStatus } from "@tuldep/shared";
import { EditIcon, GitBranchIcon, PlayIcon, PullIcon, StopIcon, TrashIcon } from "./Icons";

interface ProjectCardProps {
  project: ProjectWithStatus;
  git?: GitInfo;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenLogs: (id: string) => void;
  onEdit: (id: string) => void;
  onPull: (id: string) => void;
  starting?: boolean;
  pulling?: boolean;
}

function gitTitle(git: GitInfo): string {
  const parts = [git.detached ? "Detached HEAD" : `Branch ${git.branch}`];
  if (git.dirty) parts.push("uncommitted changes");
  if (!git.hasUpstream) parts.push("no upstream");
  else {
    if (git.ahead) parts.push(`${git.ahead} commit to push`);
    if (git.behind) parts.push(`${git.behind} commit to pull`);
  }
  return parts.join(" · ");
}

export function ProjectCard({
  project,
  git,
  onStart,
  onStop,
  onDelete,
  onOpenLogs,
  onEdit,
  onPull,
  starting,
  pulling,
}: ProjectCardProps) {
  const showGit = git?.isRepo === true && !!git.branch;
  return (
    <div className="project-card">
      <div className="project-card-body" onClick={() => onOpenLogs(project.id)}>
        <div className="project-card-title">
          <span className={`status-dot status-dot--${project.status}`} />
          <span className="project-name">{project.name}</span>
        </div>
        <div className="project-meta">{project.cwd}</div>
        <div className="project-meta project-command">{project.command}</div>
        {(project.engine || project.port || showGit) && (
          <div className="project-badges">
            {project.engine && (
              <span className={`engine-badge engine-badge--${project.engine.type}`}>
                {project.engine.type === "node" ? "⬢" : "🐘"} {project.engine.type === "node" ? "Node" : "PHP"}{" "}
                {project.engine.version}
              </span>
            )}
            {project.port && (
              <a
                className="port-badge"
                href={`http://localhost:${project.port}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 localhost:{project.port}
              </a>
            )}
            {showGit && git && (
              <span className="git-badge" title={gitTitle(git)}>
                <GitBranchIcon /> {git.branch}
                {git.dirty && <span className="git-badge-dirty">●</span>}
                {git.hasUpstream && !!git.ahead && <span className="git-badge-sync">↑{git.ahead}</span>}
                {git.hasUpstream && !!git.behind && <span className="git-badge-sync">↓{git.behind}</span>}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="project-card-actions project-card-actions--icons">
        <button
          className="primary icon-btn"
          title="Start"
          aria-label="Start project"
          disabled={project.status === "running" || starting}
          onClick={() => onStart(project.id)}
        >
          {starting ? <span className="spinner" /> : <PlayIcon />}
        </button>
        <button
          className="icon-btn"
          title="Stop"
          aria-label="Stop project"
          disabled={project.status !== "running"}
          onClick={() => onStop(project.id)}
        >
          <StopIcon />
        </button>
        {git?.isRepo && (
          <button
            className="icon-btn"
            title={git.hasUpstream ? "Pull latest" : "Pull (branch has no upstream)"}
            aria-label="Pull latest"
            disabled={pulling || !git.hasUpstream}
            onClick={() => onPull(project.id)}
          >
            {pulling ? <span className="spinner" /> : <PullIcon />}
          </button>
        )}
        <button className="icon-btn" title="Edit" aria-label="Edit project" onClick={() => onEdit(project.id)}>
          <EditIcon />
        </button>
        <button className="danger icon-btn" title="Delete" aria-label="Delete project" onClick={() => onDelete(project.id)}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
