import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchSubscription } from "@/lib/queries";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Mail, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/waiting")({
  ssr: false,
  head: () => ({ meta: [{ title: "En attente de vérification — RamonoPro" }] }),
  component: WaitingPage,
});

function WaitingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => fetchSubscription(user!.id),
    enabled: !!user,
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "checkout" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (sub?.status === "active") {
      toast.success("Votre abonnement Pro est activé ! Bienvenue 🎉");
      navigate({ to: "/dashboard" });
    }
  }, [sub?.status, navigate]);

  if (loading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f6f9fc" }}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const steps = [
    {
      icon: CheckCircle2,
      label: "Preuve de virement reçue",
      done: true,
      color: "text-green-500 bg-green-50",
    },
    {
      icon: Clock,
      label: "Vérification en cours par l'équipe",
      done: false,
      color: "text-orange-500 bg-orange-50",
    },
    {
      icon: CheckCircle2,
      label: "Accès Pro activé",
      done: false,
      color: "text-gray-300 bg-gray-50",
    },
  ];

  return (
    <div className="min-h-screen px-4 py-10 md:py-16" style={{ background: "#f6f9fc" }}>
      {/* Header */}
      <div className="mx-auto mb-8 flex max-w-lg items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Accueil
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="RamonoPro" className="h-8 w-8" width={32} height={32} />
          <span className="text-sm font-bold text-gray-800">RamonoPro</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-lg"
      >
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-xl shadow-gray-900/5">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="h-10 w-10 text-orange-400" />
            </motion.div>
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-900">
            Paiement en cours de vérification
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-gray-500">
            Notre équipe vérifie votre virement manuellement.
            <br />
            <span className="font-semibold text-gray-700">Délai maximum : 24 heures.</span>
          </p>

          {/* Steps */}
          <div className="mt-8 space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.color}`}>
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : i === 1 ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-sm font-medium ${step.done ? "text-green-700" : i === 1 ? "text-orange-700" : "text-gray-300"}`}>
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Email reminder */}
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
            <p>
              Vous recevrez un email de confirmation à <strong>{user?.email}</strong> dès que votre
              accès sera activé.
            </p>
          </div>

          {/* Live check badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Vérification automatique toutes les 8 secondes…
          </div>

          <Button
            onClick={() => navigate({ to: "/checkout" })}
            variant="outline"
            className="mt-6 w-full text-sm text-gray-600"
          >
            Modifier ma demande
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
