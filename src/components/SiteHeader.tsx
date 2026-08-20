import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LineChart, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/commodities", label: "Commodities" },
];

const authedLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prices", label: "Price history" },
];

export function SiteHeader() {
  const { session, displayName, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <LineChart className="size-4" aria-hidden />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">AgroTicker</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {[...publicLinks, ...(session ? authedLinks : [])].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? null : session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {displayName ?? session.user.email}
              </span>
              {isAdmin ? <Badge variant="secondary">admin</Badge> : null}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
