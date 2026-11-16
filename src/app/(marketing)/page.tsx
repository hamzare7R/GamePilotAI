"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  AudioWaveform,
  BrainCircuit,
  Check,
  ChevronRight,
  CirclePlay,
  Gamepad2,
  Layers3,
  LibraryBig,
  Orbit,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    number: "01",
    icon: BrainCircuit,
    title: "A coach that gets your game",
    description:
      "Turn your play patterns into focused advice, practical routines and a clearer next move.",
    detail: "AI COACH",
    tone: "violet",
  },
  {
    number: "02",
    icon: LibraryBig,
    title: "Your worlds, in one place",
    description:
      "Bring your games and gaming activity together in one library built around the way you play.",
    detail: "UNIFIED LIBRARY",
    tone: "cyan",
  },
  {
    number: "03",
    icon: Activity,
    title: "See the signal. Skip the noise.",
    description:
      "Understand your sessions, spot patterns and make better decisions without drowning in stats.",
    detail: "PLAYER INSIGHTS",
    tone: "pink",
  },
];

const journey = [
  {
    step: "01",
    title: "Bring your games",
    text: "Start with your gaming library and the platforms you already use.",
    icon: Layers3,
  },
  {
    step: "02",
    title: "Find your rhythm",
    text: "Explore your activity and let your personal gaming picture take shape.",
    icon: AudioWaveform,
  },
  {
    step: "03",
    title: "Make every session count",
    text: "Use clear insights and coaching to decide what to work on next.",
    icon: Target,
  },
];

const worlds = [
  { name: "COMPETE", sub: "Sharpen your edge", icon: Trophy, color: "from-fuchsia-500 to-violet-500" },
  { name: "DISCOVER", sub: "Find your next world", icon: Orbit, color: "from-cyan-400 to-blue-600" },
  { name: "IMPROVE", sub: "Build your own meta", icon: Zap, color: "from-amber-300 to-orange-500" },
];

