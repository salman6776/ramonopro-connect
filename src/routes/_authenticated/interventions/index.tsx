import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchInterventions } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import { generateCertificatePDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/interventions/")({
  component: List,
});

function List() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data = [], isLoading } = useQuery({
    queryKey: ["interventions", uid], queryFn: () => fetchInterventions(uid),
  });
  const [search, setSearch] = useState("");

  const filtered = data.filter((i) => {
    const txt = (i.clients?.name ?? "") + " " + i.installation_type;
    return txt.toLowerCase().includes(search.toLowerCase());
  });

  const downloadCert = async (i: typeof data[number]) => {
    const pdf = await generateCertificatePDF({
      intervention_date: i.intervention_date,
      client_name: i.clients?.name ?? "Client",
      client_address: i.clients?.address ?? "",
      client_phone: i.clients?.phone ?? undefined,
      installation_type: i.installation_type,
      conduit_state: i.conduit_state ?? "—",
      cleaning_done: !!i.cleaning_done,
      recommendations: i.recommendations ?? "",
      technician_name: user?.email ?? "",
    });
    pdf.save(`certificat-${i.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Historique des interventions</h1>
          <p className="text-sm text-muted-foreground">{data.length} intervention{data.length > 1 ? "s" : ""}</p>
        </div>
        <Input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune intervention.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="py-4 flex flex-wrap items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium">{i.clients?.name ?? "Client supprimé"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(i.intervention_date).toLocaleDateString("fr-FR")} · {i.installation_type} · conduit {i.conduit_state}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${i.cleaning_done ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {i.cleaning_done ? "Nettoyé" : "Non nettoyé"}
                </span>
                <Button variant="outline" size="sm" onClick={() => downloadCert(i)}>
                  <FileDown className="h-4 w-4 mr-1" />PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
