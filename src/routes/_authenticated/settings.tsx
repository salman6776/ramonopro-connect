import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const uid = user!.id;
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setCompanyName(data.company_name ?? "");
        setPhone(data.phone ?? "");
      }
    });
  }, [uid]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: uid, full_name: fullName, company_name: companyName, phone, email: user!.email,
    }, { onConflict: "id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Paramètres</h1>
      <Card>
        <CardHeader><CardTitle>Mon profil</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>Entreprise</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button type="submit" disabled={busy} className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
