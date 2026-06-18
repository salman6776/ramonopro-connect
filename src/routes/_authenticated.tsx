import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, PlusCircle, FileText, Receipt, Users, Bell, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchSubscription } from "@/lib/queries";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

const items = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Nouvelle intervention", url: "/interventions/new", icon: PlusCircle },
  { title: "Historique", url: "/interventions", icon: FileText },
  { title: "Factures", url: "/invoices", icon: Receipt },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Rappels", url: "/reminders", icon: Bell },
  { title: "Paramètres", url: "/settings", icon: Settings },
];

function AuthedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: sub } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => fetchSubscription(user!.id),
    enabled: !!user,
  });
  const planLabel = ((sub?.plan ?? "starter") as string).replace(/^./, (c) => c.toUpperCase());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
              <img src={logo} alt="RamonoPro" className="h-8 w-8 shrink-0" width={32} height={32} />
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-sidebar-foreground leading-tight">RamonoPro</span>
                <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[10px] w-fit bg-[var(--color-brand)]/15 text-[var(--color-brand)] border-0">{planLabel}</Badge>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Button
              variant="ghost"
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Déconnexion</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-background px-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">{user.email}</span>
          </header>
          <main className="flex-1 p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
