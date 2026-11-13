import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock,
  Gamepad2,
  LibraryBig,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Dashboard",
};

const stats = [
  { label: "Games tracked", value: "48", hint: "+6 this month", icon: Gamepad2, accent: "purple" as const },
  { label: "Hours played", value: "312h", hint: "Last 30 days: 46h", icon: Clock, accent: "blue" as const },
  { label: "Win rate", value: "61%", hint: "Top 18% of your tier", icon: Target, accent: "purple" as const },
  { label: "Coach insights", value: "12", hint: "3 new this week", icon: Sparkles, accent: "blue" as const },
];

const recentSessions = [
  {
    title: "Neon Drift",
    meta: "PC · 2h 14m · Today",
    progress: 72,
    status: "Playing",
    variant: "blue" as const,
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "Aetherfall",
    meta: "PS5 · 1h 02m · Yesterday",
    progress: 43,
    status: "Backlog",
    variant: "outline" as const,
    gradient: "from-sky-400 to-blue-600",
  },
  {
    title: "Rift Legends",
    meta: "Xbox · 48m · 2 days ago",
    progress: 91,
    status: "Ranked",
    variant: "success" as const,
    gradient: "from-violet-500 to-indigo-600",
  },
];

const recommendations = [
  {
    icon: Target,
    title: "Tighten your ranked warm-up",
    description: "Two short aim blocks before queueing lifted your first-match win rate by 9%.",
    impact: "High impact",
  },
  {
    icon: Clock,
    title: "Cap sessions at 90 minutes",
    description: "Accuracy drops after the 90-minute mark. A planned break protects your rank.",
    impact: "Medium",
  },
];

const weeklyPlaytime = [42, 68, 35, 80, 55, 92, 60];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Command center"
        title="Welcome back, Pilot"
        description="A live view of your library, sessions and the next best move. Sample data shown until your API is connected."
        actions={
          <>
            <Badge variant="outline">Preview data</Badge>
            <Button asChild variant="secondary">
              <Link href="/library">
                <LibraryBig />
                Sync library
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Progress synced across your connected platforms.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/library">
                  View library
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentSessions.map((session, index) => (
              <div key={session.title}>
                <div className="flex items-center gap-3 py-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${session.gradient} text-white`}
                  >
                    <Gamepad2 className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <Badge variant={session.variant} className="ml-auto shrink-0">
                        {session.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{session.meta}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={session.progress} className="h-1.5 flex-1" />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {session.progress}%
                      </span>
                    </div>
                  </div>
                </div>
                {index < recentSessions.length - 1 ? <Separator /> : null}
              </div>
            ))}

            <div className="mt-4 rounded-lg border border-border/70 bg-background/40 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Playtime this week</span>
                <span className="font-mono text-foreground">14.2h</span>
              </div>
              <div className="mt-3 flex h-20 items-end gap-2" aria-hidden="true">
                {weeklyPlaytime.map((value, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-md bg-linear-to-t from-brand-violet/70 via-brand-purple to-brand-cyan"
                    style={{ height: `${value}%` }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={index}>{day}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-primary/20 blur-3xl" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>AI coach</CardTitle>
              <Badge variant="blue">Beta</Badge>
            </div>
            <CardDescription>Recommendations based on your last 10 sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-lg border border-border/70 bg-background/40 p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm font-medium">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <Badge variant={item.impact === "High impact" ? "default" : "secondary"} className="mt-2.5">
                    {item.impact}
                  </Badge>
                </div>
              );
            })}

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Coach readiness</span>
                <span className="font-mono text-foreground">68%</span>
              </div>
              <Progress value={68} />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Connect two more platforms to unlock full-session coaching.
              </p>
            </div>

            <Button asChild variant="secondary" className="w-full">
              <Link href="/coach">
                <Sparkles />
                Open AI coach
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed bg-card/40 py-5">
        <CardContent className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan">
            <Activity className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">Your data layer is ready to plug in</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              This dashboard reads from static preview data. Wire it to{" "}
              <code className="font-mono text-brand-cyan">playerService</code> and{" "}
              <code className="font-mono text-brand-cyan">libraryService</code> when the backend is
              online.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/games">
              Browse games
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Trophy className="size-3.5 text-primary" />
        Season tracker and achievements arrive with the profile API.
      </div>
    </div>
  );
}
