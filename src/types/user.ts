import type { GameGenre, GamePlatform } from "@/types/game";

export type PlayerTier = "rookie" | "contender" | "veteran" | "elite" | "legend";

export type UserProfile = {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  tier: PlayerTier;
  platforms: GamePlatform[];
  favoriteGenres: GameGenre[];
  joinedAt: string;
};

export type PlayerStats = {
  gamesPlayed: number;
  hoursPlayed: number;
  achievementsUnlocked: number;
  winRate: number;
  streakDays: number;
  weeklyPlaytimeMinutes: number;
  favoriteGenre?: GameGenre;
};

export type NotificationPreferences = {
  productUpdates: boolean;
  weeklyReport: boolean;
  coachingReminders: boolean;
};

export type UserPreferences = {
  language: string;
  notifications: NotificationPreferences;
};

export type UpdateProfileInput = Partial<
  Pick<UserProfile, "displayName" | "bio" | "avatarUrl" | "platforms" | "favoriteGenres">
>;
