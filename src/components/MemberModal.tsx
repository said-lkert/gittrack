import React from "react";
import { Member, Task, Commit } from "../data/mock";
import { Avatar, Badge, ProgressBar } from "./ui";
import { X, GitCommit, CheckCircle2, Circle, AlertCircle } from "lucide-react";

export function MemberModal({ 
  member, 
  tasks, 
  commits, 
  onClose 
}: { 
  member: Member; 
  tasks: Task[]; 
  commits: Commit[]; 
  onClose: () => void;
}) {
  const memberTasks = tasks.filter(t => t.assigneeIds.includes(member.id));
  const memberCommits = commits.filter(c => c.authorId === member.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gh-bg border border-gh-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gh-border flex items-start justify-between bg-gh-header">
          <div className="flex items-center gap-4">
            <Avatar src={member.avatar} alt={member.login} className="w-14 h-14" />
            <div>
              <h2 className="text-xl font-semibold text-gh-text">{member.name}</h2>
              <p className="text-sm text-gh-muted">@{member.login}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gh-muted hover:text-gh-text transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gh-card border border-gh-border rounded-lg p-4">
              <div className="text-sm text-gh-muted mb-1">Contribution Globale</div>
              <div className="text-2xl font-semibold text-gh-text">{member.contribution}%</div>
            </div>
            <div className="bg-gh-card border border-gh-border rounded-lg p-4">
              <div className="text-sm text-gh-muted mb-1">Commits Récents</div>
              <div className="text-2xl font-semibold text-gh-text">{memberCommits.length}</div>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-sm font-semibold text-gh-text mb-3 uppercase tracking-wider">Tâches Assignées</h3>
            <div className="space-y-3">
              {memberTasks.length > 0 ? memberTasks.map(task => (
                <div key={task.id} className="bg-gh-card border border-gh-border rounded-lg p-3 flex items-center gap-3">
                  {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-gh-success-text shrink-0" /> :
                   task.status === 'behind' ? <AlertCircle className="w-5 h-5 text-gh-danger shrink-0" /> :
                   <Circle className="w-5 h-5 text-gh-muted shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-gh-muted line-through' : 'text-gh-text'}`}>
                        {task.title}
                      </span>
                      <span className="text-xs text-gh-muted">{task.progress}%</span>
                    </div>
                    <ProgressBar value={task.progress} className="h-1.5" />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gh-muted">Aucune tâche assignée.</p>
              )}
            </div>
          </div>

          {/* Commits */}
          <div>
            <h3 className="text-sm font-semibold text-gh-text mb-3 uppercase tracking-wider">Activité Récente</h3>
            <div className="space-y-3">
              {memberCommits.length > 0 ? memberCommits.map(commit => {
                const task = tasks.find(t => t.id === commit.taskId);
                return (
                  <div key={commit.id} className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <GitCommit className="w-4 h-4 text-gh-muted" />
                    </div>
                    <div className="flex-1 bg-gh-card border border-gh-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gh-blue">{commit.sha}</span>
                        <span className="text-xs text-gh-muted">{commit.date}</span>
                      </div>
                      <p className="text-gh-text mb-2">{commit.message}</p>
                      {task && (
                        <Badge variant="outline" className="text-[10px]">
                          {task.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-gh-muted">Aucun commit récent.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
