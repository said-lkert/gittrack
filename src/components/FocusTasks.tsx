import { Task } from "../data/mock";
import { Card, ProgressBar } from "./ui";
import { AlertTriangle, Flame, Clock } from "lucide-react";

export function FocusTasks({ tasks }: { tasks: Task[] }) {
  // Filter for behind, critical, or incomplete tasks, take top 3
  const focusTasks = tasks
    .filter(t => t.status !== "completed")
    .sort((a, b) => {
      if (a.status === "critical" && b.status !== "critical") return -1;
      if (b.status === "critical" && a.status !== "critical") return 1;
      if (a.status === "behind" && b.status !== "behind") return -1;
      if (b.status === "behind" && a.status !== "behind") return 1;
      return a.progress - b.progress;
    })
    .slice(0, 3);

  return (
    <Card className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gh-border bg-gh-header flex items-center gap-2">
        <Flame className="w-4 h-4 text-gh-danger" />
        <h3 className="font-semibold text-sm text-gh-text">Focus Tasks</h3>
      </div>
      <div className="p-4 flex flex-col gap-4 flex-1 justify-center">
        {focusTasks.map(task => (
          <div key={task.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {task.status === "critical" && <AlertTriangle className="w-3.5 h-3.5 text-gh-danger" />}
                {task.status === "behind" && <Clock className="w-3.5 h-3.5 text-[#d29922]" />}
                <span className="text-sm font-medium text-gh-text truncate max-w-[180px]">{task.title}</span>
              </div>
              <span className="text-xs font-medium text-gh-muted">{task.progress}%</span>
            </div>
            <ProgressBar 
              value={task.progress} 
              className="h-1.5" 
              indicatorClassName={task.status === "critical" ? "bg-gh-danger" : task.status === "behind" ? "bg-[#d29922]" : "bg-gh-success-bg"}
            />
            <div className="text-[10px] text-gh-muted">
              Deadline: {task.deadline}
            </div>
          </div>
        ))}
        {focusTasks.length === 0 && (
          <div className="text-sm text-gh-muted text-center py-4">Aucune tâche critique.</div>
        )}
      </div>
    </Card>
  );
}
