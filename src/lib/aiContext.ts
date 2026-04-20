import { Commit, Member, Task } from "../data/mock";
import { ensurePuterSignedIn, getPuter, PuterChatStream } from "./puter";
import { Insight } from "../data/mock";

export function buildProjectContext(currentProjectName: string, members: Member[], tasks: Task[], commits: Commit[]) {
  const topMembers = [...members]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6)
    .map((member) => `${member.name} (${member.role}, ${member.contribution}%)`)
    .join(", ");

  const taskSummary = tasks
    .slice(0, 10)
    .map((task) => `${task.title} | progress=${task.progress}% | status=${task.status} | deadline=${task.deadline}`)
    .join("\n");

  const recentCommits = commits
    .slice(0, 12)
    .map((commit) => `${commit.date} | ${commit.message}`)
    .join("\n");

  return [
    `Project: ${currentProjectName}`,
    `Members: ${topMembers || "none"}`,
    `Tasks:\n${taskSummary || "none"}`,
    `Recent commits:\n${recentCommits || "none"}`,
  ].join("\n\n");
}

export async function runPuterProjectPrompt(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  userPrompt: string;
  onChunk: (text: string) => void;
  forcePuterSignIn?: boolean;
}) {
  const puter = await ensurePuterSignedIn(args.forcePuterSignIn);

  const context = buildProjectContext(args.currentProjectName, args.members, args.tasks, args.commits);
  const finalPrompt = [
    "You are an AI project analyst embedded in GitTrack.",
    "Answer in French.",
    "Be concise, practical, and grounded in the provided project data.",
    "Return actionable analysis for a software project manager.",
    "Structure the answer with short sections and bullet points whenever possible.",
    "Avoid one long paragraph. Prefer clear scanning over narrative prose.",
    "Do not invent facts that are not supported by the data.",
    "",
    context,
    "",
    `User request: ${args.userPrompt.trim()}`,
  ].join("\n");

  const response = await puter.ai.chat(finalPrompt, {
    model: "gpt-5.4-nano",
    stream: true,
  });

  let fullText = "";
  for await (const part of response as PuterChatStream) {
    if (!part?.text) {
      continue;
    }

    fullText += part.text;
    args.onChunk(fullText);
  }

  return fullText;
}

function extractJsonPayload(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La reponse AI n'est pas un JSON exploitable.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export type InterviewQuestion = {
  id: string;
  label: string;
  placeholder: string;
};

export type InterviewPlanTask = {
  title: string;
  assignedTo: string;
  deadline: string;
  rationale: string;
  weight: number;
};

export type InterviewWizardAnswers = {
  projectIdea: string;
  targetUsers: string;
  successCriteria: string;
  constraints: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
  infraStack: string;
  architectureStyle: string;
  modules: string;
  apiStyle: string;
  dataNotes: string;
  taskMode: "suggested" | "manual";
  manualTaskText: string;
  distributionMode: "suggested" | "manual";
};

export type InterviewStageSuggestion = {
  summary: string;
  recommendations: string[];
  fields?: Partial<InterviewWizardAnswers>;
};

export type InterviewProjectPlan = {
  summary: string;
  kickoff: string;
  recommendations: string[];
  tasks: InterviewPlanTask[];
};

export async function generateInterviewQuestions(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
}) {
  const text = await runPuterProjectPrompt({
    ...args,
    userPrompt:
      'Return JSON only with { "questions": [{ "id": "...", "label": "...", "placeholder": "..." }] }. Generate 4 short project interview questions to clarify scope, stack, architecture, timeline, and priorities.',
    onChunk: () => {},
  });

  const parsed = extractJsonPayload(text) as { questions?: InterviewQuestion[] };
  return parsed.questions?.length
    ? parsed.questions
    : [
        { id: "stack", label: "Quelles technologies principales allez-vous utiliser ?", placeholder: "Ex: React, Node.js, PostgreSQL..." },
        { id: "goal", label: "Quel est l'objectif principal du projet ?", placeholder: "Ex: livrer un MVP CRM pour..." },
        { id: "priority", label: "Quelle est la priorité technique actuelle ?", placeholder: "Ex: auth, dashboard, API..." },
        { id: "deadline", label: "Quelle contrainte de temps faut-il respecter ?", placeholder: "Ex: demo client dans 3 semaines" },
      ];
}

