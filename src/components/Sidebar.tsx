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

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "insights", label: "Insights", icon: Lightbulb },
] as const;

export function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, onSwitchProject, currentProjectName }: SidebarProps) {
  return (
    <div
      className={cn(
        "fixed md:static inset-y-0 left-0 z-50 bg-gh-bg border-r border-gh-border h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64" : "w-0 md:w-16"
      )}
    >
      <div className={cn("h-full flex flex-col", isOpen ? "w-64" : "w-16")}>
        <div className="h-14 border-b border-gh-border flex items-center shrink-0 overflow-hidden px-5">
          <h1 className="text-xl font-bold text-gh-text whitespace-nowrap">
            {isOpen ? "GitTrack" : "GT"}
          </h1>
        </div>

        <nav className="p-3 flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          {onSwitchProject && (
            <button
              onClick={() => onSwitchProject()}
              title={isOpen ? undefined : currentProjectName || "Changer de projet"}
              className={cn(
                "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]",
                isOpen ? "px-3 py-2" : "justify-center px-0 py-2"
              )}
            >
              <FolderKanban className="w-4 h-4 shrink-0" />
              {isOpen && (
                <span className="truncate">
                  {currentProjectName ? `Projet: ${currentProjectName}` : "Changer de projet"}
                </span>
              )}
            </button>
          )}
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              title={isOpen ? undefined : label}
              className={cn(
                "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                isOpen ? "px-3 py-2" : "justify-center px-0 py-2",
                currentView === key
                  ? "bg-[#1f6feb26] text-gh-blue"
                  : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 border-t border-gh-border shrink-0">
          <button
            onClick={() => setCurrentView("settings")}
            title={isOpen ? undefined : "Settings"}
            className={cn(
              "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
              isOpen ? "px-3 py-2" : "justify-center px-0 py-2",
              currentView === "settings"
                ? "bg-[#1f6feb26] text-gh-blue"
                : "text-gh-muted hover:text-gh-text hover:bg-[#b3b3b31f]"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {isOpen && <span>Settings</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
