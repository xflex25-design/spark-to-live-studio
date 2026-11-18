import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function AppHeader({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-panel px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link to="/dashboard"><Logo /></Link>
        {children}
      </div>
      <Button variant="ghost" size="sm" onClick={signOut}><FontAwesomeIcon icon={faRightFromBracket} /> Sign out</Button>
    </header>
  );
}
