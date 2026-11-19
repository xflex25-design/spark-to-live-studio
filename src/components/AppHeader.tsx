import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faGauge } from "@fortawesome/free-solid-svg-icons";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-ready";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppHeader({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-panel px-6 shadow-sm">
      <div className="flex min-w-0 items-center gap-6">
        <Link to="/dashboard" className="flex items-center">
          <Logo />
        </Link>
        {children}
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <FontAwesomeIcon icon={faGauge} /> Dashboard
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
          <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
        </Button>
      </div>

      {/* Mobile Hamburger Menu on Right */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open Navigation Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] p-6">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <Logo />
                </div>
                <nav className="flex flex-col gap-3">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <FontAwesomeIcon icon={faGauge} className="w-4 h-4" /> Dashboard
                  </Link>
                </nav>
              </div>
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
