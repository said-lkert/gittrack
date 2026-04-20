import React, { useState } from "react";
import { Task, Commit, Member } from "../data/mock";
import { AvatarGroup, ProgressBar, Badge, Button } from "./ui";
import { Calendar, GitCommit, ChevronDown, AlertCircle, Clock, CheckCircle2, Trash2, Activity, Circle, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  members: Member[];
  commits: Commit[];
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

function getPriorityBadge(priority?: Task["priority"]) {
  if (priority === "high") return <Badge variant="danger">Haute</Badge>;
  if (priority === "low") return <Badge variant="outline">Basse</Badge>;
  return <Badge variant="warning">Moyenne</Badge>;
}

export function TaskCard({ task, members, commits, onUpdate, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const taskCommits = commits.filter((commit) => commit.taskId === task.id).sort((a, b) => b.timestamp - a.timestamp);
  const assignees = members.filter((member) => task.assigneeIds.includes(member.id));

  const isCompleted = task.progress === 100 || task.status === "completed";

  const handleToggleComplete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onUpdate(task.id, {
      progress: isCompleted ? 0 : 100,
      status: isCompleted ? "on_track" : "completed",
    });
  };

  const handleProgressChange = (value: number) => {
    onUpdate(task.id, {
      progress: value,
      status: value >= 100 ? "completed" : value < 40 && task.status === "critical" ? "critical" : value < 50 ? "behind" : "on_track",
    });
  };

  const deadlineDate = new Date(task.deadline);
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 3600 * 24));

  let smartBadge = null;
  if (isCompleted) {
    smartBadge = <Badge variant="success" className="bg-[#23863626] text-gh-success-text"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Terminee</Badge>;
  } else if (task.status === "behind" || daysUntilDeadline < 0) {
    smartBadge = <Badge variant="danger" className="bg-[#da363326] text-gh-danger"><AlertCircle className="w-3 h-3 mr-1 inline" />En retard</Badge>;
  } else if (daysUntilDeadline <= 3) {
    smartBadge = <Badge variant="warning" className="bg-[#d2992226] text-[#d29922]"><Clock className="w-3 h-3 mr-1 inline" />Deadline proche</Badge>;
  } else if (taskCommits.length === 0 || (Date.now() - (taskCommits[0]?.timestamp || 0) > 86400000 * 3)) {
    smartBadge = <Badge variant="outline" className="text-gh-muted"><Activity className="w-3 h-3 mr-1 inline" />Peu d'activite</Badge>;
  } else {
    smartBadge = <Badge variant="success" className="bg-[#23863626] text-gh-success-text"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Bon rythme</Badge>;
  }

  return (
    <div className="flex flex-col transition-colors hover:bg-[#b3b3b30a] bg-gh-bg group">
      <div className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4" onClick={() => setExpanded((current) => !current)}>
        <button
          onClick={handleToggleComplete}
          className={cn("hidden sm:flex shrink-0 text-gh-muted hover:text-gh-blue transition-colors", isCompleted && "text-gh-success-text hover:text-gh-success-text/80")}
          aria-label={isCompleted ? "Marquer comme non terminee" : "Marquer comme terminee"}
        >
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0 flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2 w-full flex-wrap">
            <h3 className={`font-semibold text-sm truncate ${isCompleted ? "text-gh-muted line-through" : "text-gh-text"}`}>
              {task.title}
            </h3>
            {getPriorityBadge(task.priority)}
            {smartBadge}
          </div>
          {!expanded && taskCommits.length > 0 && (
            <div className="text-xs text-gh-muted flex items-center gap-1.5">
              <GitCommit className="w-3 h-3" />
              {taskCommits.length} commit(s)
            </div>
          )}
        </div>

        <div className="sm:w-24 shrink-0 flex items-center">
          <AvatarGroup members={assignees} />
        </div>

        <div className="sm:w-48 shrink-0 w-full">
          <div className="flex justify-between text-xs mb-1 sm:hidden">
            <span className="text-gh-muted">Progression</span>
            <span className="text-gh-text font-medium">{task.progress}%</span>
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar value={task.progress} className="h-1.5 flex-1" indicatorClassName={task.status === "critical" ? "bg-gh-danger" : task.status === "behind" ? "bg-[#d29922]" : "bg-gh-success-text"} />
            <span className="text-xs text-gh-text font-medium hidden sm:inline-block w-8 text-right">{task.progress}%</span>
          </div>
        </div>

        <div className={`sm:w-32 shrink-0 flex items-center gap-1.5 text-sm ${daysUntilDeadline < 0 && !isCompleted ? "text-gh-danger" : "text-gh-muted"}`}>
          <Calendar className="w-4 h-4" />
          <span className="text-xs">{task.deadline}</span>
        </div>

        <div className="hidden sm:flex shrink-0 pl-2 items-center justify-center">
          <ChevronDown className={cn("w-4 h-4 text-gh-muted transition-transform duration-300", expanded && "-rotate-180")} />
        </div>
      </div>

      <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none")}>
        <div className="overflow-hidden">
          <div className="border-t border-gh-border bg-[#161b22]/30 p-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gh-text">Mettre a jour la progression ({task.progress}%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={task.progress}
                  onChange={(event) => handleProgressChange(parseInt(event.target.value))}
                  className="flex-1 accent-gh-blue"
                />
                <Button variant="danger" size="sm" onClick={(event) => { event.stopPropagation(); onDelete(task.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gh-text uppercase tracking-wider mb-3">Historique des commits</h4>
              <div className="space-y-2">
                {taskCommits.map((commit) => {
                  const author = members.find((member) => member.id === commit.authorId);
                  return (
                    <div key={commit.id} className="flex gap-3 text-sm bg-gh-bg border border-gh-border p-2.5 rounded-md">
                      <GitCommit className="w-4 h-4 text-gh-muted shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gh-text text-xs">{author?.name}</span>
                          <span className="font-mono text-[10px] text-gh-blue">{commit.sha}</span>
                          <span className="text-[10px] text-gh-muted ml-auto">{commit.date}</span>
                        </div>
                        <p className="text-gh-text text-xs mb-1.5">{commit.message}</p>
                        <span className="text-[10px] font-medium text-gh-success-text bg-[#23863626] px-1.5 rounded-sm inline-block">
                          +{commit.contributionPercent}% progression
                        </span>
                      </div>
                    </div>
                  );
                })}
                {taskCommits.length === 0 && (
                  <p className="text-xs text-gh-muted">Aucun commit associe a cette tache.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
