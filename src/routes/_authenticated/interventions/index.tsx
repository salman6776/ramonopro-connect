import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchInterventions } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Receipt, Mail, Loader2 } from "lucide-react";
import { generateCertificatePDF } from "@/lib/pdf";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendCertificateEmail } from "@/lib/email.functions";

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendEmail = useServerFn(sendCertificateEmail);

  const filtered = useMemo(() => {
    const now = new Date();
    return data.filter((i) => {
      const txt = `${i.clients?.name ?? ""} ${i.installation_type} ${i.clients?.phone ?? ""}`;
      if (!txt.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && i.installation_type !== typeFilter) return false;
      if (period !== "all") {
        const d = new Date(i.intervention_date);
        if (period === "month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
        if (period === "year" && d.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [data, search, typeFilter, period]);

  const openCertificate = async (i: typeof data[number]) => {
    // Try cached PDF in storage first
    const { data: cert } = await supabase
      .from("certificates").select("pdf_url").eq("intervention_id", i.id).maybeSingle();
    if (cert?.pdf_url) {
      window.open(cert.pdf_url, "_blank");
      return;
    }
    // Fallback: regenerate locally
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

  const resendToClient = async (i: typeof data[number]) => {
    if (!i.clients?.email) {
      toast.error("Aucun email enregistré pour ce client");
      return;
    }
    setSendingId(i.id);
    try {
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
      const base64 = pdf.output("datauristring").split(",")[1];
      await sendEmail({ data: {
        to: i.clients.email,
        clientName: i.clients.name,
        technicianName: user?.email ?? "Votre ramoneur",
        interventionDate: i.intervention_date,
        installationType: i.installation_type,
        pdfBase64: base64,
        fileName: `certificat-ramonage-${new Date(i.intervention_date).toISOString().slice(0,10)}.pdf`,
      }});
      toast.success(`Certificat envoyé à ${i.clients.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur envoi email");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Historique des interventions</h1>
        <p className="text-sm text-muted-foreground">{data.length} intervention{data.length > 1 ? "s" : ""}</p>
      </div>

      <Card>
        <CardContent className="py-3 flex flex-wrap gap-2">
          <Input placeholder="Rechercher client, téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[180px]" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="gaz">Gaz</SelectItem>
              <SelectItem value="fioul">Fioul</SelectItem>
              <SelectItem value="bois">Bois</SelectItem>
              <SelectItem value="granulés">Granulés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune intervention.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="py-4 flex flex-wrap items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium">{i.clients?.name ?? "Client supprimé"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(i.intervention_date).toLocaleDateString("fr-FR")} · {i.installation_type} · {i.conduit_state}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${i.cleaning_done ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {i.cleaning_done ? "Nettoyé" : "Non nettoyé"}
                </span>
                <Button variant="outline" size="sm" onClick={() => openCertificate(i)}>
                  <FileDown className="h-4 w-4 mr-1" />PDF
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/invoices"><Receipt className="h-4 w-4 mr-1" />Facture</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => resendToClient(i)}>
                  Renvoyer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
