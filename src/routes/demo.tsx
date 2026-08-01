import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { generatePreviewPdf } from "@/lib/docraptor.service";
import { generateRecommendations, improveNotes } from "@/lib/ai.functions";
import { SignaturePad } from "@/components/signature-pad";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  Camera, FileCheck, X, Loader2, Sparkles, ImagePlus, Images, Wand2,
  PenLine, ArrowRight, CheckCircle2, Banknote, FileText, Zap, Users, BellRing,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { requireAccessToken } from "@/lib/session";

export const Route = createFileRoute("/demo")({
  ssr: false,
  head: () => ({ meta: [{ title: "Essai gratuit — RamonoPro" }] }),
  component: DemoPage,
});

type PhotoItem = { id: string; file: File; preview: string };
type Step = "form" | "signature" | "generating" | "success";

const PRO_FEATURES = [
  { icon: FileCheck, label: "Certificats PDF illimités" },
  { icon: Zap, label: "Notes vocales avec IA" },
  { icon: Users, label: "Base clients complète" },
  { icon: BellRing, label: "Rappels annuels automatiques" },
];

function DemoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const genPreview = useServerFn(generatePreviewPdf);
  const aiGen = useServerFn(generateRecommendations);
  const aiImprove = useServerFn(improveNotes);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { tab: "signup", redirect: "demo" } });
    }
  }, [loading, user, navigate]);

  const [step, setStep] = useState<Step>("form");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [installationType, setInstallationType] = useState("gaz");
  const [conduitState, setConduitState] = useState("bon");
  const [cleaningDone, setCleaningDone] = useState(true);
  const [vacuityTest, setVacuityTest] = useState(true);
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [improveBusy, setImproveBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [certNumber, setCertNumber] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4)
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
    setPhotos((prev) => [...prev, ...items].slice(0, 4));
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const goToSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) { toast.error("Nom du client requis"); return; }
    setStep("signature");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generatePDF = async () => {
    if (!user) return;
    setBusy(true);
    setStep("generating");

    try {
      // 1. Upload photos côté client (on a besoin des File objects)
      const photoUrls: string[] = [];
      for (const item of photos) {
        const path = `${user.id}/${Date.now()}-${item.id}.${item.file.name.split(".").pop() || "jpg"}`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, item.file, { contentType: item.file.type });
        if (!upErr) {
          // Bucket privé : lien signé à durée limitée (pas d'URL publique devinable).
          const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
          if (signed?.signedUrl) photoUrls.push(signed.signedUrl);
        }
      }

      // 2. Appel serveur — crée client, intervention, PDF, certificat, rappel
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expirée. Reconnectez-vous.");
      const result = await genPreview({
        data: {
          access_token: token,
          user_id: user.id,
          client_name: clientName,
          client_phone: clientPhone || undefined,
          client_address: clientAddress || undefined,
          client_email: clientEmail || undefined,
          installation_type: installationType,
          conduit_state: conduitState,
          cleaning_done: cleaningDone,
          vacuity_test: vacuityTest,
          recommendations: recommendations || undefined,
          notes: notes || undefined,
          signature_base64: signature || undefined,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
        },
      });

      // 3. Télécharger le PDF
      const byteChars = atob(result.pdfBase64);
      const byteNums = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteNums], { type: "application/pdf" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `${result.certNumber}-${clientName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      setPdfUrl(result.pdfUrl);
      setCertNumber(result.certNumber);
      setStep("success");
      toast.success(`${result.certNumber} généré et téléchargé !`);
    } catch (err) {
      console.error("PDF generation error:", err);
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg);
      setStep("signature");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── SUCCESS ── */
  if (step === "success") {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="RamonoPro" className="h-9 w-9" />
              <span className="text-base font-bold tracking-tight text-primary">RamonoPro</span>
            </Link>
          </div>
        </header>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg px-4 py-12">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Votre certificat est prêt !</h1>
            <p className="mt-2 text-sm text-muted-foreground">{certNumber} · Téléchargement automatique</p>
          </div>

          {pdfUrl && (
            <Card className="mb-6 border-green-200 bg-green-50/50">
              <CardContent className="py-4 text-center">
                <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">PDF archivé avec filigrane d'essai</p>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-600 underline mt-1 inline-block">
                  Ouvrir dans un nouvel onglet
                </a>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--color-brand)] to-amber-500 px-6 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-100">Passez Pro</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold">24€</span>
                <span className="text-sm font-medium text-orange-100">/mois</span>
              </div>
              <p className="mt-1 text-xs text-orange-100">Sans engagement · Annulation en 1 clic</p>
            </div>
            <CardContent className="pt-4 space-y-2">
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button onClick={() => navigate({ to: "/checkout" })} size="lg"
              className="w-full h-12 bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)] text-base font-semibold">
              <Banknote className="mr-2 h-5 w-5" />Souscrire à l'abonnement Pro
            </Button>
            <Button onClick={() => navigate({ to: "/" })} variant="outline" size="lg" className="w-full h-12">
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── GENERATING ── */
  if (step === "generating") {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="RamonoPro" className="h-9 w-9" />
              <span className="text-base font-bold text-primary">RamonoPro</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--color-brand)]" />
            </div>
            <h2 className="text-xl font-bold text-primary">Génération en cours…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Votre certificat PDF est en cours de création, merci de patienter.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── SIGNATURE ── */
  if (step === "signature") {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="RamonoPro" className="h-9 w-9" />
              <span className="text-base font-bold text-primary">RamonoPro</span>
            </Link>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div>
            <button type="button" onClick={() => setStep("form")} className="text-sm text-muted-foreground hover:text-foreground mb-2">
              ← Retour au formulaire
            </button>
            <h1 className="text-2xl font-bold text-primary">Signature du certificat</h1>
            <p className="text-sm text-muted-foreground">Facultatif — vous pouvez aussi générer sans signature.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />Zone de signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad onSigned={(b64) => setSignature(b64)} onClear={() => setSignature(null)} />
              <div className="text-xs text-muted-foreground border-t pt-3">
                <p>Date : <strong>{new Date().toLocaleDateString("fr-FR")}</strong></p>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={generatePDF} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Générer sans signature
            </Button>
            <Button type="button"
              className="flex-1 bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]"
              onClick={generatePDF} disabled={busy || !signature}>
              {busy
                ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Génération…</>
                : <><FileCheck className="mr-2 h-5 w-5" />Générer le certificat signé</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="RamonoPro" className="h-9 w-9" />
            <span className="text-base font-bold tracking-tight text-primary">RamonoPro</span>
          </Link>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            Essai gratuit — 1 certificat
          </span>
        </div>
      </header>

      <form onSubmit={goToSignature} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Générer votre certificat gratuit</h1>
          <p className="text-sm text-muted-foreground">Remplissez les détails du chantier pour générer un aperçu PDF.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Client</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nom du client *</Label>
                <Input required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="06 12 34 56 78" />
              </div>
              <div className="sm:col-span-2">
                <Label>Adresse d'intervention</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="12 Rue des Cheminées, 75001 Paris" />
              </div>
              <div className="sm:col-span-2">
                <Label>Email du client</Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Installation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Type d'installation</Label>
                <Select value={installationType} onValueChange={setInstallationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaz">Gaz</SelectItem>
                    <SelectItem value="fioul">Fioul</SelectItem>
                    <SelectItem value="bois">Bois</SelectItem>
                    <SelectItem value="granulés">Granulés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>État du conduit</Label>
                <Select value={conduitState} onValueChange={setConduitState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bon">Bon état</SelectItem>
                    <SelectItem value="anomalie_mineure">Anomalie mineure</SelectItem>
                    <SelectItem value="anomalie_majeure">Anomalie majeure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={cleaningDone} onCheckedChange={(v) => setCleaningDone(!!v)} />
              <span>Nettoyage du conduit effectué</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={vacuityTest} onCheckedChange={(v) => setVacuityTest(!!v)} />
              <span>Test de vacuité réussi</span>
            </label>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <Label>Recommandations (visibles sur le certificat)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled={aiBusy}
                    onClick={async () => {
                      setAiBusy(true);
                      try {
                        const { text } = await aiGen({ data: { access_token: await requireAccessToken(), notes, installationType, conduitState, cleaningDone, vacuityTest } });
                        if (text) { setRecommendations(text); toast.success("Recommandations générées ✓"); }
                      } catch { toast.error("Erreur IA"); }
                      finally { setAiBusy(false); }
                    }}>
                    {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    IA
                  </Button>
                  <VoiceRecorder onTranscribed={(t) => setRecommendations((prev) => (prev ? prev + " " : "") + t)} />
                </div>
              </div>
              <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Texte qui apparaîtra sur le certificat remis au client." />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <Label>Notes internes (non visibles sur le certificat)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled={improveBusy || !notes.trim()}
                    onClick={async () => {
                      setImproveBusy(true);
                      try {
                        const { text } = await aiImprove({ data: { access_token: await requireAccessToken(), notes } });
                        if (text) { setNotes(text); toast.success("Notes améliorées ✓"); }
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Erreur IA");
                      } finally { setImproveBusy(false); }
                    }}>
                    {improveBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                    Améliorer
                  </Button>
                  <VoiceRecorder onTranscribed={(t) => setNotes((prev) => (prev ? prev + " " : "") + t)} />
                </div>
              </div>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Tapez ou dictez vos observations." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Photos ({photos.length}/4)</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="secondary" disabled={photos.length >= 4}>
                    <ImagePlus className="h-4 w-4 mr-1" />Ajouter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" />Prendre une photo
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => galleryInputRef.current?.click()}>
                    <Images className="h-4 w-4 mr-2" />Galerie
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            {photos.length === 0 ? (
              <button type="button" onClick={() => galleryInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg py-8 text-sm text-muted-foreground hover:border-primary hover:text-primary transition flex flex-col items-center gap-2">
                <ImagePlus className="h-6 w-6" />Cliquez pour ajouter des photos
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={p.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(p.id)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg"
          className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
          <ArrowRight className="mr-2 h-5 w-5" />Continuer — Signature
        </Button>
      </form>
    </div>
  );
}
