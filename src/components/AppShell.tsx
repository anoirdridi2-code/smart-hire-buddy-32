import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  KanbanSquare,
  Radar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Mic,
  Sparkles,
  User,
  X,
  BrainCircuit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoleGate } from "@/components/RoleGate";
import { useAlerts, useRole } from "@/lib/queries";

const CANDIDATE_NAV = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/cv", label: "Mes CV", icon: FileText },
  { to: "/offres", label: "Recherche d'emploi", icon: BriefcaseBusiness },
  { to: "/agent", label: "Agent IA", icon: Radar },
  { to: "/candidatures", label: "Candidatures", icon: Sparkles },
  { to: "/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/evaluation", label: "Évaluation", icon: BrainCircuit },
  { to: "/coach", label: "Coach IA", icon: MessagesSquare },
  { to: "/entretien", label: "Entretien", icon: Mic },
  { to: "/profil", label: "Profil", icon: User },
] as const;

const RECRUITER_NAV = [
  { to: "/recruteur/offres", label: "Mes offres", icon: BriefcaseBusiness },
  { to: "/recruteur/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/coach", label: "Assistant IA", icon: MessagesSquare },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: role } = useRole();
  const { data: alerts } = useAlerts();
  const unread = (alerts ?? []).filter((a) => !a.is_read).length;
  const items = role === "recruiter" ? RECRUITER_NAV : CANDIDATE_NAV;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/agent" && unread > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <RoleGate>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
          <Link to="/" className="mb-8 flex items-center gap-2 px-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-bold text-white shadow-sm">
              K
            </span>
            <span className="font-display text-lg font-semibold text-slate-950">Karriera</span>
          </Link>
          {nav}
          <Button variant="ghost" className="mt-auto justify-start gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950" onClick={signOut}>
            <LogOut className="size-4" />
            Se déconnecter
          </Button>
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Fermer le menu"
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-6 flex items-center justify-between px-2">
                <span className="font-display text-lg font-semibold text-slate-950">Karriera</span>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="size-5" />
                </Button>
              </div>
              {nav}
              <Button variant="ghost" className="mt-auto justify-start gap-3 text-slate-600" onClick={signOut}>
                <LogOut className="size-4" />
                Se déconnecter
              </Button>
            </div>
          </div>
        )}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
                <Menu className="size-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h1>
                {description && <p className="truncate text-sm text-slate-500">{description}</p>}
              </div>
              {role !== "recruiter" && (
                <Link to="/agent" aria-label="Alertes de l'agent IA" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                  <Bell className="size-5" />
                  {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-indigo-600" />}
                </Link>
              )}
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
