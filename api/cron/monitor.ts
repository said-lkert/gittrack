import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";
import { runServerMonitoringAnalysis } from "../../server/gemini.js";

type RegisteredRepo = {
  repoUrl: string;
  projectName: string;
  registeredAt: string;
};

const KV_REPOS_KEY = "monitor:repos";

function kvResultKey(repoUrl: string) {
  return `monitor:result:${Buffer.from(repoUrl.toLowerCase()).toString("base64url")}`;
}

async function fetchGitHubData(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) throw new Error(`Invalid repo URL: ${repoUrl}`);
  const [, owner, repo] = match;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitTrack-Cron",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchJson = async (path: string) => {
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (!res.ok) {
      if (res.status === 204 || res.status === 409) return [];
      throw new Error(`GitHub ${res.status}: ${await res.text()}`);
    }
    return res.json();
  };

  const [repoData, commitsRaw, contributorsRaw] = await Promise.all([
    fetchJson(`/repos/${owner}/${repo}`) as Promise<any>,
    fetchJson(`/repos/${owner}/${repo}/commits?per_page=15`) as Promise<any[]>,
    fetchJson(`/repos/${owner}/${repo}/contributors?per_page=12`) as Promise<any[]>,
  ]);

  return {
    repository: {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      openIssues: repoData.open_issues_count || 0,
      language: repoData.language || null,
    },
    commits: (commitsRaw || []).map((c: any) => ({
      message: c.commit?.message || "",
      author: c.author?.login || c.commit?.author?.name || "Unknown",
      date: c.commit?.author?.date || null,
    })),
    contributors: (contributorsRaw || []).map((c: any) => ({
      login: c.login || "Unknown",
      totalContributions: c.contributions || 0,
      recentCommits: 0,
      status: "active",
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const repos: RegisteredRepo[] = (await kv.get<RegisteredRepo[]>(KV_REPOS_KEY)) || [];

    const fallbackRepo = process.env.GITTRACK_REPO_URL;
    if (fallbackRepo && !repos.some((r) => r.repoUrl.toLowerCase() === fallbackRepo.toLowerCase())) {
      repos.push({ repoUrl: fallbackRepo, projectName: "Default", registeredAt: new Date().toISOString() });
    }

    if (repos.length === 0) {
      return res.json({ ok: true, message: "No repos registered for monitoring.", processed: 0 });
    }

    const results: Array<{ repoUrl: string; success: boolean; error?: string }> = [];

    for (const repo of repos) {
      try {
        const githubData = await fetchGitHubData(repo.repoUrl);

        const snapshot = await runServerMonitoringAnalysis({
          projectName: repo.projectName,
          repoUrl: repo.repoUrl,
          ...githubData,
        });

        await kv.set(kvResultKey(repo.repoUrl), JSON.stringify(snapshot), { ex: 86400 * 2 });
        results.push({ repoUrl: repo.repoUrl, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ repoUrl: repo.repoUrl, success: false, error: message });
      }
    }

    return res.json({ ok: true, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Cron monitor failed", details: message });
  }
}
