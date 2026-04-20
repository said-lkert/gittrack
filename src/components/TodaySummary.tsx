import { Commit, Task, Member } from "../data/mock";
import { Card } from "./ui";
import { Activity, GitCommit, TrendingUp, Users } from "lucide-react";

export function TodaySummary({ commits, tasks, members }: { commits: Commit[], tasks: Task[], members: Member[] }) {
  // In a real app, filter by today's date. Here we just take the most recent ones for the mock.
  // We'll take commits from the last 24h based on timestamp.
  const oneDayAgo = Date.now() - 86400000;
  const recentCommits = commits.filter(c => c.timestamp >= oneDayAgo);
  
  // If no commits in the last 24h, fallback to the last 5 for demonstration purposes
  const displayCommits = recentCommits.length > 0 ? recentCommits : commits.slice(0, 5);

  // Calculate stats
  const totalCommits = displayCommits.length;
  const totalProgress = displayCommits.reduce((sum, c) => sum + c.contributionPercent, 0);
  const activeContributors = new Set(displayCommits.map(c => c.authorId)).size;

  // Find top task
  const taskContributions: Record<string, number> = {};
  displayCommits.forEach(c => {
    taskContributions[c.taskId] = (taskContributions[c.taskId] || 0) + c.contributionPercent;
  });

  let topTaskId = "";
  let maxContrib = 0;
  Object.entries(taskContributions).forEach(([taskId, contrib]) => {
    if (contrib > maxContrib) {
      maxContrib = contrib;
      topTaskId = taskId;
    }
  });
  const topTask = tasks.find(t => t.id === topTaskId);

  // Find top contributor
  const authorContributions: Record<string, number> = {};
  displayCommits.forEach(c => {
    authorContributions[c.authorId] = (authorContributions[c.authorId] || 0) + 1;
  });
  let topAuthorId = "";
  let maxAuthorCommits = 0;
  Object.entries(authorContributions).forEach(([authorId, count]) => {
    if (count > maxAuthorCommits) {
      maxAuthorCommits = count;
      topAuthorId = authorId;
    }
  });
  const topAuthor = members.find(m => m.id === topAuthorId);

  const activityLevel = totalCommits > 8 ? "intense" : totalCommits > 3 ? "normale" : "faible";

  return (
    <Card className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gh-border bg-gh-header flex items-center gap-2">
        <Activity className="w-4 h-4 text-gh-blue" />
        <h3 className="font-semibold text-sm text-gh-text">Today Summary</h3>
      </div>
      <div className="p-4 flex flex-col gap-4 flex-1 justify-center">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gh-bg border border-gh-border rounded-md p-2 flex flex-col items-center justify-center text-center">
            <GitCommit className="w-4 h-4 text-gh-muted mb-1.5" />
            <span className="text-xl font-semibold text-gh-text leading-none">{totalCommits}</span>
            <span className="text-[10px] text-gh-muted mt-1 uppercase tracking-wider">Commits</span>
          </div>
          <div className="bg-gh-bg border border-gh-border rounded-md p-2 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-4 h-4 text-gh-success-text mb-1.5" />
            <span className="text-xl font-semibold text-gh-success-text leading-none">+{totalProgress}%</span>
            <span className="text-[10px] text-gh-muted mt-1 uppercase tracking-wider">Progrès</span>
          </div>
          <div className="bg-gh-bg border border-gh-border rounded-md p-2 flex flex-col items-center justify-center text-center">
            <Users className="w-4 h-4 text-gh-blue mb-1.5" />
            <span className="text-xl font-semibold text-gh-text leading-none">{activeContributors}</span>
            <span className="text-[10px] text-gh-muted mt-1 uppercase tracking-wider">Actifs</span>
          </div>
        </div>

        {/* Text Summary */}
        <div className="bg-[#161b22]/50 rounded-md p-3 text-sm text-gh-text leading-relaxed border border-gh-border/50">
          Activité <span className="italic text-gh-muted">{activityLevel}</span> aujourd'hui. 
          L'effort principal s'est concentré sur <strong className="text-gh-blue">{topTask?.title || "diverses tâches"}</strong>. 
          <strong className="text-gh-text"> {topAuthor?.name}</strong> a été le plus actif.
        </div>

      </div>
    </Card>
  );
}
