import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchClients, fetchInterventions } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Phone, MapPin, Mail, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: Clients,
});

function Clients() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: clients = [] } = useQuery({ queryKey: ["clients", uid], queryFn: () => fetchClients(uid) });
  const { data: interventions = [] } = useQuery({ queryKey: ["interventions", uid], queryFn: () => fetchInterventions(uid) });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.address, c.email].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [clients, search]);

  const interventionsFor = (id: string) =>
    interventions.filter((i) => i.client_id === id).sort((a, b) => +new Date(b.intervention_date) - +new Date(a.intervention_date));

  const selected = clients.find((c) => c.id === openId);
  const selectedInterventions = openId ? interventionsFor(openId) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Clients</h1>
        <Input placeholder="Rechercher nom, téléphone, adresse…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {clients.length === 0 ? "Aucun client. Créez-en un en lançant une nouvelle intervention." : "Aucun résultat."}
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const list = interventionsFor(c.id);
            const last = list[0];
            return (
              <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => setOpenId(c.id)}>
                <CardContent className="py-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.phone ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.address ?? "—"}</div>
                    <div className="text-xs text-[var(--color-brand)] mt-1">
                      {list.length} intervention{list.length > 1 ? "s" : ""}{last ? ` · dernière ${new Date(last.intervention_date).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                {selected.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selected.phone}</div>}
                {selected.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />{selected.address}</div>}
                {selected.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selected.email}</div>}
              </div>
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Interventions ({selectedInterventions.length})</h3>
                {selectedInterventions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInterventions.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4 text-primary" />
                        <div className="flex-1 text-sm">
                          <div>{new Date(i.intervention_date).toLocaleDateString("fr-FR")}</div>
                          <div className="text-xs text-muted-foreground capitalize">{i.installation_type} · {i.conduit_state}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
