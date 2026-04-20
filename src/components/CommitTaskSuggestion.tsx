import React from "react";
import { Commit, Task } from "../data/mock";
import { Badge, Button } from "./ui";
import { GitCommit, Check, X, Sparkles } from "lucide-react";

export type PendingSuggestion = {
  commitId: string;
  suggestedTaskId: string | null;
};

interface CommitTaskSuggestionProps {
  suggestions: PendingSuggestion[];
  commits: Commit[];
  tasks: Task[];
  onConfirm: (commitId: string, taskId: string) => void;
  onDismiss: (commitId: string) => void;
}

export function CommitTaskSuggestion({ suggestions, commits, tasks, onConfirm, onDismiss }: CommitTaskSuggestionProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mx-4 mt-4 rounded-lg border border-gh-blue/40 bg-[#1f6feb0d] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-gh-blue" />
        <span className="text-sm font-semibold text-gh-text">Suggestions IA — Associer les commits aux taches</span>
        <Badge variant="outline" className="text-gh-blue border-gh-blue/40">{suggestions.length}</Badge>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => {
          const commit = commits.find((c) => c.id === suggestion.commitId);
          if (!commit) return null;
          const suggestedTask = tasks.find((t) => t.id === suggestion.suggestedTaskId);
          return (
            <SuggestionRow
              key={suggestion.commitId}
              commit={commit}
              suggestedTask={suggestedTask || null}
              suggestedTaskId={suggestion.suggestedTaskId}
              tasks={tasks}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
            />
          );
        })}
      </div>
    </div>
  );
}

function SuggestionRow({
  commit,
  suggestedTask,
  suggestedTaskId,
  tasks,
  onConfirm,
  onDismiss,
}: {
  key?: React.Key;
  commit: Commit;
  suggestedTask: Task | null;
  suggestedTaskId: string | null;
  tasks: Task[];
  onConfirm: (commitId: string, taskId: string) => void;
  onDismiss: (commitId: string) => void;
}) {
  const [selectedTaskId, setSelectedTaskId] = React.useState(suggestedTaskId || "");

  return (
    <div className="flex items-center gap-3 bg-gh-card border border-gh-border rounded-md px-3 py-2">
      <GitCommit className="w-4 h-4 text-gh-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-gh-blue mr-2">{commit.sha}</span>
        <span className="text-xs text-gh-text truncate">{commit.message.slice(0, 60)}</span>
      </div>
      <span className="text-xs text-gh-muted shrink-0">→</span>
      <select
        value={selectedTaskId}
        onChange={(e) => setSelectedTaskId(e.target.value)}
        className="text-xs bg-gh-bg border border-gh-border rounded px-2 py-1 text-gh-text max-w-[200px]"
      >
        <option value="">-- Aucune tache --</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      {suggestedTask && (
        <Badge variant="outline" className="text-gh-blue border-gh-blue/30 text-[10px] shrink-0">
          IA: {suggestedTask.title.slice(0, 20)}
        </Badge>
      )}
      <Button
        size="sm"
        variant="primary"
        onClick={() => selectedTaskId && onConfirm(commit.id, selectedTaskId)}
        className="shrink-0"
      >
        <Check className="w-3 h-3" />
      </Button>
      <button
        onClick={() => onDismiss(commit.id)}
        className="text-gh-muted hover:text-gh-text p-1 shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
