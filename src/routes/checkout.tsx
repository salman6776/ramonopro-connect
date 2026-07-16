import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  ArrowLeft,
  Banknote,
  Shield,
  Zap,
  FileCheck2,
  Users,
  BellRing,
  Send,
  Mic,
  Archive,
  Loader2,
  CheckCircle2,
  UploadCloud,
  Clock,
  FileText,
} from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Finaliser votre abonnement — RamonoPro" }] }),
  component: CheckoutPage,
});

const BANK_DETAILS = [
  { label: "Titulaire", value: "RAISSO ABDOURAHMAN ALI" },
  { label: "Banque", value: "East Africa Bank" },
  { label: "IBAN", value: "DJ2100018001011002192700166" },
  { label: "SWIFT / BIC", value: "EABDDJJD" },
  { label: "Adresse", value: "EAB TOWER, Rue de Athènes, Djibouti" },
];

const PRO_FEATURES = [
  { icon: FileCheck2, label: "Certificats PDF illimités" },
  { icon: Mic, label: "Notes vocales illimitées" },
  { icon: Archive, label: "Archivage cloud sécurisé" },
  { icon: BellRing, label: "Rappels annuels automatiques" },
  { icon: Send, label: "Envoi email instantané" },
  { icon: Users, label: "Historique client complet" },
  { icon: Zap, label: "Support réactif 7j/7" },
  { icon: Shield, label: "Sans engagement" },
];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copié !`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-100/70">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        aria-label={`Copier ${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(f.type)) {
      toast.error("Format non accepté. Utilisez JPG, PNG ou PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setFile(f);
  };

  const handleConfirmTransfer = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour continuer.");
      navigate({ to: "/auth", search: { redirect: "checkout" } });
      return;
    }
    if (!email.trim()) {
      toast.error("Veuillez saisir votre email de référence.");
      return;
    }
    if (!file) {
      toast.error("Veuillez uploader votre preuve de virement.");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan: "pro",
          status: "pending_verification",
          proof_url: filePath,
          reference_email: email.trim(),
        },
        { onConflict: "user_id" }
      );

      if (dbError) throw dbError;

      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f6f9fc" }}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 md:py-16" style={{ background: "#f6f9fc" }}>
      <div className="mx-auto mb-8 flex max-w-lg items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="RamonoPro" className="h-8 w-8" width={32} height={32} />
          <span className="text-sm font-bold text-gray-800">RamonoPro</span>
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          /* ── SUCCESS SCREEN ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-lg text-center"
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-8 py-12 shadow-xl shadow-gray-900/5">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 ring-8 ring-orange-50/50">
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Virement reçu !</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                Merci ! Votre paiement est en cours de vérification.
                <br />
                <span className="font-semibold text-gray-700">Votre accès Pro sera activé sous 24h.</span>
              </p>
              <div className="mx-auto mt-6 flex max-w-xs flex-col items-center gap-2 rounded-xl bg-orange-50 px-5 py-4 text-xs text-orange-700">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Preuve de virement envoyée
                </span>
                <span className="text-orange-500">Vous recevrez une confirmation par email.</span>
              </div>
              <Button
                onClick={() => navigate({ to: "/waiting" })}
                className="mt-8 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Voir le statut de mon compte
              </Button>
            </div>
          </motion.div>
        ) : (
          /* ── CHECKOUT FORM ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-lg"
          >
            <div className="mb-6 text-center">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 ring-1 ring-orange-200">
                <Banknote className="h-3.5 w-3.5" />
                Paiement par virement
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Finaliser votre abonnement
              </h1>
              <p className="mt-1 text-sm text-gray-500">Accès illimité à toutes les fonctionnalités Pro</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
              {/* Price banner */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-100">Plan Pro</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">24€</span>
                      <span className="text-sm font-medium text-orange-100">/mois</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                    Sans engagement
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-1.5">
                  {PRO_FEATURES.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-orange-50">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/25">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank details */}
              <div className="px-6 pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                    <Banknote className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-800">Coordonnées bancaires</h2>
                </div>
                <div className="space-y-2">
                  {BANK_DETAILS.map(({ label, value }) => (
                    <CopyField key={label} label={label} value={value} />
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="px-6 pt-6 pb-2 space-y-4">
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <p>
                    Indiquez votre email comme <strong>référence du virement</strong>, puis uploadez
                    votre preuve. Votre accès sera activé sous 24h après vérification manuelle.
                  </p>
                </div>

                {/* Email input */}
                <div>
                  <Label htmlFor="ref-email" className="text-sm font-semibold text-gray-700">
                    Votre email (à mettre en référence du virement) *
                  </Label>
                  <Input
                    id="ref-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="mt-1.5"
                    autoComplete="email"
                  />
                </div>

                {/* File upload */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Preuve de virement (JPG, PNG ou PDF) *
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label
                    htmlFor="proof-upload"
                    className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors ${
                      file
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-400 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-600"
                    }`}
                  >
                    {file ? (
                      <>
                        <CheckCircle2 className="h-7 w-7 text-green-500" />
                        <span className="max-w-[200px] truncate text-center font-semibold">{file.name}</span>
                        <span className="text-xs text-green-500">Cliquez pour changer</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-7 w-7" />
                        <span className="font-medium">Uploader ma preuve de virement</span>
                        <span className="text-xs">JPG, PNG, PDF — max 10 Mo</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 mt-4 border-t border-gray-100" />

              {/* CTA */}
              <div className="px-6 py-5">
                <Button
                  onClick={handleConfirmTransfer}
                  disabled={busy || !email || !file}
                  className="group h-12 w-full bg-orange-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      J'ai effectué le virement
                    </>
                  )}
                </Button>

                {!user && (
                  <p className="mt-3 text-center text-xs text-gray-400">
                    Vous devez être{" "}
                    <Link
                      to="/auth"
                      search={{ redirect: "checkout" }}
                      className="font-medium text-orange-500 underline underline-offset-2 hover:text-orange-600"
                    >
                      connecté
                    </Link>{" "}
                    pour soumettre votre paiement.
                  </p>
                )}

                <p className="mt-3 text-center text-[11px] text-gray-400">
                  Accès activé sous 24h après vérification · Sans engagement
                </p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: Shield, label: "Données sécurisées" },
                { icon: Clock, label: "Vérification sous 24h" },
                { icon: Check, label: "Sans engagement" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
