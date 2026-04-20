import { Commit, Task, Member } from "../data/mock";
import { Avatar, Badge } from "./ui";
import { GitCommit, Zap } from "lucide-react";

export function CommitFeed({ commits, tasks, members }: { commits: Commit[], tasks: Task[], members: Member[] }) {
  // Generate highlights from the 3 most recent commits
  const highlights = commits.slice(0, 3).map(commit => {
    const author = members.find(m => m.id === commit.authorId);
    const task = tasks.find(t => t.id === commit.taskId);
    return {
      id: `hl-${commit.id}`,
      text: `${author?.name} a avancé ${task?.title} de +${commit.contributionPercent}%`
    };
  });

  return (
    <div className="bg-gh-card border border-gh-border rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gh-border bg-gh-header flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gh-text">Activity Highlights & Commits</h3>
        <Badge variant="outline">{commits.length} récents</Badge>
      </div>
      
      {/* Highlights Section */}
      <div className="p-4 border-b border-gh-border bg-[#161b22]/50">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#d29922]" />
          <span className="text-xs font-semibold text-gh-muted uppercase tracking-wider">Highlights</span>
        </div>
        <ul className="space-y-2">
          {highlights.map(hl => (
            <li key={hl.id} className="text-sm text-gh-text flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gh-blue"></span>
              {hl.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Detailed Feed */}
      <div className="divide-y divide-gh-border overflow-y-auto custom-scrollbar max-h-[400px]">
        {commits.map(commit => {
          const author = members.find(m => m.id === commit.authorId);
          const task = tasks.find(t => t.id === commit.taskId);
          
          return (
            <div key={commit.id} className="p-4 flex gap-3 hover:bg-[#b3b3b30a] transition-colors">
              <Avatar src={author?.avatar || ""} alt={author?.login || ""} className="w-8 h-8 shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gh-text text-sm">{author?.name}</span>
                  <span className="text-gh-muted text-sm">a commité</span>
                  <span className="font-mono text-xs text-gh-blue">{commit.sha}</span>
                  <span className="text-gh-muted text-xs ml-auto">{commit.date}</span>
                </div>
                <p className="text-sm text-gh-text mb-2">{commit.message}</p>
                <div className="flex items-center gap-2">
                  {task && (
                    <Badge variant="outline" className="text-[10px] bg-gh-bg">
                      {task.title}
                    </Badge>
                  )}
                  <span className="text-[10px] font-medium text-gh-success-text bg-[#23863626] px-1.5 rounded-sm">
                    +{commit.contributionPercent}% progression
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {commits.length === 0 && (
          <div className="p-8 text-center text-gh-muted text-sm">Aucun commit récent.</div>
        )}
      </div>
    </div>
  );
}
