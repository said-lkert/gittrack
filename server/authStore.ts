import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredAccount = {
  id: string;
  userId: string;
  provider: "github" | "google";
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredSession = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type StoredProject = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  repoUrl: string;
  branch: string;
  projectType: string;
  objective: string;
  startDate: string;
  endDate: string;
  members?: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
    login?: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    assigneeIds: string[];
    progress: number;
    deadline: string;
    status: "on_track" | "behind" | "completed" | "critical";
    weight: number;
    priority?: "low" | "medium" | "high";
  }>;
  settings?: {
    aiEnabled: boolean;
    alertThreshold: number;
  };
  createdAt: string;
  lastAccessed: string;
  updatedAt: string;
};

type AuthDb = {
  users: StoredUser[];
  accounts: StoredAccount[];
  sessions: StoredSession[];
  projects: StoredProject[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "auth-db.json");

const emptyDb: AuthDb = {
  users: [],
  accounts: [],
  sessions: [],
  projects: [],
};

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDb, null, 2), "utf8");
  }
}

async function readDb(): Promise<AuthDb> {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf8");
  try {
    return JSON.parse(raw) as AuthDb;
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDb, null, 2), "utf8");
    return emptyDb;
  }
}

async function writeDb(db: AuthDb) {
  await ensureDb();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export async function findSession(sessionId: string) {
  const db = await readDb();
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.sessions = db.sessions.filter((item) => item.id !== sessionId);
    await writeDb(db);
    return null;
  }

  const user = db.users.find((item) => item.id === session.userId) || null;
  if (!user) return null;

  const accounts = db.accounts.filter((item) => item.userId === user.id);
  return { session, user, accounts };
}

export async function createOrUpdateOAuthUser(input: {
  provider: "github" | "google";
  providerAccountId: string;
  name: string;
  email: string;
  avatar: string;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt?: string;
}) {
  const now = new Date().toISOString();
  const db = await readDb();

  let account = db.accounts.find(
    (item) => item.provider === input.provider && item.providerAccountId === input.providerAccountId,
  );

  let user = account ? db.users.find((item) => item.id === account!.userId) || null : null;

  if (!user) {
    user = db.users.find((item) => item.email.toLowerCase() === input.email.toLowerCase()) || null;
  }

  if (!user) {
    user = {
      id: `user_${crypto.randomUUID()}`,
      name: input.name,
      email: input.email,
      avatar: input.avatar,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
  } else {
    user.name = input.name || user.name;
    user.email = input.email || user.email;
    user.avatar = input.avatar || user.avatar;
    user.updatedAt = now;
  }

  if (!account) {
    account = {
      id: `acct_${crypto.randomUUID()}`,
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      scope: input.scope,
      tokenType: input.tokenType,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    db.accounts.push(account);
  } else {
    account.userId = user.id;
    account.accessToken = input.accessToken;
    account.refreshToken = input.refreshToken;
    account.scope = input.scope;
    account.tokenType = input.tokenType;
    account.expiresAt = input.expiresAt;
    account.updatedAt = now;
  }

  await writeDb(db);
  return { user, account };
}

export async function createSession(userId: string, maxAgeDays = 30) {
  const now = Date.now();
  const session: StoredSession = {
    id: `sess_${crypto.randomUUID()}`,
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + maxAgeDays * 24 * 60 * 60 * 1000).toISOString(),
  };

  const db = await readDb();
  db.sessions.push(session);
  await writeDb(db);
  return session;
}

export async function deleteSession(sessionId: string) {
  const db = await readDb();
  db.sessions = db.sessions.filter((item) => item.id !== sessionId);
  await writeDb(db);
}

export async function listProjectsForUser(userId: string) {
  const db = await readDb();
  return db.projects.filter((project) => project.ownerUserId === userId);
}

export async function createProjectForUser(input: {
  ownerUserId: string;
  name: string;
  description: string;
  repoUrl: string;
  branch: string;
  projectType: string;
  objective: string;
  startDate: string;
  endDate: string;
  members?: StoredProject["members"];
  tasks?: StoredProject["tasks"];
  settings?: StoredProject["settings"];
}) {
  const now = new Date().toISOString();
  const db = await readDb();

  const existing = db.projects.find(
    (project) => project.ownerUserId === input.ownerUserId && project.repoUrl.toLowerCase() === input.repoUrl.toLowerCase(),
  );

  if (existing) {
    existing.name = input.name || existing.name;
    existing.description = input.description;
    existing.branch = input.branch || existing.branch;
    existing.projectType = input.projectType;
    existing.objective = input.objective;
    existing.startDate = input.startDate;
    existing.endDate = input.endDate;
    existing.members = input.members ?? existing.members ?? [];
    existing.tasks = input.tasks ?? existing.tasks ?? [];
    existing.settings = input.settings ?? existing.settings ?? { aiEnabled: true, alertThreshold: 3 };
    existing.lastAccessed = now;
    existing.updatedAt = now;
    await writeDb(db);
    return existing;
  }

  const project: StoredProject = {
    id: `project_${crypto.randomUUID()}`,
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: input.description,
    repoUrl: input.repoUrl,
    branch: input.branch,
    projectType: input.projectType,
    objective: input.objective,
    startDate: input.startDate,
    endDate: input.endDate,
    members: input.members ?? [],
    tasks: input.tasks ?? [],
    settings: input.settings ?? { aiEnabled: true, alertThreshold: 3 },
    createdAt: now,
    lastAccessed: now,
    updatedAt: now,
  };

  db.projects.push(project);
  await writeDb(db);
  return project;
}

export async function updateProjectTasksForUser(input: {
  ownerUserId: string;
  projectId: string;
  tasks: NonNullable<StoredProject["tasks"]>;
}) {
  const now = new Date().toISOString();
  const db = await readDb();
  const project = db.projects.find((item) => item.id === input.projectId && item.ownerUserId === input.ownerUserId);

  if (!project) {
    return null;
  }

  project.tasks = input.tasks;
  project.lastAccessed = now;
  project.updatedAt = now;
  await writeDb(db);
  return project;
}
