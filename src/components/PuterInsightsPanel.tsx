import { useEffect, useState } from "react";
import { Bot, BrainCircuit, LoaderCircle, RefreshCcw, Send, Sparkles } from "lucide-react";
import { Commit, Member, Task } from "../data/mock";
import { runPuterProjectPrompt } from "../lib/aiContext";
import { getPuter, PuterUser } from "../lib/puter";
import { Badge, Button, Card } from "./ui";
import { FormattedAIText } from "./FormattedAIText";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

interface PuterInsightsPanelProps {
  currentProjectName: string;
  members: Member[];
  tasks: Task[];
  commits: Commit[];
}

export function PuterInsightsPanel({ currentProjectName, members, tasks, commits }: PuterInsightsPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puterUser, setPuterUser] = useState<PuterUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const puter = getPuter();
    if (!puter?.auth?.isSignedIn?.()) {
      setPuterUser(null);
      return;
    }

    puter.auth
      .getUser()
      .then((user) => setPuterUser(user))
      .catch(() => setPuterUser(null));
  }, []);

  const suggestions = [
    "Resume le projet en 5 points clairs.",
    "Donne-moi les risques actuels du projet.",
    "Quelles actions prioritaires recommandes-tu cette semaine ?",
  ];

  const runPrompt = async (rawPrompt: string) => {
    const input = rawPrompt.trim();
    if (!input || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: input,
    };

    const assistantId = `assistant_${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", text: "" }]);
    setPrompt("");
    setError(null);
    setLoading(true);

    try {
      await runPuterProjectPrompt({
        currentProjectName,
        members,
        tasks,
        commits,
        userPrompt: input,
        forcePuterSignIn: false,
        onChunk: (fullText) => {
          setMessages((current) =>
            current.map((message) => (message.id === assistantId ? { ...message, text: fullText } : message)),
          );
        },
      });

      const puter = getPuter();
      if (puter?.auth?.isSignedIn?.()) {
        const user = await puter.auth.getUser();
        setPuterUser(user);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur Puter inconnue.";
      setError(message);
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, text: `[Erreur] ${message}` } : item)),
      );
    } finally {
      setLoading(false);
    }
  };

  const reconnectPuter = async () => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter n'est pas charge dans l'application.");
      return;
    }

    setAuthLoading(true);
    setError(null);
    try {
      if (puter.auth.isSignedIn()) {
        await puter.auth.signOut();
      }
      await puter.auth.signIn();
      const user = await puter.auth.getUser();
      setPuterUser(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de changer de compte Puter.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <Card className="p-5 border-[#1f6feb30] bg-gradient-to-b from-[#1f6feb10] to-transparent">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="w-4 h-4 text-gh-blue" />
            <h2 className="text-sm font-semibold text-gh-text uppercase tracking-wider">Puter AI Copilot</h2>
          </div>
          <p className="text-sm text-gh-muted">
            Analyse interactive du projet courant avec Puter.js et le contexte GitTrack.
          </p>
          <p className="text-xs text-gh-muted mt-2">
            Compte Puter: {puterUser?.username || puterUser?.email || "non connecte"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Puter</Badge>
          <Button variant="default" size="sm" onClick={() => void reconnectPuter()} disabled={authLoading || loading}>
            {authLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Changer de compte
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void runPrompt(suggestion)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-gh-border text-xs text-gh-muted hover:text-gh-text hover:border-gh-blue transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            {suggestion}
          </button>
        ))}
      </div>

      <div className="border border-gh-border rounded-xl bg-gh-bg overflow-hidden">
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-gh-muted flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Posez une question sur votre projet pour obtenir une analyse AI contextualisee.
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  message.role === "user"
                    ? "max-w-[88%] rounded-2xl rounded-br-md bg-[#1f6feb26] border border-[#1f6feb40] px-4 py-3 text-sm text-gh-text whitespace-pre-wrap"
                    : "max-w-[88%] rounded-2xl rounded-bl-md bg-gh-card border border-gh-border px-4 py-3 text-sm text-gh-text"
                }
              >
                {message.role === "assistant" ? (
                  <FormattedAIText text={message.text || (loading ? "Analyse en cours..." : "")} />
                ) : (
                  message.text || (loading && message.role === "user" ? "Analyse en cours..." : "")
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gh-border p-3">
          <div className="flex gap-3">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex: quelles sont les zones de risque de ce projet ?"
              className="min-h-[92px] flex-1 rounded-xl bg-gh-card border border-gh-border px-3 py-2 text-sm text-gh-text placeholder:text-gh-muted focus:outline-none focus:border-gh-blue resize-none"
            />
            <Button
              variant="primary"
              onClick={() => void runPrompt(prompt)}
              disabled={loading || !prompt.trim()}
              className="self-end"
            >
              {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Analyser
            </Button>
          </div>
          {error && <div className="mt-3 text-sm text-gh-danger">{error}</div>}
        </div>
      </div>
    </Card>
  );
}
