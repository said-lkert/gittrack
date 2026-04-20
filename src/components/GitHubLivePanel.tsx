import { GitHubLiveData } from "../lib/github";
import { Avatar, Badge, Card } from "./ui";
import { ExternalLink, GitBranch, GitFork, Github, GitCommit, Shield, Star, Users } from "lucide-react";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GitHubLivePanel({
  data,
  loading,
  error,
}: {
  data: GitHubLiveData | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gh-border bg-gh-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-gh-text" />
          <h3 className="font-semibold text-sm text-gh-text">GitHub Live</h3>
          {loading && data && <span className="text-[11px] text-gh-muted">Mise a jour...</span>}
        </div>
        {data && (
          <a
            href={data.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gh-blue inline-flex items-center gap-1 hover:underline"
          >
            {data.owner}/{data.repo}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading && !data && <div className="text-sm text-gh-muted">Chargement des donnees GitHub...</div>}

        {error && !loading && !data && (
          <div className="text-sm text-gh-danger bg-[#da363315] border border-[#da363340] rounded-md p-3">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-gh-bg border border-gh-border rounded-md p-3">
                <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Branche</div>
                <div className="text-sm font-medium text-gh-text flex items-center gap-2"><GitBranch className="w-4 h-4 text-gh-blue" />{data.repository.defaultBranch}</div>
              </div>
              <div className="bg-gh-bg border border-gh-border rounded-md p-3">
                <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Stars</div>
                <div className="text-sm font-medium text-gh-text flex items-center gap-2"><Star className="w-4 h-4 text-[#d29922]" />{data.repository.stars}</div>
              </div>
              <div className="bg-gh-bg border border-gh-border rounded-md p-3">
                <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Forks</div>
                <div className="text-sm font-medium text-gh-text flex items-center gap-2"><GitFork className="w-4 h-4 text-gh-blue" />{data.repository.forks}</div>
              </div>
              <div className="bg-gh-bg border border-gh-border rounded-md p-3">
                <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Issues</div>
                <div className="text-sm font-medium text-gh-text">{data.repository.openIssues}</div>
              </div>
              <div className="bg-gh-bg border border-gh-border rounded-md p-3">
                <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Visibilite</div>
                <div className="text-sm font-medium text-gh-text flex items-center gap-2"><Shield className="w-4 h-4 text-gh-success-text" />{data.repository.visibility}</div>
              </div>
            </div>

            <div className="bg-gh-bg border border-gh-border rounded-md p-3">
              <div className="text-[10px] text-gh-muted uppercase tracking-wider mb-1">Repository</div>
              <div className="text-sm text-gh-text">{data.repository.description || "Aucune description GitHub fournie pour ce repository."}</div>
              <div className="text-[11px] text-gh-muted mt-2">
                Langage principal: {data.repository.language || "Non detecte"} • Dernier push: {formatDate(data.repository.pushedAt)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-gh-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gh-border bg-gh-bg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-gh-blue" />
                    <span className="text-sm font-medium text-gh-text">Derniers commits</span>
                  </div>
                  <Badge variant="outline">{data.commits.length}</Badge>
                </div>
                <div className="divide-y divide-gh-border max-h-[340px] overflow-y-auto custom-scrollbar">
                  {data.commits.map((commit) => (
                    <div key={commit.sha} className="p-3 flex gap-3">
                      <Avatar src={commit.authorAvatar || ""} alt={commit.author} className="w-8 h-8 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-gh-text">{commit.author}</span>
                          <span className="font-mono text-[10px] text-gh-blue">{commit.sha.slice(0, 7)}</span>
                        </div>
                        <p className="text-sm text-gh-text break-words">{commit.message}</p>
                        <div className="text-[11px] text-gh-muted mt-1">{formatDate(commit.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gh-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gh-border bg-gh-bg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gh-success-text" />
                    <span className="text-sm font-medium text-gh-text">Contributeurs recents</span>
                  </div>
                  <Badge variant="outline">{data.contributors.filter((item) => item.status === "active").length} actifs</Badge>
                </div>
                <div className="divide-y divide-gh-border max-h-[340px] overflow-y-auto custom-scrollbar">
                  {data.contributors.map((contributor) => (
                    <div key={contributor.login} className="p-3 flex items-center gap-3">
                      <Avatar src={contributor.avatar} alt={contributor.login} className="w-9 h-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={contributor.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gh-text hover:text-gh-blue"
                          >
                            {contributor.login}
                          </a>
                          <Badge variant={contributor.status === "active" ? "success" : "outline"}>
                            {contributor.status === "active" ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-gh-muted mt-1">
                          {contributor.recentCommits} commit(s) recents • {contributor.totalContributions} contribution(s) totales
                        </div>
                        <div className="text-[11px] text-gh-muted">
                          Dernier commit: {formatDate(contributor.lastCommitAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-gh-muted">
              GitHub ne fournit pas un statut "en ligne" en temps reel. Ici, "actif" signifie qu&apos;un contributeur a commit dans les 7 derniers jours.
            </p>
          </>
        )}

        {data && error && !loading && (
          <div className="text-xs text-[#d29922]">
            Derniere synchronisation conservee. Nouvelle mise a jour indisponible pour le moment.
          </div>
        )}
      </div>
    </Card>
  );
}
