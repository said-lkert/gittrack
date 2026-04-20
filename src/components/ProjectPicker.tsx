import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Clock, FolderPlus, GitCommit, Github, LogOut, Plus, Search, Star } from "lucide-react";
import { buildHttpError, readJsonSafe } from "../lib/http";
import { Project, User } from "../lib/store";
import { Avatar, Badge, Button, Card } from "./ui";

type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  repoUrl: string;
  description: string | null;
  branch: string;
  language: string | null;
  stars: number;
  forks: number;
  visibility: string;
  pushedAt: string | null;
};

interface ProjectPickerProps {
  user: User;
  projects: Project[];
  hasGitHubAccess: boolean;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onImportRepo: (repo: GitHubRepo) => Promise<{ id: string }>;
  onLogout: () => void;
}

export function ProjectPicker({ user, projects, hasGitHubAccess, onSelectProject, onCreateProject, onImportRepo, onLogout }: ProjectPickerProps) {
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [importingRepoId, setImportingRepoId] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadRepos = async () => {
      if (!hasGitHubAccess) {
        setRepos([]);
        return;
      }

      setReposLoading(true);
      try {
        const response = await fetch("/api/github/repos");
        const json = await readJsonSafe(response);
        if (!active) return;

        if (!response.ok) {
          throw buildHttpError(response, json, "Unable to load GitHub repositories.");
        }

        setRepos(Array.isArray(json.repos) ? json.repos : []);
        setReposError(null);
        setImportError(null);
      } catch (error) {
        if (!active) return;
        setReposError(error instanceof Error ? error.message : "Unable to load GitHub repositories.");
      } finally {
        if (active) {
          setReposLoading(false);
        }
      }
    };

    void loadRepos();
    return () => {
      active = false;
    };
  }, [hasGitHubAccess]);

  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()));
  const importedRepoUrls = useMemo(() => new Set(projects.map((project) => project.repoUrl.toLowerCase())), [projects]);
  const filteredRepos = repos.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(search.toLowerCase()) &&
      !importedRepoUrls.has(repo.repoUrl.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gh-bg text-gh-text flex flex-col p-4 md:p-8">
      <header className="flex items-center justify-between max-w-6xl mx-auto w-full mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gh-blue rounded-md flex items-center justify-center text-white font-bold text-sm shadow-sm">GT</div>
          <span className="font-semibold text-lg">GitTrack</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Avatar src={user.avatar} alt={user.name} className="w-8 h-8" />
            <span className="text-gh-muted hidden sm:inline-block">{user.name}</span>
          </div>
          <div className="w-px h-4 bg-gh-border" />
          <button onClick={onLogout} className="text-sm text-gh-muted hover:text-gh-text flex items-center gap-1.5 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline-block">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Choisir un projet</h1>
            <p className="text-gh-muted">Sélectionnez un projet déjà configuré ou importez directement un repository GitHub.</p>
          </div>
          <Button variant="primary" onClick={onCreateProject} className="shrink-0">
            <Plus className="w-4 h-4" />
            Nouveau Projet manuel
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gh-muted" />
          <input type="text" placeholder="Rechercher un projet ou un repo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-gh-card border border-gh-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all" />
        </div>

        {filteredProjects.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <FolderPlus className="w-4 h-4 text-gh-blue" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gh-text">Projets configurés</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="p-5 flex flex-col cursor-pointer hover:border-gh-muted transition-all group hover:shadow-lg hover:shadow-gh-blue/5" onClick={() => onSelectProject(project.id)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1f6feb15] border border-[#1f6feb30] flex items-center justify-center text-gh-blue">
                        <Github className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base group-hover:text-gh-blue transition-colors">{project.name}</h3>
                        <p className="text-xs text-gh-muted flex items-center gap-1">
                          <GitCommit className="w-3 h-3" /> {project.branch}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gh-muted mb-6 line-clamp-2 flex-1">{project.description || "Aucune description fournie."}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gh-border mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-gh-muted">
                      <Clock className="w-3.5 h-3.5" />
                      Accédé {new Date(project.lastAccessed).toLocaleDateString()}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-gh-bg flex items-center justify-center group-hover:bg-gh-blue group-hover:text-white transition-colors text-gh-muted">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Github className="w-4 h-4 text-gh-success-text" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gh-text">Repositories GitHub</h2>
          </div>

          {reposLoading && <div className="text-sm text-gh-muted">Chargement de vos repositories GitHub...</div>}
          {reposError && !reposLoading && <div className="text-sm text-gh-danger bg-[#da363315] border border-[#da363340] rounded-md p-3">{reposError}</div>}
          {importError && !reposLoading && <div className="text-sm text-gh-danger bg-[#da363315] border border-[#da363340] rounded-md p-3 mt-3">{importError}</div>}

          {!reposLoading && !reposError && filteredRepos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepos.map((repo) => (
                <Card key={repo.id} className="p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-base text-gh-text">{repo.fullName}</h3>
                      <div className="text-xs text-gh-muted mt-1">{repo.language || "Language inconnu"} • {repo.branch}</div>
                    </div>
                    <Badge variant="outline">{repo.visibility}</Badge>
                  </div>
                  <p className="text-sm text-gh-muted mb-4 min-h-[40px]">{repo.description || "Aucune description fournie."}</p>
                  <div className="text-xs text-gh-muted flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" /> {repo.stars}</span>
                    <span>Forks {repo.forks}</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      setImportError(null);
                      setImportingRepoId(repo.id);
                      try {
                        const project = await onImportRepo(repo);
                        onSelectProject(project.id);
                      } catch (error) {
                        setImportError(error instanceof Error ? error.message : "Import du repository impossible.");
                      } finally {
                        setImportingRepoId(null);
                      }
                    }}
                  >
                    {importingRepoId === repo.id ? "Import..." : "Importer et ouvrir"}
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {!reposLoading && !reposError && filteredRepos.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-gh-card/30 border border-gh-border border-dashed rounded-xl">
              <div className="w-16 h-16 bg-gh-bg border border-gh-border rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-gh-muted" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucun repository importable</h3>
              <p className="text-gh-muted max-w-sm mb-6">
                {hasGitHubAccess
                  ? "Tous vos repositories visibles sont déjà importés, ou aucun ne correspond à votre recherche."
                  : "Connectez un compte GitHub pour lister vos repositories ici."}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
