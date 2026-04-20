import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, GitCommit, Github, Mail, Users } from "lucide-react";

interface WelcomeScreenProps {
  authError?: string | null;
}

function formatAuthError(error: string) {
  const decoded = decodeURIComponent(error).replace(/\+/g, " ");

  if (decoded.includes("redirect_uri")) {
    return "La redirection OAuth ne correspond pas a la configuration du provider.";
  }

  if (decoded.includes("bad_verification_code")) {
    return "Le code OAuth GitHub est invalide ou a expire. Relancez la connexion.";
  }

  if (decoded.includes("incorrect_client_credentials") || decoded.includes("client_secret")) {
    return "Les identifiants OAuth sont invalides. Verifiez le client ID et le client secret.";
  }

  if (decoded.includes("invalid_state")) {
    return "La session OAuth a expire ou l'etat de securite est invalide. Relancez la connexion.";
  }

  return decoded;
}

export function WelcomeScreen({ authError }: WelcomeScreenProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showGitHubChoice, setShowGitHubChoice] = useState(false);
  const [recentlyLoggedOutGitHub, setRecentlyLoggedOutGitHub] = useState(false);
  const [switchAccountHelp, setSwitchAccountHelp] = useState(false);

  useEffect(() => {
    const shouldPrompt = sessionStorage.getItem("gittrack_force_github_choice") === "1";
    setRecentlyLoggedOutGitHub(shouldPrompt);
    setShowGitHubChoice(shouldPrompt);
  }, []);

  const authErrorMessage = useMemo(() => (authError ? formatAuthError(authError) : null), [authError]);

  const startGitHubAuth = () => {
    setIsLoading("github");
    sessionStorage.removeItem("gittrack_force_github_choice");
    window.location.assign("/auth/github");
  };

  const handleLogin = (provider: string) => {
    setIsLoading(provider);

    if (provider === "github") {
      if (recentlyLoggedOutGitHub) {
        setShowGitHubChoice(true);
        setIsLoading(null);
        return;
      }

      startGitHubAuth();
      return;
    }

    if (provider === "google") {
      window.location.href = "/auth/google";
      return;
    }

    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gh-bg text-gh-text flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gh-blue/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gh-success/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f6feb26] text-gh-blue text-xs font-semibold tracking-wide mb-6">
              <span className="w-2 h-2 rounded-full bg-gh-blue animate-pulse" />
              PROJECT BOOTSTRAP
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Configurez vos projets <span className="text-transparent bg-clip-text bg-gradient-to-r from-gh-blue to-cyan-300">GitHub</span> avant d&apos;entrer
            </h1>
            <p className="text-lg text-gh-muted leading-relaxed">
              GitTrack prepare votre espace de travail, connecte votre repository, structure vos membres et deverrouille un suivi live des commits et de l&apos;activite.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <GitCommit className="w-5 h-5 text-gh-blue" />, text: "Connexions GitHub et commits temps reel" },
              { icon: <Activity className="w-5 h-5 text-gh-success-text" />, text: "Parcours de creation projet par niveaux" },
              { icon: <Users className="w-5 h-5 text-cyan-300" />, text: "Selection de projet si vous en gerez plusieurs" },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 bg-gh-card/50 border border-gh-border p-3 rounded-lg backdrop-blur-sm">
                <div className="p-2 bg-gh-bg rounded-md border border-gh-border">{feature.icon}</div>
                <span className="font-medium text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gh-card border border-gh-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gh-blue via-cyan-300 to-gh-success" />
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gh-blue rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-gh-blue/20">GT</div>
            <h2 className="text-2xl font-semibold mb-2">Bienvenue sur GitTrack</h2>
            <p className="text-sm text-gh-muted">Commencez par creer votre espace projet.</p>
          </div>

          {authErrorMessage && (
            <div className="mb-4 rounded-lg border border-[#da363340] bg-[#da363315] p-3 text-sm text-gh-danger">
              {authErrorMessage}
            </div>
          )}

          {showGitHubChoice && (
            <div className="mb-4 rounded-lg border border-gh-border bg-gh-bg p-4">
              <div className="text-sm font-medium mb-2">Connexion GitHub</div>
              <p className="text-sm text-gh-muted mb-4">
                GitHub peut reconnecter automatiquement le compte deja ouvert dans votre navigateur. Voulez-vous continuer avec ce compte, ou preparer un changement de compte ?
              </p>
              <div className="space-y-2">
                <button
                  onClick={startGitHubAuth}
                  disabled={isLoading === "github"}
                  className="w-full flex items-center justify-center gap-3 bg-[#2ea043] hover:bg-[#2c974b] text-white py-2.5 px-4 rounded-lg font-medium transition-all"
                >
                  {isLoading === "github" ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Github className="w-4 h-4" />}
                  Continuer avec le compte GitHub ouvert
                </button>
                <button
                  onClick={() => {
                    setSwitchAccountHelp(true);
                    setIsLoading(null);
                    window.open("https://github.com/logout", "_blank", "noopener,noreferrer");
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gh-card border border-gh-border hover:bg-[#b3b3b31f] text-gh-text py-2.5 px-4 rounded-lg font-medium transition-all"
                >
                  Je veux changer de compte
                </button>
              </div>
              {switchAccountHelp && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gh-muted">
                    Une page GitHub s&apos;est ouverte. Deconnectez-vous de GitHub dans cet onglet, revenez ici, puis relancez la connexion.
                  </p>
                  <button
                    onClick={startGitHubAuth}
                    disabled={isLoading === "github"}
                    className="w-full flex items-center justify-center gap-3 bg-[#238636] hover:bg-[#2ea043] text-white py-2.5 px-4 rounded-lg font-medium transition-all"
                  >
                    {isLoading === "github" ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Github className="w-4 h-4" />}
                    J&apos;ai change de compte, relancer GitHub
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {!showGitHubChoice && (
              <button onClick={() => handleLogin("github")} disabled={isLoading !== null} className="w-full flex items-center justify-center gap-3 bg-[#2ea043] hover:bg-[#2c974b] text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoading === "github" ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Github className="w-5 h-5" />Continuer avec GitHub</>}
              </button>
            )}
            <button onClick={() => handleLogin("google")} disabled={isLoading !== null} className="w-full flex items-center justify-center gap-3 bg-gh-bg border border-gh-border hover:bg-[#b3b3b31f] text-gh-text py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading === "google" ? <div className="w-5 h-5 border-2 border-gh-text/30 border-t-gh-text rounded-full animate-spin" /> : <><Mail className="w-5 h-5" />Continuer avec Google</>}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gh-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-gh-card px-2 text-gh-muted">ou</span></div>
            </div>

            <button onClick={() => handleLogin("guest")} disabled={isLoading !== null} className="w-full flex items-center justify-center gap-2 text-sm text-gh-muted hover:text-gh-text transition-colors">
              Continuer sans connexion <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
