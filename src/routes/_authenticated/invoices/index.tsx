import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchInvoices } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Check } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: Invoices,
});

function Invoices() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["invoices", uid], queryFn: () => fetchInvoices(uid) });

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "payée" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Facture marquée payée");
    qc.invalidateQueries({ queryKey: ["invoices", uid] });
  };

  const download = async (inv: typeof data[number]) => {
    const client = inv.interventions?.clients;
    const pdf = await generateInvoicePDF({
      invoice_number: inv.invoice_number ?? inv.id.slice(0, 8),
      date: inv.created_at,
      client_name: client?.name ?? "Client",
      client_address: client?.address ?? "",
      description: `Intervention de ramonage du ${new Date(inv.interventions?.intervention_date ?? inv.created_at).toLocaleDateString("fr-FR")}`,
      amount: Number(inv.amount),
      status: inv.status,
    });
    pdf.save(`facture-${inv.invoice_number ?? inv.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Factures</h1>
      {data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune facture.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((inv) => {
            const paid = inv.status === "payée" || inv.status === "paid";
            return (
              <Card key={inv.id}>
                <CardContent className="py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium">N° {inv.invoice_number ?? inv.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.interventions?.clients?.name ?? "—"} · {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="font-bold">{Number(inv.amount).toFixed(2)} €</div>
                  <span className={`text-xs px-2 py-1 rounded ${paid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {paid ? "Payée" : "En attente"}
                  </span>
                  {!paid && (
                    <Button size="sm" variant="outline" onClick={() => markPaid(inv.id)}>
                      <Check className="h-4 w-4 mr-1" />Payée
                    </Button>
                  )}
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
