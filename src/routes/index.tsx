import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FileCheck, Calendar, Receipt, Users, Bell, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RamonoPro — Le logiciel des ramoneurs" },
      { name: "description", content: "Certificats, factures et gestion clients pour ramoneurs. Tout-en-un, simple, conforme." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RamonoPro" className="h-10 w-10" width={40} height={40} />
            <span className="text-lg font-bold text-primary">RamonoPro</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Connexion</Link></Button>
            <Button asChild className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]"><Link to="/auth">Essayer</Link></Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary">
          Le logiciel <span className="text-[var(--color-brand)]">des ramoneurs</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Gérez vos interventions, générez des certificats PDF conformes et facturez vos clients en quelques clics. Conçu pour les pros du ramonage en France.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)]">
            <Link to="/auth">Démarrer gratuitement</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: FileCheck, title: "Certificats PDF", desc: "Générez un certificat professionnel après chaque intervention." },
          { icon: Receipt, title: "Facturation auto", desc: "Une facture est créée automatiquement, prête à envoyer." },
          { icon: Users, title: "Fichier clients", desc: "Centralisez tous vos clients et leur historique d'entretien." },
          { icon: Bell, title: "Rappels annuels", desc: "Ne ratez plus un entretien : rappels à 11 mois automatiques." },
          { icon: Calendar, title: "Mobile-first", desc: "Travaillez depuis le chantier, sur votre téléphone." },
          { icon: ShieldCheck, title: "Sécurisé", desc: "Vos données et celles de vos clients sont protégées." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RamonoPro
      </footer>
    </div>
  );
}
