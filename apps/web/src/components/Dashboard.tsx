import { useCallback, useEffect, useRef, useState } from "react";
import type { GitInfo, ProjectWithStatus } from "@tuldep/shared";
import * as api from "../api";
import { ProjectForm } from "./ProjectForm";
import { ProjectCard } from "./ProjectCard";
import { LogViewer } from "./LogViewer";
import { Modal } from "./Modal";
import { EmptyState } from "./Mascot";
import { DiscoverProjectsModal } from "./discover/DiscoverProjectsModal";

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set());
  const [pullingIds, setPullingIds] = useState<Set<string>>(new Set());
  const [gitInfo, setGitInfo] = useState<Record<string, GitInfo>>({});
  const gitRequested = useRef<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    setProjects(await api.listProjects());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const loadGit = useCallback(async (id: string) => {
    try {
      const info = await api.getProjectGit(id);
      setGitInfo((prev) => ({ ...prev, [id]: info }));
    } catch {
      // git info is a nicety — a failed lookup just means no badge
    }
  }, []);

  // Git info spawns a process per project, so it stays out of the 2s poll:
  // fetch once per project when it first appears, then after pull / edit.
  useEffect(() => {
    for (const p of projects) {
      if (gitRequested.current.has(p.id)) continue;
      gitRequested.current.add(p.id);
      loadGit(p.id);
    }
  }, [projects, loadGit]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), notice.kind === "error" ? 10000 : 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function handlePull(id: string) {
    setPullingIds((prev) => new Set(prev).add(id));
    try {
      const result = await api.pullProject(id);
      setGitInfo((prev) => ({ ...prev, [id]: result.info }));
      if (result.success) {
        const text = result.notice ?? "Pull selesai";
        setNotice({ kind: "success", text: result.output ? `${text}\n${result.output}` : text });
      } else {
        setNotice({ kind: "error", text: result.output || "Pull gagal" });
      }
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setPullingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

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

  async function handleClearAll() {
    const confirmed = window.confirm(
      `Hapus SEMUA project (${projects.length})? Project yang sedang berjalan akan dihentikan. Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;
    setClearing(true);
    try {
      await api.clearAllProjects();
      setSelectedProjectId(null);
      setEditingProjectId(null);
    } finally {
      setClearing(false);
      refresh();
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const editingProject = projects.find((p) => p.id === editingProjectId) ?? null;

  return (
    <div className="dashboard">
      {notice && (
        <div className={notice.kind === "error" ? "notice-banner notice-banner--error" : "notice-banner"}>
          {notice.text}
        </div>
      )}

      <div className="dashboard-toolbar">
        <button onClick={() => setDiscoverOpen(true)}>Auto-discover</button>
        <button className="danger" disabled={projects.length === 0 || clearing} onClick={handleClearAll}>
          {clearing ? <span className="spinner" /> : "🗑 Clear Data"}
        </button>
      </div>

      <ProjectForm
        mode="create"
        onSubmit={async (input) => {
          await api.createProject(input);
          refresh();
        }}
      />

      <div className="project-grid">
        {projects.length === 0 && <EmptyState>No projects yet — add one above!</EmptyState>}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            git={gitInfo[project.id]}
            onStart={handleStart}
            onStop={handleStop}
            onDelete={handleDelete}
            onOpenLogs={setSelectedProjectId}
            onEdit={setEditingProjectId}
            onPull={handlePull}
            starting={startingIds.has(project.id)}
            pulling={pullingIds.has(project.id)}
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
              loadGit(editingProject.id); // cwd may have changed
              if (res.notice) setNotice({ kind: "success", text: res.notice });
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
