import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchSubscription } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const uid = user!.id;
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [address, setAddress] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("80");
  const [legalMentions, setLegalMentions] = useState("Conformément au DTU 24.1 et à l'arrêté du 23 février 2009 relatif à l'entretien annuel des appareils de chauffage.");
  const [plan, setPlan] = useState<string | null>(null);
  const [planEnd, setPlanEnd] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setCompanyName(data.company_name ?? "");
        setPhone(data.phone ?? "");
        setSiret(data.siret ?? "");
        setAddress(data.address ?? "");
        if (data.default_price != null) setDefaultPrice(String(data.default_price));
        if (data.legal_mentions) setLegalMentions(data.legal_mentions);
      }
    });
    fetchSubscription(uid).then((sub) => {
      setPlan(sub?.plan ?? "starter");
      setPlanEnd(sub?.current_period_end ?? null);
    });
  }, [uid]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      full_name: fullName,
      company_name: companyName,
      phone,
      siret,
      address,
      email: user!.email,
      default_price: Number(defaultPrice) || 80,
      legal_mentions: legalMentions,
    }, { onConflict: "id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  };

  const planLabel = (plan ?? "starter").charAt(0).toUpperCase() + (plan ?? "starter").slice(1);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Paramètres</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Abonnement</CardTitle>
          <Badge className="bg-[var(--color-brand)] text-[var(--color-brand-foreground)]">{planLabel}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {planEnd && <p className="text-muted-foreground">Renouvellement : {new Date(planEnd).toLocaleDateString("fr-FR")}</p>}
          <Button variant="outline" disabled>
            Gérer mon abonnement (à activer)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mon entreprise</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Société</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div><Label>SIRET</Label><Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" /></div>
            </div>
            <div><Label>Adresse</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div><Label>Prix par défaut (€)</Label><Input type="number" min="0" step="1" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} /></div>
            <div>
              <Label>Mentions légales (PDF)</Label>
              <Textarea rows={4} value={legalMentions} onChange={(e) => setLegalMentions(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
