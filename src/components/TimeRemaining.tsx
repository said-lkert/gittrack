import { Card, Badge } from "./ui";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export function TimeRemaining({ daysLeft, status }: { daysLeft: number, status: "ahead" | "on_track" | "behind" }) {
  const statusConfig = {
    ahead: { color: "text-gh-success-text", bg: "bg-[#23863626]", label: "En avance", icon: CheckCircle2 },
    on_track: { color: "text-[#d29922]", bg: "bg-[#d2992226]", label: "Dans les temps", icon: Clock },
    behind: { color: "text-gh-danger", bg: "bg-[#f8514926]", label: "En retard", icon: AlertCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="p-5 flex flex-col justify-center h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gh-text">Temps Restant</span>
        <Badge variant="outline" className={`${config.color} ${config.bg} border-transparent flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-light text-gh-text leading-none">{daysLeft}</span>
        <span className="text-sm text-gh-muted">jours</span>
      </div>
    </Card>
  );
}
