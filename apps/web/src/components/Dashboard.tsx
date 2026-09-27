import { useCallback, useEffect, useState } from "react";
import type { ProjectWithStatus } from "@tuldep/shared";
import * as api from "../api";
import { AddProjectForm } from "./AddProjectForm";
import { ProjectCard } from "./ProjectCard";
import { LogViewer } from "./LogViewer";

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProjects(await api.listProjects());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleStart(id: string) {
    await api.startProject(id);
    refresh();
  }

  async function handleStop(id: string) {
    await api.stopProject(id);
    refresh();
  }

  async function handleDelete(id: string) {
    await api.deleteProject(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    refresh();
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className="dashboard">
      <AddProjectForm onAdded={refresh} />

      <div className="project-grid">
        {projects.length === 0 && <p className="empty-state">No projects yet — add one above.</p>}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onStart={handleStart}
            onStop={handleStop}
            onDelete={handleDelete}
            onOpenLogs={setSelectedProjectId}
          />
        ))}
      </div>

      {selectedProject && (
        <LogViewer
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  );
}
