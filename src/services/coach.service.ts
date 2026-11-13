import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  CoachMessage,
  CoachRecommendation,
  CoachSession,
  SendCoachMessageInput,
} from "@/types/coach";

export const coachService = {
  listSessions() {
    return apiClient.get<CoachSession[]>(endpoints.coach.sessions);
  },

  getSession(sessionId: string) {
    return apiClient.get<CoachSession>(endpoints.coach.session(sessionId));
  },

  createSession(input: { title?: string; gameId?: string } = {}) {
    return apiClient.post<CoachSession>(endpoints.coach.sessions, input);
  },

  sendMessage(sessionId: string, input: SendCoachMessageInput) {
    return apiClient.post<CoachMessage>(endpoints.coach.messages(sessionId), input);
  },

  getRecommendations() {
    return apiClient.get<CoachRecommendation[]>(endpoints.coach.recommendations);
  },
};
