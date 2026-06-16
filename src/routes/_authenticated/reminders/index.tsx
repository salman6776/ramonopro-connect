import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchReminders } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reminders/")({
  component: Reminders,
});

function Reminders() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data = [] } = useQuery({ queryKey: ["reminders", uid], queryFn: () => fetchReminders(uid) });

  const now = new Date();
  const due = data.filter((r) => new Date(r.reminder_date) <= now && r.status !== "envoyé");
  const upcoming = data.filter((r) => new Date(r.reminder_date) > now);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Rappels annuels</h1>
        <p className="text-sm text-muted-foreground">Vos clients à recontacter pour leur entretien annuel.</p>
      </div>

      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-[var(--color-brand)]">
          <AlertCircle className="h-4 w-4" />À envoyer ({due.length})
        </h2>
        {due.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Aucun rappel en attente.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {due.map((r) => (
              <Card key={r.id} className="border-[var(--color-brand)]/40">
                <CardContent className="py-3 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[var(--color-brand)]" />
                  <div className="flex-1">
                    <div className="font-medium">{r.clients?.name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">{r.clients?.phone ?? ""} · {r.clients?.address ?? ""}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">échéance {new Date(r.reminder_date).toLocaleDateString("fr-FR")}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Programmés ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Aucun rappel programmé.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{r.clients?.name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">Rappel le {new Date(r.reminder_date).toLocaleDateString("fr-FR")}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
