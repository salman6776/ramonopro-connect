import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchInterventions, fetchClients, fetchInvoices } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, FileText, Euro } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user!.id;

  const { data: interventions = [] } = useQuery({
    queryKey: ["interventions", uid], queryFn: () => fetchInterventions(uid),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", uid], queryFn: () => fetchClients(uid),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", uid], queryFn: () => fetchInvoices(uid),
  });

  const now = new Date();
  const monthInterventions = interventions.filter((i) => {
    const d = new Date(i.intervention_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthRevenue = invoices
    .filter((inv) => {
      const d = new Date(inv.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Aperçu de votre activité</p>
        </div>
        <Button asChild size="lg" className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
          <Link to="/interventions/new"><PlusCircle className="mr-2 h-5 w-5" />Nouveau certificat</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={FileText} label="Interventions ce mois" value={monthInterventions.length.toString()} />
        <StatCard icon={Euro} label="CA du mois" value={`${monthRevenue.toFixed(0)} €`} />
        <StatCard icon={Users} label="Clients actifs" value={clients.length.toString()} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dernières interventions</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/interventions">Voir tout</Link></Button>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune intervention pour le moment.{" "}
              <Link to="/interventions/new" className="text-[var(--color-brand)] underline">Créer la première</Link>
            </p>
          ) : (
            <div className="divide-y">
              {interventions.slice(0, 5).map((i) => (
                <Link key={i.id} to="/interventions" className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded">
                  <div>
                    <div className="font-medium">{i.clients?.name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(i.intervention_date).toLocaleDateString("fr-FR")} · {i.installation_type}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">{i.installation_type}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
