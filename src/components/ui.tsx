import React from "react";
import { cn } from "../lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-gh-bg border border-gh-border rounded-md overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

export function Button({ variant = "default", size = "md", className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" | "danger", size?: "sm" | "md" }) {
  const variants = {
    default: "bg-[#21262d] border border-[#f0f6fc1a] hover:bg-[#30363d] hover:border-gh-border-hover text-gh-text shadow-sm",
    primary: "bg-gh-green border border-[#f0f6fc1a] hover:bg-gh-green-hover text-white shadow-sm",
    ghost: "bg-transparent hover:bg-[#b3b3b31f] text-gh-muted hover:text-gh-text border border-transparent",
    danger: "bg-gh-card border border-gh-border hover:bg-gh-danger-bg text-gh-danger"
  };
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm font-medium"
  };
  return (
    <button className={cn("rounded-md transition-colors flex items-center gap-2", variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, variant = "default", className }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "outline"; className?: string }) {
  const variants = {
    default: "bg-[#1f6feb26] text-gh-blue border-transparent",
    success: "bg-[#23863626] text-gh-success-text border-transparent",
    warning: "bg-[#d2992226] text-[#d29922] border-transparent",
    danger: "bg-[#da363326] text-gh-danger border-transparent",
    outline: "bg-transparent border-gh-border text-gh-muted"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", variants[variant], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return (
    <div className={cn("h-2 w-full bg-gh-card rounded-full overflow-hidden border border-gh-border", className)}>
      <div
        className={cn("h-full bg-gh-success-text transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Avatar({ src, alt, className, title }: { key?: React.Key; src: string; alt: string; className?: string; title?: string }) {
  return (
    <img src={src} alt={alt} title={title} className={cn("rounded-full bg-gh-card border border-gh-border object-cover", className)} referrerPolicy="no-referrer" />
  );
}

export function AvatarGroup({ members, className }: { members: { id: string, avatar: string, name: string }[], className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      {members.map((m, i) => (
        <img key={m.id} src={m.avatar} alt={m.name} title={m.name} className={cn("w-6 h-6 rounded-full border-2 border-gh-bg bg-gh-card object-cover", i > 0 && "-ml-2")} referrerPolicy="no-referrer" />
      ))}
    </div>
  );
}

export function Switch({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) {
  const inputId = React.useId();

  return (
    <div className="relative h-[24px] w-[40px] shrink-0">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="absolute h-0 w-0 opacity-0"
      />
      <label
        htmlFor={inputId}
        className={cn(
          "block h-full w-full cursor-pointer rounded-full transition-all duration-200 ease-out",
          checked ? "bg-[#34C759]" : "bg-[#e9e9eb]",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-[20px] w-[20px] -translate-y-1/2 rounded-full bg-white shadow-[0px_3px_8px_rgba(0,0,0,0.15),0px_3px_1px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out",
            checked ? "left-[18px]" : "left-[2px]",
          )}
        />
      </label>
    </div>
  );
}
