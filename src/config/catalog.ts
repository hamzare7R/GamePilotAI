import {
  Apple,
  Brain,
  Car,
  Cloud,
  Compass,
  Crosshair,
  Gamepad,
  Gamepad2,
  Ghost,
  Joystick,
  Map,
  Monitor,
  Smartphone,
  Sparkles,
  Swords,
  Tent,
  Trophy,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import type { GameGenre, GamePlatform } from "@/types/game";

export type PlatformMeta = {
  id: GamePlatform;
  label: string;
  shortLabel: string;
  coverage: string;
  shortCoverage: string;
  icon: LucideIcon;
  accent: string;
  surface: string;
};

export const platformMeta: Record<GamePlatform, PlatformMeta> = {
  pc: {
    id: "pc",
    label: "PC",
    shortLabel: "PC",
    coverage: "Steam · Epic · GOG",
    shortCoverage: "Steam · Epic",
    icon: Monitor,
    accent: "text-violet-200",
    surface: "bg-linear-to-br from-violet-500/30 to-fuchsia-500/5",
  },
  playstation: {
    id: "playstation",
    label: "PlayStation",
    shortLabel: "PS5",
    coverage: "PS4 · PS5",
    shortCoverage: "PS4 / PS5",
    icon: Gamepad2,
    accent: "text-blue-200",
    surface: "bg-linear-to-br from-blue-500/30 to-indigo-500/5",
  },
  xbox: {
    id: "xbox",
    label: "Xbox",
    shortLabel: "Xbox",
    coverage: "One · Series X|S",
    shortCoverage: "One / Series X|S",
    icon: Gamepad,
    accent: "text-emerald-200",
    surface: "bg-linear-to-br from-emerald-500/25 to-teal-500/5",
  },
  switch: {
    id: "switch",
    label: "Nintendo Switch",
    shortLabel: "Switch",
    coverage: "Handheld · Docked",
    shortCoverage: "Play anywhere",
    icon: Joystick,
    accent: "text-rose-200",
    surface: "bg-linear-to-br from-rose-500/25 to-orange-500/5",
  },
  android: {
    id: "android",
    label: "Android",
    shortLabel: "Android",
    coverage: "Google Play",
    shortCoverage: "Google Play",
    icon: Smartphone,
    accent: "text-lime-200",
    surface: "bg-linear-to-br from-lime-500/25 to-emerald-500/5",
  },
  ios: {
    id: "ios",
    label: "iOS",
    shortLabel: "iOS",
    coverage: "App Store",
    shortCoverage: "App Store",
    icon: Apple,
    accent: "text-cyan-200",
    surface: "bg-linear-to-br from-cyan-500/25 to-sky-500/5",
  },
  cloud: {
    id: "cloud",
    label: "Cloud Gaming",
    shortLabel: "Cloud",
    coverage: "Stream anywhere",
    shortCoverage: "Streaming",
    icon: Cloud,
    accent: "text-indigo-200",
    surface: "bg-linear-to-br from-indigo-500/30 to-violet-500/5",
  },
};

export const platformList: PlatformMeta[] = [
  platformMeta.pc,
  platformMeta.playstation,
  platformMeta.xbox,
  platformMeta.switch,
  platformMeta.android,
  platformMeta.ios,
  platformMeta.cloud,
];

export const genreLabels: Record<GameGenre, string> = {
  action: "Action",
  adventure: "Adventure",
  rpg: "RPG",
  shooter: "Shooter",
  strategy: "Strategy",
  sports: "Sports",
  racing: "Racing",
  simulation: "Simulation",
  horror: "Horror",
  puzzle: "Puzzle",
  mmo: "MMO",
  indie: "Indie",
  survival: "Survival",
  "open-world": "Open World",
  multiplayer: "Multiplayer",
  other: "Other",
};

export type GameCategory = {
  id: GameGenre;
  label: string;
  blurb: string;
  icon: LucideIcon;
  accent: string;
};

/** The twelve storefront categories used by the discovery center. */
export const gameCategories: GameCategory[] = [
  { id: "action", label: "Action", blurb: "Fast and loud", icon: Swords, accent: "text-rose-200" },
  { id: "adventure", label: "Adventure", blurb: "Worlds to explore", icon: Compass, accent: "text-emerald-200" },
  { id: "rpg", label: "RPG", blurb: "Build your legend", icon: Wand2, accent: "text-violet-200" },
  { id: "racing", label: "Racing", blurb: "Drift and redline", icon: Car, accent: "text-orange-200" },
  { id: "horror", label: "Horror", blurb: "Fear in the dark", icon: Ghost, accent: "text-red-200" },
  { id: "shooter", label: "Shooter", blurb: "Aim under fire", icon: Crosshair, accent: "text-amber-200" },
  { id: "strategy", label: "Strategy", blurb: "Outthink the board", icon: Brain, accent: "text-sky-200" },
  { id: "sports", label: "Sports", blurb: "Play to win", icon: Trophy, accent: "text-lime-200" },
  { id: "survival", label: "Survival", blurb: "Endure the wild", icon: Tent, accent: "text-teal-200" },
  { id: "open-world", label: "Open World", blurb: "No rails at all", icon: Map, accent: "text-cyan-200" },
  { id: "multiplayer", label: "Multiplayer", blurb: "Squad up, drop in", icon: Users, accent: "text-fuchsia-200" },
  { id: "indie", label: "Indie", blurb: "Bold small teams", icon: Sparkles, accent: "text-indigo-200" },
];

export const platformIds: GamePlatform[] = platformList.map((platform) => platform.id);
export const genreIds = Object.keys(genreLabels) as GameGenre[];
