import type { ProjectWithStatus } from "@tuldep/shared";

interface ProjectCardProps {
  project: ProjectWithStatus;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenLogs: (id: string) => void;
}

export function ProjectCard({ project, onStart, onStop, onDelete, onOpenLogs }: ProjectCardProps) {
  return (
    <div className="project-card">
      <div className="project-card-body" onClick={() => onOpenLogs(project.id)}>
        <div className="project-card-title">
          <span className={`status-dot status-dot--${project.status}`} />
          <span className="project-name">{project.name}</span>
        </div>
        <div className="project-meta">{project.cwd}</div>
        <div className="project-meta project-command">{project.command}</div>
      </div>
      <div className="project-card-actions">
        <button disabled={project.status === "running"} onClick={() => onStart(project.id)}>
          Start
        </button>
        <button disabled={project.status !== "running"} onClick={() => onStop(project.id)}>
          Stop
        </button>
        <button className="danger" onClick={() => onDelete(project.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
