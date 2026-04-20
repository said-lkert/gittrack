/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { TasksPage } from "./components/TasksPage";
import { ActivityPage } from "./components/ActivityPage";
import { InsightsPage } from "./components/InsightsPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ProjectPicker } from "./components/ProjectPicker";
import { ProjectCreationWizard } from "./components/ProjectCreationWizard";
import { MonitorSnapshot, runPuterMonitoringAnalysis, suggestTaskForCommit } from "./lib/aiContext";
import { Commit, Member, initialCommits, initialInsights, initialMembers, initialTasks, Task } from "./data/mock";
import { fetchGitHubLiveData, GitHubLiveData, readCachedGitHubLiveData, subscribeToGitHubLiveUpdates } from "./lib/github";
import { buildHttpError, readJsonSafe } from "./lib/http";
import { useAppStore } from "./lib/store";
import { PendingSuggestion } from "./components/CommitTaskSuggestion";
import { Menu } from "lucide-react";

type MonitorSchedule = {
  enabled: boolean;
  time: string;
};

const DEFAULT_MONITOR_SCHEDULE: MonitorSchedule = {
  enabled: false,
  time: "08:00",
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
}

function getLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyRunTarget(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const target = new Date(date);
  target.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return target;
}

function getNextDailyRun(date: Date, time: string) {
  const target = getDailyRunTarget(date, time);
  if (target.getTime() > date.getTime()) {
    return target;
  }

  const next = new Date(target);
  next.setDate(next.getDate() + 1);
  return next;
}

function readStoredMonitorSchedule(projectId: string): MonitorSchedule {
  if (typeof window === "undefined") {
    return DEFAULT_MONITOR_SCHEDULE;
  }

  try {
    const stored = window.localStorage.getItem(`gittrack_ai_monitor_schedule_${projectId}`);
    if (!stored) return DEFAULT_MONITOR_SCHEDULE;
    const parsed = JSON.parse(stored) as Partial<MonitorSchedule>;
    return {
      enabled: Boolean(parsed.enabled),
      time: typeof parsed.time === "string" && parsed.time ? parsed.time : DEFAULT_MONITOR_SCHEDULE.time,
    };
  } catch {
    return DEFAULT_MONITOR_SCHEDULE;
  }
}

function writeStoredMonitorSchedule(projectId: string, schedule: MonitorSchedule) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`gittrack_ai_monitor_schedule_${projectId}`, JSON.stringify(schedule));
}

function normalizeProject(project: any) {
  return {
    ...project,
    createdAt: typeof project.createdAt === "number" ? project.createdAt : new Date(project.createdAt).getTime(),
    lastAccessed: typeof project.lastAccessed === "number" ? project.lastAccessed : new Date(project.lastAccessed).getTime(),
    members: Array.isArray(project.members) ? project.members : [],
    tasks: Array.isArray(project.tasks) ? project.tasks : [],
    commits: Array.isArray(project.commits) ? project.commits : [],
    settings: project.settings || {
      aiEnabled: true,
      alertThreshold: 3,
    },
  };
}

