import crypto from "crypto";
import dotenv from "dotenv";
import express, { Request, Response } from "express";

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 4000);

const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const frontendUrl = process.env.FRONTEND_URL || vercelUrl || "http://localhost:3000";
const apiBaseUrl = process.env.API_PUBLIC_URL || vercelUrl || `http://localhost:${port}`;

const fallbackGithubToken = process.env.GITHUB_TOKEN;
const defaultRepoUrl = process.env.GITTRACK_REPO_URL;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";
const sessionSecret = process.env.SESSION_SECRET || "gittrack_dev_session_secret";

const githubClientId = process.env.GITHUB_OAUTH_CLIENT_ID || "";
const githubClientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET || "";
const githubRedirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || `${apiBaseUrl}/auth/github/callback`;

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
const googleRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${apiBaseUrl}/auth/google/callback`;

// --- Types ---

type CookieSession = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  provider: "github" | "google";
  accessToken: string;
  providers: string[];
  issuedAt: number;
};

type ParsedRepo = { owner: string; repo: string };

type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string; avatar_url?: string; html_url?: string } | null;
};

type GitHubContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  visibility?: string;
  private: boolean;
  pushed_at: string | null;
};

type LiveCommit = {
  message: string;
  author: string;
  authorAvatar: string | null;
  authorUrl: string | null;
  date: string | null;
  sha: string;
};

type LiveContributor = {
  login: string;
  avatar: string;
  profileUrl: string;
  totalContributions: number;
  recentCommits: number;
  lastCommitAt: string | null;
  status: "active" | "inactive";
};

type LiveState = {
  owner: string;
  repo: string;
  repoUrl: string;
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
  commits: LiveCommit[];
  contributors: LiveContributor[];
  updatedAt: string;
};

// --- In-memory cache (ephemeral on Vercel, works within warm instances) ---

let liveState: LiveState | null = null;
let liveStateRefreshPromise: Promise<LiveState> | null = null;
let githubRateLimitCooldownUntil = 0;

// --- Middleware ---

app.use((req, _res, next) => {
  if (req.path === "/api/github/webhook") return next();
  express.json()(req, _res, next);
});

// --- Cookie & Session helpers ---

function parseCookies(req: Request) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const index = part.indexOf("=");
      const key = part.slice(0, index).trim();
      const value = decodeURIComponent(part.slice(index + 1).trim());
      return [key, value];
    }),
  );
}

function signValue(value: string) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSignedValue(value: string) {
  return `${value}.${signValue(value)}`;
}

function readSignedValue(rawValue: string | undefined) {
  if (!rawValue) return null;
  const index = rawValue.lastIndexOf(".");
  if (index === -1) return null;
  const value = rawValue.slice(0, index);
  const signature = rawValue.slice(index + 1);
  const expected = signValue(value);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return value;
}

function encodeSession(session: CookieSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = signValue(payload);
  return `${payload}.${sig}`;
}

function decodeSession(raw: string | undefined): CookieSession | null {
  if (!raw) return null;
  const index = raw.lastIndexOf(".");
  if (index === -1) return null;
  const payload = raw.slice(0, index);
  const sig = raw.slice(index + 1);
  const expected = signValue(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CookieSession;
  } catch {
    return null;
  }
}

function appendCookie(res: Response, cookie: string) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", [cookie]);
    return;
  }
  const cookies = Array.isArray(current) ? current : [String(current)];
  cookies.push(cookie);
  res.setHeader("Set-Cookie", cookies);
}

function buildCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function getRequestSession(req: Request): CookieSession | null {
  const cookies = parseCookies(req);
  return decodeSession(cookies.gittrack_session);
}

// --- Repo helpers ---

function parseRepoUrl(repoUrl?: string): ParsedRepo | null {
  if (!repoUrl) return null;
  try {
    const normalized = repoUrl.startsWith("http") ? repoUrl : `https://${repoUrl}`;
    const url = new URL(normalized);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function resolveRepo(owner?: string, repo?: string, repoUrl?: string) {
  if (owner && repo) return { owner, repo };
  return parseRepoUrl(repoUrl) || parseRepoUrl(defaultRepoUrl);
}

// --- GitHub API helpers ---

function isGitHubRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("GitHub API request failed (403)") && message.toLowerCase().includes("rate limit exceeded");
}

