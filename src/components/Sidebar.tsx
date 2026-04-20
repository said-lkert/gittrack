import { LayoutDashboard, CheckSquare, Activity, Lightbulb, Settings, FolderKanban } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  currentView: string;
  setCurrentView: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSwitchProject?: () => void;
  currentProjectName?: string | null;
}

export function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, onSwitchProject, currentProjectName }: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 bg-gh-bg border-r border-gh-border h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0 md:border-transparent md:opacity-0"
      )}>
        <div className="w-64 h-full flex flex-col">
          <div className="h-14 px-5 border-b border-gh-border flex items-center shrink-0">
            <h1 className="text-xl font-bold text-gh-text flex items-center gap-2">
              GitTrack
            </h1>
          </div>
          <nav className="p-3 flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
            {onSwitchProject && (
              <button
                onClick={() => { onSwitchProject(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]"
              >
                <FolderKanban className="w-4 h-4" />
                {currentProjectName ? `Projet: ${currentProjectName}` : "Changer de projet"}
              </button>
            )}
            <button 
              onClick={() => { setCurrentView('dashboard'); }} 
              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", currentView === 'dashboard' ? "bg-[#1f6feb26] text-gh-blue" : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]")}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={() => { setCurrentView('tasks'); }} 
              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", currentView === 'tasks' ? "bg-[#1f6feb26] text-gh-blue" : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]")}
            >
              <CheckSquare className="w-4 h-4" />
              Tasks
            </button>
            <button 
              onClick={() => { setCurrentView('activity'); }} 
              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", currentView === 'activity' ? "bg-[#1f6feb26] text-gh-blue" : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]")}
            >
              <Activity className="w-4 h-4" />
              Activity
            </button>
            <button 
              onClick={() => { setCurrentView('insights'); }} 
              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", currentView === 'insights' ? "bg-[#1f6feb26] text-gh-blue" : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]")}
            >
              <Lightbulb className="w-4 h-4" />
              Insights
            </button>
          </nav>
          
          <div className="mt-auto p-3 border-t border-gh-border shrink-0">
            <button 
              onClick={() => { setCurrentView('settings'); }} 
              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", currentView === 'settings' ? "bg-[#1f6feb26] text-gh-blue" : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]")}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
