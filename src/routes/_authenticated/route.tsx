import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <Link to="/codes" className="text-sm font-extrabold text-primary sm:text-base">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/codes">Codes</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/unlock">Access</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await signOut();
              await navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </nav>
      </header>
      <p className="px-4 pt-3 text-xs text-muted-foreground sm:px-8">
        Signed in as {profile?.display_name ?? profile?.email ?? "member"}
        {isAdmin ? " · Super Admin" : ""}
      </p>
      <Outlet />
    </div>
  );
}
