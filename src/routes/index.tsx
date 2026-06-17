import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import {
  Mic,
  FileCheck2,
  Archive,
  Users,
  BellRing,
  Send,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Play,
  ChevronDown,
  ShieldCheck,
  Zap,
  Clock,
} from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RamonoPro — Le certificat de ramonage en 30 secondes" },
      {
        name: "description",
        content:
          "Envoyez une note vocale après votre intervention. RamonoPro génère, envoie et archive votre certificat de ramonage automatiquement. 24€/mois, illimité.",
      },
      { property: "og:title", content: "RamonoPro — Le logiciel des ramoneurs" },
      {
        property: "og:description",
        content: "Le certificat de ramonage en 30 secondes. Note vocale → PDF → Client. Automatique.",
      },
    ],
  }),
  component: Landing,
});

import type { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Nav />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="RamonoPro" className="h-9 w-9" width={36} height={36} />
          <span className="text-base font-bold tracking-tight text-primary">RamonoPro</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="text-sm">
            <Link to="/auth">Connexion</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-[var(--color-brand-foreground)] shadow-lg shadow-orange-500/20"
          >
            <Link to="/auth">
              Essayer
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative pt-12 pb-20 md:pt-24 md:pb-32">
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[var(--color-brand)]/15 blur-3xl" />
        <div className="absolute top-40 -left-32 h-[300px] w-[300px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <motion.div style={{ y, opacity }} className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          </span>
          <span className="text-muted-foreground">Conçu pour les ramoneurs français</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-primary sm:text-5xl md:text-7xl"
        >
          Le certificat de ramonage{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-[var(--color-brand)] to-orange-500 bg-clip-text text-transparent">
              en 30 secondes.
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute -bottom-1 left-0 right-0 h-1 origin-left rounded-full bg-gradient-to-r from-[var(--color-brand)] to-orange-500/0"
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          Envoyez une note vocale après votre intervention. RamonoPro génère automatiquement votre
          certificat, l'envoie au client et l'archive.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="group h-12 w-full bg-[var(--color-brand)] px-7 text-base font-semibold text-[var(--color-brand-foreground)] shadow-xl shadow-orange-500/30 hover:bg-[var(--color-brand)]/90 sm:w-auto"
          >
            <Link to="/auth">
              Commencer maintenant
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full px-6 text-base font-semibold backdrop-blur sm:w-auto"
          >
            <a href="#how">
              <Play className="mr-2 h-4 w-4" />
              Voir une démonstration
            </a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-xs text-muted-foreground"
        >
          Sans engagement • Annulation en 1 clic
        </motion.div>

        <HeroFlow />
      </motion.div>
    </section>
  );
}

