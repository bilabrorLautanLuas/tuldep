import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { DbScriptsPage } from "./components/db/DbScriptsPage";
import { MyIpPage } from "./components/MyIpPage";

type View = "projects" | "db" | "my-ip";

export default function App() {
  const [view, setView] = useState<View>("projects");

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
          <button className={view === "my-ip" ? "active" : ""} onClick={() => setView("my-ip")}>
            🌐 My IP
          </button>
        </nav>
      </header>
      {view === "projects" && <Dashboard />}
      {view === "db" && <DbScriptsPage />}
      {view === "my-ip" && <MyIpPage />}
    </div>
  );
}
