import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  User,
  Mail,
} from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — RamonoPro" }] }),
  component: AdminPage,
});

const ADMIN_EMAIL = "salman@ramonopro.com";
const ADMIN_SECRET = "RAMONO-ADMIN-2024";

type PendingSub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  proof_url: string | null;
  reference_email: string | null;
  created_at: string;
  profiles: { email: string | null; full_name: string | null; company_name: string | null } | null;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [secretInput, setSecretInput] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [subs, setSubs] = useState<PendingSub[]>([]);
  const [fetching, setFetching] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);

  const isAdminEmail = user?.email === ADMIN_EMAIL;
  const hasAccess = isAdminEmail || accessGranted;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (hasAccess) fetchPending();
  }, [hasAccess]);

  const fetchPending = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, profiles(email, full_name, company_name)")
        .eq("status", "pending_verification")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubs((data ?? []) as PendingSub[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  const handleViewProof = async (proofPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("proofs")
        .createSignedUrl(proofPath, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Impossible d'ouvrir la preuve.");
    }
  };

  const handleValidate = async (sub: PendingSub) => {
    setValidating(sub.id);
    try {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active", current_period_end: periodEnd.toISOString() })
        .eq("id", sub.id);

      if (error) throw error;

      toast.success(`Abonnement de ${sub.profiles?.email ?? sub.user_id} activé !`);
      setSubs((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la validation";
      toast.error(msg);
    } finally {
      setValidating(null);
    }
  };

  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim() === ADMIN_SECRET) {
      setAccessGranted(true);
    } else {
      toast.error("Code incorrect.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="RamonoPro" className="h-8 w-8" width={32} height={32} />
          <span className="font-bold text-gray-800">RamonoPro</span>
          <Badge className="ml-1 bg-orange-100 text-orange-700 hover:bg-orange-100">Admin</Badge>
        </div>
        <span className="text-sm text-gray-400">{user?.email}</span>
      </div>

      <div className="mx-auto max-w-3xl">
        {!hasAccess ? (
          /* ── ACCESS GATE ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-sm"
          >
            <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-xl shadow-gray-900/5 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
                <ShieldCheck className="h-8 w-8 text-orange-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Accès Admin</h1>
              <p className="mt-2 text-sm text-gray-500">Entrez le code secret pour accéder au panneau d'administration.</p>
              <form onSubmit={handleSecretSubmit} className="mt-6 space-y-3">
                <div className="text-left">
                  <Label htmlFor="secret">Code secret</Label>
                  <Input
                    id="secret"
                    type="password"
                    required
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Accéder
                </Button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* ── ADMIN PANEL ── */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Virements en attente</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {subs.length === 0
                    ? "Aucun virement en attente de validation."
                    : `${subs.length} virement${subs.length > 1 ? "s" : ""} à vérifier`}
                </p>
              </div>
              <Button
                onClick={fetchPending}
                variant="outline"
                size="sm"
                disabled={fetching}
                className="gap-1.5"
              >
                {fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Actualiser
              </Button>
            </div>

            {fetching && subs.length === 0 ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : subs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-300" />
                <p className="mt-4 font-semibold text-gray-500">Aucun virement en attente</p>
                <p className="mt-1 text-sm text-gray-400">Tous les paiements ont été traités.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subs.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    {/* Sub header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50">
                          <User className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {sub.profiles?.full_name ?? "—"}
                            {sub.profiles?.company_name && (
                              <span className="ml-1.5 text-xs font-normal text-gray-400">
                                ({sub.profiles.company_name})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            {sub.profiles?.email ?? sub.reference_email ?? "email inconnu"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-50 border-orange-200 border">
                          <Clock className="mr-1 h-3 w-3" />
                          En attente
                        </Badge>
                      </div>
                    </div>

                    {/* Sub body */}
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <p className="font-semibold uppercase tracking-wider text-gray-400">Plan</p>
                          <p className="mt-0.5 font-semibold text-gray-700 capitalize">{sub.plan}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <p className="font-semibold uppercase tracking-wider text-gray-400">Date</p>
                          <p className="mt-0.5 font-semibold text-gray-700">
                            {new Date(sub.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {sub.reference_email && (
                          <div className="col-span-2 rounded-lg bg-blue-50 px-3 py-2">
                            <p className="font-semibold uppercase tracking-wider text-blue-400">Email de référence</p>
                            <p className="mt-0.5 font-semibold text-blue-700">{sub.reference_email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
                      {sub.proof_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleViewProof(sub.proof_url!)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Voir la preuve
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Aucune preuve uploadée</span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleValidate(sub)}
                        disabled={validating === sub.id}
                        className="ml-auto bg-green-500 hover:bg-green-600 text-white gap-1.5"
                      >
                        {validating === sub.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Valider le paiement
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
