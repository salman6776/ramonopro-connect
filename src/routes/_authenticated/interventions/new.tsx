import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { fetchClients } from "@/lib/queries";
import { uploadPhoto, uploadCertificate } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Camera, FileCheck, X, Loader2, Sparkles, ImagePlus, Images, Wand2 } from "lucide-react";
import { generateCertificatePDF } from "@/lib/pdf";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useServerFn } from "@tanstack/react-start";
import { generateRecommendations, improveNotes } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/interventions/new")({
  component: NewIntervention,
});

type PhotoItem = { id: string; file: File; preview: string };

function NewIntervention() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: clientList = [] } = useQuery({ queryKey: ["clients", uid], queryFn: () => fetchClients(uid) });

  const [clientId, setClientId] = useState<string>("__new");
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
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [improveBusy, setImproveBusy] = useState(false);
  const aiGen = useServerFn(generateRecommendations);
  const aiImprove = useServerFn(improveNotes);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAI = async () => {
    setAiBusy(true);
    try {
      const { text } = await aiGen({ data: {
        notes, installationType, conduitState, cleaningDone, vacuityTest,
      }});
      if (text) {
        setRecommendations(text);
        toast.success("Recommandations générées ✓");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  };

  const runImprove = async () => {
    if (!notes.trim()) {
      toast.error("Ajoutez d'abord quelques notes");
      return;
    }
    setImproveBusy(true);
    try {
      const { text } = await aiImprove({ data: { notes } });
      if (text) {
        setNotes(text);
        toast.success("Notes améliorées ✓");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur IA");
    } finally {
      setImproveBusy(false);
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
    setPhotos((prev) => [...prev, ...items]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let finalClientId: string | null = clientId === "__new" ? null : clientId;
      let finalClient = clientList.find((c) => c.id === finalClientId);

      if (clientId === "__new") {
        if (!clientName.trim()) throw new Error("Nom du client requis");
        const { data: newClient, error: cErr } = await supabase
          .from("clients")
          .insert({
            user_id: uid,
            name: clientName,
            phone: clientPhone || null,
            address: clientAddress || null,
            email: clientEmail || null,
          })
          .select().single();
        if (cErr) throw cErr;
        finalClientId = newClient.id;
        finalClient = newClient;
      }

      // 1. Upload photos to Storage
      const photoUrls: string[] = [];
      for (const slot of photos) {
        if (slot.file) {
          const url = await uploadPhoto(uid, slot.file);
          photoUrls.push(url);
        }
      }

      // 2. Insert intervention
      const { data: intervention, error: iErr } = await supabase
        .from("interventions")
        .insert({
          user_id: uid,
          client_id: finalClientId,
          intervention_date: new Date().toISOString(),
          installation_type: installationType,
          conduit_state: conduitState,
          cleaning_done: cleaningDone,
          vacuity_test: vacuityTest,
          recommendations,
          notes,
          photos: photoUrls,
        })
        .select().single();
      if (iErr) throw iErr;

      // 3. Generate PDF + upload to certificates bucket
      const pdf = await generateCertificatePDF({
        intervention_date: intervention.intervention_date,
        client_name: finalClient?.name ?? clientName,
        client_address: finalClient?.address ?? clientAddress,
        client_phone: finalClient?.phone ?? clientPhone,
        installation_type: installationType,
        conduit_state: conduitState,
        cleaning_done: cleaningDone,
        recommendations,
        technician_name: user!.email ?? "",
      });

      const { url: pdfUrl } = await uploadCertificate(uid, intervention.id, pdf);

      await supabase.from("certificates").insert({
        user_id: uid,
        intervention_id: intervention.id,
        pdf_url: pdfUrl,
      });

      // 4. Auto invoice + reminder
      await supabase.from("invoices").insert({
        user_id: uid,
        intervention_id: intervention.id,
        amount: 80,
        status: "en attente",
        invoice_number: `F-${Date.now()}`,
      });

      const reminderDate = new Date(intervention.intervention_date);
      reminderDate.setMonth(reminderDate.getMonth() + 11);
      await supabase.from("reminders").insert({
        user_id: uid,
        intervention_id: intervention.id,
        client_id: finalClientId,
        reminder_date: reminderDate.toISOString(),
        status: "programmé",
      });

      pdf.save(`certificat-${(finalClient?.name ?? "client").replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Certificat généré ✓");
      qc.invalidateQueries();
      navigate({ to: "/interventions" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Nouvelle intervention</h1>
        <p className="text-sm text-muted-foreground">Remplissez les détails du chantier puis générez le certificat PDF.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Client</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Sélectionner un client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">+ Nouveau client</SelectItem>
                {clientList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {clientId === "__new" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input required value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
              <div><Label>Téléphone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Adresse</Label><Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Email (pour envoi du certificat)</Label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Installation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
            <Checkbox checked={vacuityTest} onCheckedChange={(v) => setVacuityTest(!!v)} />
            <span>Test de vacuité réussi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={cleaningDone} onCheckedChange={(v) => setCleaningDone(!!v)} />
            <span>Nettoyage effectué</span>
          </label>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Notes internes</Label>
              <VoiceRecorder onTranscribed={(t) => setNotes((prev) => (prev ? prev + " " : "") + t)} />
            </div>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dictez ou tapez vos observations…" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Recommandations (client)</Label>
              <Button type="button" variant="secondary" size="sm" onClick={runAI} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Générer avec IA
              </Button>
            </div>
            <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Texte qui apparaîtra sur le certificat remis au client." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {PHOTO_LABELS.map((label, i) => (
              <label key={i} className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary text-xs text-muted-foreground relative overflow-hidden">
                {photos[i].preview ? (
                  <>
                    <img src={photos[i].preview!} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.preventDefault(); handlePhoto(i, null); }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6 mb-1" />
                    <span className="text-center px-1">{label}</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => handlePhoto(i, e.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={busy} size="lg"
        className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
        {busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Génération…</> : <><FileCheck className="mr-2 h-5 w-5" />Générer le certificat PDF</>}
      </Button>
    </form>
  );
}
