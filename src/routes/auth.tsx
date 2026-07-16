import { createFileRoute, useNavigate, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || undefined,
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({ meta: [{ title: "Connexion — RamonoPro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect, tab } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);

  const dest = redirect === "checkout" ? "/checkout" : redirect === "demo" ? "/demo" : "/dashboard";

  if (!loading && user) return <Navigate to={dest} />;

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Connexion réussie");
    navigate({ to: dest });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Supabase Auth: crée le compte
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${dest}`,
          data: { full_name: fullName, company_name: companyName },
        },
      });
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }

      // Si session immédiate (email confirmation désactivée) → connecté directement
      if (data.session) {
        await supabase.from("profiles").upsert({
          id: data.user!.id,
          full_name: fullName,
          company_name: companyName,
          email,
        }, { onConflict: "id" });
        toast.success("Compte créé ! Bienvenue 🎉");
        navigate({ to: dest });
        return;
      }

      // Pas de session → confirmation email requise OU confirmation automatique manquante
      // Essayer de se connecter directement (fonctionne si confirm email est OFF)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email, password,
      });
      if (!signInErr && signInData.session) {
        await supabase.from("profiles").upsert({
          id: signInData.user!.id,
          full_name: fullName,
          company_name: companyName,
          email,
        }, { onConflict: "id" });
        toast.success("Compte créé ! Bienvenue 🎉");
        navigate({ to: dest });
        return;
      }

      // Dernier recours: confirmation email requise
      if (data.user) {
        toast.success("Compte créé ! Un email de confirmation a été envoyé. Cliquez sur le lien pour activer votre compte.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-[var(--color-brand)]/5 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-2 mb-6">
          <img src={logo} alt="RamonoPro" className="h-16 w-16" width={64} height={64} />
          <span className="text-xl font-bold text-primary">RamonoPro</span>
        </Link>

        {redirect === "checkout" && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 text-center">
            Créez votre compte pour finaliser votre abonnement Pro 🚀
          </div>
        )}
        {redirect === "demo" && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 text-center">
            Créez votre compte pour générer votre certificat gratuit ✨
          </div>
        )}

        <div className="bg-card border rounded-xl shadow-sm p-6">
          <Tabs defaultValue={tab === "login" ? "login" : "signup"}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-3">
                <div>
                  <Label htmlFor="le">Email</Label>
                  <Input id="le" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lp">Mot de passe</Label>
                  <Input id="lp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
                  {busy ? "Connexion…" : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-3">
                <div>
                  <Label htmlFor="sn">Nom complet</Label>
                  <Input id="sn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sc">Entreprise</Label>
                  <Input id="sc" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="se">Email</Label>
                  <Input id="se" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sp">Mot de passe</Label>
                  <Input id="sp" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
                  {busy ? "Création…" : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
