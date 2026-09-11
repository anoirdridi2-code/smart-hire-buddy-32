import { motion } from "framer-motion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BriefcaseBusiness, FileText, MessageCircle, Mic2, Search, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karriera — Votre copilote emploi propulsé par l'IA" },
      { name: "description", content: "CV, matching emploi, recherche intelligente, coaching et entretiens dans une seule plateforme IA." },
      { property: "og:title", content: "Karriera — Votre copilote emploi propulsé par l'IA" },
      { property: "og:description", content: "Une expérience moderne pour trouver le bon métier et accélérer votre carrière." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: FileText, title: "CV & ATS", text: "Analysez votre CV, identifiez les points faibles et améliorez votre score." },
  { icon: Search, title: "Recherche métier", text: "Recherchez par profession réelle, puis affinez par pays, contrat et remote." },
  { icon: Target, title: "Matching intelligent", text: "Comprenez pourquoi une offre correspond à votre profil." },
  { icon: MessageCircle, title: "AI Career Coach", text: "Un copilote pour vos choix, compétences et prochaines étapes." },
  { icon: Mic2, title: "Entretien IA", text: "Simulez vos entretiens et recevez un feedback exploitable." },
  { icon: Users, title: "Espace recruteur", text: "Publiez, triez et suivez les candidats dans un pipeline moderne." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-hero">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary font-bold text-primary-foreground shadow-glow transition-transform group-hover:scale-105">K</span>
            <span className="font-display text-lg font-bold tracking-tight">Karriera</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Accueil</Link>
            <Link to="/auth" className="hover:text-foreground">CV & ATS</Link>
            <Link to="/auth" className="hover:text-foreground">Offres</Link>
            <Link to="/inscription-professionnel" className="hover:text-foreground">Recruteurs</Link>
          </nav>
          <Button asChild variant="outline" className="rounded-full px-5">
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> AI Career Copilot
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .08 }} className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Trouvez le <span className="text-gradient">bon métier.</span><br />Construisez la suite.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .16 }} className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Karriera réunit votre CV, la recherche d’emploi, le matching IA, le coaching et la préparation aux entretiens dans une expérience simple et intelligente.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .24 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group rounded-full bg-gradient-primary px-7 shadow-glow hover:scale-[1.02]">
              <Link to="/auth">Commencer gratuitement <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full px-7">
              <Link to="/inscription-professionnel">Je suis recruteur</Link>
            </Button>
          </motion.div>
          <div className="mt-8 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>✓ Analyse ATS</span><span>✓ Matching métier</span><span>✓ Coach IA</span><span>✓ Simulation entretien</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .7, delay: .15 }} className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary/20 via-transparent to-accent/15 blur-3xl" />
          <div className="glass relative rounded-[2rem] p-4 shadow-elegant sm:p-5">
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-elegant sm:p-6">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div><p className="text-xs text-muted-foreground">Votre matching</p><p className="mt-1 font-semibold">Automaticien industriel</p></div>
                <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-bold text-success">92%</span>
              </div>
              <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><BriefcaseBusiness className="size-5" /></span><div><p className="font-semibold">Technicien automatisme</p><p className="text-xs text-muted-foreground">Tunisie · CDI · Sur site</p></div></div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-background/80 p-3"><b className="block text-foreground">96%</b><span className="text-muted-foreground">Métier</span></div><div className="rounded-xl bg-background/80 p-3"><b className="block text-foreground">88%</b><span className="text-muted-foreground">Skills</span></div><div className="rounded-xl bg-background/80 p-3"><b className="block text-foreground">91%</b><span className="text-muted-foreground">Profil</span></div></div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-4"><div><p className="text-sm font-semibold">Pourquoi cette offre ?</p><p className="mt-1 text-xs text-muted-foreground">Automatisme · maintenance · électrotechnique</p></div><Target className="size-5 text-primary" /></div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl"><p className="text-sm font-semibold text-primary">Tout au même endroit</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Une expérience pensée pour votre carrière</h2></div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => <motion.div variants={item} whileHover={{ y: -5 }} key={f.title} className="panel group p-6 transition-shadow hover:shadow-glow">
            <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105"><f.icon className="size-5" /></div>
            <h3 className="text-lg font-bold">{f.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{f.text}</p>
          </motion.div>)}
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 text-center sm:px-6">
        <div className="glass rounded-[2rem] p-8 sm:p-12">
          <p className="text-sm font-semibold text-primary">Votre prochaine étape commence ici</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">Moins de bruit. Plus de bonnes opportunités.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Laissez Karriera vous aider à comprendre votre profil et à cibler les offres qui ont réellement du sens.</p>
          <Button asChild size="lg" className="mt-7 rounded-full bg-gradient-primary px-8 shadow-glow"><Link to="/auth">Créer mon compte <ArrowRight className="ml-2 size-4" /></Link></Button>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><span>© 2026 Karriera</span><span>AI Career Copilot · CV · Jobs · Coach · Interviews</span></div></footer>
    </main>
  );
}
