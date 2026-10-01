import type { GitInfo, ProjectWithStatus } from "@tuldep/shared";
import { CardMenu, type CardMenuItem } from "./CardMenu";
import { GitBadge } from "./GitBadge";
import { EditIcon, LogIcon, PlayIcon, PullIcon, StopIcon, TrashIcon } from "./Icons";

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

  const menuItems: CardMenuItem[] = [
    { label: "Edit", icon: <EditIcon />, onClick: () => onEdit(project.id) },
    ...(git?.isRepo
      ? [
          {
            label: "Pull",
            icon: <PullIcon />,
            onClick: () => onPull(project.id),
            disabled: pulling || !git.hasUpstream,
            title: git.hasUpstream ? "Pull latest (fast-forward only)" : "Branch has no upstream",
          },
        ]
      : []),
    { label: "Delete", icon: <TrashIcon />, onClick: () => onDelete(project.id), danger: true },
  ];

  return (
    <div className="project-card">
      <div className="project-card-header">
        <div className="project-card-title">
          <span className={`status-dot status-dot--${project.status}`} />
          <span className="project-name">{project.name}</span>
        </div>
        <CardMenu items={menuItems} busy={pulling} />
      </div>
      <div className="project-card-body">
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
              >
                🔗 localhost:{project.port}
              </a>
            )}
            {showGit && git && <GitBadge git={git} />}
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
        <button className="icon-btn" title="Logs" aria-label="View logs" onClick={() => onOpenLogs(project.id)}>
          <LogIcon />
        </button>
      </div>
    </div>
  );
}
