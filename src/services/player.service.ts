import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { PlayerStats, UpdateProfileInput, UserPreferences, UserProfile } from "@/types/user";

export const playerService = {
  getProfile() {
    return apiClient.get<UserProfile>(endpoints.player.profile);
  },

  updateProfile(input: UpdateProfileInput) {
    return apiClient.patch<UserProfile>(endpoints.player.profile, input);
  },

  getStats() {
    return apiClient.get<PlayerStats>(endpoints.player.stats);
  },

  getPreferences() {
    return apiClient.get<UserPreferences>(endpoints.player.preferences);
  },

  updatePreferences(input: Partial<UserPreferences>) {
    return apiClient.put<UserPreferences>(endpoints.player.preferences, input);
  },
};
