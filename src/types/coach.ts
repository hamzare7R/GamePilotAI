export type CoachRole = "user" | "assistant";

export type CoachMessage = {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: string;
};

export type CoachSession = {
  id: string;
  title: string;
  gameId?: string;
  messages: CoachMessage[];
  createdAt: string;
  updatedAt: string;
};

export type CoachRecommendationCategory = "performance" | "build" | "routine" | "discovery";

export type CoachRecommendation = {
  id: string;
  title: string;
  summary: string;
  category: CoachRecommendationCategory;
  impact: "low" | "medium" | "high";
};

export type SendCoachMessageInput = {
  message: string;
  gameId?: string;
};