function buildGitHubRateLimitMessage() {
  const retryAt = githubRateLimitCooldownUntil ? new Date(githubRateLimitCooldownUntil).toLocaleTimeString("fr-FR") : null;
  return retryAt
    ? `GitHub bloque temporairement les requetes live pour ce compte. Nouvel essai apres ${retryAt}.`
    : "GitHub bloque temporairement les requetes live pour ce compte.";
}

function getMatchingLiveState(parsed: ParsedRepo) {
  if (!liveState) return null;
  if (liveState.owner !== parsed.owner || liveState.repo !== parsed.repo) return null;
  return liveState;
}

async function githubRequest<T>(path: string, accessToken?: string | null): Promise<T> {
  const token = accessToken || fallbackGithubToken;
  if (!token) throw new Error("No GitHub token available. Connect a GitHub account or configure GITHUB_TOKEN.");

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "GitTrack",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 204) return [] as T;
  if (response.status === 409) {
    const details = await response.text();
    if (details.includes("Git Repository is empty")) return [] as T;
    throw new Error(`GitHub API request failed (${response.status}): ${details}`);
  }
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${details}`);
  }

  return (await response.json()) as T;
}

async function githubRequestWithFallback<T>(path: string, userAccessToken?: string | null): Promise<T> {
  const serverToken = fallbackGithubToken || null;
  const userToken = userAccessToken || null;

  if (serverToken) {
    try {
      return await githubRequest<T>(path, serverToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const shouldTryUserToken =
        !!userToken &&
        userToken !== serverToken &&
        (message.includes("(403)") || message.includes("(404)") || message.includes("(401)"));

      if (!shouldTryUserToken) throw error;
    }
  }

  return githubRequest<T>(path, userToken);
}

function mapCommits(data: GitHubCommit[]): LiveCommit[] {
  return data.map((commit) => ({
    message: commit.commit.message,
    author: commit.author?.login || commit.commit.author?.name || "Unknown",
    authorAvatar: commit.author?.avatar_url || null,
    authorUrl: commit.author?.html_url || null,
    date: commit.commit.author?.date || null,
    sha: commit.sha,
  }));
}

function mapContributors(contributors: GitHubContributor[], recentCommits: GitHubCommit[]): LiveContributor[] {
  const recentByAuthor = recentCommits.reduce<Record<string, { recentCommits: number; lastCommitAt: string | null }>>((acc, commit) => {
    const login = commit.author?.login || commit.commit.author?.name;
    const date = commit.commit.author?.date || null;
    if (!login) return acc;
    const current = acc[login] || { recentCommits: 0, lastCommitAt: null };
    current.recentCommits += 1;
    if (!current.lastCommitAt || (date && date > current.lastCommitAt)) current.lastCommitAt = date;
    acc[login] = current;
    return acc;
  }, {});

  const now = Date.now();
  return contributors.map((contributor) => {
    const recent = recentByAuthor[contributor.login] || { recentCommits: 0, lastCommitAt: null };
    const lastCommitTime = recent.lastCommitAt ? new Date(recent.lastCommitAt).getTime() : 0;
    return {
      login: contributor.login,
      avatar: contributor.avatar_url,
      profileUrl: contributor.html_url,
      totalContributions: contributor.contributions,
      recentCommits: recent.recentCommits,
      lastCommitAt: recent.lastCommitAt,
      status: lastCommitTime > now - 7 * 24 * 60 * 60 * 1000 ? "active" : "inactive",
    };
  });
}

async function refreshLiveState(parsed: ParsedRepo, accessToken?: string | null): Promise<LiveState> {
  try {
    const [repositoryRaw, commitsRaw, contributorsRaw, recentCommitsRaw] = await Promise.all([
      githubRequestWithFallback<GitHubRepository>(`/repos/${parsed.owner}/${parsed.repo}`, accessToken),
      githubRequestWithFallback<GitHubCommit[]>(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=15`, accessToken),
      githubRequestWithFallback<GitHubContributor[]>(`/repos/${parsed.owner}/${parsed.repo}/contributors?per_page=12`, accessToken),
      githubRequestWithFallback<GitHubCommit[]>(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=100`, accessToken),
    ]);

    githubRateLimitCooldownUntil = 0;
    liveState = {
      owner: parsed.owner,
      repo: parsed.repo,
      repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      repository: {
        description: repositoryRaw.description,
        defaultBranch: repositoryRaw.default_branch,
        stars: repositoryRaw.stargazers_count,
        forks: repositoryRaw.forks_count,
        openIssues: repositoryRaw.open_issues_count,
        language: repositoryRaw.language,
        visibility: repositoryRaw.visibility || (repositoryRaw.private ? "private" : "public"),
        pushedAt: repositoryRaw.pushed_at,
      },
      commits: mapCommits(commitsRaw),
      contributors: mapContributors(contributorsRaw, recentCommitsRaw),
      updatedAt: new Date().toISOString(),
    };
    return liveState;
  } catch (error) {
    if (isGitHubRateLimitError(error)) {
      githubRateLimitCooldownUntil = Date.now() + 15 * 60_000;
    }
    throw error;
  }
}

async function ensureLiveState(parsed: ParsedRepo, accessToken?: string | null) {
  if (
    liveState &&
    liveState.owner === parsed.owner &&
    liveState.repo === parsed.repo &&
    Date.now() - new Date(liveState.updatedAt).getTime() < 60_000
  ) {
    return liveState;
  }

  if (githubRateLimitCooldownUntil && Date.now() < githubRateLimitCooldownUntil) {
    const staleState = getMatchingLiveState(parsed);
    if (staleState) return staleState;
    throw new Error(buildGitHubRateLimitMessage());
  }

  if (liveStateRefreshPromise) return liveStateRefreshPromise;

  liveStateRefreshPromise = refreshLiveState(parsed, accessToken).finally(() => {
    liveStateRefreshPromise = null;
  });

  return liveStateRefreshPromise;
}

function verifyWebhookSignature(signature: string | undefined, body: Buffer) {
  if (!signature || !webhookSecret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", webhookSecret).update(body).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireConfiguredOAuth(res: Response, provider: "github" | "google") {
  if (provider === "github" && (!githubClientId || !githubClientSecret)) {
    res.status(500).json({ error: "GitHub OAuth is not configured on the server." });
    return false;
  }
  if (provider === "google" && (!googleClientId || !googleClientSecret)) {
    res.status(500).json({ error: "Google OAuth is not configured on the server." });
    return false;
  }
  return true;
}

// --- Routes ---

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gittrack-api" });
});

app.get("/auth/me", (req, res) => {
  const session = getRequestSession(req);
  if (!session) {
    return res.status(401).json({ user: null });
  }
  return res.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      avatar: session.avatar,
    },
    providers: session.providers,
    projects: [],
  });
});

app.post("/auth/logout", (_req, res) => {
  appendCookie(res, buildCookie("gittrack_session", "", 0));
  appendCookie(res, buildCookie("gittrack_oauth_state", "", 0));
  res.json({ ok: true });
});

app.get("/auth/github", (req, res) => {
  if (!requireConfiguredOAuth(res, "github")) return;
  const state = crypto.randomBytes(24).toString("hex");
  appendCookie(res, buildCookie("gittrack_oauth_state", createSignedValue(`github:${state}`), 600));
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", githubClientId);
  authUrl.searchParams.set("redirect_uri", githubRedirectUri);
  authUrl.searchParams.set("scope", "read:user user:email repo");
  authUrl.searchParams.set("state", state);
  res.redirect(authUrl.toString());
});

app.get("/auth/google", (req, res) => {
  if (!requireConfiguredOAuth(res, "google")) return;
  const state = crypto.randomBytes(24).toString("hex");
  appendCookie(res, buildCookie("gittrack_oauth_state", createSignedValue(`google:${state}`), 600));
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  res.redirect(authUrl.toString());
});

app.get("/auth/github/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookies = parseCookies(req);
  const expected = readSignedValue(cookies.gittrack_oauth_state);

  if (!code || expected !== `github:${state}`) {
    return res.redirect(`${frontendUrl}?authError=github_oauth_invalid_state`);
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: githubRedirectUri,
        state,
      }),
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      token_type?: string;
      error?: string;
    };

    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error || "GitHub token exchange failed.");
    }

    const userResponse = await githubRequest<{ id: number; name: string | null; login: string; avatar_url: string; email: string | null }>(
      "/user",
      tokenJson.access_token,
    );

    let email = userResponse.email;
    if (!email) {
      const emails = await githubRequest<Array<{ email: string; primary: boolean; verified: boolean }>>("/user/emails", tokenJson.access_token);
      email = emails.find((item) => item.primary)?.email || emails[0]?.email || `${userResponse.login}@users.noreply.github.com`;
    }

    const cookieSession: CookieSession = {
      userId: `github_${userResponse.id}`,
      name: userResponse.name || userResponse.login,
      email,
      avatar: userResponse.avatar_url,
      provider: "github",
      accessToken: tokenJson.access_token,
      providers: ["github"],
      issuedAt: Date.now(),
    };

    appendCookie(res, buildCookie("gittrack_session", encodeSession(cookieSession), 30 * 24 * 60 * 60));
    appendCookie(res, buildCookie("gittrack_oauth_state", "", 0));
    return res.redirect(frontendUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "github_callback_failed";
    return res.redirect(`${frontendUrl}?authError=${encodeURIComponent(message)}`);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookies = parseCookies(req);
  const expected = readSignedValue(cookies.gittrack_oauth_state);

  if (!code || expected !== `google:${state}`) {
    return res.redirect(`${frontendUrl}?authError=google_oauth_invalid_state`);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error || "Google token exchange failed.");
    }

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const userInfo = (await userInfoResponse.json()) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    const cookieSession: CookieSession = {
      userId: `google_${userInfo.sub}`,
      name: userInfo.name || userInfo.email || "Google User",
      email: userInfo.email || `google_${userInfo.sub}@example.com`,
      avatar: userInfo.picture || "",
      provider: "google",
      accessToken: tokenJson.access_token,
      providers: ["google"],
      issuedAt: Date.now(),
    };

    appendCookie(res, buildCookie("gittrack_session", encodeSession(cookieSession), 30 * 24 * 60 * 60));
    appendCookie(res, buildCookie("gittrack_oauth_state", "", 0));
    return res.redirect(frontendUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "google_callback_failed";
    return res.redirect(`${frontendUrl}?authError=${encodeURIComponent(message)}`);
  }
});

app.get("/api/github/repos", (req, res) => {
  const session = getRequestSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const accessToken = session.provider === "github" ? session.accessToken : null;
  if (!accessToken) {
    return res.status(400).json({ error: "No GitHub account connected for this user." });
  }

  githubRequest<GitHubRepository[]>("/user/repos?per_page=100&sort=updated", accessToken)
    .then((repos) => {
      res.json({
        repos: repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          repoUrl: repo.html_url,
          description: repo.description,
          branch: repo.default_branch,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          visibility: repo.visibility || (repo.private ? "private" : "public"),
          pushedAt: repo.pushed_at,
        })),
      });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Unable to fetch GitHub repositories.", details: message });
    });
});

app.post("/api/github/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("x-hub-signature-256");
  const event = req.header("x-github-event");
  const body = req.body as Buffer;
  if (!verifyWebhookSignature(signature, body)) return res.status(401).json({ error: "Invalid webhook signature." });
  if (event !== "push") return res.json({ ok: true, ignored: true });

  try {
    const payload = JSON.parse(body.toString("utf8")) as {
      repository?: { html_url?: string; owner?: { login?: string }; name?: string };
      commits?: Array<{ id: string }>;
    };
    const parsed = resolveRepo(payload.repository?.owner?.login, payload.repository?.name, payload.repository?.html_url);
    if (!parsed) return res.status(400).json({ error: "Unable to resolve repository from webhook payload." });
    await refreshLiveState(parsed);
    return res.json({ ok: true, event: "push", commitsReceived: payload.commits?.length || 0, repo: `${parsed.owner}/${parsed.repo}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Webhook processing failed.", details: message });
  }
});

