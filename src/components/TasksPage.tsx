import React, { useState } from "react";
import { Task, Commit, Member } from "../data/mock";
import { Button, Card, Avatar } from "./ui";
import { Plus, Filter, Users, TriangleAlert, Trash2 } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { AddTaskModal } from "./AddTaskModal";

interface TasksPageProps {
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCommits: React.Dispatch<React.SetStateAction<Commit[]>>;
}

export function TasksPage({ members, tasks, commits, setTasks }: TasksPageProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);

  const filteredTasks = tasks.filter((task) => {
    if (filterMember !== "all" && !task.assigneeIds.includes(filterMember)) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "completed" && task.progress !== 100) return false;
      if (filterStatus === "in_progress" && (task.progress === 100 || task.progress === 0)) return false;
      if (filterStatus === "behind" && task.status !== "behind" && task.status !== "critical") return false;
    }
    return true;
  });

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setTaskPendingDeletion(null);
  };

  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const tasksByMember: Record<string, Task[]> = { unassigned: [] };
  members.forEach((member) => {
    tasksByMember[member.id] = [];
  });

  filteredTasks.forEach((task) => {
    if (task.assigneeIds.length === 0) {
      tasksByMember.unassigned.push(task);
      return;
    }

    task.assigneeIds.forEach((id) => {
      if (tasksByMember[id]) {
        tasksByMember[id].push(task);
      }
    });
  });

  return (
    <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gh-text">Project Tasks</h1>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nouvelle tache
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-gh-card border border-gh-border p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gh-muted">
          <Filter className="w-4 h-4" />
          <span>Filtres :</span>
        </div>
        <select
          value={filterMember}
          onChange={(event) => setFilterMember(event.target.value)}
          className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue"
        >
          <option value="all">Tous les membres</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue"
        >
          <option value="all">Tous les statuts</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Termine</option>
          <option value="behind">En retard</option>
        </select>
      </div>

      <div className="space-y-8">
        {members.map((member) => {
          const memberTasks = tasksByMember[member.id];
          if (filterMember !== "all" && filterMember !== member.id) return null;
          if (memberTasks.length === 0) return null;

          return (
            <div key={member.id} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <Avatar src={member.avatar} alt={member.name} className="w-6 h-6 border bg-gh-bg" />
                <h2 className="text-sm font-semibold text-gh-text">{member.name}</h2>
                <span className="text-xs bg-gh-border text-gh-muted px-2 py-0.5 rounded-full">{memberTasks.length}</span>
              </div>
              <Card className="overflow-hidden">
                <div className="divide-y divide-gh-border">
                  {memberTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      commits={commits}
                      onUpdate={handleUpdateTask}
                      onDelete={(taskId) => {
                        const candidate = tasks.find((item) => item.id === taskId) || null;
                        setTaskPendingDeletion(candidate);
                      }}
                    />
                  ))}
                </div>
              </Card>
            </div>
          );
        })}

        {filterMember === "all" && tasksByMember.unassigned.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-6 h-6 rounded-full border border-gh-border border-dashed flex items-center justify-center text-gh-muted bg-gh-bg">
                <Users className="w-3 h-3" />
              </div>
              <h2 className="text-sm font-semibold text-gh-text tracking-wide text-gh-muted">Non assigne</h2>
              <span className="text-xs bg-gh-border text-gh-muted px-2 py-0.5 rounded-full">{tasksByMember.unassigned.length}</span>
            </div>
            <Card className="overflow-hidden">
              <div className="divide-y divide-gh-border">
                {tasksByMember.unassigned.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    commits={commits}
                    onUpdate={handleUpdateTask}
                    onDelete={(taskId) => {
                      const candidate = tasks.find((item) => item.id === taskId) || null;
                      setTaskPendingDeletion(candidate);
                    }}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gh-muted border border-dashed border-gh-border rounded-xl">
            Aucune tache ne correspond a vos filtres.
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddTaskModal
          members={members}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddTask}
        />
      )}

      {taskPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gh-border bg-gh-bg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gh-border bg-gh-header flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#da363326] text-gh-danger">
                <TriangleAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gh-text">Confirmer la suppression</div>
                <div className="text-xs text-gh-muted">Cette action supprimera la tache du projet et de l'affichage.</div>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-sm text-gh-text">
                Voulez-vous vraiment supprimer la tache <span className="font-semibold">{taskPendingDeletion.title}</span> ?
              </div>
              <div className="text-xs text-gh-muted">
                Recommendation: supprimez-la seulement si elle n'est plus utile dans le plan du projet.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gh-border flex justify-end gap-2 bg-gh-header/60">
              <Button variant="ghost" onClick={() => setTaskPendingDeletion(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => handleDeleteTask(taskPendingDeletion.id)}>
                <Trash2 className="w-4 h-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
