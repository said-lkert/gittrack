import { useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, Github, Rocket, Settings, Target, Users } from "lucide-react";
import { Project } from "../lib/store";
import { Button, Card, Switch } from "./ui";

interface ProjectCreationWizardProps {
  onComplete: (project: Project) => void;
  onCancel: () => void;
}

const today = new Date().toISOString().slice(0, 10);
const inThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const STEPS = [
  { id: "identity", title: "Identité", icon: <Rocket className="w-4 h-4" /> },
  { id: "timeline", title: "Timeline", icon: <CalendarRange className="w-4 h-4" /> },
  { id: "source", title: "Source", icon: <Github className="w-4 h-4" /> },
  { id: "team", title: "Équipe", icon: <Users className="w-4 h-4" /> },
  { id: "rules", title: "Règles", icon: <Settings className="w-4 h-4" /> },
  { id: "review", title: "Validation", icon: <CheckCircle2 className="w-4 h-4" /> },
];

export function ProjectCreationWizard({ onComplete, onCancel }: ProjectCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectType: "Web App",
    objective: "",
    startDate: today,
    endDate: inThirtyDays,
    repoUrl: "",
    branch: "main",
    aiEnabled: true,
    alertThreshold: 3,
  });

  const durationInDays = useMemo(() => {
    const start = new Date(formData.startDate).getTime();
    const end = new Date(formData.endDate).getTime();
    const diff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    return Math.max(diff, 0);
  }, [formData.endDate, formData.startDate]);

  const updateForm = (updates: Partial<typeof formData>) => setFormData((current) => ({ ...current, ...updates }));

  const isStepValid = () => {
    if (currentStep === 0) return formData.name.trim().length > 0 && formData.objective.trim().length > 0;
    if (currentStep === 1) return durationInDays > 0;
    if (currentStep === 2) return formData.repoUrl.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep === 2) {
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setCurrentStep((current) => Math.min(current + 1, STEPS.length - 1));
      }, 900);
      return;
    }
    setCurrentStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleFinish = () => {
    onComplete({
      id: `project_${Date.now()}`,
      name: formData.name || "Nouveau Projet",
      description: formData.description,
      repoUrl: formData.repoUrl,
      branch: formData.branch,
      projectType: formData.projectType,
      objective: formData.objective,
      startDate: formData.startDate,
      endDate: formData.endDate,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      members: [],
      tasks: [],
      commits: [],
      settings: {
        aiEnabled: formData.aiEnabled,
        alertThreshold: formData.alertThreshold,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gh-bg text-gh-text flex flex-col">
      <header className="h-16 border-b border-gh-border bg-gh-header flex items-center px-4 md:px-8 justify-between shrink-0 sticky top-0 z-50">
        <button onClick={onCancel} className="text-gh-muted hover:text-gh-text transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="font-semibold text-sm">Création de projet</div>
        <div className="w-20" />
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-6xl w-full mx-auto p-4 md:p-8 gap-8 md:gap-12">
        <div className="md:w-64 shrink-0">
          <div className="sticky top-24 space-y-1">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isPast = index < currentStep;
              return (
                <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? "bg-[#1f6feb15] text-gh-blue" : isPast ? "text-gh-text" : "text-gh-muted"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${isActive ? "border-gh-blue bg-gh-bg" : isPast ? "border-gh-success-text bg-gh-success-text text-white" : "border-gh-border bg-gh-bg"}`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-semibold opacity-70">Étape {index + 1}</span>
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-2xl">
          <Card className="p-6 md:p-8 min-h-[460px] flex flex-col relative overflow-hidden">
            {currentStep === 0 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Identité du projet</h2>
                  <p className="text-gh-muted">Définissez le cadre initial du projet avant la connexion au repo.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Nom du projet *</label>
                    <input type="text" value={formData.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Ex: CRM PFE" className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all" autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Type de projet</label>
                    <select value={formData.projectType} onChange={(e) => updateForm({ projectType: e.target.value })} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all">
                      <option>Web App</option>
                      <option>Mobile App</option>
                      <option>Backend API</option>
                      <option>Data Platform</option>
                      <option>Internal Tool</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Objectif principal *</label>
                    <div className="relative">
                      <Target className="w-4 h-4 absolute left-3 top-3 text-gh-muted" />
                      <textarea value={formData.objective} onChange={(e) => updateForm({ objective: e.target.value })} placeholder="Ex: livrer un CRM collaboratif avec suivi GitHub temps réel" className="w-full bg-gh-bg border border-gh-border rounded-md pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all min-h-[90px] resize-y" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Description</label>
                    <textarea value={formData.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Contexte, périmètre, contraintes, attentes..." className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all min-h-[100px] resize-y" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Durée du projet</h2>
                  <p className="text-gh-muted">GitTrack utilisera cette fenêtre pour le suivi du temps restant, des risques et des alertes.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Date de début</label>
                    <input type="date" value={formData.startDate} onChange={(e) => updateForm({ startDate: e.target.value })} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Date de fin</label>
                    <input type="date" value={formData.endDate} onChange={(e) => updateForm({ endDate: e.target.value })} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all" />
                  </div>
                </div>
                <div className="bg-gh-bg border border-gh-border rounded-lg p-4">
                  <div className="text-xs text-gh-muted uppercase tracking-wider mb-2">Synthèse timeline</div>
                  <div className="text-lg font-semibold text-gh-text">{durationInDays} jour(s)</div>
                  <div className="text-sm text-gh-muted mt-1">De {formData.startDate} à {formData.endDate}</div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Connexion source</h2>
                  <p className="text-gh-muted">Liez votre repository GitHub. Les commits, contributeurs et métadonnées du repo alimenteront automatiquement l’interface.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">URL du repository GitHub *</label>
                    <div className="relative">
                      <Github className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gh-muted" />
                      <input type="url" value={formData.repoUrl} onChange={(e) => updateForm({ repoUrl: e.target.value })} placeholder="https://github.com/org/repo" className="w-full bg-gh-bg border border-gh-border rounded-md pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Branche principale</label>
                    <select value={formData.branch} onChange={(e) => updateForm({ branch: e.target.value })} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all">
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                    </select>
                  </div>
                </div>
                {isConnecting && (
                  <div className="absolute inset-0 bg-gh-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
                    <div className="w-8 h-8 border-4 border-gh-blue/30 border-t-gh-blue rounded-full animate-spin mb-4" />
                    <p className="font-medium">Vérification de l’accès au repository...</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Équipe</h2>
                  <p className="text-gh-muted">Les contributeurs GitHub seront importés automatiquement. Vous pourrez ensuite enrichir les rôles et ajouter d’autres membres si besoin.</p>
                </div>
                <div className="border border-gh-border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gh-bg/50">
                  <div className="w-12 h-12 bg-[#1f6feb15] text-gh-blue rounded-full flex items-center justify-center mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium mb-2">Import automatique des collaborateurs</h3>
                  <p className="text-sm text-gh-muted max-w-sm">Le dashboard utilisera les contributeurs, derniers commits et activité réelle du repo dès la création du projet.</p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Règles & intelligence</h2>
                  <p className="text-gh-muted">Définissez le niveau de suivi initial et les signaux d’alerte pour ce projet.</p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4 p-4 border border-gh-border rounded-lg bg-gh-bg">
                    <div>
                      <p className="font-medium text-sm mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gh-blue" />
                        Analyse IA des commits
                      </p>
                      <p className="text-xs text-gh-muted">Utiliser l’IA pour enrichir l’analyse de progression, d’activité et de risque.</p>
                    </div>
                    <Switch checked={formData.aiEnabled} onChange={(checked) => updateForm({ aiEnabled: checked })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gh-text mb-1.5">Seuil d’alerte d’inactivité</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min="1" max="30" value={formData.alertThreshold} onChange={(e) => updateForm({ alertThreshold: Number(e.target.value) })} className="w-24 bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gh-blue" />
                      <span className="text-sm text-gh-muted">jours sans activité avant alerte</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Prêt à démarrer</h2>
                  <p className="text-gh-muted">Vérifiez les informations avant de créer le projet.</p>
                </div>
                <div className="bg-gh-bg border border-gh-border rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b border-gh-border pb-4"><div className="col-span-1 text-sm text-gh-muted">Nom</div><div className="col-span-2 text-sm font-medium">{formData.name}</div></div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gh-border pb-4"><div className="col-span-1 text-sm text-gh-muted">Type</div><div className="col-span-2 text-sm font-medium">{formData.projectType}</div></div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gh-border pb-4"><div className="col-span-1 text-sm text-gh-muted">Objectif</div><div className="col-span-2 text-sm font-medium">{formData.objective}</div></div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gh-border pb-4"><div className="col-span-1 text-sm text-gh-muted">Timeline</div><div className="col-span-2 text-sm font-medium">{formData.startDate} → {formData.endDate} ({durationInDays} jours)</div></div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gh-border pb-4"><div className="col-span-1 text-sm text-gh-muted">Source</div><div className="col-span-2 text-sm font-medium">{formData.repoUrl} ({formData.branch})</div></div>
                  <div className="grid grid-cols-3 gap-4"><div className="col-span-1 text-sm text-gh-muted">Analyse IA</div><div className="col-span-2 text-sm font-medium">{formData.aiEnabled ? "Activée" : "Désactivée"}</div></div>
                </div>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-gh-border flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep((current) => Math.max(current - 1, 0))} className={currentStep === 0 ? "invisible" : ""}>
                Précédent
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button variant="primary" onClick={handleNext} disabled={!isStepValid() || isConnecting}>
                  Continuer <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleFinish}>
                  <Rocket className="w-4 h-4" />
                  Créer le projet
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
