import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { DbScriptsPage } from "./components/db/DbScriptsPage";

export default function App() {
  const [view, setView] = useState<"projects" | "db">("projects");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tuldep</h1>
        <nav className="app-nav">
          <button className={view === "projects" ? "active" : ""} onClick={() => setView("projects")}>
            Projects
          </button>
          <button className={view === "db" ? "active" : ""} onClick={() => setView("db")}>
            DB Scripts
          </button>
        </nav>
      </header>
      {view === "projects" ? <Dashboard /> : <DbScriptsPage />}
    </div>
  );
}
