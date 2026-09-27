import { useState } from "react";
import * as api from "../api";

interface AddProjectFormProps {
  onAdded: () => void;
}

export function AddProjectForm({ onAdded }: AddProjectFormProps) {
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState("");
  const [command, setCommand] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !cwd || !command) return;
    setSubmitting(true);
    try {
      await api.createProject({ name, cwd, command, env: {} });
      setName("");
      setCwd("");
      setCommand("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>Add Project</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Working directory" value={cwd} onChange={(e) => setCwd(e.target.value)} />
      <input placeholder="Command" value={command} onChange={(e) => setCommand(e.target.value)} />
      <button type="submit" disabled={submitting}>
        Add Project
      </button>
    </form>
  );
}
