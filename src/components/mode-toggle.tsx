import { Link, useRouterState } from "@tanstack/react-router";
import { Smartphone, Monitor } from "lucide-react";

export function ModeToggle() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const fan = path.startsWith("/fan");
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="glass flex items-center gap-1 rounded-full p-1 shadow-glow">
        <Link
          to="/fan"
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            fan ? "bg-gradient-brand text-white shadow-glow" : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Fan Mode
        </Link>
        <Link
          to="/ops"
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            !fan && path.startsWith("/ops")
              ? "bg-gradient-brand text-white shadow-glow"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          Ops Mode
        </Link>
      </div>
    </div>
  );
}