export default function App() {
  const { state, currentProject, logout, hydrateSession, addProject, updateProjectTasks, updateProjectCommits, selectProject } = useAppStore();

  const [currentView, setCurrentView] = useState<"dashboard" | "tasks" | "activity" | "insights" | "settings">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [members] = useState(initialMembers);
  const [tasks, setTasks] = useState(initialTasks);
  const [commits, setCommits] = useState(initialCommits);
  const [insights, setInsights] = useState(initialInsights);
  const [githubLiveData, setGitHubLiveData] = useState<GitHubLiveData | null>(null);
  const [githubLoading, setGitHubLoading] = useState(true);
  const [githubError, setGitHubError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [monitorSnapshot, setMonitorSnapshot] = useState<MonitorSnapshot | null>(null);
  const [monitorSchedule, setMonitorSchedule] = useState<MonitorSchedule>(DEFAULT_MONITOR_SCHEDULE);
  const githubLiveDataRef = useRef<GitHubLiveData | null>(null);

  const updateMonitorSchedule: React.Dispatch<React.SetStateAction<MonitorSchedule>> = (value) => {
    setMonitorSchedule((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (currentProject?.id) {
        writeStoredMonitorSchedule(currentProject.id, next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!currentProject) {
      setTasks(initialTasks);
      setCommits(initialCommits);
      setInsights(initialInsights);
      setMonitorSnapshot(null);
      setMonitorSchedule(DEFAULT_MONITOR_SCHEDULE);
      return;
    }

    setTasks(Array.isArray(currentProject.tasks) ? currentProject.tasks : []);
    setCommits(Array.isArray(currentProject.commits) ? currentProject.commits : []);
    setMonitorSchedule(readStoredMonitorSchedule(currentProject.id));

    try {
      const stored = localStorage.getItem(`gittrack_ai_monitor_${currentProject.id}`);
      if (stored) {
        const snapshot = JSON.parse(stored) as MonitorSnapshot;
        setMonitorSnapshot(snapshot);
        setInsights(snapshot.insights.length > 0 ? snapshot.insights : initialInsights);
      } else {
        setMonitorSnapshot(null);
        setInsights(initialInsights);
      }
    } catch {
      setMonitorSnapshot(null);
      setInsights(initialInsights);
    }
  }, [currentProject?.id]);

  const activeRepoUrl = useMemo(() => currentProject?.repoUrl || null, [currentProject]);

  const effectiveMembers = useMemo<Member[]>(() => {
    if (!githubLiveData || githubLiveData.contributors.length === 0) {
      return currentProject ? [] : members;
    }

    const totalContributions = githubLiveData.contributors.reduce((sum, contributor) => sum + contributor.totalContributions, 0) || 1;

    return githubLiveData.contributors.map((contributor, index) => ({
      id: `gh_${contributor.login}`,
      login: contributor.login,
      name: contributor.login,
      avatar: contributor.avatar,
      role: index === 0 ? "Lead Contributor" : contributor.status === "active" ? "Contributor" : "Observer",
      contribution: Math.round((contributor.totalContributions / totalContributions) * 100),
      commitTypes: {
        feat: contributor.recentCommits,
        fix: 0,
        other: Math.max(contributor.totalContributions - contributor.recentCommits, 0),
      },
    }));
  }, [githubLiveData, members]);

  const effectiveTasks = tasks;

  const effectiveCommits = commits;

  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
  const processedShasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentProject || !githubLiveData || githubLiveData.commits.length === 0) return;

    const knownShas = new Set(commits.map((c) => c.sha));
    const newLiveCommits = githubLiveData.commits.filter(
      (lc) => {
        const sha = lc.sha.slice(0, 7);
        return !knownShas.has(sha) && !processedShasRef.current.has(sha);
      }
    );
    if (newLiveCommits.length === 0) return;

    const newCommits: Commit[] = newLiveCommits.map((lc) => {
      const sha = lc.sha.slice(0, 7);
      processedShasRef.current.add(sha);
      return {
        id: `live_${lc.sha}`,
        sha,
        authorId: `gh_${slugify(lc.author)}`,
        taskId: "",
        message: lc.message,
        date: lc.date ? new Date(lc.date).toLocaleString("fr-FR") : "Date inconnue",
        timestamp: lc.date ? new Date(lc.date).getTime() : Date.now(),
        contributionPercent: 5,
        type: lc.message.startsWith("feat:") ? "feat"
          : lc.message.startsWith("fix:") ? "fix"
          : lc.message.startsWith("docs:") ? "docs"
          : lc.message.startsWith("test:") ? "test"
          : lc.message.startsWith("chore:") ? "chore"
          : "other",
      };
    });

    setProjectCommits((prev) => [...newCommits, ...prev]);

    newCommits.forEach((commit) => {
      suggestTaskForCommit({
        commitMessage: commit.message,
        commitSha: commit.sha,
        tasks: effectiveTasks,
        projectName: currentProject.name,
      }).then((suggestedTaskId) => {
        if (suggestedTaskId) {
          setPendingSuggestions((prev) => [...prev, { commitId: commit.id, suggestedTaskId }]);
        }
      });
    });
  }, [githubLiveData, currentProject?.id]);

  useEffect(() => {
    githubLiveDataRef.current = githubLiveData;
  }, [githubLiveData]);

  useEffect(() => {
    if (!currentProject?.id || !state.user) {
      setMonitorSnapshot(null);
      return;
    }

    let active = true;
    const storageKey = `gittrack_ai_monitor_${currentProject.id}`;

    const hydrateStored = () => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      try {
        return JSON.parse(stored) as MonitorSnapshot;
      } catch {
        return null;
      }
    };

    const runAnalysis = async () => {
      const stored = hydrateStored();
      if (stored && active) {
        setMonitorSnapshot(stored);
        setInsights(stored.insights.length > 0 ? stored.insights : initialInsights);
      }

      try {
        const snapshot = await runPuterMonitoringAnalysis({
          currentProjectName: currentProject.name,
          members: effectiveMembers,
          tasks: effectiveTasks,
          commits: effectiveCommits,
        });
        if (!active) return;
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
        setMonitorSnapshot(snapshot);
        setInsights(snapshot.insights.length > 0 ? snapshot.insights : initialInsights);
      } catch {
        if (!active || !stored) return;
        setMonitorSnapshot(stored);
        setInsights(stored.insights.length > 0 ? stored.insights : initialInsights);
      }
    };

    const evaluateSchedule = async () => {
      const stored = hydrateStored();
      if (stored && active) {
        setMonitorSnapshot(stored);
        setInsights(stored.insights.length > 0 ? stored.insights : initialInsights);
      }

      if (!monitorSchedule.enabled) {
        return;
      }

      const now = new Date();
      const target = getDailyRunTarget(now, monitorSchedule.time);
      if (now.getTime() < target.getTime()) return;

      if (stored) {
        const lastRunAt = new Date(stored.lastRunAt);
        const lastRunDateKey = getLocalDateKey(lastRunAt);
        const todayKey = getLocalDateKey(now);
        if (lastRunDateKey === todayKey && lastRunAt.getTime() >= target.getTime()) {
          return;
        }
      }

      await runAnalysis();
    };

    let intervalId: number | null = null;
    let timeoutId: number | null = null;

    const schedulePreciseTick = () => {
      if (!monitorSchedule.enabled) return;
      const now = new Date();
      const nextRun = getNextDailyRun(now, monitorSchedule.time);
      const delay = Math.max(nextRun.getTime() - now.getTime(), 1_000);

      timeoutId = window.setTimeout(() => {
        void evaluateSchedule();
        intervalId = window.setInterval(() => {
          void evaluateSchedule();
        }, 60_000);
      }, delay);
    };

    void evaluateSchedule();
    if (monitorSchedule.enabled) {
      intervalId = window.setInterval(() => {
        void evaluateSchedule();
      }, 60_000);
      schedulePreciseTick();
    }

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [currentProject?.id, currentProject?.name, effectiveCommits, effectiveMembers, effectiveTasks, monitorSchedule.enabled, monitorSchedule.time, state.user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("authError");
    if (error) {
      setAuthError(error);
      params.delete("authError");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch("/auth/me");
        if (!active) return;
        const data = await readJsonSafe(response);

        if (response.ok) {
          hydrateSession({
            user: data.user,
            projects: Array.isArray(data.projects) ? data.projects.map(normalizeProject) : [],
            providers: Array.isArray(data.providers) ? data.providers : [],
          });
        } else {
          hydrateSession({ user: null, projects: [] });
        }
      } catch {
        if (active) {
          hydrateSession({ user: null, projects: [] });
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadGitHubData = async () => {
      if (!state.user || !currentProject) {
        if (active) {
          setGitHubLiveData(null);
          setGitHubError(null);
          setGitHubLoading(false);
        }
        return;
      }

      const cached = readCachedGitHubLiveData(activeRepoUrl);
      const hasVisibleData = Boolean(githubLiveDataRef.current || cached);
      if (active) {
        if (cached) {
          setGitHubLiveData(cached);
        } else if (!githubLiveDataRef.current) {
          setGitHubLiveData(null);
        }
      }
      setGitHubLoading(!hasVisibleData);

      try {
        const liveData = await fetchGitHubLiveData(activeRepoUrl);
        if (!active) return;
        setGitHubLiveData(liveData);
        setGitHubError(null);
      } catch (error) {
        if (!active) return;
        if (!hasVisibleData) {
          setGitHubError(error instanceof Error ? error.message : "Unable to load GitHub data.");
        }
      } finally {
        if (active) {
          setGitHubLoading(false);
        }
      }
    };

    void loadGitHubData();
    const unsubscribe = subscribeToGitHubLiveUpdates(() => {
      void loadGitHubData();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeRepoUrl, currentProject?.id, state.user?.id]);

  const setProjectTasks: React.Dispatch<React.SetStateAction<Task[]>> = (value) => {
    setTasks((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (currentProject) {
        updateProjectTasks(currentProject.id, next);
      }
      return next;
    });
  };

  const setProjectCommits: React.Dispatch<React.SetStateAction<Commit[]>> = (value) => {
    setCommits((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (currentProject) {
        updateProjectCommits(currentProject.id, next);
      }
      return next;
    });
  };

  const handleConfirmSuggestion = (commitId: string, taskId: string) => {
    setProjectCommits((prev) =>
      prev.map((c) => (c.id === commitId ? { ...c, taskId } : c))
    );
    setPendingSuggestions((prev) => prev.filter((s) => s.commitId !== commitId));
  };

  const handleDismissSuggestion = (commitId: string) => {
    setPendingSuggestions((prev) => prev.filter((s) => s.commitId !== commitId));
  };

  const handleLogout = async () => {
    const hadGitHub = state.providers.includes("github");

    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {
      // Preserve local logout even if the backend session is already gone.
    }

    if (hadGitHub) {
      sessionStorage.setItem("gittrack_force_github_choice", "1");
    } else {
      sessionStorage.removeItem("gittrack_force_github_choice");
    }

    logout();
    setAuthError(null);
    window.history.replaceState({}, "", "/");
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gh-bg text-gh-text flex items-center justify-center">Chargement...</div>;
  }

  if (!state.user) {
    return <WelcomeScreen authError={authError} />;
  }

  if (isCreatingProject || (state.projects.length === 0 && !state.providers.includes("github"))) {
    return (
      <ProjectCreationWizard
        onComplete={async (project) => {
          addProject(normalizeProject({
            ...project,
            members: [],
            tasks: [],
            commits: [],
            settings: {
              aiEnabled: project.settings.aiEnabled,
              alertThreshold: project.settings.alertThreshold,
            },
          }));
          setIsCreatingProject(false);
        }}
        onCancel={() => {
          if (state.projects.length === 0) {
            void handleLogout();
          } else {
            setIsCreatingProject(false);
          }
        }}
      />
    );
  }

  if (!state.currentProjectId || !currentProject) {
    return (
      <ProjectPicker
        user={state.user}
        projects={state.projects}
        hasGitHubAccess={state.providers.includes("github")}
        onSelectProject={(id) => selectProject(id)}
        onCreateProject={() => setIsCreatingProject(true)}
        onImportRepo={async (repo) => {
          const now = new Date();
          const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const project = normalizeProject({
            id: `project_${Date.now()}`,
            name: repo.name,
            description: repo.description || "",
            repoUrl: repo.repoUrl,
            branch: repo.branch,
            projectType: "Imported GitHub Repo",
            objective: `Track repository activity and delivery for ${repo.fullName}`,
            startDate: now.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            members: [],
            tasks: [],
            commits: [],
            settings: { aiEnabled: true, alertThreshold: 3 },
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          });
          addProject(project);
          selectProject(project.id);
          return { id: project.id };
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gh-bg text-gh-text font-sans overflow-hidden selection:bg-[#1f6feb4d]">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onSwitchProject={() => selectProject(null)}
        currentProjectName={currentProject.name}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 border-b border-gh-border bg-gh-header flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gh-muted hover:text-gh-text p-1 rounded-md hover:bg-[#b3b3b31f] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm capitalize text-gh-text">{currentView}</span>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {currentView === "dashboard" && (
            <Dashboard
              members={effectiveMembers}
              tasks={effectiveTasks}
              commits={effectiveCommits}
              insights={insights}
              setTasks={setProjectTasks}
              setCommits={setProjectCommits}
              githubLiveData={githubLiveData}
              githubLoading={githubLoading}
              githubError={githubError}
              currentProject={currentProject}
              pendingSuggestions={pendingSuggestions}
              onConfirmSuggestion={handleConfirmSuggestion}
              onDismissSuggestion={handleDismissSuggestion}
            />
          )}
          {currentView === "tasks" && <TasksPage members={effectiveMembers} tasks={effectiveTasks} commits={effectiveCommits} setTasks={setProjectTasks} setCommits={setProjectCommits} />}
          {currentView === "activity" && <ActivityPage members={effectiveMembers} tasks={effectiveTasks} commits={effectiveCommits} />}
          {currentView === "insights" && (
            <InsightsPage
              currentProjectId={currentProject.id}
              currentProjectName={currentProject.name}
              members={effectiveMembers}
              tasks={effectiveTasks}
              commits={effectiveCommits}
              onApplyInterviewTasks={(newTasks) => setProjectTasks(newTasks)}
              onOpenInterview={() => setIsSidebarOpen(false)}
              monitorSummary={monitorSnapshot?.summary || null}
              monitorLastRunAt={monitorSnapshot?.lastRunAt || null}
              monitorSchedule={monitorSchedule}
              onUpdateMonitorSchedule={updateMonitorSchedule}
            />
          )}
          {currentView === "settings" && (
            <SettingsPage
              members={effectiveMembers}
              githubRepoUrl={currentProject.repoUrl || githubLiveData?.repoUrl || null}
              githubConnected={!githubError}
              currentProject={currentProject}
            />
          )}
        </main>
      </div>
    </div>
  );
}
