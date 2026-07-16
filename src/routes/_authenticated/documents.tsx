import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchCertificates, buildCertNumber } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  component: Documents,
});

function Documents() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data = [], isLoading } = useQuery({
    queryKey: ["certificates", uid],
    queryFn: () => fetchCertificates(uid),
  });

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");

  const years = useMemo(() => {
    const s = new Set(data.map((c) => new Date(c.generated_at).getFullYear().toString()));
    return Array.from(s).sort((a, b) => +b - +a);
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.filter((c) => {
      const client = c.interventions?.clients?.full_name ?? "";
      const date = new Date(c.generated_at).toLocaleDateString("fr-FR");
      const type = c.interventions?.installation_type ?? "";
      if (q && ![client, date, type].some((v) => v.toLowerCase().includes(q))) return false;
      if (yearFilter !== "all" && new Date(c.generated_at).getFullYear().toString() !== yearFilter) return false;
      return true;
    });
  }, [data, search, yearFilter]);

  const download = (cert: typeof data[number]) => {
    if (!cert.pdf_url) return;
    const a = document.createElement("a");
    a.href = cert.pdf_url;
    a.target = "_blank";
    a.download = `certificat-${cert.id.slice(0, 8)}.pdf`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Documents</h1>
        <p className="text-sm text-muted-foreground">{data.length} certificat{data.length > 1 ? "s" : ""} généré{data.length > 1 ? "s" : ""}</p>
      </div>

      <Card>
        <CardContent className="py-3 flex flex-wrap gap-2">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Client, type d'installation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {data.length === 0
              ? "Aucun certificat. Créez une intervention pour générer le premier."
              : "Aucun résultat pour cette recherche."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((cert, idx) => {
            const certYear = new Date(cert.generated_at).getFullYear();
            const certIndex = data.filter((c) => new Date(c.generated_at).getFullYear() === certYear).indexOf(cert) + 1;
            const certNum = buildCertNumber(certYear, certIndex);
            const client = cert.interventions?.clients?.full_name ?? "—";
            const date = cert.interventions
              ? new Date(cert.interventions.intervention_date).toLocaleDateString("fr-FR")
              : new Date(cert.generated_at).toLocaleDateString("fr-FR");
            const type = cert.interventions?.installation_type ?? "—";

            return (
              <Card key={cert.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4 flex flex-wrap items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium">{client}</div>
                    <div className="text-xs text-muted-foreground">{date} · {type}</div>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
                    {certNum}
                  </span>
                  {cert.pdf_url ? (
                    <Button size="sm" variant="outline" onClick={() => download(cert)}>
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">PDF non disponible</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
