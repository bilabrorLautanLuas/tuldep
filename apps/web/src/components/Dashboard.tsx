import { useCallback, useEffect, useState } from "react";
import type { ProjectWithStatus } from "@tuldep/shared";
import * as api from "../api";
import { ProjectForm } from "./ProjectForm";
import { ProjectCard } from "./ProjectCard";
import { LogViewer } from "./LogViewer";
import { Modal } from "./Modal";
import { DiscoverProjectsModal } from "./discover/DiscoverProjectsModal";

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setProjects(await api.listProjects());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function handleStart(id: string) {
    setStartingIds((prev) => new Set(prev).add(id));
    try {
      await api.startProject(id);
    } finally {
      setStartingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refresh();
    }
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
  const editingProject = projects.find((p) => p.id === editingProjectId) ?? null;

  return (
    <div className="dashboard">
      {notice && <div className="notice-banner">{notice}</div>}

      <div className="dashboard-toolbar">
        <button onClick={() => setDiscoverOpen(true)}>Auto-discover</button>
      </div>

      <ProjectForm
        mode="create"
        onSubmit={async (input) => {
          await api.createProject(input);
          refresh();
        }}
      />

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
            onEdit={setEditingProjectId}
            starting={startingIds.has(project.id)}
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

      {editingProject && (
        <Modal title="Edit Project" onClose={() => setEditingProjectId(null)}>
          <ProjectForm
            mode="edit"
            initialProject={editingProject}
            onSubmit={async (input) => {
              const res = await api.updateProject(editingProject.id, input);
              setEditingProjectId(null);
              refresh();
              if (res.notice) setNotice(res.notice);
            }}
            onCancel={() => setEditingProjectId(null)}
          />
        </Modal>
      )}

      {discoverOpen && (
        <DiscoverProjectsModal onClose={() => setDiscoverOpen(false)} onImported={refresh} />
      )}
    </div>
  );
}
