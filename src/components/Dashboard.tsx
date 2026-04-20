import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Member, Task, Commit, Insight } from "../data/mock";
import { GitHubLiveData } from "../lib/github";
import { Project } from "../lib/store";
import { Button, ProgressBar, Avatar, Card } from "./ui";
import { MemberModal } from "./MemberModal";
import { RecommendationBox } from "./RecommendationBox";
import { CommitFeed } from "./CommitFeed";
import { TimeRemaining } from "./TimeRemaining";
import { FocusTasks } from "./FocusTasks";
import { TodaySummary } from "./TodaySummary";
import { GitHubLivePanel } from "./GitHubLivePanel";
import { PuterDashboardBrief } from "./PuterDashboardBrief";
import { CommitTaskSuggestion, PendingSuggestion } from "./CommitTaskSuggestion";

interface DashboardProps {
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  insights: Insight[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCommits: React.Dispatch<React.SetStateAction<Commit[]>>;
  githubLiveData: GitHubLiveData | null;
  githubLoading: boolean;
  githubError: string | null;
  currentProject: Project;
  pendingSuggestions?: PendingSuggestion[];
  onConfirmSuggestion?: (commitId: string, taskId: string) => void;
  onDismissSuggestion?: (commitId: string) => void;
}

export function Dashboard({ members, tasks, commits, insights, setTasks, setCommits, githubLiveData, githubLoading, githubError, currentProject, pendingSuggestions, onConfirmSuggestion, onDismissSuggestion }: DashboardProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Calculate global progress based on tasks
  const globalProgress = useMemo(() => {
    const totalWeight = tasks.reduce((acc, t) => acc + t.weight, 0);
    if (totalWeight === 0) return 0;
    const completedWeight = tasks.reduce((acc, t) => acc + (t.progress * t.weight / 100), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  }, [tasks]);
  const daysLeft = useMemo(() => {
    const end = new Date(currentProject.endDate).getTime();
    return Math.ceil((end - Date.now()) / (1000 * 3600 * 24));
  }, [currentProject.endDate]);

  const recommendationPayload = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status !== "completed");
    const overdueTasks = activeTasks.filter((task) => new Date(task.deadline).getTime() < Date.now());
    const behindTasks = activeTasks.filter((task) => task.status === "behind" || task.status === "critical");
    const blockedTasks = activeTasks.filter((task) => {
      const linkedCommits = commits.filter((commit) => commit.taskId === task.id);
      if (linkedCommits.length === 0) return true;
      const lastCommitAt = Math.max(...linkedCommits.map((commit) => commit.timestamp));
      return Date.now() - lastCommitAt > 3 * 24 * 60 * 60 * 1000;
    });
    const mostCriticalTask = overdueTasks[0] || behindTasks[0] || blockedTasks[0] || activeTasks[0] || null;
    const assigneeName = mostCriticalTask
      ? members.find((member) => mostCriticalTask.assigneeIds.includes(member.id))?.name || "l'equipe"
      : "l'equipe";

    const fallbackInsights: Insight[] = [];
    if (overdueTasks.length > 0) {
      fallbackInsights.push({
        id: "dashboard_overdue",
        type: "danger",
        message: `${overdueTasks.length} tache(s) ont depasse leur deadline sur ${currentProject.name}.`,
      });
    }
    if (blockedTasks.length > 0) {
      fallbackInsights.push({
        id: "dashboard_blocked",
        type: "warning",
        message: `${blockedTasks.length} tache(s) n'ont pas eu de commit recent et demandent une verification.`,
      });
    }
    if (daysLeft <= 7) {
      fallbackInsights.push({
        id: "dashboard_deadline",
        type: "info",
        message: `La fin de projet approche (${Math.max(daysLeft, 0)} jour(s)). Priorisez la livraison des sujets restants.`,
      });
    }

    return {
      insights: insights.length > 0 ? insights : fallbackInsights,
      nextAction: mostCriticalTask
        ? {
            message: `Traiter ${mostCriticalTask.title} avec ${assigneeName} pour reduire le risque immediat sur ${currentProject.name}.`,
            action: overdueTasks.length > 0 ? "Urgent" : blockedTasks.length > 0 ? "Deblocage" : "Execution",
          }
        : {
            message: `Initialiser le backlog de ${currentProject.name} et definir le premier chantier a lancer.`,
            action: "Kickoff",
          },
    };
  }, [commits, currentProject.name, daysLeft, insights, members, tasks]);

  const handleSimulateCommit = () => {
    const incompleteTasks = tasks.filter(t => t.progress < 100);
    if (incompleteTasks.length === 0) return;
    const task = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
    const authorId = task.assigneeIds[0] || members[0].id;

    const contrib = Math.floor(Math.random() * 15) + 5;
    const newProgress = Math.min(100, task.progress + contrib);
    const actualContrib = newProgress - task.progress;

    const newCommit = {
      id: Math.random().toString(36).substring(7),
      sha: Math.random().toString(16).substring(2, 9),
      authorId,
      taskId: task.id,
      message: `feat: update ${task.title.toLowerCase()}`,
      date: "À l'instant",
      timestamp: Date.now(),
      contributionPercent: actualContrib,
      type: "feat" as const
    };

    setCommits(prev => [newCommit, ...prev]);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: newProgress, status: newProgress === 100 ? "completed" : t.status } : t));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">

      {pendingSuggestions && onConfirmSuggestion && onDismissSuggestion && (
        <CommitTaskSuggestion
          suggestions={pendingSuggestions}
          commits={commits}
          tasks={tasks}
          onConfirm={onConfirmSuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gh-text">GitTrack Dashboard</h1>
        <Button variant="primary" onClick={handleSimulateCommit}>
          <Plus className="w-4 h-4" />
          Simuler un Commit
        </Button>
      </div>

      {/* Row 1: Global Progress & Time Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 md:col-span-2 flex flex-col justify-center">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-medium text-gh-text">Avancement Global</span>
            <span className="text-3xl font-light text-gh-text leading-none">{globalProgress}%</span>
          </div>
          <ProgressBar value={globalProgress} className="h-3" />
          <div className="text-xs text-gh-muted mt-3">
            {currentProject.projectType} • {currentProject.startDate} → {currentProject.endDate}
          </div>
        </Card>
        <div className="md:col-span-1">
          <TimeRemaining daysLeft={daysLeft} status={daysLeft < 0 ? "behind" : daysLeft <= 7 ? "on_track" : "ahead"} />
        </div>
      </div>

      {/* Row 2: Team Members (Single Line) */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {members.map(member => {
            const memberTasks = tasks.filter(t => t.assigneeIds.includes(member.id));
            const totalWeight = memberTasks.reduce((acc, t) => acc + t.weight, 0);
            const completedWeight = memberTasks.reduce((acc, t) => acc + (t.progress * t.weight / 100), 0);
            const progress = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);

            return (
              <Card 
                key={member.id} 
                className="p-3 cursor-pointer hover:border-gh-blue hover:ring-1 hover:ring-gh-blue transition-all flex flex-col justify-between gap-3"
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex items-start gap-3">
                  <Avatar src={member.avatar} alt={member.login} className="w-8 h-8 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gh-text truncate leading-tight">{member.name}</div>
                    <div className="text-[10px] text-gh-muted truncate mt-0.5">
                      {memberTasks.filter(t => t.status !== 'completed').length} tâche(s) active(s)
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-medium text-gh-muted">Progression</span>
                    <span className="text-xs font-semibold text-gh-text">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} className="h-1.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <GitHubLivePanel data={githubLiveData} loading={githubLoading} error={githubError} />

      <PuterDashboardBrief
        currentProjectName={currentProject.name}
        members={members}
        tasks={tasks}
        commits={commits}
      />

      {/* Row 3: Focus Tasks & Today Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FocusTasks tasks={tasks} />
        <TodaySummary commits={commits} tasks={tasks} members={members} />
      </div>

      {/* Row 4: Activity Highlights & Commits */}
      <CommitFeed commits={commits} tasks={tasks} members={members} />

      {/* Row 5: Recommendations & Next Action */}
      <RecommendationBox insights={recommendationPayload.insights} nextAction={recommendationPayload.nextAction} />

      {/* Modal */}
      {selectedMember && (
        <MemberModal 
          member={selectedMember} 
          tasks={tasks} 
          commits={commits} 
          onClose={() => setSelectedMember(null)} 
        />
      )}
    </div>
  );
}
