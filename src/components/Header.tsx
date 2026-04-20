import { Search, Plus, Bell, ChevronDown } from "lucide-react";
import { Avatar, Button } from "./ui";

export function Header() {
  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-gh-border bg-gh-header sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-gh-text">
          <span className="text-gh-blue hover:underline cursor-pointer">acme-corp</span>
          <span className="text-gh-muted">/</span>
          <span className="font-semibold cursor-pointer hover:text-gh-blue transition-colors">covoiturage-app</span>
          <span className="px-1.5 py-0.5 rounded-full border border-gh-border text-gh-muted text-xs font-normal ml-2">Public</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gh-muted" />
          <input
            type="text"
            placeholder="Type / to search"
            className="bg-gh-bg border border-gh-border text-gh-text text-sm rounded-md pl-7 pr-2 py-1 focus:outline-none focus:border-gh-blue focus:ring-1 focus:ring-gh-blue transition-all w-64"
          />
        </div>
        <div className="h-5 w-px bg-gh-border mx-1 hidden sm:block" />
        <Button variant="ghost" size="sm" className="px-2">
          <Plus className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 text-gh-muted ml-1" />
        </Button>
        <Button variant="ghost" size="sm" className="px-2">
          <Bell className="w-4 h-4" />
        </Button>
        <Avatar src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" alt="User" className="w-7 h-7 ml-1 cursor-pointer hover:ring-2 hover:ring-gh-border transition-all" />
      </div>
    </header>
  );
}