function HeroFlow() {
  const steps = [
    { icon: Mic, label: "Note vocale", color: "from-blue-500 to-blue-600" },
    { icon: Sparkles, label: "IA", color: "from-orange-500 to-amber-500" },
    { icon: FileCheck2, label: "Certificat PDF", color: "from-emerald-500 to-emerald-600" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="relative mx-auto mt-16 max-w-3xl"
    >
      <div className="relative rounded-3xl border border-border/60 bg-card/50 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl md:p-10">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-[var(--color-brand)]/10 to-primary/5" />
        <div className="flex items-center justify-between gap-3 md:gap-6">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center gap-3 md:gap-6">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.25, type: "spring", stiffness: 200 }}
                className="flex flex-1 flex-col items-center text-center"
              >
                <div
                  className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-lg md:h-16 md:w-16`}
                >
                  <s.icon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-xs">
                  {s.label}
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.9 + i * 0.25, duration: 0.5 }}
                  className="h-px flex-1 origin-left bg-gradient-to-r from-border via-[var(--color-brand)]/40 to-border"
                />
              )}
            </div>
          ))}
        </div>
        {/* Animated voice wave */}
        <div className="mt-8 flex items-end justify-center gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: i * 0.05,
                ease: "easeInOut",
              }}
              className="w-1 rounded-full bg-gradient-to-t from-[var(--color-brand)] to-orange-300"
              style={{ height: "20%", minHeight: 6, maxHeight: 40 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ProblemSection() {
  const before = [
    { icon: FileCheck2, label: "Papier carbone" },
    { icon: Clock, label: "30 min de paperasse" },
    { icon: Archive, label: "Classeurs encombrants" },
    { icon: Users, label: "Clients oubliés" },
  ];
  const after = [
    { icon: Mic, label: "Note vocale" },
    { icon: Zap, label: "PDF en 30 sec" },
    { icon: Archive, label: "Archivage cloud" },
    { icon: BellRing, label: "Rappels auto" },
  ];

  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]"
          >
            Le problème
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
            Fini la paperasse après chaque chantier.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground">
            Vous êtes ramoneur, pas secrétaire. RamonoPro fait le travail pour vous.
          </motion.p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Avant */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl border border-destructive/20 bg-card/40 p-6 md:p-8 backdrop-blur"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <X className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Avant</div>
                <div className="text-lg font-bold">Le quotidien d'avant</div>
              </div>
            </div>
            <ul className="space-y-3">
              {before.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm line-through decoration-destructive/40 opacity-70"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Après */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--color-brand)]/30 bg-gradient-to-br from-[var(--color-brand)]/5 to-card/60 p-6 md:p-8 backdrop-blur shadow-xl shadow-orange-500/10"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-brand)]/20 blur-2xl" />
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lg">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
                  Avec RamonoPro
                </div>
                <div className="text-lg font-bold">Votre nouveau quotidien</div>
              </div>
            </div>
            <ul className="space-y-3">
              {after.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-sm font-medium backdrop-blur"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  {item.label}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Mic,
      title: "Parlez ou écrivez",
      desc: "Une note vocale ou quelques mots suffisent à décrire l'intervention.",
    },
    {
      n: "02",
      icon: Sparkles,
      title: "Ajoutez vos photos",
      desc: "Une photo du conduit avant/après pour compléter le dossier.",
    },
    {
      n: "03",
      icon: FileCheck2,
      title: "Le certificat est généré",
      desc: "Un PDF professionnel et conforme, signé et prêt à envoyer.",
    },
    {
      n: "04",
      icon: Send,
      title: "Le client le reçoit",
      desc: "Envoi automatique par email. Archivage instantané dans votre espace.",
    },
  ];

  return (
    <section id="how" className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]"
          >
            Comment ça marche
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
            4 étapes. 30 secondes.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground">
            Depuis votre téléphone, directement sur le chantier.
          </motion.p>
        </motion.div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-10 md:space-y-16">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
                className={`relative flex items-start gap-4 md:gap-8 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Node */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-orange-500 text-white shadow-xl shadow-orange-500/30 md:absolute md:left-1/2 md:-translate-x-1/2">
                  <s.icon className="h-5 w-5" />
                </div>

                {/* Card */}
                <div className={`flex-1 md:max-w-[42%] ${i % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl md:p-6"
                  >
                    <div className="mb-2 text-xs font-bold tracking-widest text-[var(--color-brand)]">
                      ÉTAPE {s.n}
                    </div>
                    <h3 className="text-lg font-bold text-primary md:text-xl">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: FileCheck2,
      title: "Certificats automatiques",
      desc: "Un PDF conforme généré à chaque intervention, en un clin d'œil.",
      grad: "from-blue-500/20 to-blue-500/0",
    },
    {
      icon: Mic,
      title: "Notes vocales",
      desc: "Décrivez l'intervention à voix haute. L'IA s'occupe du reste.",
      grad: "from-orange-500/20 to-orange-500/0",
    },
    {
      icon: Archive,
      title: "Archivage intelligent",
      desc: "Tous vos certificats classés, indexés et accessibles à vie.",
      grad: "from-emerald-500/20 to-emerald-500/0",
    },
    {
      icon: Users,
      title: "Historique client",
      desc: "Toutes les interventions d'un client, en deux clics.",
      grad: "from-violet-500/20 to-violet-500/0",
    },
    {
      icon: BellRing,
      title: "Rappels annuels",
      desc: "Vos clients reçoivent un rappel 11 mois après. Sans rien faire.",
      grad: "from-amber-500/20 to-amber-500/0",
    },
    {
      icon: Send,
      title: "Envoi PDF instantané",
      desc: "Le client reçoit son certificat par email avant que vous ne partiez.",
      grad: "from-rose-500/20 to-rose-500/0",
    },
  ];

  return (
    <section className="relative py-20 md:py-32">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container relative mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]"
          >
            Fonctionnalités
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
            Tout ce dont vous avez besoin.
            <br />
            <span className="text-muted-foreground">Rien de plus.</span>
          </motion.h2>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl transition-all hover:border-[var(--color-brand)]/40 hover:shadow-2xl hover:shadow-orange-500/10"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${f.grad} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand)] to-orange-500 text-white shadow-lg shadow-orange-500/20 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-primary">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const items = [
    "Certificats illimités",
    "Notes vocales illimitées",
    "Archivage cloud sécurisé",
    "Rappels annuels automatiques",
    "Envoi email instantané",
    "Historique client complet",
    "Support réactif 7j/7",
    "Sans engagement",
  ];
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]"
          >
            Tarif
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
            Un seul plan. Tout inclus.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground">
            Pas de palier, pas de surprise. Tout, pour tout le monde.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-12 max-w-md"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/90 p-1 shadow-2xl shadow-primary/30">
            {/* Animated glow */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 -z-10 bg-[conic-gradient(from_0deg,transparent,var(--color-brand),transparent_40%)] opacity-50 blur"
            />
            <div className="rounded-[22px] bg-card p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">
                    Plan Pro
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Tout illimité</div>
                </div>
                <ShieldCheck className="h-7 w-7 text-[var(--color-brand)]" />
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-6xl font-extrabold tracking-tight text-primary">24€</span>
                <span className="text-base text-muted-foreground">/mois</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Soit moins de 1€ par jour
              </div>

              <Button
                asChild
                size="lg"
                className="mt-6 h-12 w-full bg-[var(--color-brand)] text-base font-semibold text-[var(--color-brand-foreground)] shadow-xl shadow-orange-500/30 hover:bg-[var(--color-brand)]/90"
              >
                <Link to="/auth">
                  Essayer maintenant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="mt-6 space-y-2.5">
                {items.map((it, i) => (
                  <motion.div
                    key={it}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <span className="text-foreground/80">{it}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Les certificats sont-ils conformes ?",
      a: "Oui. Chaque certificat respecte les mentions légales obligatoires pour le ramonage en France (DTU 24.1, numéro de SIRET, type de conduit, résultat du test de vacuité, signature professionnelle).",
    },
    {
      q: "Puis-je utiliser mon téléphone ?",
      a: "RamonoPro est pensé mobile-first. Tout fonctionne depuis votre téléphone, directement sur le chantier. Aucune installation, aucune application à télécharger.",
    },
    {
      q: "Les certificats sont-ils archivés ?",
      a: "Tous vos certificats sont archivés automatiquement dans le cloud, sécurisés et accessibles à vie depuis votre espace. Vos clients ont aussi accès à leur historique.",
    },
    {
      q: "Puis-je retrouver un client rapidement ?",
      a: "Oui. Une barre de recherche unique : nom, adresse, numéro de téléphone. Vous retrouvez un client et tout son historique en deux secondes.",
    },
    {
      q: "Y a-t-il une limite de certificats ?",
      a: "Aucune. Pour 24€/mois, vous générez autant de certificats que vous voulez. Pas de quota, pas de surcoût.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]"
          >
            FAQ
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-primary md:text-5xl">
            Vos questions, nos réponses.
          </motion.h2>
        </motion.div>

        <div className="mt-12 space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-primary md:text-base">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mt-20 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-center md:p-12"
        >
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[var(--color-brand)]/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[var(--color-brand)]/20 blur-3xl" />
          <h3 className="relative text-2xl font-bold text-primary-foreground md:text-4xl">
            Prêt à terminer la paperasse ?
          </h3>
          <p className="relative mt-3 text-sm text-primary-foreground/70 md:text-base">
            Essayez RamonoPro aujourd'hui. Premier certificat en 30 secondes.
          </p>
          <Button
            asChild
            size="lg"
            className="relative mt-6 h-12 bg-[var(--color-brand)] px-8 text-base font-semibold text-[var(--color-brand-foreground)] shadow-2xl shadow-orange-500/40 hover:bg-[var(--color-brand)]/90"
          >
            <Link to="/auth">
              Commencer maintenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RamonoPro" className="h-7 w-7" width={28} height={28} />
            <span className="font-bold text-primary">RamonoPro</span>
            <span className="text-muted-foreground/60">— le logiciel des ramoneurs</span>
          </div>
          <div className="text-xs">© {new Date().getFullYear()} RamonoPro. Tous droits réservés.</div>
        </div>
      </div>
    </footer>
  );
}
