import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchInterventions, fetchClients, fetchReminders } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, FileText, Bell, AlertCircle } from "lucide-react";

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
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", uid], queryFn: () => fetchReminders(uid),
  });

  const now = new Date();
  const monthCertifs = interventions.filter((i) => {
    const d = new Date(i.intervention_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const toContact = reminders.filter((r) => new Date(r.scheduled_date) <= now && r.status !== "contacté" && r.status !== "envoyé");
  const upcoming = reminders.filter((r) => new Date(r.scheduled_date) > now);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Button asChild size="lg" className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
          <Link to="/interventions/new"><PlusCircle className="mr-2 h-5 w-5" />Nouveau certificat</Link>
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Certificats ce mois" value={monthCertifs.length} color="text-primary" />
        <StatCard icon={Users} label="Clients actifs" value={clients.length} color="text-primary" />
        <StatCard icon={AlertCircle} label="À relancer" value={toContact.length} color={toContact.length > 0 ? "text-[var(--color-brand)]" : "text-primary"} highlight={toContact.length > 0} />
        <StatCard icon={Bell} label="Rappels programmés" value={upcoming.length} color="text-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Dernières interventions</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/interventions">Voir tout</Link></Button>
          </CardHeader>
          <CardContent>
            {interventions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune intervention.{" "}
                <Link to="/interventions/new" className="text-[var(--color-brand)] underline">Créer la première</Link>
              </p>
            ) : (
              <div className="divide-y">
                {interventions.slice(0, 5).map((i) => (
                  <Link key={i.id} to="/interventions" className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded">
                    <div>
                      <div className="font-medium text-sm">{i.clients?.full_name ?? "Client"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(i.intervention_date).toLocaleDateString("fr-FR")} · {i.installation_type}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 capitalize">Généré</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {toContact.length > 0 && <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />}
              Clients à relancer
            </CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/reminders">Voir tout</Link></Button>
          </CardHeader>
          <CardContent>
            {toContact.length === 0 ? (
              <div className="py-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun client à relancer pour l'instant.</p>
              </div>
            ) : (
              <div className="divide-y">
                {toContact.slice(0, 5).map((r) => (
                  <Link key={r.id} to="/reminders" className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded">
                    <div>
                      <div className="font-medium text-sm">{r.clients?.full_name ?? "Client"}</div>
                      <div className="text-xs text-muted-foreground">{r.clients?.phone ?? ""}</div>
                    </div>
                    <span className="text-xs text-[var(--color-brand)] font-medium">
                      {new Date(r.scheduled_date).toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color, highlight,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[var(--color-brand)]/40" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