function buildInterviewAnswerBlock(answers: InterviewWizardAnswers) {
  return [
    `Project idea: ${answers.projectIdea || "not defined"}`,
    `Target users: ${answers.targetUsers || "not defined"}`,
    `Success criteria: ${answers.successCriteria || "not defined"}`,
    `Constraints: ${answers.constraints || "not defined"}`,
    `Frontend stack: ${answers.frontendStack || "not defined"}`,
    `Backend stack: ${answers.backendStack || "not defined"}`,
    `Database: ${answers.databaseStack || "not defined"}`,
    `Infrastructure: ${answers.infraStack || "not defined"}`,
    `Architecture style: ${answers.architectureStyle || "not defined"}`,
    `Main modules: ${answers.modules || "not defined"}`,
    `API style: ${answers.apiStyle || "not defined"}`,
    `Data notes: ${answers.dataNotes || "not defined"}`,
    `Task mode: ${answers.taskMode}`,
    `Manual tasks: ${answers.manualTaskText || "none"}`,
    `Distribution mode: ${answers.distributionMode}`,
  ].join("\n");
}

export async function generateInterviewStageSuggestion(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  stage: "project" | "stack" | "architecture";
  answers: InterviewWizardAnswers;
}) {
  const stagePrompt =
    args.stage === "project"
      ? [
          "Act as a senior software engineer and project manager.",
          "Analyze the project idea and refine it.",
          'Return JSON only with shape: { "summary": "...", "recommendations": ["..."], "fields": { "targetUsers": "...", "successCriteria": "...", "constraints": "..." } }',
          "Recommend a sharper product definition, clearer target users, and realistic constraints.",
        ].join("\n")
      : args.stage === "stack"
        ? [
            "Act as a senior software architect.",
            "Recommend the most coherent tech stack for the project idea.",
            'Return JSON only with shape: { "summary": "...", "recommendations": ["..."], "fields": { "frontendStack": "...", "backendStack": "...", "databaseStack": "...", "infraStack": "..." } }',
            "Favor practical, production-ready choices and keep them aligned with the project scope.",
          ].join("\n")
        : [
            "Act as a lead architect and engineering manager.",
            "Recommend an architecture for this project.",
            'Return JSON only with shape: { "summary": "...", "recommendations": ["..."], "fields": { "architectureStyle": "...", "modules": "...", "apiStyle": "...", "dataNotes": "..." } }',
            "Keep the architecture simple, scalable enough for the scope, and easy for a small team to execute.",
          ].join("\n");

  const text = await runPuterProjectPrompt({
    currentProjectName: args.currentProjectName,
    members: args.members,
    tasks: args.tasks,
    commits: args.commits,
    userPrompt: [stagePrompt, "", buildInterviewAnswerBlock(args.answers)].join("\n"),
    onChunk: () => {},
  });

  const parsed = extractJsonPayload(text) as InterviewStageSuggestion;
  return {
    summary: parsed.summary || "Suggestion AI generee.",
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    fields: parsed.fields || {},
  } satisfies InterviewStageSuggestion;
}

