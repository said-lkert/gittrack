import { GoogleGenAI } from "@google/genai";

export type ServerMonitorSnapshot = {
  summary: string;
  nextAction: string;
  insights: Array<{ id: string; type: "warning" | "danger" | "info"; message: string }>;
  lastRunAt: string;
  repoUrl: string;
  projectName: string;
};

type GitHubDataForAnalysis = {
  projectName: string;
  repoUrl: string;
  commits: Array<{ message: string; author: string; date: string | null }>;
  contributors: Array<{ login: string; totalContributions: number; recentCommits: number; status: string }>;
  repository: { stars: number; forks: number; openIssues: number; language: string | null };
};

function buildPromptContext(data: GitHubDataForAnalysis): string {
  const commitLines = data.commits
    .slice(0, 12)
    .map((c) => `${c.date || "?"} | ${c.author} | ${c.message}`)
    .join("\n");

  const contributorLines = data.contributors
    .slice(0, 8)
    .map((c) => `${c.login} (${c.totalContributions} total, ${c.recentCommits} recent, ${c.status})`)
    .join(", ");

  return [
    `Project: ${data.projectName}`,
    `Repository: ${data.repoUrl}`,
    `Stats: ${data.repository.stars} stars, ${data.repository.forks} forks, ${data.repository.openIssues} open issues, language: ${data.repository.language || "N/A"}`,
    `Contributors: ${contributorLines}`,
    `Recent commits:\n${commitLines}`,
  ].join("\n\n");
}

export async function runServerMonitoringAnalysis(data: GitHubDataForAnalysis): Promise<ServerMonitorSnapshot> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = buildPromptContext(data);

  const prompt = [
    "You are an AI project analyst embedded in GitTrack.",
    "Answer in French.",
    "Be concise, practical, and grounded in the provided project data.",
    "Do not invent facts that are not supported by the data.",
    "",
    context,
    "",
    "Analyze project progress and anomalies based on recent GitHub activity.",
    'Return JSON only in this exact shape:',
    '{ "summary": "...", "nextAction": "...", "insights": [{ "id": "i1", "type": "warning|danger|info", "message": "..." }] }',
    "Provide 2 or 3 insights max. Use danger/warning/info as types. Mention only real anomalies or notable risks.",
  ].join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text ?? "";

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return {
      summary: "Analyse terminee (format inattendu).",
      nextAction: "Verifier manuellement.",
      insights: [],
      lastRunAt: new Date().toISOString(),
      repoUrl: data.repoUrl,
      projectName: data.projectName,
    };
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
    summary?: string;
    nextAction?: string;
    insights?: Array<{ id: string; type: "warning" | "danger" | "info"; message: string }>;
  };

  return {
    summary: parsed.summary || "Analyse AI terminee.",
    nextAction: parsed.nextAction || "Continuer le suivi.",
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    lastRunAt: new Date().toISOString(),
    repoUrl: data.repoUrl,
    projectName: data.projectName,
  };
}
