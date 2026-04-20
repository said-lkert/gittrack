import { Insight } from "../data/mock";
import { Lightbulb, AlertTriangle, Info, Target } from "lucide-react";

export function RecommendationBox({ insights, nextAction }: { insights: Insight[], nextAction: { message: string, action: string } }) {
  return (
    <div className="bg-gh-card border border-gh-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gh-border bg-gh-header flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-[#d29922]" />
        <h3 className="font-semibold text-sm text-gh-text">Recommandations & Next Action</h3>
      </div>
      
      {/* Next Action Banner */}
      <div className="p-4 border-b border-gh-border bg-[#23863615]">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-gh-success-text shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-gh-success-text uppercase tracking-wider mb-1">Action Prioritaire</div>
            <p className="text-sm text-gh-text font-medium">{nextAction.message}</p>
          </div>
        </div>
      </div>

      {/* Other Insights */}
      <div className="p-2">
        {insights.map(insight => {
          const Icon = insight.type === 'danger' ? AlertTriangle : insight.type === 'warning' ? Lightbulb : Info;
          const colorClass = insight.type === 'danger' ? 'text-gh-danger' : insight.type === 'warning' ? 'text-[#d29922]' : 'text-gh-blue';
          
          return (
            <div key={insight.id} className="flex items-start gap-3 p-2 hover:bg-[#b3b3b30a] rounded-md transition-colors">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorClass}`} />
              <p className="text-sm text-gh-text leading-snug">{insight.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