export async function generateInterviewTaskPlan(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  answers: Record<string, string>;
}) {
  const answerBlock = Object.entries(args.answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const text = await runPuterProjectPrompt({
    currentProjectName: args.currentProjectName,
    members: args.members,
    tasks: args.tasks,
    commits: args.commits,
    userPrompt: [
      "Based on the project context and the interview answers below, recommend a task distribution across contributors.",
      "Return JSON only in this exact shape:",
      '{ "summary": "...", "tasks": [{ "title": "...", "assignedTo": "member name", "deadline": "YYYY-MM-DD", "rationale": "...", "weight": 10 }] }',
      "Generate 4 to 6 tasks max. Use the existing contributors when possible.",
      "",
      answerBlock,
    ].join("\n"),
    onChunk: () => {},
  });

  const parsed = extractJsonPayload(text) as {
    summary?: string;
    tasks?: InterviewPlanTask[];
  };

  return {
    summary: parsed.summary || "Plan de taches genere par l'AI.",
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  };
}

export async function generateInterviewProjectPlan(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  answers: InterviewWizardAnswers;
}) {
  const text = await runPuterProjectPrompt({
    currentProjectName: args.currentProjectName,
    members: args.members,
    tasks: args.tasks,
    commits: args.commits,
    userPrompt: [
      "Act as a senior software engineer and project manager.",
      "Based on the project definition, stack, architecture, and team members, generate an initial execution plan.",
      'Return JSON only with this exact shape: { "summary": "...", "kickoff": "...", "recommendations": ["..."], "tasks": [{ "title": "...", "assignedTo": "member name", "deadline": "YYYY-MM-DD", "rationale": "...", "weight": 10 }] }',
      "The project must start at 0% progress.",
      "Tasks should be practical, ordered for a real kickoff, and balanced across contributors when possible.",
      "If taskMode is manual, integrate the manual tasks into the final plan and improve them.",
      "If distributionMode is suggested, optimize the assignment for balance and skill fit.",
      "Generate 5 to 8 tasks max.",
      "",
      buildInterviewAnswerBlock(args.answers),
    ].join("\n"),
    onChunk: () => {},
  });

  const parsed = extractJsonPayload(text) as InterviewProjectPlan;
  return {
    summary: parsed.summary || "Plan projet genere par l'AI.",
    kickoff: parsed.kickoff || "Commencer par cadrer le projet, valider la stack et ouvrir les premiers chantiers techniques.",
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  } satisfies InterviewProjectPlan;
}

export type MonitorSnapshot = {
  summary: string;
  nextAction: string;
  insights: Insight[];
  lastRunAt: string;
};

export async function runPuterMonitoringAnalysis(args: {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
}) {
  const text = await runPuterProjectPrompt({
    ...args,
    userPrompt: [
      "Analyze project progress and anomalies.",
      "Return JSON only in this exact shape:",
      '{ "summary": "...", "nextAction": "...", "insights": [{ "id": "...", "type": "warning", "message": "..." }] }',
      "Provide 2 or 3 insights max. Use danger/warning/info as types. Mention only real anomalies or notable risks.",
    ].join("\n"),
    onChunk: () => {},
  });

  const parsed = extractJsonPayload(text) as {
    summary?: string;
    nextAction?: string;
    insights?: Insight[];
  };

  return {
    summary: parsed.summary || "Analyse AI terminee.",
    nextAction: parsed.nextAction || "Continuer le suivi de l'avancement.",
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    lastRunAt: new Date().toISOString(),
  } satisfies MonitorSnapshot;
}

export async function suggestTaskForCommit(args: {
  commitMessage: string;
  commitSha: string;
  tasks: Task[];
  projectName: string;
}): Promise<string | null> {
  const puter = getPuter();
  if (!puter || !puter.auth.isSignedIn()) return null;
  if (args.tasks.length === 0) return null;

  const taskList = args.tasks
    .map((t) => `id=${t.id} | title=${t.title} | progress=${t.progress}% | status=${t.status}`)
    .join("\n");

  const prompt = [
    `Projet: ${args.projectName}`,
    `Taches existantes:\n${taskList}`,
    "",
    `Nouveau commit (sha: ${args.commitSha}): "${args.commitMessage}"`,
    "",
    `Quel id de tache correspond le mieux a ce commit ?`,
    `Reponds UNIQUEMENT en JSON: { "taskId": "..." }`,
    `Si aucune tache ne correspond, reponds: { "taskId": "" }`,
    `Utilise uniquement les ids de la liste ci-dessus.`,
  ].join("\n");

  try {
    const response = await puter.ai.chat(prompt, { model: "gpt-5.4-nano", stream: false });
    const text = typeof response === "string" ? response : "";
    const parsed = extractJsonPayload(text) as { taskId?: string };
    const suggested = parsed.taskId || "";
    if (suggested && args.tasks.some((t) => t.id === suggested)) {
      return suggested;
    }
    return null;
  } catch {
    return null;
  }
}
