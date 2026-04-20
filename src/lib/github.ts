import { buildHttpError, readJsonSafe } from "./http";

export type GitHubLiveCommit = {
  message: string;
  author: string;
  authorAvatar: string | null;
  authorUrl: string | null;
  date: string | null;
  sha: string;
};

export type GitHubLiveContributor = {
  login: string;
  avatar: string;
  profileUrl: string;
  totalContributions: number;
  recentCommits: number;
  lastCommitAt: string | null;
  status: "active" | "inactive";
};

export type GitHubLiveData = {
  repoUrl: string;
  owner: string;
  repo: string;
  repository: {
    description: string | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    language: string | null;
    visibility: string;
    pushedAt: string | null;
  };
  commits: GitHubLiveCommit[];
  contributors: GitHubLiveContributor[];
};

const GITHUB_CACHE_PREFIX = "gittrack_github_live_";
const GITHUB_FETCH_TIMEOUT_MS = 8000;

function getCacheKey(repoUrl: string) {
  return `${GITHUB_CACHE_PREFIX}${repoUrl.toLowerCase()}`;
}

export function readCachedGitHubLiveData(repoUrl?: string | null): GitHubLiveData | null {
  if (typeof window === "undefined" || !repoUrl) {
    return null;
  }

  const raw = window.localStorage.getItem(getCacheKey(repoUrl));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as GitHubLiveData;
  } catch {
    return null;
  }
}

function writeCachedGitHubLiveData(data: GitHubLiveData) {
  if (typeof window === "undefined" || !data.repoUrl) {
    return;
  }

  window.localStorage.setItem(getCacheKey(data.repoUrl), JSON.stringify(data));
}

function isGitHubRateLimitMessage(message: string) {
  return message.includes("GitHub API request failed (403)") && message.toLowerCase().includes("rate limit exceeded");
}

export async function fetchGitHubLiveData(repoUrl?: string | null): Promise<GitHubLiveData> {
  const query = repoUrl ? `?repoUrl=${encodeURIComponent(repoUrl)}` : "";
  const commitsController = new AbortController();
  const contributorsController = new AbortController();
  const commitsTimeout = window.setTimeout(() => commitsController.abort(), GITHUB_FETCH_TIMEOUT_MS);
  const contributorsTimeout = window.setTimeout(() => contributorsController.abort(), GITHUB_FETCH_TIMEOUT_MS);
  let commitsResponse: Response;
  let contributorsResponse: Response;

  try {
    [commitsResponse, contributorsResponse] = await Promise.all([
      fetch(`/api/github/commits${query}`, { signal: commitsController.signal }),
      fetch(`/api/github/contributors${query}`, { signal: contributorsController.signal }),
    ]);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Le chargement GitHub a pris trop de temps.");
    }
    throw error;
  } finally {
    window.clearTimeout(commitsTimeout);
    window.clearTimeout(contributorsTimeout);
  }

  const commitsJson = await readJsonSafe(commitsResponse);
  const contributorsJson = await readJsonSafe(contributorsResponse);

  if (!commitsResponse.ok) {
    const error = buildHttpError(commitsResponse, commitsJson, "Unable to load GitHub commits.");
    const cached = readCachedGitHubLiveData(repoUrl);
    if (cached && isGitHubRateLimitMessage(error.message)) {
      return cached;
    }
    if (isGitHubRateLimitMessage(error.message)) {
      throw new Error("GitHub a temporairement bloque les requetes a cause du quota API. Reessayez plus tard ou configurez un autre token serveur.");
    }
    throw error;
  }

  if (!contributorsResponse.ok) {
    const error = buildHttpError(contributorsResponse, contributorsJson, "Unable to load GitHub contributors.");
    const cached = readCachedGitHubLiveData(repoUrl);
    if (cached && isGitHubRateLimitMessage(error.message)) {
      return cached;
    }
    if (isGitHubRateLimitMessage(error.message)) {
      throw new Error("GitHub a temporairement bloque les requetes a cause du quota API. Reessayez plus tard ou configurez un autre token serveur.");
    }
    throw error;
  }

  const liveData = {
    repoUrl: commitsJson?.repoUrl || "",
    owner: commitsJson?.owner || "",
    repo: commitsJson?.repo || "",
    repository: commitsJson?.repository || {
      description: null,
      defaultBranch: "main",
      stars: 0,
      forks: 0,
      openIssues: 0,
      language: null,
      visibility: "unknown",
      pushedAt: null,
    },
    commits: Array.isArray(commitsJson?.commits) ? commitsJson.commits : [],
    contributors: Array.isArray(contributorsJson?.contributors) ? contributorsJson.contributors : [],
  };

  writeCachedGitHubLiveData(liveData);
  return liveData;
}

export function subscribeToGitHubLiveUpdates(onUpdate: () => void) {
  const id = window.setInterval(onUpdate, 45_000);
  return () => window.clearInterval(id);
}
