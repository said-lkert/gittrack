import React, { useMemo, useState } from "react";
import { Member, Task, Commit } from "../data/mock";
import { Card, Avatar, ProgressBar, Badge, Switch } from "./ui";
import { PuterInsightsPanel } from "./PuterInsightsPanel";
import { AIInterviewModal } from "./AIInterviewModal";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, BrainCircuit, Users, Target, Lightbulb, Activity, ArrowRight, ClipboardList, AlarmClock } from "lucide-react";
import { Button } from "./ui";
import { FormattedAIText } from "./FormattedAIText";

interface InsightsPageProps {
  currentProjectId: string;
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  onApplyInterviewTasks: (tasks: Task[]) => void;
  onOpenInterview?: () => void;
  monitorSummary?: string | null;
  monitorLastRunAt?: string | null;
  monitorSchedule: {
    enabled: boolean;
    time: string;
  };
  onUpdateMonitorSchedule: React.Dispatch<React.SetStateAction<{ enabled: boolean; time: string }>>;
}

function formatNextScheduledRun(time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const next = new Date();
  next.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InsightsPage({
  currentProjectId,
  currentProjectName,
  members,
  tasks,
  commits,
  onApplyInterviewTasks,
  onOpenInterview,
  monitorSummary,
  monitorLastRunAt,
  monitorSchedule,
  onUpdateMonitorSchedule,
}: InsightsPageProps) {
  const now = Date.now();
  const dayMs = 86400000;
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);

  // --- 1. Core Calculations ---
  const {
    projectProgress,
    velocityPerDay,
    overdueTasks,
    blockedTasks,
    inactiveMembers,
    teamWorkload,
    globalStatus,
    daysRemaining
  } = useMemo(() => {
    // Global Progress
    const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
    const currentProgress = tasks.reduce((sum, t) => sum + (t.progress * t.weight), 0) / (totalWeight || 1);

    // Velocity (based on commits in last 7 days)
    const recentCommits = commits.filter(c => c.timestamp > now - 7 * dayMs);
    const velocity7d = recentCommits.reduce((sum, c) => sum + c.contributionPercent, 0);
    const velocityPerDay = Math.max(velocity7d / 7, 0.5); // Minimum 0.5% per day to avoid Infinity

    // Task Analysis
    const overdueTasks = tasks.filter(t => new Date(t.deadline).getTime() < now && t.progress < 100);
    
    const blockedTasks = tasks.filter(t => {
      if (t.progress === 100) return false;
      const taskCommits = commits.filter(c => c.taskId === t.id);
      if (taskCommits.length === 0) return true;
      const lastCommit = Math.max(...taskCommits.map(c => c.timestamp));
      return (now - lastCommit) > 3 * dayMs; // No commits in 3 days
    });

    // Team Analysis
    const teamWorkload = members.map(m => {
      const memberCommits = commits.filter(c => c.authorId === m.id);
      const totalContrib = memberCommits.reduce((sum, c) => sum + c.contributionPercent, 0);
      const lastActive = memberCommits.length > 0 ? Math.max(...memberCommits.map(c => c.timestamp)) : 0;
      return { ...m, totalContrib, lastActive };
    }).sort((a, b) => b.totalContrib - a.totalContrib);

    const inactiveMembers = teamWorkload.filter(m => (now - m.lastActive) > 7 * dayMs);

    // Global Status
    let globalStatus: "ok" | "risk" | "problem" = "ok";
    if (overdueTasks.length > 0 || inactiveMembers.length > 1) globalStatus = "problem";
    else if (blockedTasks.length > 0 || teamWorkload[0]?.totalContrib > 50) globalStatus = "risk";

    // Estimation
    const remainingProgress = 100 - currentProgress;
    const daysRemaining = Math.ceil(remainingProgress / velocityPerDay);

    return {
      projectProgress: currentProgress,
      velocityPerDay,
      overdueTasks,
      blockedTasks,
      inactiveMembers,
      teamWorkload,
      globalStatus,
      daysRemaining
    };
  }, [tasks, commits, members, now, dayMs]);

  // --- 2. AI Summary & Recommendations ---
  const { aiSummary, recommendations } = useMemo(() => {
    const summary = [];
    const recs = [];

    // Status summary
    if (globalStatus === "ok") summary.push("Le projet avance à un bon rythme et semble sous contrôle.");
    else if (globalStatus === "risk") summary.push("Le projet présente quelques risques qui nécessitent votre attention.");
    else summary.push("Alerte : Le projet rencontre des problèmes critiques qui impactent la livraison.");

    // Task summary
    if (overdueTasks.length > 0) {
      summary.push(`${overdueTasks.length} tâche(s) sont actuellement en retard.`);
      recs.push(`Prioriser immédiatement la tâche "${overdueTasks[0].title}".`);
    }
    if (blockedTasks.length > 0) {
      summary.push(`${blockedTasks.length} tâche(s) semblent bloquées (aucune activité récente).`);
      recs.push(`Relancer l'équipe sur "${blockedTasks[0].title}" pour débloquer la situation.`);
    }

    // Team summary
    if (teamWorkload.length > 0) {
      const topContributor = teamWorkload[0];
      const totalTeamContrib = teamWorkload.reduce((sum, m) => sum + m.totalContrib, 0) || 1;
      const topPercent = (topContributor.totalContrib / totalTeamContrib) * 100;
      
      if (topPercent > 50) {
        summary.push(`Forte dépendance à ${topContributor.name} qui porte ${Math.round(topPercent)}% de l'effort récent.`);
        recs.push(`Rééquilibrer la charge de travail de ${topContributor.name} vers d'autres membres.`);
      }
    }

    if (inactiveMembers.length > 0) {
      summary.push(`${inactiveMembers.length} membre(s) n'ont pas d'activité récente.`);
      recs.push(`Vérifier si ${inactiveMembers[0].name} est bloqué(e) ou a besoin d'aide.`);
    }

    if (recs.length === 0) {
      recs.push("Maintenir le rythme actuel, aucune action corrective majeure n'est requise.");
    }

    return { aiSummary: summary, recommendations: recs };
  }, [globalStatus, overdueTasks, blockedTasks, teamWorkload, inactiveMembers]);

  return (
    <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gh-text flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-gh-blue" />
            Project Insights
          </h1>
          <Button
            variant="primary"
            onClick={() => {
              onOpenInterview?.();
              setIsInterviewOpen(true);
            }}
          >
            <ClipboardList className="w-4 h-4" />
            Interview AI
          </Button>
        </div>

        {(monitorSummary || monitorLastRunAt) && (
          <Card className="p-4 bg-gradient-to-r from-[#1f6feb10] to-transparent border-[#1f6feb30]" data-project-id={currentProjectId}>
            <div className="text-xs uppercase tracking-wider text-gh-muted mb-2">AI Monitoring</div>
            {monitorSummary && <div className="mb-2"><FormattedAIText text={monitorSummary} /></div>}
            {monitorLastRunAt && <div className="text-xs text-gh-muted">Derniere analyse: {new Date(monitorLastRunAt).toLocaleString("fr-FR")}</div>}
          </Card>
        )}

        <Card className="p-4 border-[#1f6feb30] bg-gradient-to-r from-[#1f6feb10] to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-[#1f6feb20] text-gh-blue">
                <AlarmClock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gh-text">Analyse AI planifiee</div>
                <div className="text-xs text-gh-muted">
                  Lance une analyse complete du projet chaque jour a l&apos;heure choisie et rattrape la derniere execution si vous ouvrez l&apos;app plus tard.
                </div>
              </div>
            </div>
            <Switch
              checked={monitorSchedule.enabled}
              onChange={(checked) => onUpdateMonitorSchedule((current) => ({ ...current, enabled: checked }))}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gh-muted mb-2">Heure quotidienne</label>
              <input
                type="time"
                value={monitorSchedule.time}
                onChange={(event) => onUpdateMonitorSchedule((current) => ({ ...current, time: event.target.value }))}
                className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
              />
            </div>
            <div className="text-sm text-gh-text">
              {monitorSchedule.enabled ? (
                <>
                  Prochaine verification automatique: <span className="text-gh-blue font-medium">{formatNextScheduledRun(monitorSchedule.time)}</span>
                </>
              ) : (
                <span className="text-gh-muted">Le monitoring journalier est desactive pour ce projet.</span>
              )}
            </div>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4 border-l-4 border-l-transparent" style={{ borderLeftColor: globalStatus === 'ok' ? '#238636' : globalStatus === 'risk' ? '#d29922' : '#da3633' }}>
            <div className={`p-3 rounded-full ${globalStatus === 'ok' ? 'bg-[#23863626] text-gh-success-text' : globalStatus === 'risk' ? 'bg-[#d2992226] text-[#d29922]' : 'bg-[#da363326] text-gh-danger'}`}>
              {globalStatus === 'ok' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs text-gh-muted uppercase tracking-wider font-semibold mb-1">Statut Global</p>
              <p className="text-xl font-bold text-gh-text capitalize">{globalStatus === 'ok' ? 'Sain' : globalStatus === 'risk' ? 'À Risque' : 'Critique'}</p>
            </div>
          </Card>
          
          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#1f6feb26] text-gh-blue">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gh-muted uppercase tracking-wider font-semibold mb-1">Fin Estimée</p>
              <p className="text-xl font-bold text-gh-text">~{daysRemaining} jours</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-gh-bg border border-gh-border text-gh-text">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gh-muted uppercase tracking-wider font-semibold mb-1">Vitesse Actuelle</p>
              <p className="text-xl font-bold text-gh-text">+{velocityPerDay.toFixed(1)}% / jour</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-3">
          <PuterInsightsPanel currentProjectName={currentProjectName} members={members} tasks={tasks} commits={commits} />
        </div>
        
        {/* LEFT COLUMN: Alerts & Analysis */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 2. PRIORITY ALERTS */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gh-danger" />
              Alertes Prioritaires
            </h2>
            <div className="space-y-2">
              {overdueTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-[#da363315] border border-[#da363340] p-3 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-gh-danger shrink-0" />
                  <span className="text-sm text-gh-text font-medium">Tâche en retard :</span>
                  <span className="text-sm text-gh-muted truncate">{t.title}</span>
                  <Badge variant="danger" className="ml-auto shrink-0">{t.progress}%</Badge>
                </div>
              ))}
              {blockedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-[#d2992215] border border-[#d2992240] p-3 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-[#d29922] shrink-0" />
                  <span className="text-sm text-gh-text font-medium">Tâche bloquée :</span>
                  <span className="text-sm text-gh-muted truncate">{t.title}</span>
                  <span className="text-xs text-[#d29922] ml-auto shrink-0">Aucun commit &gt; 3j</span>
                </div>
              ))}
              {inactiveMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-gh-bg border border-gh-border p-3 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-gh-muted shrink-0" />
                  <span className="text-sm text-gh-text font-medium">Membre inactif :</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar src={m.avatar} alt={m.name} className="w-4 h-4" />
                    <span className="text-sm text-gh-muted">{m.name}</span>
                  </div>
                  <span className="text-xs text-gh-muted ml-auto shrink-0">&gt; 7j sans activité</span>
                </div>
              ))}
              {overdueTasks.length === 0 && blockedTasks.length === 0 && inactiveMembers.length === 0 && (
                <div className="flex items-center gap-3 bg-[#23863615] border border-[#23863640] p-3 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-gh-success-text shrink-0" />
                  <span className="text-sm text-gh-success-text">Aucune alerte critique. L'équipe est sur la bonne voie !</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TEAM ANALYSIS */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-gh-blue" />
              Répartition de l'effort (30 derniers jours)
            </h2>
            <div className="space-y-4">
              {teamWorkload.map(m => {
                const totalTeamContrib = teamWorkload.reduce((sum, member) => sum + member.totalContrib, 0) || 1;
                const percent = Math.round((m.totalContrib / totalTeamContrib) * 100);
                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <div className="w-24 shrink-0 flex items-center gap-2">
                      <Avatar src={m.avatar} alt={m.name} className="w-6 h-6" />
                      <span className="text-sm text-gh-text font-medium truncate">{m.name}</span>
                    </div>
                    <div className="flex-1">
                      <ProgressBar value={percent} className="h-2" indicatorClassName={percent > 50 ? 'bg-gh-danger' : percent < 5 ? 'bg-gh-muted' : 'bg-gh-blue'} />
                    </div>
                    <div className="w-12 text-right text-sm text-gh-muted font-mono">{percent}%</div>
                  </div>
                );
              })}
            </div>
            {teamWorkload.length > 0 && (teamWorkload[0].totalContrib / (teamWorkload.reduce((s, m) => s + m.totalContrib, 0) || 1)) > 0.5 && (
              <div className="mt-4 p-3 bg-[#d2992215] border border-[#d2992240] rounded-md text-sm text-[#d29922] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Le travail est fortement concentré sur <strong>{teamWorkload[0].name}</strong>. Risque de goulot d'étranglement ou d'épuisement.</p>
              </div>
            )}
          </Card>

          {/* 4. TASK ANALYSIS */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-gh-success-text" />
              Analyse des Tâches
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gh-border rounded-lg p-4 bg-gh-bg">
                <h3 className="text-xs font-semibold text-gh-muted uppercase mb-3">Tâches à risque</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'behind' || t.status === 'critical').map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm">
                      <span className="text-gh-text truncate pr-2">{t.title}</span>
                      <Badge variant={t.status === 'critical' ? 'danger' : 'warning'}>{t.progress}%</Badge>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'behind' || t.status === 'critical').length === 0 && (
                    <span className="text-sm text-gh-muted">Aucune tâche à risque.</span>
                  )}
                </div>
              </div>
              <div className="border border-gh-border rounded-lg p-4 bg-gh-bg">
                <h3 className="text-xs font-semibold text-gh-muted uppercase mb-3">Tâches saines</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'on_track' || t.status === 'completed').slice(0, 4).map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm">
                      <span className="text-gh-text truncate pr-2">{t.title}</span>
                      <Badge variant="success">{t.progress}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: AI Summary & Recommendations */}
        <div className="space-y-6">
          {/* 7. AI SUMMARY */}
          <Card className="p-5 bg-gradient-to-b from-[#1f6feb10] to-transparent border-[#1f6feb30]">
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider flex items-center gap-2 mb-4">
              <BrainCircuit className="w-4 h-4 text-gh-blue" />
              Résumé IA
            </h2>
            <div className="space-y-3">
              {aiSummary.map((text, i) => (
                <p key={i} className="text-sm text-gh-text leading-relaxed flex items-start gap-2">
                  <span className="text-gh-blue mt-1">•</span>
                  {text}
                </p>
              ))}
            </div>
          </Card>

          {/* 8. RECOMMENDATIONS */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#d29922]" />
              Actions Recommandées
            </h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gh-bg border border-gh-border rounded-md group hover:border-gh-muted transition-colors cursor-default">
                  <ArrowRight className="w-4 h-4 text-gh-muted group-hover:text-gh-blue shrink-0 mt-0.5 transition-colors" />
                  <span className="text-sm text-gh-text">{rec}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

      {isInterviewOpen && (
        <AIInterviewModal
          currentProjectName={currentProjectName}
          members={members}
          tasks={tasks}
          commits={commits}
          onClose={() => setIsInterviewOpen(false)}
          onApply={onApplyInterviewTasks}
        />
      )}
    </div>
  );
}
