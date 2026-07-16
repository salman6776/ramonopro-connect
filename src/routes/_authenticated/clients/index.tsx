import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchClients, fetchInterventions, fetchCertificates, buildCertNumber } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Phone, MapPin, Mail, FileText, Download, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: Clients,
});

function Clients() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: clients = [] } = useQuery({ queryKey: ["clients", uid], queryFn: () => fetchClients(uid) });
  const { data: interventions = [] } = useQuery({ queryKey: ["interventions", uid], queryFn: () => fetchInterventions(uid) });
  const { data: certificates = [] } = useQuery({ queryKey: ["certificates", uid], queryFn: () => fetchCertificates(uid) });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.full_name, c.phone, c.address, c.email].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [clients, search]);

  const interventionsFor = (id: string) =>
    interventions.filter((i) => i.client_id === id).sort((a, b) => +new Date(b.intervention_date) - +new Date(a.intervention_date));

  const certificatesFor = (id: string) => {
    const interventionIds = interventions.filter((i) => i.client_id === id).map((i) => i.id);
    return certificates.filter((c) => c.intervention_id && interventionIds.includes(c.intervention_id));
  };

  const selected = clients.find((c) => c.id === openId);
  const selectedInterventions = openId ? interventionsFor(openId) : [];
  const selectedCertificates = openId ? certificatesFor(openId) : [];

  const downloadCert = (cert: typeof certificates[number], index: number) => {
    if (!cert.pdf_url) return;
    const a = document.createElement("a");
    a.href = cert.pdf_url;
    a.target = "_blank";
    a.download = `certificat-${cert.id.slice(0, 8)}.pdf`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client{clients.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button asChild size="sm" className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)] shrink-0">
            <Link to="/interventions/new"><PlusCircle className="h-4 w-4 mr-1" />Nouveau</Link>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {clients.length === 0 ? "Aucun client. Créez-en un via une nouvelle intervention." : "Aucun résultat."}
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const list = interventionsFor(c.id);
            const last = list[0];
            const certCount = certificatesFor(c.id).length;
            return (
              <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => setOpenId(c.id)}>
                <CardContent className="py-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-sm">
                    {c.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.phone ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.address ?? "—"}</div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-[var(--color-brand)]">
                        {list.length} intervention{list.length > 1 ? "s" : ""}
                      </span>
                      {certCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {certCount} certificat{certCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {last && (
                        <span className="text-xs text-muted-foreground">
                          dernière : {new Date(last.intervention_date).toLocaleDateString("fr-FR")}
                        </span>
                      )}
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
                <SheetTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {selected.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  {selected.full_name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-2 text-sm">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-[var(--color-brand)] hover:underline">
                    <Phone className="h-4 w-4 text-muted-foreground" />{selected.phone}
                  </a>
                )}
                {selected.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />{selected.address}</div>}
                {selected.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selected.email}</div>}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Historique ({selectedInterventions.length})</h3>
                  {selectedInterventions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedInterventions.map((i, idx) => {
                        const cert = selectedCertificates.find((c) => c.intervention_id === i.id);
                        return (
                          <div key={i.id} className="flex items-start gap-2 p-3 border rounded-lg">
                            <div className="flex-1 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{new Date(i.intervention_date).toLocaleDateString("fr-FR")}</span>
                                {cert && (
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {buildCertNumber(new Date(cert.generated_at).getFullYear(), selectedCertificates.indexOf(cert) + 1)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize mt-0.5">{i.installation_type} · {i.conduit_state}</div>
                            </div>
                            {cert?.pdf_url && (
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadCert(cert, idx)}>
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedCertificates.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Certificats ({selectedCertificates.length})
                    </h3>
                    <div className="space-y-1">
                      {selectedCertificates.map((cert, idx) => (
                        <div key={cert.id} className="flex items-center justify-between py-2 px-3 border rounded-lg text-sm">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">
                              {buildCertNumber(new Date(cert.generated_at).getFullYear(), idx + 1)}
                            </span>
                            <div className="text-xs text-muted-foreground">{new Date(cert.generated_at).toLocaleDateString("fr-FR")}</div>
                          </div>
                          {cert.pdf_url && (
                            <Button size="sm" variant="outline" className="h-7" onClick={() => downloadCert(cert, idx)}>
                              <Download className="h-3 w-3 mr-1" />PDF
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
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
