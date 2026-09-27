import type { ProjectWithStatus } from "@tuldep/shared";

interface ProjectCardProps {
  project: ProjectWithStatus;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenLogs: (id: string) => void;
  onEdit: (id: string) => void;
  starting?: boolean;
}

export function ProjectCard({ project, onStart, onStop, onDelete, onOpenLogs, onEdit, starting }: ProjectCardProps) {
  return (
    <div className="project-card">
      <div className="project-card-body" onClick={() => onOpenLogs(project.id)}>
        <div className="project-card-title">
          <span className={`status-dot status-dot--${project.status}`} />
          <span className="project-name">{project.name}</span>
        </div>
        <div className="project-meta">{project.cwd}</div>
        <div className="project-meta project-command">{project.command}</div>
        {(project.engine || project.port) && (
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
          </div>
        )}
      </div>
      <div className="project-card-actions">
        <button disabled={project.status === "running" || starting} onClick={() => onStart(project.id)}>
          {starting ? <span className="spinner" /> : "Start"}
        </button>
        <button disabled={project.status !== "running"} onClick={() => onStop(project.id)}>
          Stop
        </button>
        <button onClick={() => onEdit(project.id)} title="Edit project">
          ✎ Edit
        </button>
        <button className="danger" onClick={() => onDelete(project.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
