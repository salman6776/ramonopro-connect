import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Camera, FileCheck, X, Loader2, Sparkles, ImagePlus, Images, Wand2, PenLine, ArrowRight, AlertCircle, RotateCw } from "lucide-react";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useServerFn } from "@tanstack/react-start";
import { generateRecommendations, improveNotes } from "@/lib/ai.functions";
import { generateOfficialPdf } from "@/lib/docraptor.service";
import { SignaturePad } from "@/components/signature-pad";

export const Route = createFileRoute("/_authenticated/interventions/new")({
  component: NewIntervention,
});

type PhotoItem = { id: string; file: File; preview: string };
type Step = "form" | "signature";

function NewIntervention() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [installationType, setInstallationType] = useState("gaz");
  const [conduitState, setConduitState] = useState("bon");
  const [conduitCount, setConduitCount] = useState(1);
  const [conduitMaterial, setConduitMaterial] = useState("maconne");
  const [cleaningDone, setCleaningDone] = useState(true);
  const [vacuityTest, setVacuityTest] = useState(true);
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [improveBusy, setImproveBusy] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  const aiGen = useServerFn(generateRecommendations);
  const aiImprove = useServerFn(improveNotes);
  const genPDF = useServerFn(generateOfficialPdf);

  const runImprove = async () => {
    if (!notes.trim()) { toast.error("Ajoutez d'abord des notes"); return; }
    setImproveBusy(true); setImproveError(null);
    try {
      const { text } = await aiImprove({ data: { notes } });
      if (text) { setNotes(text); toast.success("Notes améliorées ✓"); }
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : "Erreur IA");
    } finally { setImproveBusy(false); }
  };

  const runRecommendations = async () => {
    setAiBusy(true); setAiError(null);
    try {
      const { text } = await aiGen({ data: { notes, installationType, conduitState, cleaningDone, vacuityTest } });
      if (text) { setRecommendations(text); toast.success("Recommandations générées ✓"); }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Erreur IA");
    } finally { setAiBusy(false); }
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6)
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
    setPhotos((prev) => [...prev, ...items].slice(0, 6));
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
    setBusy(true);
    try {
      // 1. Upload photos (on a besoin des File objects côté client)
      const photoUrls: string[] = [];
      for (const item of photos) {
        const path = `${uid}/${Date.now()}-${item.id}.${item.file.name.split(".").pop() || "jpg"}`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, item.file, { contentType: item.file.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("photos").getPublicUrl(path);
          photoUrls.push(pub.publicUrl);
        } else {
          console.warn("Photo upload error:", upErr.message);
        }
      }

      // 2. Appel serveur — crée client, intervention, PDF officiel, certificat, rappel, facture
      toast.loading("Génération du certificat officiel…", { id: "pdf-gen" });
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.dismiss("pdf-gen");
        toast.error("Session expirée. Reconnectez-vous.");
        setBusy(false);
        return;
      }
      const result = await genPDF({
        data: {
          access_token: token,
          user_id: uid,
          client_name: clientName,
          client_phone: clientPhone || undefined,
          client_address: clientAddress || undefined,
          client_email: clientEmail || undefined,
          installation_type: installationType,
          conduit_state: conduitState,
          conduit_count: conduitCount,
          conduit_material: conduitMaterial,
          cleaning_done: cleaningDone,
          vacuity_test: vacuityTest,
          recommendations: recommendations || undefined,
          notes: notes || undefined,
          signature_base64: signature || undefined,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
        },
      });
      toast.dismiss("pdf-gen");

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

      if (result.mode === "preview") {
        const left = result.previewsRemaining ?? 0;
        toast.success(
          left > 0
            ? `Essai gratuit — ${left} certificat(s) restant(s). Passez Pro pour retirer le filigrane.`
            : `Dernier essai gratuit utilisé. Passez Pro pour continuer sans filigrane.`,
        );
      } else {
        toast.success(`${result.certNumber} généré et téléchargé ✓`);
      }
      qc.invalidateQueries();
      navigate({ to: "/interventions" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.dismiss("pdf-gen");
      const msg = err instanceof Error ? err.message : "Erreur lors de la génération";
      if (msg.includes("Passez Pro") || msg.includes("essai") || msg.toLowerCase().includes("subscription")) {
        toast.error(msg);
        navigate({ to: "/checkout" });
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  /* ── SIGNATURE ── */
  if (step === "signature") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <button type="button" onClick={() => setStep("form")}
            className="text-sm text-muted-foreground hover:text-foreground mb-2">
            ← Retour au formulaire
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Signature du certificat</h1>
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
    );
  }

  /* ── FORM ── */
  return (
    <form onSubmit={goToSignature} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Nouvelle intervention</h1>
        <p className="text-sm text-muted-foreground">Remplissez les détails puis générez le certificat PDF officiel.</p>
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
              <Label>Email (envoi du certificat)</Label>
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nombre de conduits ramonés</Label>
              <Input type="number" min={1} max={20} value={conduitCount}
                onChange={(e) => setConduitCount(Math.max(1, parseInt(e.target.value || "1", 10)))} />
            </div>
            <div>
              <Label>Matériau du conduit</Label>
              <Select value={conduitMaterial} onValueChange={setConduitMaterial}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maconne">Maçonné (briques / boisseaux)</SelectItem>
                  <SelectItem value="metallique">Métallique</SelectItem>
                  <SelectItem value="tubage_inox">Tubage inox</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
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
              <Label>Notes internes</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={runImprove}
                  disabled={improveBusy || !notes.trim()}>
                  {improveBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                  Améliorer
                </Button>
                <VoiceRecorder onTranscribed={(t) => setNotes((prev) => (prev ? prev + " " : "") + t)} />
              </div>
            </div>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Tapez ou dictez vos observations." />
            {improveError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="flex-1">{improveError}</span>
                <button type="button" onClick={runImprove}
                  className="inline-flex items-center gap-1 underline hover:no-underline">
                  <RotateCw className="h-3 w-3" />Réessayer
                </button>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Recommandations (visibles sur le certificat)</Label>
              <Button type="button" variant="secondary" size="sm" onClick={runRecommendations} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Générer avec IA
              </Button>
            </div>
            <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Texte qui apparaîtra sur le certificat remis au client." />
            {aiError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="flex-1">{aiError}</span>
                <button type="button" onClick={runRecommendations}
                  className="inline-flex items-center gap-1 underline hover:no-underline">
                  <RotateCw className="h-3 w-3" />Réessayer
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span>Photos ({photos.length}/6)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="secondary" disabled={photos.length >= 6}>
                  <ImagePlus className="h-4 w-4 mr-1" />Ajouter des photos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" />Prendre une photo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => galleryInputRef.current?.click()}>
                  <Images className="h-4 w-4 mr-2" />Choisir dans la galerie
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  <FileCheck className="h-4 w-4 mr-2" />Importer un fichier
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
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          {photos.length === 0 ? (
            <button type="button" onClick={() => galleryInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-lg py-8 text-sm text-muted-foreground hover:border-primary hover:text-primary transition flex flex-col items-center gap-2">
              <ImagePlus className="h-6 w-6" />Cliquez pour ajouter des photos
            </button>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
  );
}
