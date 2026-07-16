import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
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
import { Upload, Building2, Palette } from "lucide-react";

const SUPABASE_URL = "https://esdeyidgtbfandpxtqpr.supabase.co";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

const BRAND_COLORS = [
  { label: "Orange", value: "#e05c1a" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Vert", value: "#16a34a" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Gris", value: "#374151" },
];

function Settings() {
  const { user } = useAuth();
  const uid = user!.id;
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("80");
  const [legalMentions, setLegalMentions] = useState("Conformément au DTU 24.1 et à l'arrêté du 23 février 2009 relatif à l'entretien annuel des appareils de chauffage.");
  const [primaryColor, setPrimaryColor] = useState("#e05c1a");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
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
    const storedColor = localStorage.getItem(`ramono-color-${uid}`);
    if (storedColor) setPrimaryColor(storedColor);
    const storedLogo = localStorage.getItem(`ramono-logo-${uid}`);
    if (storedLogo) setLogoUrl(storedLogo);
    const storedWebsite = localStorage.getItem(`ramono-website-${uid}`);
    if (storedWebsite) setWebsite(storedWebsite);
  }, [uid]);

  const applyColor = (color: string) => {
    document.documentElement.style.setProperty("--color-brand", color);
  };

  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    applyColor(color);
    localStorage.setItem(`ramono-color-${uid}`, color);
  };

  const uploadLogo = async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${uid}/logo.${ext}`;
    setLogoUploading(true);
    try {
      const sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const buf = await file.arrayBuffer();
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: new Uint8Array(buf),
      });
      if (!res.ok) throw new Error("Upload échoué");
      const url = `${SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
      setLogoUrl(url);
      localStorage.setItem(`ramono-logo-${uid}`, url);
      toast.success("Logo téléchargé ✓");
    } catch (e) {
      toast.error("Impossible d'uploader le logo");
    } finally {
      setLogoUploading(false);
    }
  };

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
    localStorage.setItem(`ramono-website-${uid}`, website);
    localStorage.setItem(`ramono-color-${uid}`, primaryColor);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Paramètres enregistrés ✓");
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
          <Button variant="outline" disabled>Gérer mon abonnement</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Mon entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Société</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div><Label>SIRET</Label><Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" /></div>
            </div>
            <div><Label>Adresse</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div><Label>Site web <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://monsite.fr" />
            </div>
            <div><Label>Prix par défaut (€)</Label>
              <Input type="number" min="0" step="1" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} />
            </div>
            <div>
              <Label>Mentions légales (apparaissent sur les certificats)</Label>
              <Textarea rows={4} value={legalMentions} onChange={(e) => setLegalMentions(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Logo entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded-lg p-1" />
            ) : (
              <div className="h-16 w-16 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-xs text-center">Logo</div>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoUploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoUploading ? "Upload…" : logoUrl ? "Changer le logo" : "Importer un logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG ou JPG · Max 2 Mo</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Couleur principale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.value,
                  borderColor: primaryColor === c.value ? "black" : "transparent",
                  outline: primaryColor === c.value ? "2px solid white" : "none",
                  outlineOffset: "-4px",
                }}
                onClick={() => handleColorChange(c.value)}
              />
            ))}
            <div className="flex items-center gap-2 ml-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-9 w-9 rounded-full border cursor-pointer"
                title="Couleur personnalisée"
              />
              <span className="text-xs text-muted-foreground">Personnalisée</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">La couleur s'applique à l'interface. Les préférences de couleur sont sauvegardées localement.</p>
        </CardContent>
      </Card>
    </div>
  );
}
