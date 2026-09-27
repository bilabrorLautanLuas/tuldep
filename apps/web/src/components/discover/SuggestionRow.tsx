import type { ProjectSuggestion } from "@tuldep/shared";

interface SuggestionRowProps {
  suggestion: ProjectSuggestion;
  selected: boolean;
  command: string;
  onToggle: () => void;
  onCommandChange: (value: string) => void;
}

export function SuggestionRow({ suggestion, selected, command, onToggle, onCommandChange }: SuggestionRowProps) {
  return (
    <div className="suggestion-row">
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div className="suggestion-info">
        <div className="suggestion-title">
          <span className={`kind-badge kind-badge--${suggestion.detectedType}`}>{suggestion.detectedType}</span>
          <span className="project-name">{suggestion.name}</span>
        </div>
        <div className="project-meta project-command">{suggestion.path}</div>
      </div>
      <input
        className="suggestion-command-input"
        value={command}
        onChange={(e) => onCommandChange(e.target.value)}
      />
    </div>
  );
}