app.get("/api/github/commits", async (req, res) => {
  const owner = typeof req.query.owner === "string" ? req.query.owner : undefined;
  const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
  const repoUrl = typeof req.query.repoUrl === "string" ? req.query.repoUrl : undefined;
  const parsed = resolveRepo(owner, repo, repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Missing repository information. Provide owner+repo, repoUrl, or GITTRACK_REPO_URL." });
  }

  try {
    const session = getRequestSession(req);
    const accessToken = session?.provider === "github" ? session.accessToken : null;
    const state = await ensureLiveState(parsed, accessToken);
    return res.json({
      owner: state.owner,
      repo: state.repo,
      repoUrl: state.repoUrl,
      repository: state.repository,
      updatedAt: state.updatedAt,
      count: state.commits.length,
      commits: state.commits,
    });
  } catch (error) {
    if (isGitHubRateLimitError(error)) {
      const staleState = getMatchingLiveState(parsed);
      if (staleState) {
        return res.json({
          owner: staleState.owner,
          repo: staleState.repo,
          repoUrl: staleState.repoUrl,
          repository: staleState.repository,
          updatedAt: staleState.updatedAt,
          count: staleState.commits.length,
          commits: staleState.commits,
          stale: true,
        });
      }

      return res.status(429).json({
        error: "GitHub live data is temporarily rate-limited.",
        details: buildGitHubRateLimitMessage(),
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Unable to fetch repository commits from GitHub.", details: message });
  }
});

app.get("/api/github/contributors", async (req, res) => {
  const owner = typeof req.query.owner === "string" ? req.query.owner : undefined;
  const repo = typeof req.query.repo === "string" ? req.query.repo : undefined;
  const repoUrl = typeof req.query.repoUrl === "string" ? req.query.repoUrl : undefined;
  const parsed = resolveRepo(owner, repo, repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Missing repository information. Provide owner+repo, repoUrl, or GITTRACK_REPO_URL." });
  }

  try {
    const session = getRequestSession(req);
    const accessToken = session?.provider === "github" ? session.accessToken : null;
    const state = await ensureLiveState(parsed, accessToken);
    return res.json({
      owner: state.owner,
      repo: state.repo,
      repoUrl: state.repoUrl,
      repository: state.repository,
      updatedAt: state.updatedAt,
      count: state.contributors.length,
      contributors: state.contributors,
    });
  } catch (error) {
    if (isGitHubRateLimitError(error)) {
      const staleState = getMatchingLiveState(parsed);
      if (staleState) {
        return res.json({
          owner: staleState.owner,
          repo: staleState.repo,
          repoUrl: staleState.repoUrl,
          repository: staleState.repository,
          updatedAt: staleState.updatedAt,
          count: staleState.contributors.length,
          contributors: staleState.contributors,
          stale: true,
        });
      }

      return res.status(429).json({
        error: "GitHub live data is temporarily rate-limited.",
        details: buildGitHubRateLimitMessage(),
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Unable to fetch repository contributors from GitHub.", details: message });
  }
});

// --- Monitor routes (KV-backed, graceful fallback if KV not configured) ---

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<T>(key);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: string, ttl?: number): Promise<void> {
  try {
    const { kv } = await import("@vercel/kv");
    if (ttl) {
      await kv.set(key, value, { ex: ttl });
    } else {
      await kv.set(key, value);
    }
  } catch {
    // KV not available (local dev), silently skip
  }
}

app.post("/api/monitor/register", async (req, res) => {
  const { repoUrl, projectName } = req.body as { repoUrl?: string; projectName?: string };
  if (!repoUrl) return res.status(400).json({ error: "repoUrl is required." });

  try {
    const existing = (await kvGet<Array<{ repoUrl: string; projectName: string }>>("monitor:repos")) || [];
    const alreadyRegistered = existing.some((r) => r.repoUrl.toLowerCase() === repoUrl.toLowerCase());

    if (!alreadyRegistered) {
      existing.push({ repoUrl, projectName: projectName || "Project", registeredAt: new Date().toISOString() } as any);
      await kvSet("monitor:repos", JSON.stringify(existing));
    }

    return res.json({ ok: true, registered: !alreadyRegistered });
  } catch {
    return res.json({ ok: true, registered: false, kvUnavailable: true });
  }
});

app.get("/api/monitor/latest", async (req, res) => {
  const repoUrl = typeof req.query.repoUrl === "string" ? req.query.repoUrl : "";
  if (!repoUrl) return res.status(400).json({ error: "repoUrl query parameter is required." });

  try {
    const key = `monitor:result:${Buffer.from(repoUrl.toLowerCase()).toString("base64url")}`;
    const raw = await kvGet<string>(key);
    if (!raw) return res.json({ snapshot: null });
    const snapshot = typeof raw === "string" ? JSON.parse(raw) : raw;
    return res.json({ snapshot });
  } catch {
    return res.json({ snapshot: null });
  }
});

// --- Server start (skipped on Vercel) ---

export { app };

if (process.env.VERCEL !== "1") {
  app.listen(port, async () => {
    console.log(`GitTrack API listening on http://localhost:${port}`);
    const parsed = resolveRepo();
    if (parsed) {
      try {
        await refreshLiveState(parsed);
        console.log(`Live cache primed for ${parsed.owner}/${parsed.repo}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.log(`Live cache prime failed: ${message}`);
      }
    }
  });
}
