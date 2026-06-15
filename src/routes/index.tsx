import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BarChart3, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/aftermath-logo.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1100px] flex-col items-center justify-center px-6 py-12 text-center">
        <img src={logo} alt="Aftermath Insurance Group" className="mb-8 h-20 w-auto sm:h-24" />
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          <span className="gradient-text">Aftermath Insurance Group</span> Performance Dashboard
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          Log every policy in seconds, watch revenue, attach rates, and CPA update in real time, and turn your team
          into a leaderboard‑driven sales machine.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/signup">Create account</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Frictionless entry", desc: "Submit a sale in under 30 seconds with auto-generated IDs." },
            { icon: BarChart3, title: "Live analytics", desc: "Revenue, attach rates, CPA, and trends update instantly." },
            { icon: Trophy, title: "Leaderboards", desc: "Rank agents and teams daily, weekly, or monthly." },
          ].map((f) => (
            <div key={f.title} className="surface-card p-5 text-left">
              <f.icon className="h-5 w-5 text-accent" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
