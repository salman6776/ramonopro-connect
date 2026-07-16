import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchInvoices } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: Invoices,
});

const STATUS_OPTIONS = [
  { value: "en attente", label: "En attente", className: "bg-orange-100 text-orange-700" },
  { value: "payée", label: "Payée", className: "bg-green-100 text-green-700" },
  { value: "en retard", label: "En retard", className: "bg-red-100 text-red-700" },
];

function statusClass(status: string) {
  if (status === "payée" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "en retard" || status === "overdue") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
}

function statusLabel(status: string) {
  if (status === "payée" || status === "paid") return "Payée";
  if (status === "en retard" || status === "overdue") return "En retard";
  return "En attente";
}

function Invoices() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["invoices", uid], queryFn: () => fetchInvoices(uid) });

  const stats = useMemo(() => ({
    total: data.length,
    paid: data.filter((i) => i.status === "payée" || i.status === "paid").length,
    pending: data.filter((i) => i.status !== "payée" && i.status !== "paid" && i.status !== "en retard").length,
    overdue: data.filter((i) => i.status === "en retard").length,
    totalAmount: data.reduce((s, i) => s + Number(i.amount || 0), 0),
    paidAmount: data.filter((i) => i.status === "payée" || i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0),
  }), [data]);

  const changeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Statut mis à jour : ${statusLabel(newStatus)}`);
    qc.invalidateQueries({ queryKey: ["invoices", uid] });
  };

  const download = async (inv: typeof data[number]) => {
    const client = inv.interventions?.clients;
    const pdf = await generateInvoicePDF({
      invoice_number: inv.id.slice(0, 8),
      date: inv.issued_at,
      client_name: client?.full_name ?? "Client",
      client_address: client?.address ?? "",
      description: `Intervention de ramonage du ${new Date(inv.interventions?.intervention_date ?? inv.issued_at).toLocaleDateString("fr-FR")}`,
      amount: Number(inv.amount),
      status: inv.status,
    });
    pdf.save(`facture-${inv.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Factures</h1>

      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 text-center">
            <div className="text-lg font-bold text-green-600">{stats.paid}</div>
            <div className="text-xs text-muted-foreground">Payées</div>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <div className="text-lg font-bold text-orange-500">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <div className="text-lg font-bold text-red-500">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">En retard</div>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <div className="text-lg font-bold">{stats.paidAmount.toFixed(0)} €</div>
            <div className="text-xs text-muted-foreground">Encaissé</div>
          </CardContent></Card>
        </div>
      )}

      {data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune facture.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((inv) => {
            const currentStatus = inv.status;
            return (
              <Card key={inv.id} className={currentStatus === "en retard" ? "border-red-200" : ""}>
                <CardContent className="py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium">N° {inv.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.interventions?.clients?.full_name ?? "—"} · {new Date(inv.issued_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="font-bold">{Number(inv.amount).toFixed(2)} €</div>

                  <span className={`text-xs px-2 py-1 rounded font-medium ${statusClass(currentStatus)}`}>
                    {statusLabel(currentStatus)}
                  </span>

                  <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTIONS.filter((s) => s.value !== currentStatus && s.value !== "paid").map((s) => (
                      <Button
                        key={s.value}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => changeStatus(inv.id, s.value)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>

                  <Button size="sm" variant="outline" onClick={() => download(inv)}>
                    <FileDown className="h-4 w-4 mr-1" />PDF
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
