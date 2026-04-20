import { mockData } from "./mockData.js";

export type RawMember = {
  id: string;
  name: string;
  avatar: string;
  role: string;
};

export type RawTask = {
  id: string;
  title: string;
  assignedTo: string;
  progress: number;
  deadline: string;
  status: "in_progress" | "completed" | "late";
};

export type RawCommit = {
  id: string;
  message: string;
  author: string;
  taskId: string;
  contribution: number;
  date: string;
};

export type Project = {
  name: string;
  startDate: string;
  endDate: string;
  globalProgress: number;
};

export type Task = {
  id: string;
  title: string;
  assigneeIds: string[];
  progress: number;
  deadline: string;
  status: "on_track" | "behind" | "completed" | "critical";
  weight: number;
  priority?: "low" | "medium" | "high";
};

export type Member = {
  id: string;
  login: string;
  name: string;
  avatar: string;
  role: string;
  contribution: number;
  commitTypes: { feat: number; fix: number; other: number };
};

export type Commit = {
  id: string;
  sha: string;
  authorId: string;
  taskId: string;
  message: string;
  date: string;
  timestamp: number;
  contributionPercent: number;
  type: "feat" | "fix" | "docs" | "test" | "chore" | "other";
  filesModified?: string[];
};

export type Insight = {
  id: string;
  type: "warning" | "danger" | "info";
  message: string;
};

const taskWeights: Record<string, number> = {
  t1: 15,
  t2: 14,
  t3: 16,
  t4: 12,
  t5: 16,
  t6: 13,
  t7: 14,
};

const rawMembers = mockData.members as RawMember[];
const rawTasks = mockData.tasks as RawTask[];
const rawCommits = mockData.commits as RawCommit[];
const rawProject = mockData.project as Project;

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
}

function inferCommitType(message: string): Commit["type"] {
  const prefix = message.split(":")[0]?.trim().toLowerCase();
  if (prefix === "feat" || prefix === "fix" || prefix === "docs" || prefix === "test" || prefix === "chore") {
    return prefix;
  }
  return "other";
}

function mapTaskStatus(task: RawTask): Task["status"] {
  if (task.status === "completed" || task.progress >= 100) {
    return "completed";
  }

  if (task.status === "late") {
    return task.progress < 50 ? "critical" : "behind";
  }

  return task.progress < 50 ? "behind" : "on_track";
}

const memberCommitTotals = rawCommits.reduce<Record<string, number>>((acc, commit) => {
  acc[commit.author] = (acc[commit.author] || 0) + commit.contribution;
  return acc;
}, {});

const totalContribution = Object.values(memberCommitTotals).reduce((sum, value) => sum + value, 0) || 1;

const memberCommitTypes = rawCommits.reduce<Record<string, { feat: number; fix: number; other: number }>>((acc, commit) => {
  const type = inferCommitType(commit.message);
  const current = acc[commit.author] || { feat: 0, fix: 0, other: 0 };

  if (type === "feat") current.feat += 1;
  else if (type === "fix") current.fix += 1;
  else current.other += 1;

  acc[commit.author] = current;
  return acc;
}, {});

export const initialMembers: Member[] = rawMembers.map((member) => ({
  id: member.id,
  login: slugify(member.name),
  name: member.name,
  avatar: member.avatar,
  role: member.role,
  contribution: Math.round(((memberCommitTotals[member.id] || 0) / totalContribution) * 100),
  commitTypes: memberCommitTypes[member.id] || { feat: 0, fix: 0, other: 0 },
}));

export const initialTasks: Task[] = rawTasks.map((task) => ({
  id: task.id,
  title: task.title,
  assigneeIds: [task.assignedTo],
  progress: task.progress,
  deadline: task.deadline,
  status: mapTaskStatus(task),
  weight: taskWeights[task.id] || 10,
}));

export const initialCommits: Commit[] = [...rawCommits]
  .map((commit) => ({
    id: commit.id,
    sha: commit.id.replace("c", "").padEnd(7, "0").slice(0, 7),
    authorId: commit.author,
    taskId: commit.taskId,
    message: commit.message,
    date: commit.date,
    timestamp: new Date(commit.date).getTime(),
    contributionPercent: commit.contribution,
    type: inferCommitType(commit.message),
  }))
  .sort((a, b) => b.timestamp - a.timestamp);

export const initialProject: Project = rawProject;

const latestCommitByTask = initialTasks.reduce<Record<string, number>>((acc, task) => {
  const timestamps = initialCommits.filter((commit) => commit.taskId === task.id).map((commit) => commit.timestamp);
  acc[task.id] = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  return acc;
}, {});

const topContributor = [...initialMembers].sort((a, b) => b.contribution - a.contribution)[0];
const riskiestTask = initialTasks.find((task) => task.status === "critical") || initialTasks.find((task) => task.status === "behind");
const quietTask = initialTasks.find((task) => Date.now() - (latestCommitByTask[task.id] || 0) > 2 * 24 * 60 * 60 * 1000 && task.progress < 100);

export const initialInsights: Insight[] = [
  {
    id: "i1",
    type: "danger",
    message: riskiestTask
      ? `${riskiestTask.title} is at risk and needs attention before ${riskiestTask.deadline}.`
      : "No critical task detected.",
  },
  {
    id: "i2",
    type: "warning",
    message: topContributor
      ? `${topContributor.name} is carrying ${topContributor.contribution}% of recent delivery effort.`
      : "Team contribution is balanced.",
  },
  {
    id: "i3",
    type: "info",
    message: quietTask
      ? `${quietTask.title} has seen limited recent activity despite remaining work.`
      : "Recent commit activity is healthy across active tasks.",
  },
];

export const nextActionMock = {
  message: riskiestTask
    ? `Review ${riskiestTask.title} with ${initialMembers.find((member) => member.id === riskiestTask.assigneeIds[0])?.name || "the assignee"}`
    : "Keep the current execution plan",
  action: "Team sync",
};

export { mockData };
