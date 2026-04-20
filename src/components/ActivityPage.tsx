import React, { useState, useMemo } from "react";
import { Member, Task, Commit } from "../data/mock";
import { Card, Avatar, Badge, Button } from "./ui";
import { Filter, GitCommit, Bug, Sparkles, FileText, Wrench, ChevronDown, ChevronUp, Flame, Moon, AlertTriangle, Rocket, Activity as ActivityIcon, TestTube } from "lucide-react";

interface ActivityPageProps {
  members: Member[];
  tasks: Task[];
  commits: Commit[];
}

const getIconForType = (type?: string) => {
  switch (type) {
    case 'feat': return <Sparkles className="w-4 h-4 text-gh-success-text" />;
    case 'fix': return <Bug className="w-4 h-4 text-gh-danger" />;
    case 'docs': return <FileText className="w-4 h-4 text-gh-blue" />;
    case 'test': return <TestTube className="w-4 h-4 text-[#d29922]" />;
    case 'chore': return <Wrench className="w-4 h-4 text-gh-muted" />;
    default: return <GitCommit className="w-4 h-4 text-gh-muted" />;
  }
};

export function ActivityPage({ members, tasks, commits }: ActivityPageProps) {
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterTask, setFilterTask] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<number>(30); // days
  const [sortBy, setSortBy] = useState<"recent" | "impact">("recent");

  // Filter commits
  const filteredCommits = useMemo(() => {
    const cutoff = Date.now() - filterPeriod * 86400000;
    let filtered = commits.filter(c => c.timestamp >= cutoff);
    if (filterMember !== "all") filtered = filtered.filter(c => c.authorId === filterMember);
    if (filterTask !== "all") filtered = filtered.filter(c => c.taskId === filterTask);

    if (sortBy === "recent") {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      filtered.sort((a, b) => b.contributionPercent - a.contributionPercent);
    }
    return filtered;
  }, [commits, filterMember, filterTask, filterPeriod, sortBy]);

  // Smart Grouping (by Day -> Author -> Task)
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, Commit[]>>> = {};
    
    filteredCommits.forEach(commit => {
      // Simple day grouping (in a real app, use proper date formatting)
      const dateObj = new Date(commit.timestamp);
      const dayKey = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      
      if (!groups[dayKey]) groups[dayKey] = {};
      if (!groups[dayKey][commit.authorId]) groups[dayKey][commit.authorId] = {};
      if (!groups[dayKey][commit.authorId][commit.taskId]) groups[dayKey][commit.authorId][commit.taskId] = [];
      
      groups[dayKey][commit.authorId][commit.taskId].push(commit);
    });

    return groups;
  }, [filteredCommits]);

  // Top Summary Stats
  const stats = useMemo(() => {
    const oneDayAgo = Date.now() - 86400000;
    const todayCommits = commits.filter(c => c.timestamp >= oneDayAgo);
    
    const authorCounts: Record<string, number> = {};
    const taskProgress: Record<string, number> = {};
    
    todayCommits.forEach(c => {
      authorCounts[c.authorId] = (authorCounts[c.authorId] || 0) + 1;
      taskProgress[c.taskId] = (taskProgress[c.taskId] || 0) + c.contributionPercent;
    });

    let topAuthorId = "";
    let maxCommits = 0;
    Object.entries(authorCounts).forEach(([id, count]) => {
      if (count > maxCommits) { maxCommits = count; topAuthorId = id; }
    });

    let topTaskId = "";
    let maxProgress = 0;
    Object.entries(taskProgress).forEach(([id, prog]) => {
      if (prog > maxProgress) { maxProgress = prog; topTaskId = id; }
    });

    return {
      todayCount: todayCommits.length,
      topAuthor: members.find(m => m.id === topAuthorId),
      topTask: tasks.find(t => t.id === topTaskId),
      activityLevel: todayCommits.length > 10 ? "Élevée" : todayCommits.length > 3 ? "Normale" : "Faible"
    };
  }, [commits, members, tasks]);

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-gh-text">Activity</h1>
        
        <div className="flex flex-wrap items-center gap-3 bg-gh-card border border-gh-border p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gh-muted">
            <Filter className="w-4 h-4" />
            <span>Filtres :</span>
          </div>
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue">
            <option value="all">Tous les membres</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={filterTask} onChange={e => setFilterTask(e.target.value)} className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue max-w-[200px] truncate">
            <option value="all">Toutes les tâches</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(Number(e.target.value))} className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue">
            <option value={1}>Dernières 24h</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>
          <div className="flex-1"></div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-gh-blue">
            <option value="recent">Plus récent d'abord</option>
            <option value="impact">Plus d'impact d'abord</option>
          </select>
        </div>
      </div>

      {/* Top Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-gh-muted uppercase tracking-wider font-semibold">Commits (24h)</span>
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-gh-blue" />
            <span className="text-2xl font-bold text-gh-text">{stats.todayCount}</span>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-gh-muted uppercase tracking-wider font-semibold">Activité</span>
          <div className="flex items-center gap-2">
            {stats.activityLevel === "Élevée" ? <Flame className="w-5 h-5 text-gh-danger" /> : stats.activityLevel === "Normale" ? <ActivityIcon className="w-5 h-5 text-gh-success-text" /> : <Moon className="w-5 h-5 text-gh-muted" />}
            <span className="text-lg font-bold text-gh-text">{stats.activityLevel}</span>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-gh-muted uppercase tracking-wider font-semibold">Membre actif</span>
          <div className="flex items-center gap-2">
            {stats.topAuthor ? (
              <>
                <Avatar src={stats.topAuthor.avatar} alt={stats.topAuthor.name} className="w-6 h-6" />
                <span className="text-sm font-semibold text-gh-text truncate">{stats.topAuthor.name}</span>
              </>
            ) : <span className="text-sm text-gh-muted">Aucun</span>}
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-gh-muted uppercase tracking-wider font-semibold">Tâche focus</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gh-text truncate">{stats.topTask?.title || "Aucune"}</span>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gh-border">
        {Object.entries(groupedActivities).map(([day, authorsMap]) => (
          <div key={day} className="relative z-10">
            <div className="sticky top-0 z-10 flex items-center justify-center mb-6">
              <span className="bg-gh-bg border border-gh-border text-gh-text text-xs font-semibold px-3 py-1 rounded-full capitalize shadow-sm">
                {day}
              </span>
            </div>
            
            <div className="space-y-6">
              {Object.entries(authorsMap).map(([authorId, tasksMap]) => {
                const author = members.find(m => m.id === authorId);
                
                return Object.entries(tasksMap).map(([taskId, groupCommits]) => {
                  const task = tasks.find(t => t.id === taskId);
                  const typedCommits = groupCommits as Commit[];
                  const totalContrib = typedCommits.reduce((sum, c) => sum + c.contributionPercent, 0);
                  
                  return (
                    <ActivityGroup 
                      key={`${day}-${authorId}-${taskId}`}
                      author={author}
                      task={task}
                      commits={typedCommits}
                      totalContrib={totalContrib}
                    />
                  );
                });
              })}
            </div>
          </div>
        ))}

        {filteredCommits.length === 0 && (
          <div className="relative z-10 text-center py-12 text-gh-muted bg-gh-card border border-gh-border rounded-lg">
            Aucune activité trouvée pour ces filtres.
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityGroup({ author, task, commits, totalContrib }: { key?: React.Key, author?: Member, task?: Task, commits: Commit[], totalContrib: number }) {
  const [expanded, setExpanded] = useState(false);
  
  let badge = null;
  if (totalContrib >= 20) {
    badge = <Badge variant="success" className="bg-[#23863626] text-gh-success-text border-gh-success-text/30"><Rocket className="w-3 h-3 mr-1 inline"/>Forte contribution</Badge>;
  } else if (!task) {
    badge = <Badge variant="warning" className="bg-[#d2992226] text-[#d29922] border-[#d29922]/30"><AlertTriangle className="w-3 h-3 mr-1 inline"/>Hors tâche</Badge>;
  }

  return (
    <div className="relative flex items-start gap-4 md:gap-8 group">
      {/* Timeline dot */}
      <div className="absolute left-5 md:left-1/2 -translate-x-1/2 mt-1.5 w-3 h-3 rounded-full bg-gh-border border-2 border-gh-bg group-hover:bg-gh-blue transition-colors z-10" />
      
      {/* Content Card */}
      <Card className="flex-1 ml-10 md:ml-0 md:w-[calc(50%-2rem)] md:even:ml-auto md:odd:mr-auto p-0 overflow-hidden transition-colors hover:border-gh-muted/50">
        <div 
          className="p-4 cursor-pointer flex flex-col gap-3"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar src={author?.avatar || ""} alt={author?.name || ""} className="w-6 h-6" />
              <span className="font-semibold text-sm text-gh-text">{author?.name}</span>
              <span className="text-sm text-gh-muted">a contribué à</span>
            </div>
            <div className="flex items-center gap-2">
              {badge}
              {expanded ? <ChevronUp className="w-4 h-4 text-gh-muted" /> : <ChevronDown className="w-4 h-4 text-gh-muted" />}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-gh-bg text-gh-text font-medium">
              {task?.title || "Tâche inconnue"}
            </Badge>
            <span className="text-sm font-bold text-gh-success-text bg-[#23863626] px-2 py-0.5 rounded-md">
              +{totalContrib}%
            </span>
            <span className="text-xs text-gh-muted ml-auto">
              {commits.length} commit{commits.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gh-border bg-[#161b22]/30 p-4 space-y-3">
            {commits.map(commit => (
              <div key={commit.id} className="flex gap-3 text-sm">
                <div className="mt-0.5 shrink-0">
                  {getIconForType(commit.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-gh-blue bg-[#1f6feb26] px-1.5 rounded-sm">{commit.sha}</span>
                    <span className="text-[10px] text-gh-muted ml-auto">{new Date(commit.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-gh-text text-sm mb-1.5">{commit.message}</p>
                  
                  {commit.filesModified && commit.filesModified.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {commit.filesModified.map((file, i) => (
                        <span key={i} className="text-[10px] text-gh-muted bg-gh-bg border border-gh-border px-1.5 py-0.5 rounded-sm truncate max-w-[200px]">
                          {file}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
