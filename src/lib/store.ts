import { useEffect, useState } from "react";
import type { Task, Commit } from "../data/mock";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

export type ProjectMember = {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  login?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  branch: string;
  projectType: string;
  objective: string;
  startDate: string;
  endDate: string;
  createdAt: number;
  lastAccessed: number;
  members: ProjectMember[];
  tasks: Task[];
  commits: Commit[];
  settings: {
    aiEnabled: boolean;
    alertThreshold: number;
  };
};

type AppState = {
  user: User | null;
  projects: Project[];
  currentProjectId: string | null;
  providers: string[];
};

const STORAGE_KEY = "gittrack_state_v2";

const DEFAULT_STATE: AppState = {
  user: null,
  projects: [],
  currentProjectId: null,
  providers: [],
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_STATE;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }

    try {
      return JSON.parse(stored) as AppState;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = (user: User) => setState((current) => ({ ...current, user }));
  const logout = () => setState((current) => ({ ...current, user: null, currentProjectId: null, providers: [] }));
  const hydrateSession = (payload: { user: User | null; projects?: Project[]; providers?: string[] }) =>
    setState((current) => {
      const serverProjects = payload.projects ?? [];
      const localProjects = current.projects;
      const merged = [...localProjects];
      for (const sp of serverProjects) {
        if (!merged.some((p) => p.id === sp.id)) {
          merged.push(sp);
        }
      }
      const projects = merged;
      const hasCurrentProject = projects.some((project) => project.id === current.currentProjectId);
      return {
        ...current,
        user: payload.user,
        projects,
        providers: payload.providers && payload.providers.length > 0 ? payload.providers : current.providers,
        currentProjectId: payload.user ? (hasCurrentProject ? current.currentProjectId : projects[0]?.id || null) : null,
      };
    });
  const addProject = (project: Project) =>
    setState((current) => ({
      ...current,
      projects: [...current.projects, project],
      currentProjectId: project.id,
    }));
  const updateProjectTasks = (projectId: string, tasks: Task[]) =>
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, tasks, lastAccessed: Date.now() } : project,
      ),
    }));
  const updateProjectCommits = (projectId: string, commits: Commit[]) =>
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, commits, lastAccessed: Date.now() } : project,
      ),
    }));
  const updateProjectMembers = (projectId: string, members: ProjectMember[]) =>
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, members, lastAccessed: Date.now() } : project,
      ),
    }));
  const selectProject = (projectId: string | null) =>
    setState((current) => ({
      ...current,
      currentProjectId: projectId,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, lastAccessed: Date.now() } : project,
      ),
    }));

  const currentProject = state.projects.find((project) => project.id === state.currentProjectId) || null;

  return {
    state,
    currentProject,
    login,
    logout,
    hydrateSession,
    addProject,
    updateProjectTasks,
    updateProjectCommits,
    updateProjectMembers,
    selectProject,
  };
}