export default function HomePage() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-home-motion]");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    let observer: IntersectionObserver | undefined;

    if (!reduceMotion && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            (entry.target as HTMLElement).classList.toggle("scroll-is-visible", entry.isIntersecting);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
      );
      revealItems.forEach((item) => observer?.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("scroll-is-visible"));
    }

    const parallaxItems = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-parallax]"));
    const depthItems = Array.from(root.querySelectorAll<HTMLElement>("[data-3d-scroll]"));
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const updateAmbient = () => {
      if (reduceMotion) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollProgress = window.scrollY / maxScroll;
      root.style.setProperty("--ambient-scroll", `${(scrollProgress - 0.5) * 110}px`);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (reduceMotion || event.pointerType === "touch") return;
      pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 34;
      pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 26;
      root.style.setProperty("--ambient-x", `${pointerX}px`);
      root.style.setProperty("--ambient-y", `${pointerY}px`);
    };
    const updateParallax = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight || 1;
        parallaxItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const distance = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
          item.style.setProperty("--scroll-shift", reduceMotion ? "0px" : `${Math.max(-24, Math.min(24, distance * -22))}px`);
        });
        depthItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const distance = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
          const progress = Math.max(-1, Math.min(1, distance));
          item.style.setProperty("--scroll-tilt", reduceMotion ? "0deg" : `${progress * -3.2}deg`);
          item.style.setProperty("--scroll-depth", reduceMotion ? "0px" : `${(1 - Math.abs(progress)) * 22}px`);
          item.style.setProperty("--scroll-shift", reduceMotion ? "0px" : `${progress * -13}px`);
        });
      });
    };

    if (!reduceMotion) {
      updateParallax();
      updateAmbient();
      window.addEventListener("scroll", updateParallax, { passive: true });
      window.addEventListener("scroll", updateAmbient, { passive: true });
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("resize", updateParallax);
    }

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("scroll", updateAmbient);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", updateParallax);
    };
  }, []);

  return (
    <div data-home-motion className="homepage-motion relative isolate overflow-hidden">
      <style jsx global>{`
        [data-home-motion] [data-scroll-reveal] {
          opacity: 0;
          transform: translate3d(0, 30px, 0) scale(.99);
          transition: opacity 680ms cubic-bezier(.2,.7,.2,1), transform 780ms cubic-bezier(.2,.7,.2,1);
          will-change: opacity, transform;
        }
        [data-home-motion] [data-scroll-reveal].scroll-is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        [data-home-motion] [data-scroll-parallax] {
          transform: translate3d(0, var(--scroll-shift, 0px), 0);
          transition: transform 180ms linear;
          will-change: transform;
        }
        [data-home-motion] [data-3d-scroll] {
          translate: 0 var(--scroll-shift, 0px) var(--scroll-depth, 0px);
          rotate: x var(--scroll-tilt, 0deg);
          transform-style: preserve-3d;
          transition: translate 220ms ease-out, rotate 220ms ease-out;
          will-change: translate, rotate;
        }
        [data-home-motion] .ambient-orb {
          transform: translate3d(var(--ambient-x, 0px), calc(var(--ambient-y, 0px) + var(--ambient-scroll, 0px)), 0) rotateX(58deg) rotateZ(-28deg);
          transition: transform 260ms cubic-bezier(.2,.7,.2,1);
          will-change: transform;
        }
        [data-home-motion] .ambient-orb-core {
          transform: translate3d(calc(var(--ambient-x, 0px) * -.45), calc(var(--ambient-y, 0px) * -.45 - var(--ambient-scroll, 0px) * .35), 0) rotateY(18deg);
          transition: transform 340ms cubic-bezier(.2,.7,.2,1);
          will-change: transform;
        }
        [data-home-motion] .ambient-orbit {
          animation: ambient-orbit-turn 28s linear infinite;
          transform-origin: center;
        }
        [data-home-motion] .ambient-pulse {
          animation: ambient-pulse 5s ease-in-out infinite;
        }
        [data-home-motion] > section { position: relative; z-index: 2; }
        @keyframes ambient-orbit-turn {
          from { rotate: 0deg; }
          to { rotate: 360deg; }
        }
        @keyframes ambient-pulse {
          0%, 100% { opacity: .45; scale: .96; }
          50% { opacity: .9; scale: 1.04; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-home-motion] [data-scroll-reveal],
          [data-home-motion] [data-scroll-parallax],
          [data-home-motion] [data-3d-scroll],
          [data-home-motion] .ambient-orb,
          [data-home-motion] .ambient-orb-core,
          [data-home-motion] .ambient-orbit,
          [data-home-motion] .ambient-pulse,
          [data-home-motion] .ambient-pulse {
            opacity: 1 !important;
            transform: none !important;
            rotate: none !important;
            scale: none !important;
            animation: none !important;
            transition: none !important;
            will-change: auto;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-radial-glow opacity-90" />

      {/* Interactive ambient portal: a luminous 3D energy core that follows scroll and pointer movement. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[4vh] -z-10 h-[175vh] overflow-hidden">
        <div className="ambient-orb absolute right-[-21rem] top-[5rem] size-[42rem] rounded-full border border-brand-purple/30 bg-[radial-gradient(circle_at_42%_38%,rgba(168,85,247,0.24),rgba(56,189,248,0.12)_34%,rgba(10,10,25,0.02)_68%)] shadow-[inset_0_0_110px_rgba(168,85,247,0.2),0_0_130px_rgba(56,189,248,0.13)] sm:right-[-14rem] sm:size-[56rem]">
          <div className="ambient-orbit absolute inset-[8%] rounded-full border border-dashed border-brand-cyan/35 shadow-[0_0_35px_rgba(56,189,248,0.08)]" />
          <div className="ambient-orbit absolute inset-[19%] rounded-full border border-brand-purple/35 [animation-direction:reverse] [animation-duration:36s]" />
          <div className="absolute inset-[30%] rounded-full border border-white/10 shadow-[inset_0_0_55px_rgba(168,85,247,0.12)]" />
          <div className="ambient-pulse absolute left-[29%] top-[27%] size-[42%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.28),rgba(56,189,248,0.12)_42%,transparent_72%)] blur-2xl" />
          <div className="ambient-orb-core absolute left-[39%] top-[35%] size-[24%] rounded-[2.5rem] border border-white/25 bg-[linear-gradient(145deg,rgba(56,189,248,0.25),rgba(124,58,237,0.32)_48%,rgba(10,10,25,0.55))] shadow-[0_0_95px_rgba(124,58,237,0.32),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md">
            <div className="absolute inset-[12%] rounded-[1.8rem] border border-white/15" />
            <div className="ambient-pulse absolute -right-3 -top-3 size-7 rounded-full border border-brand-cyan/50 bg-brand-cyan/20 shadow-[0_0_30px_rgba(56,189,248,0.55)]" />
          </div>
          <span className="absolute left-[17%] top-[48%] size-2 rounded-full bg-brand-cyan shadow-[0_0_22px_5px_rgba(56,189,248,0.65)]" />
          <span className="ambient-pulse absolute right-[18%] top-[24%] size-3 rounded-full bg-brand-purple shadow-[0_0_26px_6px_rgba(168,85,247,0.7)]" />
          <span className="absolute bottom-[18%] right-[34%] size-1.5 rounded-full bg-white shadow-[0_0_18px_4px_rgba(255,255,255,0.6)]" />
        </div>
        <div className="absolute left-[-18rem] top-[55%] size-[32rem] rounded-full bg-brand-cyan/[0.075] blur-[110px]" />
        <div className="absolute right-[12%] top-[78%] size-[24rem] rounded-full bg-brand-purple/[0.07] blur-[110px]" />
      </div>

      <section className="relative flex min-h-[760px]/ items-center overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:min-h-[820px] lg:px-8 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="pointer-events-none absolute -left-48 top-32 -z-10 size-[520px] rounded-full bg-brand-purple/15 blur-[150px]" />
        <div className="pointer-events-none absolute -right-48 top-20 -z-10 size-[560px] rounded-full bg-brand-cyan/10 blur-[160px]" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-4">
          <div data-scroll-reveal className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-xs font-medium tracking-wide text-white/75 shadow-[0_0_35px_-15px_rgba(168,85,247,0.7)] backdrop-blur-xl">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-cyan opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-cyan" />
              </span>
              THE NEXT LEVEL OF PLAY
              <span className="text-white/25">/</span>
              <Sparkles className="size-3.5 text-brand-purple" />
              AI POWERED
            </div>

            <h1 className="mt-8 max-w-[760px] font-display text-[clamp(3.5rem,8vw,6.8rem)] leading-[0.91] font-semibold tracking-[-0.075em] text-white">
              Your game.
              <br />
              <span className="text-gradient">Your evolution.</span>
            </h1>

            <p className="mt-8 max-w-lg text-base leading-8 text-white/60 sm:text-lg">
              Meet the command center for everything you play. Bring your library together,
              understand your progress and find your next move with AI.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-sm shadow-[0_0_35px_-12px_rgba(168,85,247,0.8)]">
                <Link href="/dashboard">
                  Enter GamePilot
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/[0.035] px-6 text-sm text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#experience">
                  <CirclePlay className="mr-1 size-4" />
                  Explore the experience
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-xs tracking-wide text-white/45">
              <span className="flex items-center gap-2"><Check className="size-3.5 text-brand-cyan" /> One connected library</span>
              <span className="flex items-center gap-2"><Check className="size-3.5 text-brand-cyan" /> Personal AI insights</span>
              <span className="flex items-center gap-2"><Check className="size-3.5 text-brand-cyan" /> Built for every player</span>
            </div>
          </div>

          <div data-scroll-parallax><HeroWorld /></div>
        </div>

        <a
          href="#experience"
          className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[0.25em] text-white/35 uppercase transition-colors hover:text-white/75 lg:flex"
        >
          Scroll to explore
          <ArrowDown className="size-4 animate-bounce" />
        </a>
      </section>

      <section id="experience" className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.018] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div data-scroll-reveal className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.3em] text-brand-cyan uppercase">A new way to play</p>
              <h2 className="mt-5 font-display text-4xl leading-[1.02] font-semibold tracking-[-0.055em] text-white sm:text-6xl">
                More than a library.
                <br />
                <span className="text-white/40">A world built around you.</span>
              </h2>
            </div>
            <p className="max-w-sm pb-1 text-sm leading-7 text-white/45">
              Less switching. Less guesswork. A more connected view of your gaming life,
              designed to help you enjoy the journey and keep moving forward.
            </p>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              const tone = item.tone === "cyan" ? "text-brand-cyan" : item.tone === "pink" ? "text-fuchsia-300" : "text-brand-purple";
              const glow = item.tone === "cyan" ? "bg-brand-cyan/10" : item.tone === "pink" ? "bg-fuchsia-400/10" : "bg-brand-purple/10";
              return (
                <article key={item.number} data-scroll-reveal data-3d-scroll className="group relative min-h-[330px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b0b16] p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 sm:p-9">
                  <div className={`pointer-events-none absolute -right-16 -top-16 size-52 rounded-full ${glow} blur-[70px] transition-all duration-500 group-hover:scale-125`} />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-white/30">{item.number} / 03</span>
                      <Icon className={`size-5 ${tone}`} />
                    </div>
                    <div className="mt-14">
                      <p className={`text-[10px] font-semibold tracking-[0.25em] ${tone}`}>{item.detail}</p>
                      <h3 className="mt-4 max-w-xs font-display text-2xl leading-tight font-semibold tracking-tight text-white">{item.title}</h3>
                      <p className="mt-4 max-w-sm text-sm leading-7 text-white/45">{item.description}</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-8 text-xs text-white/35 transition-colors group-hover:text-white/75">
                      Discover the system <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/10 blur-[150px]" />
        <div data-scroll-reveal className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-brand-purple uppercase">Your next chapter</p>
            <h2 className="mt-5 font-display text-4xl leading-[1.02] font-semibold tracking-[-0.055em] text-white sm:text-6xl">
              Every player has
              <span className="text-gradient"> a different path.</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/50 sm:text-base">
              Whether you compete, explore or improve, GamePilot gives your gaming life a
              place to connect — and gives you a clearer view of where to go next.
            </p>
            <Link href="/games" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-brand-cyan">
              Explore your games <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {worlds.map((world, index) => {
              const Icon = world.icon;
              return (
                <div key={world.name} data-scroll-reveal data-3d-scroll className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b0b16] p-6 transition-all duration-500 hover:-translate-y-2 hover:border-white/20 sm:min-h-[330px] ${index === 1 ? "sm:mt-12" : index === 2 ? "sm:mt-24" : ""}`}>
                  <div className={`absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br ${world.color} opacity-15 blur-2xl transition-opacity group-hover:opacity-35`} />
                  <div className="relative flex items-center justify-between">
                    <span className="font-mono text-[10px] text-white/35">0{index + 1}</span>
                    <Icon className="size-5 text-white/65" />
                  </div>
                  <div className="relative">
                    <div className={`mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${world.color} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold tracking-wide text-white">{world.name}</h3>
                    <p className="mt-2 text-xs text-white/45">{world.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.018] px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
        <div data-scroll-reveal className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-brand-cyan uppercase">The flight plan</p>
              <h2 className="mt-5 font-display text-4xl leading-[1.02] font-semibold tracking-[-0.055em] text-white sm:text-5xl">
                From first launch
                <br />
                <span className="text-white/40">to your next level.</span>
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/45">
                Start simple. Build your picture over time. Keep your attention on the part
                that matters most: the game.
              </p>
            </div>
            <div className="space-y-3">
              {journey.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} data-scroll-reveal data-3d-scroll className="group flex gap-5 rounded-2xl border border-white/10 bg-[#0b0b16]/80 p-5 transition-colors hover:border-brand-purple/40 sm:gap-7 sm:p-7">
                    <span className="pt-1 font-mono text-xs text-brand-cyan/70">{item.step}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-white/45">{item.text}</p>
                    </div>
                    <Icon className="mt-1 size-5 shrink-0 text-white/30 transition-colors group-hover:text-brand-purple" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div data-scroll-reveal className="relative mx-auto max-w-6xl px-6 py-16 text-center sm:px-12 sm:py-24">
          <div className="relative">
            <Badge className="mx-auto gap-2 border-brand-purple/30 bg-brand-purple/10 px-3 py-1.5 text-brand-purple">
              <ShieldCheck className="size-3.5" /> YOUR NEXT SESSION STARTS HERE
            </Badge>
            <h2 className="mx-auto mt-7 max-w-3xl font-display text-4xl leading-[1.02] font-semibold tracking-[-0.06em] text-white sm:text-6xl">
              Ready to play with
              <span className="text-gradient"> purpose?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
              Step into a more connected gaming experience. Your library, your insights,
              your next move — all in one place.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7">
                <Link href="/dashboard">Launch GamePilot <ArrowRight className="ml-1 size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.035] px-7 text-white hover:bg-white/10 hover:text-white">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroWorld() {
  return (
    <div className="relative mx-auto flex min-h-[490px] w-full max-w-[680px] items-center justify-center sm:min-h-[600px] lg:min-h-[660px]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/20 blur-[100px] sm:size-[520px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-purple/20 [transform:translate(-50%,-50%)_rotateX(68deg)] sm:size-[440px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-cyan/15 [transform:translate(-50%,-50%)_rotateX(68deg)_rotateZ(-28deg)] sm:size-[520px]" />

      <div className="relative aspect-square w-[min(100%,520px)] [perspective:1100px]">
        <div className="absolute inset-[8%] rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_28%,rgba(168,85,247,0.22),rgba(9,9,20,0.1)_48%,rgba(56,189,248,0.12))] shadow-[inset_0_0_80px_rgba(168,85,247,0.12),0_0_100px_rgba(56,189,248,0.08)] [transform:rotateX(58deg)_rotateZ(-25deg)]" />
        <div className="absolute inset-[17%] rounded-full border border-dashed border-brand-cyan/30 [transform:rotateX(66deg)_rotateZ(24deg)]" />
        <div className="absolute inset-[25%] rounded-full border border-brand-purple/40 [transform:rotateX(64deg)_rotateZ(-35deg)]" />

        <div className="absolute left-1/2 top-1/2 flex size-[54%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] border border-white/20 bg-[linear-gradient(145deg,rgba(35,22,67,0.94),rgba(10,15,31,0.96)_55%,rgba(10,34,49,0.9))] shadow-[0_35px_100px_-35px_rgba(124,58,237,0.75),inset_0_1px_0_rgba(255,255,255,0.18)] [transform:rotateX(12deg)_rotateY(-16deg)_rotateZ(-8deg)] transition-transform duration-700 hover:[transform:rotateX(4deg)_rotateY(-5deg)_rotateZ(-3deg)]">
          <div className="absolute inset-3 rounded-[1.9rem] border border-white/[0.08]" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative flex size-24 items-center justify-center rounded-[1.8rem] border border-brand-cyan/30 bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.28),rgba(124,58,237,0.16)_55%,rgba(8,8,20,0.7))] shadow-[0_0_50px_-15px_rgba(56,189,248,0.65)] sm:size-32">
              <Gamepad2 className="size-12 text-white sm:size-16" strokeWidth={1.2} />
              <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-white/20 bg-[#111020] text-brand-cyan shadow-lg"><Sparkles className="size-3.5" /></span>
            </div>
            <p className="mt-7 font-mono text-[9px] tracking-[0.35em] text-brand-cyan/80 sm:text-[10px]">PLAYER SYSTEM ONLINE</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">GAMEPILOT<span className="text-brand-cyan">AI</span></p>
            <p className="mt-2 text-[10px] tracking-[0.2em] text-white/35 uppercase">Your gaming command center</p>
            <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <span className="font-mono text-[9px] tracking-wider text-white/55">READY TO LAUNCH</span>
            </div>
          </div>
        </div>

        <div className="absolute left-[2%] top-[23%] flex animate-float items-center gap-3 rounded-2xl border border-white/10 bg-[#10101c]/90 p-3 shadow-2xl backdrop-blur-xl sm:left-0 sm:p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple"><BrainCircuit className="size-4" /></div>
          <div><p className="text-[9px] tracking-widest text-white/35">AI COACH</p><p className="mt-1 text-xs font-medium text-white">Insight unlocked</p></div>
        </div>

        <div className="absolute right-[1%] top-[28%] flex animate-float items-center gap-3 rounded-2xl border border-white/10 bg-[#10101c]/90 p-3 shadow-2xl backdrop-blur-xl [animation-delay:1.2s] sm:right-0 sm:p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan"><LibraryBig className="size-4" /></div>
          <div><p className="text-[9px] tracking-widest text-white/35">YOUR LIBRARY</p><p className="mt-1 text-xs font-medium text-white">All games connected</p></div>
        </div>

        <div className="absolute bottom-[12%] left-[8%] flex animate-float items-center gap-3 rounded-2xl border border-white/10 bg-[#10101c]/90 p-3 shadow-2xl backdrop-blur-xl [animation-delay:2.1s] sm:bottom-[10%] sm:left-[6%] sm:p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Trophy className="size-4" /></div>
          <div><p className="text-[9px] tracking-widest text-white/35">PLAYER PROGRESS</p><p className="mt-1 text-xs font-medium text-white">Your next level awaits</p></div>
        </div>

        <div className="absolute bottom-[15%] right-[5%] hidden items-center gap-2 rounded-full border border-white/10 bg-[#10101c]/90 px-4 py-2 text-[10px] text-white/60 shadow-2xl backdrop-blur-xl sm:flex">
          <Play className="size-3 fill-brand-cyan text-brand-cyan" /> YOUR NEXT SESSION
        </div>
      </div>
    </div>
  );
}
