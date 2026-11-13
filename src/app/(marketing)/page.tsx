import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  Clock,
  Gamepad2,
  LibraryBig,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const previewLibrary = [
  {
    title: "Neon Drift",
    meta: "PC · Racing",
    progress: 72,
    gradient: "from-fuchsia-500 to-violet-600",
    tag: "Playing",
  },
  {
    title: "Aetherfall",
    meta: "PS5 · RPG",
    progress: 43,
    gradient: "from-sky-400 to-blue-600",
    tag: "Backlog",
  },
  {
    title: "Rift Legends",
    meta: "Xbox · Shooter",
    progress: 91,
    gradient: "from-violet-500 to-indigo-600",
    tag: "Ranked",
  },
];

const features = [
  {
    icon: Sparkles,
    title: "Adaptive AI coaching",
    description:
      "A coach that reads your sessions, finds the weak spots and gives you one clear next move — not a wall of stats.",
    accent: "purple",
  },
  {
    icon: LibraryBig,
    title: "One library, every platform",
    description:
      "PC, console or cloud. Your games, progress and playtime live in a single, searchable command center.",
    accent: "blue",
  },
  {
    icon: Activity,
    title: "Insight, not noise",
    description:
      "Session trends, win-rate shifts and playtime balance are surfaced as plain-language signals you can act on.",
    accent: "purple",
  },
];

const steps = [
  {
    title: "Connect your platforms",
    description: "Link the stores and launchers you already use. GamePilot builds your library automatically.",
  },
  {
    title: "Let the pilot analyze",
    description: "Your sessions, achievements and play patterns become a personal performance profile.",
  },
  {
    title: "Play with a plan",
    description: "Get a focused routine, build suggestions and recommendations for what to play next.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-40 left-1/4 size-[420px] animate-pulse-glow rounded-full bg-brand-purple/20 blur-[130px]" />
        <div className="pointer-events-none absolute top-24 -right-24 size-[380px] rounded-full bg-brand-cyan/15 blur-[130px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 pt-20 pb-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pt-28 lg:pb-32">
          <div>
            <Badge className="gap-1.5 border-primary/30 bg-primary/10 px-3 py-1">
              <Sparkles className="size-3.5" />
              AI-powered gaming companion
            </Badge>

            <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Play smarter.
              <br />
              <span className="text-gradient">Level up faster.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              GamePilot AI turns your play history into a personal co-pilot: one library, clear
              performance signals and coaching that adapts to how you actually play.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Launch dashboard
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#features">Explore features</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                Unified game library
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-brand-cyan" />
                Session-level insights
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                Built for every platform
              </span>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-t border-border/60 bg-card/20 py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The system"
            title="Your entire gaming life, under one roof"
            description="Built as a companion, not another dashboard. Every layer of GamePilot is designed to make the next session better than the last."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden gap-0 py-6 transition-colors hover:border-primary/35"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="gap-4">
                    <span
                      className={
                        feature.accent === "blue"
                          ? "flex size-11 items-center justify-center rounded-xl border border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan"
                          : "flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"
                      }
                    >
                      <Icon className="size-5" />
                    </span>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps to a better session"
            description="No spreadsheets, no manual tracking. Connect once and let the co-pilot keep the picture up to date."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-xl border border-border/70 bg-card/40 p-6"
              >
                <span className="font-display text-4xl font-semibold text-gradient">
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-primary/25 bg-gradient-brand-soft px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" />
          <div className="relative">
            <Badge variant="blue" className="mx-auto">
              Foundation ready
            </Badge>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
              Ready to take the <span className="text-gradient">pilot seat?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The shell, design system and data layer are in place. Open the command center and see
              where your next season is heading.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Open command center
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/api/health">Check API health</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-brand opacity-15 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
            gamepilot.app / command
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-primary/25 bg-gradient-brand-soft p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              AI COACH
              <Badge variant="blue" className="ml-auto px-1.5 py-0 text-[10px]">
                live
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              Your aim accuracy drops 12% after 90 minutes. Try a 70-minute ranked block, then a
              break — your win rate climbs in the third match.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={68} className="h-1.5 flex-1" />
              <span className="font-mono text-[11px] text-muted-foreground">68%</span>
            </div>
          </div>

          <div className="space-y-2">
            {previewLibrary.map((game) => (
              <div
                key={game.title}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-linear-to-br ${game.gradient} text-white`}
                >
                  <Gamepad2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{game.title}</p>
                    <span className="ml-auto text-[10px] text-muted-foreground">{game.tag}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{game.meta}</p>
                </div>
                <div className="w-16 shrink-0">
                  <Progress value={game.progress} className="h-1" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Clock, label: "This week", value: "14.2h" },
              { icon: Trophy, label: "Season", value: "Diamond" },
              { icon: Target, label: "Win rate", value: "61%" },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-center"
                >
                  <Icon className="mx-auto size-3.5 text-brand-cyan" />
                  <p className="mt-1.5 font-display text-sm font-semibold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-10 -left-4 flex animate-float items-center gap-2 rounded-lg border border-brand-cyan/25 bg-background/90 px-3 py-2 shadow-glow-blue backdrop-blur">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-cyan/10 text-brand-cyan">
          <Zap className="size-3.5" />
        </span>
        <div>
          <p className="text-[11px] text-muted-foreground">Session score</p>
          <p className="text-xs font-semibold text-foreground">+18% this week</p>
        </div>
      </div>

      <div className="absolute -top-4 -right-3 hidden items-center gap-2 rounded-lg border border-primary/25 bg-background/90 px-3 py-2 shadow-glow-purple backdrop-blur sm:flex">
        <Play className="size-3.5 fill-primary text-primary" />
        <span className="text-xs font-medium">3 games ready</span>
      </div>
    </div>
  );
}
