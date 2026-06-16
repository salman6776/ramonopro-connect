import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchClients, fetchInterventions } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: Clients,
});

function Clients() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: clients = [] } = useQuery({ queryKey: ["clients", uid], queryFn: () => fetchClients(uid) });
  const { data: interventions = [] } = useQuery({ queryKey: ["interventions", uid], queryFn: () => fetchInterventions(uid) });

  const countFor = (id: string) => interventions.filter((i) => i.client_id === id).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Clients</h1>
      {clients.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun client. Créez-en un en lançant une nouvelle intervention.
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {clients.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 flex gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.phone ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.address ?? "—"}</div>
                  <div className="text-xs text-[var(--color-brand)] mt-1">{countFor(c.id)} intervention(s)</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
