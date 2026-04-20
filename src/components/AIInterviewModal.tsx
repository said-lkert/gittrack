import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, ClipboardList, LoaderCircle, Sparkles, Wand2, X } from "lucide-react";
import { Commit, Member, Task } from "../data/mock";
import {
  generateInterviewProjectPlan,
  generateInterviewStageSuggestion,
  InterviewPlanTask,
  InterviewProjectPlan,
  InterviewWizardAnswers,
} from "../lib/aiContext";
import { Button, Card } from "./ui";

interface AIInterviewModalProps {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  onClose: () => void;
  onApply: (tasks: Task[]) => void;
}

const STEPS = [
  { id: "project", title: "Projet" },
  { id: "stack", title: "Stack" },
  { id: "architecture", title: "Architecture" },
  { id: "tasks", title: "Taches" },
  { id: "distribution", title: "Repartition" },
] as const;

function createInitialAnswers(): InterviewWizardAnswers {
  return {
    projectIdea: "",
    targetUsers: "",
    successCriteria: "",
    constraints: "",
    frontendStack: "",
    backendStack: "",
    databaseStack: "",
    infraStack: "",
    architectureStyle: "",
    modules: "",
    apiStyle: "",
    dataNotes: "",
    taskMode: "suggested",
    manualTaskText: "",
    distributionMode: "suggested",
  };
}

function formatDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function AIInterviewModal({ currentProjectName, members, tasks, commits, onClose, onApply }: AIInterviewModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<InterviewWizardAnswers>(createInitialAnswers);
  const [stageSummary, setStageSummary] = useState<string | null>(null);
  const [stageRecommendations, setStageRecommendations] = useState<string[]>([]);
  const [stageLoading, setStageLoading] = useState<false | "project" | "stack" | "architecture">(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectPlan, setProjectPlan] = useState<InterviewProjectPlan | null>(null);
  const [draftTasks, setDraftTasks] = useState<InterviewPlanTask[]>([]);

  const step = STEPS[stepIndex];
  const memberOptions = useMemo(() => members.map((member) => member.name), [members]);

  const updateAnswer = (key: keyof InterviewWizardAnswers, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const applyStageSuggestion = async (stage: "project" | "stack" | "architecture") => {
    setStageLoading(stage);
    setError(null);
    try {
      const suggestion = await generateInterviewStageSuggestion({
        currentProjectName,
        members,
        tasks,
        commits,
        stage,
        answers,
      });

      setStageSummary(suggestion.summary);
      setStageRecommendations(suggestion.recommendations);
      if (suggestion.fields) {
        setAnswers((current) => ({ ...current, ...suggestion.fields }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de generer la suggestion AI.");
    } finally {
      setStageLoading(false);
    }
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    setError(null);
    try {
      const result = await generateInterviewProjectPlan({
        currentProjectName,
        members,
        tasks,
        commits,
        answers,
      });
      setProjectPlan(result);
      setDraftTasks(result.tasks);
      setStageSummary(result.kickoff);
      setStageRecommendations(result.recommendations);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de generer le plan projet AI.");
    } finally {
      setPlanLoading(false);
    }
  };

  const applyPlan = () => {
    const mapped: Task[] = draftTasks.map((task, index) => {
      const matchedMember =
        members.find((item) => item.name.toLowerCase() === task.assignedTo.toLowerCase()) ||
        members[index % Math.max(members.length, 1)];

      return {
        id: `ai_task_${Date.now()}_${index}`,
        title: task.title,
        assigneeIds: matchedMember ? [matchedMember.id] : [],
        progress: 0,
        deadline: task.deadline || formatDateOffset(14 + index * 3),
        status: "on_track",
        weight: Math.max(5, Math.min(30, task.weight || 10)),
      };
    });

    onApply(mapped);
    onClose();
  };

  const renderProjectStep = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gh-text mb-1.5">Idee du projet</label>
        <textarea
          value={answers.projectIdea}
          onChange={(event) => updateAnswer("projectIdea", event.target.value)}
          placeholder="Decrivez l'idee, le probleme a resoudre et le resultat attendu."
          className="w-full min-h-[110px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Utilisateurs cibles</label>
          <textarea
            value={answers.targetUsers}
            onChange={(event) => updateAnswer("targetUsers", event.target.value)}
            placeholder="Ex: PME, medecins, etudiants, admin interne..."
            className="w-full min-h-[90px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Succes attendu</label>
          <textarea
            value={answers.successCriteria}
            onChange={(event) => updateAnswer("successCriteria", event.target.value)}
            placeholder="Ex: MVP en 4 semaines, auth + dashboard + reporting..."
            className="w-full min-h-[90px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gh-text mb-1.5">Contraintes</label>
        <textarea
          value={answers.constraints}
          onChange={(event) => updateAnswer("constraints", event.target.value)}
          placeholder="Temps, budget, demo, hebergement, securite, equipe..."
          className="w-full min-h-[90px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
        />
      </div>
    </div>
  );

  const renderStackStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Frontend</label>
          <input
            value={answers.frontendStack}
            onChange={(event) => updateAnswer("frontendStack", event.target.value)}
            placeholder="Ex: React, Vite, Tailwind"
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Backend</label>
          <input
            value={answers.backendStack}
            onChange={(event) => updateAnswer("backendStack", event.target.value)}
            placeholder="Ex: Node.js, Express, NestJS"
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Base de donnees</label>
          <input
            value={answers.databaseStack}
            onChange={(event) => updateAnswer("databaseStack", event.target.value)}
            placeholder="Ex: PostgreSQL, Prisma"
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Infra / DevOps</label>
          <input
            value={answers.infraStack}
            onChange={(event) => updateAnswer("infraStack", event.target.value)}
            placeholder="Ex: Docker, Vercel, Render, GitHub Actions"
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
      </div>
    </div>
  );

  const renderArchitectureStep = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gh-text mb-1.5">Style d'architecture</label>
        <input
          value={answers.architectureStyle}
          onChange={(event) => updateAnswer("architectureStyle", event.target.value)}
          placeholder="Ex: monolithe modulaire, services separes, clean architecture..."
          className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gh-text mb-1.5">Modules principaux</label>
        <textarea
          value={answers.modules}
          onChange={(event) => updateAnswer("modules", event.target.value)}
          placeholder="Ex: auth, dashboard, API repo, reporting, notifications..."
          className="w-full min-h-[90px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Style API</label>
          <input
            value={answers.apiStyle}
            onChange={(event) => updateAnswer("apiStyle", event.target.value)}
            placeholder="Ex: REST, GraphQL, hybride"
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Notes donnees / securite</label>
          <input
            value={answers.dataNotes}
            onChange={(event) => updateAnswer("dataNotes", event.target.value)}
            placeholder="Ex: roles, journalisation, audit, multi-tenant..."
            className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
          />
        </div>
      </div>
    </div>
  );

  const renderTaskStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setAnswers((current) => ({ ...current, taskMode: "suggested" }))}
          className={`rounded-lg border p-4 text-left ${answers.taskMode === "suggested" ? "border-gh-blue bg-[#1f6feb12]" : "border-gh-border bg-gh-card"}`}
        >
          <div className="text-sm font-semibold text-gh-text mb-1">Taches suggerees par l'AI</div>
          <div className="text-xs text-gh-muted">L'AI construit le backlog initial a partir du projet, de la stack et de l'architecture.</div>
        </button>
        <button
          onClick={() => setAnswers((current) => ({ ...current, taskMode: "manual" }))}
          className={`rounded-lg border p-4 text-left ${answers.taskMode === "manual" ? "border-gh-blue bg-[#1f6feb12]" : "border-gh-border bg-gh-card"}`}
        >
          <div className="text-sm font-semibold text-gh-text mb-1">Je fournis une base manuelle</div>
          <div className="text-xs text-gh-muted">Vous donnez une liste brute et l'AI la structure, l'ameliore et la priorise.</div>
        </button>
      </div>

      {answers.taskMode === "manual" && (
        <div>
          <label className="block text-sm font-medium text-gh-text mb-1.5">Liste brute des taches</label>
          <textarea
            value={answers.manualTaskText}
            onChange={(event) => updateAnswer("manualTaskText", event.target.value)}
            placeholder={"Ex:\n- page login\n- API auth\n- schema base de donnees\n- dashboard admin"}
            className="w-full min-h-[180px] bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
          />
        </div>
      )}
    </div>
  );

  const renderDistributionStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setAnswers((current) => ({ ...current, distributionMode: "suggested" }))}
          className={`rounded-lg border p-4 text-left ${answers.distributionMode === "suggested" ? "border-gh-blue bg-[#1f6feb12]" : "border-gh-border bg-gh-card"}`}
        >
          <div className="text-sm font-semibold text-gh-text mb-1">Repartition AI equilibree</div>
          <div className="text-xs text-gh-muted">L'AI affecte les taches selon le profil des membres et l'equilibre de charge.</div>
        </button>
        <button
          onClick={() => setAnswers((current) => ({ ...current, distributionMode: "manual" }))}
          className={`rounded-lg border p-4 text-left ${answers.distributionMode === "manual" ? "border-gh-blue bg-[#1f6feb12]" : "border-gh-border bg-gh-card"}`}
        >
          <div className="text-sm font-semibold text-gh-text mb-1">Je valide puis j'ajuste</div>
          <div className="text-xs text-gh-muted">L'AI propose quand meme un plan, mais vous gardez la main totale sur les affectations.</div>
        </button>
      </div>

      <Card className="p-4 bg-gh-card">
        <div className="text-sm font-semibold text-gh-text mb-2">Equipe disponible</div>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <div key={member.id} className="px-3 py-2 rounded-md border border-gh-border bg-gh-bg text-sm text-gh-text">
              {member.name} <span className="text-gh-muted">- {member.role}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={() => void generatePlan()} disabled={planLoading}>
          {planLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generer le plan projet
        </Button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (step.id === "project") return renderProjectStep();
    if (step.id === "stack") return renderStackStep();
    if (step.id === "architecture") return renderArchitectureStep();
    if (step.id === "tasks") return renderTaskStep();
    return renderDistributionStep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gh-bg border border-gh-border rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden h-[96vh] sm:max-h-[94vh]" onClick={(event) => event.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gh-border flex items-center justify-between bg-gh-header">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-gh-blue" />
            <h2 className="text-lg font-semibold text-gh-text">Interview AI Engineer</h2>
          </div>
          <button onClick={onClose} className="text-gh-muted hover:text-gh-text"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-0 h-[calc(96vh-72px)] sm:max-h-[calc(94vh-72px)]">
          <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-5 border-b xl:border-b-0 xl:border-r border-gh-border min-h-0">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {STEPS.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setStepIndex(index)}
                  className={`rounded-lg border px-3 py-3 text-left ${index === stepIndex ? "border-gh-blue bg-[#1f6feb12]" : "border-gh-border bg-gh-card"}`}
                >
                  <div className="text-[11px] text-gh-muted uppercase tracking-wider">Etape {index + 1}</div>
                  <div className="text-sm font-semibold text-gh-text">{item.title}</div>
                </button>
              ))}
            </div>

            <Card className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm font-semibold text-gh-text">Configuration guidee</div>
                  <div className="text-xs text-gh-muted">
                    L&apos;AI agit comme un ingenieur et chef de projet pour cadrer, recommander et initialiser le projet a 0%.
                  </div>
                </div>

                {(step.id === "project" || step.id === "stack" || step.id === "architecture") && (
                  <Button
                    variant="secondary"
                    onClick={() => void applyStageSuggestion(step.id)}
                    disabled={stageLoading === step.id}
                  >
                    {stageLoading === step.id ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Suggere
                  </Button>
                )}
              </div>

              {renderStepContent()}

              {error && <div className="mt-4 text-sm text-gh-danger">{error}</div>}

              <div className="pt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0}>
                  <ArrowLeft className="w-4 h-4" />
                  Precedent
                </Button>
                <Button variant="primary" onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))} disabled={stepIndex === STEPS.length - 1}>
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-5 bg-gh-header/40 min-h-0">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-gh-blue" />
                <div className="text-sm font-semibold text-gh-text">Coach AI</div>
              </div>
              {stageSummary ? (
                <div className="text-sm text-gh-text leading-relaxed">{stageSummary}</div>
              ) : (
                <div className="text-sm text-gh-muted">
                  Utilisez les suggestions AI sur les etapes clefs, puis lancez la generation finale du plan projet.
                </div>
              )}

              {stageRecommendations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {stageRecommendations.map((item, index) => (
                    <div key={`${item}_${index}`} className="p-3 rounded-md border border-gh-border bg-gh-card text-sm text-gh-text">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-gh-success-text" />
                <div className="text-sm font-semibold text-gh-text">Plan d'initialisation</div>
              </div>

              {!projectPlan && (
                <div className="text-sm text-gh-muted">
                  A la fin des etapes, l&apos;AI generera :
                  <div className="mt-3 space-y-2">
                    <div className="p-3 rounded-md border border-gh-border bg-gh-card">un cadrage produit</div>
                    <div className="p-3 rounded-md border border-gh-border bg-gh-card">une stack recommandee</div>
                    <div className="p-3 rounded-md border border-gh-border bg-gh-card">une architecture de depart</div>
                    <div className="p-3 rounded-md border border-gh-border bg-gh-card">des taches initiales a 0%</div>
                    <div className="p-3 rounded-md border border-gh-border bg-gh-card">une repartition equilibree par membre</div>
                  </div>
                </div>
              )}

              {projectPlan && (
                <div className="space-y-4">
                  <div className="p-3 rounded-md border border-[#1f6feb30] bg-[#1f6feb12] text-sm text-gh-text">
                    {projectPlan.summary}
                  </div>
                  <div className="p-3 rounded-md border border-[#23863640] bg-[#23863615] text-sm text-gh-text flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gh-success-text shrink-0 mt-0.5" />
                    <span>{projectPlan.kickoff}</span>
                  </div>

                  <div className="space-y-3">
                    {draftTasks.map((task, index) => (
                      <div key={`${task.title}_${index}`} className="rounded-lg border border-gh-border bg-gh-card p-4 space-y-3">
                        <input
                          value={task.title}
                          onChange={(event) => setDraftTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                          className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            value={task.assignedTo}
                            onChange={(event) => setDraftTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assignedTo: event.target.value } : item))}
                            className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
                          >
                            {memberOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <input
                            type="date"
                            value={task.deadline}
                            onChange={(event) => setDraftTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, deadline: event.target.value } : item))}
                            className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
                          />
                          <input
                            type="number"
                            value={task.weight}
                            onChange={(event) => setDraftTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, weight: Number(event.target.value) } : item))}
                            className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
                          />
                        </div>
                        <textarea
                          value={task.rationale}
                          onChange={(event) => setDraftTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, rationale: event.target.value } : item))}
                          className="w-full min-h-[72px] bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue resize-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Fermer</Button>
                    <Button variant="primary" onClick={applyPlan} disabled={draftTasks.length === 0}>
                      Appliquer et initialiser le projet
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
