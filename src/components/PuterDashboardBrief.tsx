import { useState } from "react";
import { BrainCircuit, LoaderCircle, ShieldAlert, Sparkles } from "lucide-react";
import { Commit, Member, Task } from "../data/mock";
import { runPuterProjectPrompt } from "../lib/aiContext";
import { Badge, Button, Card } from "./ui";
import { FormattedAIText } from "./FormattedAIText";

interface PuterDashboardBriefProps {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
}

export function PuterDashboardBrief({ currentProjectName, members, tasks, commits }: PuterDashboardBriefProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<string>("");
  const [activeMode, setActiveMode] = useState<"brief" | "risk" | "next" | null>(null);

  const presets = [
    {
      id: "brief" as const,
      label: "Brief AI",
      prompt: "Donne-moi un brief executif du projet avec les sections Resume:, Points forts:, Points faibles:, Priorites:, en listes courtes.",
    },
    {
      id: "risk" as const,
      label: "Risques",
      prompt: "Identifie les risques principaux du projet avec les sections Risques:, Impact:, Actions:, sous forme de points courts.",
    },
    {
      id: "next" as const,
      label: "Next action",
      prompt: "Donne la prochaine action la plus utile avec les sections Priorite:, Pourquoi:, Execution immediate:, sous forme de points.",
    },
  ];

  const generate = async (mode: "brief" | "risk" | "next", prompt: string) => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setBrief("");
    setActiveMode(mode);

    try {
      await runPuterProjectPrompt({
        currentProjectName,
        members,
        tasks,
        commits,
        userPrompt: prompt,
        onChunk: setBrief,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur AI inconnue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 border-[#1f6feb30] bg-gradient-to-b from-[#1f6feb10] to-transparent">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-4 h-4 text-gh-blue" />
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider">AI Layer</h2>
          </div>
          <p className="text-sm text-gh-muted">
            Analyse rapide du projet courant avec Puter, directement depuis le dashboard.
          </p>
        </div>
        <Badge variant="outline">Live AI</Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => void generate(preset.id, preset.prompt)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-gh-border text-xs text-gh-muted hover:text-gh-text hover:border-gh-blue transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            {preset.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gh-border bg-gh-bg min-h-[168px] p-4">
        {!brief && !loading && !error && (
          <div className="h-full flex items-center gap-3 text-sm text-gh-muted">
            <ShieldAlert className="w-4 h-4" />
            Lancez un brief AI, une analyse de risques ou une next action.
          </div>
        )}

        {(loading || brief) && (
          <div>
            <div className="flex items-center gap-2 text-xs text-gh-muted uppercase tracking-wider mb-3">
              {loading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-gh-blue" />}
              {activeMode === "risk" ? "Analyse de risques" : activeMode === "next" ? "Next action" : "Brief executif"}
            </div>
            <FormattedAIText text={brief || "Analyse en cours..."} />
          </div>
        )}

        {error && <div className="text-sm text-gh-danger">{error}</div>}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => void generate("brief", "Resume le projet avec les sections Resume:, Risques:, Recommandations:, Prochaine etape:, en listes courtes.")}
          disabled={loading}
        >
          {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
          Rafraichir l'analyse
        </Button>
      </div>
    </Card>
  );
}
