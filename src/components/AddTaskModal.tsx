import React, { useState } from "react";
import { Member } from "../data/mock";
import { Button } from "./ui";
import { X } from "lucide-react";

export function AddTaskModal({ members, onClose, onAdd }: { members: Member[], onClose: () => void, onAdd: (task: any) => void }) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState(members[0]?.id || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    
    onAdd({
      id: `t${Date.now()}`,
      title,
      assigneeIds: [assigneeId],
      progress: 0,
      deadline,
      status: "on_track",
      weight: 10,
      priority,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gh-bg border border-gh-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gh-border flex items-center justify-between bg-gh-header">
          <h2 className="text-lg font-semibold text-gh-text">Nouvelle Tâche</h2>
          <button onClick={onClose} className="text-gh-muted hover:text-gh-text"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Nom de la tâche</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
              placeholder="Ex: Refonte de l'API"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Assigner à</label>
            <select 
              value={assigneeId} 
              onChange={e => setAssigneeId(e.target.value)}
              className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Deadline</label>
            <input 
              type="date" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gh-text mb-1.5">Priorite</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}
              className="w-full bg-gh-card border border-gh-border rounded-md px-3 py-2 text-sm text-gh-text focus:outline-none focus:border-gh-blue"
            >
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary">Créer la tâche</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
