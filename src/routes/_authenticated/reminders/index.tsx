import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchReminders } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders/")({
  component: Reminders,
});

function Reminders() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["reminders", uid], queryFn: () => fetchReminders(uid) });

  const now = new Date();
  const due = data.filter((r) => new Date(r.scheduled_date) <= now && r.status !== "contacté" && r.status !== "envoyé");
  const upcoming = data.filter((r) => new Date(r.scheduled_date) > now);
  const done = data.filter((r) => r.status === "contacté" || r.status === "envoyé");

  const markContacted = async (id: string) => {
    const { error } = await supabase.from("reminders").update({ status: "contacté", sent_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Client marqué comme contacté ✓");
    qc.invalidateQueries({ queryKey: ["reminders", uid] });
  };

  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return "demain";
    if (diff <= 30) return `dans ${diff} j`;
    if (diff <= 365) return `dans ${Math.round(diff / 30)} mois`;
    return new Date(date).toLocaleDateString("fr-FR");
  };

  const daysOverdue = (date: string) => {
    const diff = Math.ceil((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "aujourd'hui";
    if (diff === 1) return "hier";
    return `il y a ${diff} j`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Clients à relancer</h1>
        <p className="text-sm text-muted-foreground">Récupérez vos anciens clients avant qu'ils ne passent à la concurrence.</p>
      </div>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-[var(--color-brand)]">
          <AlertCircle className="h-4 w-4" />
          À contacter maintenant ({due.length})
        </h2>
        {due.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tous vos clients ont été recontactés !</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {due.map((r) => (
              <Card key={r.id} className="border-[var(--color-brand)]/40 bg-[var(--color-brand)]/2">
                <CardContent className="py-3 flex flex-wrap items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] flex items-center justify-center shrink-0">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-medium">{r.clients?.full_name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {r.clients?.phone && <><Phone className="h-3 w-3" />{r.clients.phone} · </>}
                      {r.clients?.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--color-brand)] font-medium">Échéance : {daysOverdue(r.scheduled_date)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.scheduled_date).toLocaleDateString("fr-FR")}</div>
                  </div>
                  {r.clients?.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${r.clients.phone}`}><Phone className="h-4 w-4 mr-1" />Appeler</a>
                    </Button>
                  )}
                  <Button size="sm" className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]" onClick={() => markContacted(r.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />Contacté
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Rappels programmés ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Aucun rappel à venir.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 flex flex-wrap items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-medium">{r.clients?.full_name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.clients?.phone && <>{r.clients.phone} · </>}{r.clients?.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground">{daysUntil(r.scheduled_date)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.scheduled_date).toLocaleDateString("fr-FR")}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Déjà contactés ({done.length})
          </h2>
          <div className="space-y-2">
            {done.map((r) => (
              <Card key={r.id} className="opacity-60">
                <CardContent className="py-3 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{r.clients?.full_name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">
                      Contacté le {r.sent_at ? new Date(r.sent_at).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
