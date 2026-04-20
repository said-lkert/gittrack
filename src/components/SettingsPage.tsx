import React, { useState } from "react";
import { Member, initialProject } from "../data/mock";
import { Project, ProjectMember } from "../lib/store";
import { Card, Button, Avatar, Switch } from "./ui";
import { Settings, Github, Users, Activity, Bell, AlertTriangle, Save, Trash2, Plus, X, CheckCircle2 } from "lucide-react";

interface SettingsPageProps {
  members: Member[];
  githubRepoUrl?: string | null;
  githubConnected?: boolean;
  currentProject?: Project | null;
  onUpdateMembers?: (members: ProjectMember[]) => void;
}

export function SettingsPage({ members: initialMembers, githubRepoUrl, githubConnected, currentProject, onUpdateMembers }: SettingsPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");

  const [projectName, setProjectName] = useState(currentProject?.name || initialProject.name);
  const [startDate, setStartDate] = useState(currentProject?.startDate || initialProject.startDate);
  const [endDate, setEndDate] = useState(currentProject?.endDate || initialProject.endDate);

  const [repoUrl, setRepoUrl] = useState(githubRepoUrl || currentProject?.repoUrl || "https://github.com/organization/gittrack");
  const [branch, setBranch] = useState(currentProject?.branch || "main");
  const [isConnected, setIsConnected] = useState(githubConnected ?? true);

  const [aiEstimation, setAiEstimation] = useState(true);
  const [commitAnalysis, setCommitAnalysis] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(3);

  const [delayAlerts, setDelayAlerts] = useState(true);
  const [inactivityAlerts, setInactivityAlerts] = useState(true);

  const [membersList, setMembersList] = useState(initialMembers.map((member) => ({ ...member, role: member.role || "member" })));

  const syncProjectMembers = (nextMembers: typeof membersList) => {
    onUpdateMembers?.(
      nextMembers.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        avatar: member.avatar,
        login: member.login,
      })),
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleRemoveMember = (id: string) => {
    setMembersList((current) => {
      const next = current.filter((member) => member.id !== id);
      syncProjectMembers(next);
      return next;
    });
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;

    const nextMember = {
      id: `manual_${Date.now()}`,
      login: newMemberName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "."),
      name: newMemberName.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newMemberName.trim())}`,
      role: newMemberRole,
      contribution: 0,
      commitTypes: { feat: 0, fix: 0, other: 0 },
    };

    setMembersList((current) => {
      const next = [...current, nextMember];
      syncProjectMembers(next);
      return next;
    });

    setNewMemberName("");
    setNewMemberRole("member");
  };

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gh-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gh-text flex items-center gap-2">
            <Settings className="w-6 h-6 text-gh-muted" />
            Settings
          </h1>
          <p className="text-sm text-gh-muted mt-1">Gerez la configuration de votre projet GitTrack.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-gh-success-text flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Sauvegarde
            </span>
          )}
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <SettingsSection title="Parametres du Projet" icon={<Settings className="w-5 h-5 text-gh-muted" />}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Nom du projet</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gh-text mb-1.5">Date de debut</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gh-text mb-1.5">Date de fin estimee</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue" />
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Configuration GitHub" icon={<Github className="w-5 h-5 text-gh-muted" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gh-bg border border-gh-border rounded-md">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-gh-success-text" : "bg-gh-muted"}`} />
              <div>
                <p className="text-sm font-medium text-gh-text">{isConnected ? "Connecte a GitHub" : "Non connecte"}</p>
                <p className="text-xs text-gh-muted">{isConnected ? "Synchronisation active" : "Aucune donnee recue"}</p>
              </div>
            </div>
            <Button variant="default" onClick={() => setIsConnected(!isConnected)}>
              {isConnected ? "Deconnecter" : "Connecter"}
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">URL du Repository</label>
            <input type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} disabled={!isConnected} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Branche principale</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} disabled={!isConnected} className="w-full bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue disabled:opacity-50">
              <option value="main">main</option>
              <option value="master">master</option>
              <option value="dev">dev</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Gestion des Membres" icon={<Users className="w-5 h-5 text-gh-muted" />}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-sm text-gh-muted">Gerez les acces et les roles de votre equipe.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nom du membre"
                className="bg-gh-bg border border-gh-border rounded-md px-3 py-1.5 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="bg-gh-bg border border-gh-border rounded-md px-2 py-1.5 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
              >
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
              </select>
              <Button variant="default" size="sm" onClick={handleAddMember}>
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="border border-gh-border rounded-md divide-y divide-gh-border bg-gh-bg">
            {membersList.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatar} alt={member.name} className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium text-gh-text">{member.name}</p>
                    <p className="text-xs text-gh-muted">{member.login}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={member.role}
                    onChange={(e) => {
                      setMembersList((current) => {
                        const next = current.map((item) => (item.id === member.id ? { ...item, role: e.target.value } : item));
                        syncProjectMembers(next);
                        return next;
                      });
                    }}
                    className="bg-transparent border border-gh-border text-gh-text text-xs rounded-md px-2 py-1 focus:outline-none focus:border-gh-blue"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Membre</option>
                  </select>
                  <button onClick={() => handleRemoveMember(member.id)} className="text-gh-muted hover:text-gh-danger p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {membersList.length === 0 && <div className="p-4 text-center text-sm text-gh-muted">Aucun membre dans ce projet.</div>}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Suivi & Intelligence Artificielle" icon={<Activity className="w-5 h-5 text-gh-muted" />}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gh-text">Estimation automatique (IA)</p>
              <p className="text-xs text-gh-muted">L'IA estime la progression des taches selon les commits.</p>
            </div>
            <Switch checked={aiEstimation} onChange={setAiEstimation} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gh-text">Analyse semantique des commits</p>
              <p className="text-xs text-gh-muted">Categorisation automatique (feat, fix, docs).</p>
            </div>
            <Switch checked={commitAnalysis} onChange={setCommitAnalysis} />
          </div>

          <div className="pt-4 border-t border-gh-border">
            <label className="block text-sm font-medium text-gh-text mb-1.5">Seuil d'alerte d'inactivite (jours)</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="30" value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} className="w-24 bg-gh-bg border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue" />
              <span className="text-sm text-gh-muted">jours sans commit avant declenchement d'une alerte</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" icon={<Bell className="w-5 h-5 text-gh-muted" />}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gh-text">Alertes de retard</p>
              <p className="text-xs text-gh-muted">Etre notifie quand une tache depasse sa deadline.</p>
            </div>
            <Switch checked={delayAlerts} onChange={setDelayAlerts} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gh-text">Alertes d'inactivite</p>
              <p className="text-xs text-gh-muted">Etre notifie si un membre ou une tache est inactif.</p>
            </div>
            <Switch checked={inactivityAlerts} onChange={setInactivityAlerts} />
          </div>
        </div>
      </SettingsSection>

      <Card className="border-gh-danger/40 overflow-hidden">
        <div className="bg-[#da363310] px-5 py-4 border-b border-gh-danger/20 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gh-danger" />
          <h2 className="text-base font-semibold text-gh-danger">Zone Dangereuse</h2>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gh-text">Reinitialiser les donnees</p>
              <p className="text-xs text-gh-muted">Supprime l'historique des commits et remet les taches a zero.</p>
            </div>
            <Button variant="default" className="text-gh-danger hover:bg-gh-danger hover:text-white border-gh-danger/30 shrink-0">
              Reinitialiser
            </Button>
          </div>

          <div className="pt-4 border-t border-gh-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gh-text">Supprimer le projet</p>
              <p className="text-xs text-gh-muted">Cette action est irreversible. Toutes les donnees seront perdues.</p>
            </div>
            <Button variant="danger" className="shrink-0">
              <Trash2 className="w-4 h-4" />
              Supprimer le projet
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gh-header px-5 py-4 border-b border-gh-border flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-gh-text">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
