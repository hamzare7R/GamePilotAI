import {
  Apple,
  Cloud,
  Gamepad,
  Gamepad2,
  Joystick,
  Monitor,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import type { GameGenre, GamePlatform } from "@/types/game";

export type PlatformMeta = {
  id: GamePlatform;
  label: string;
  shortLabel: string;
  coverage: string;
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
    icon: Monitor,
    accent: "text-violet-200",
    surface: "bg-linear-to-br from-violet-500/30 to-fuchsia-500/5",
  },
  playstation: {
    id: "playstation",
    label: "PlayStation",
    shortLabel: "PS5",
    coverage: "PS4 · PS5",
    icon: Gamepad2,
    accent: "text-blue-200",
    surface: "bg-linear-to-br from-blue-500/30 to-indigo-500/5",
  },
  xbox: {
    id: "xbox",
    label: "Xbox",
    shortLabel: "Xbox",
    coverage: "One · Series X|S",
    icon: Gamepad,
    accent: "text-emerald-200",
    surface: "bg-linear-to-br from-emerald-500/25 to-teal-500/5",
  },
  switch: {
    id: "switch",
    label: "Nintendo Switch",
    shortLabel: "Switch",
    coverage: "Handheld · Docked",
    icon: Joystick,
    accent: "text-rose-200",
    surface: "bg-linear-to-br from-rose-500/25 to-orange-500/5",
  },
  android: {
    id: "android",
    label: "Android",
    shortLabel: "Android",
    coverage: "Google Play",
    icon: Smartphone,
    accent: "text-lime-200",
    surface: "bg-linear-to-br from-lime-500/25 to-emerald-500/5",
  },
  ios: {
    id: "ios",
    label: "iOS",
    shortLabel: "iOS",
    coverage: "App Store",
    icon: Apple,
    accent: "text-cyan-200",
    surface: "bg-linear-to-br from-cyan-500/25 to-sky-500/5",
  },
  cloud: {
    id: "cloud",
    label: "Cloud Gaming",
    shortLabel: "Cloud",
    coverage: "Stream anywhere",
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
  other: "Other",
};

export const genreFilterOptions: { id: GameGenre; label: string }[] = [
  "action",
  "adventure",
  "rpg",
  "shooter",
  "racing",
  "horror",
  "strategy",
  "mmo",
  "puzzle",
  "sports",
].map((id) => ({ id: id as GameGenre, label: genreLabels[id as GameGenre] }));
