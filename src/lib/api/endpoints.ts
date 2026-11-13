export const endpoints = {
  health: "/health",
  games: {
    list: "/games",
    detail: (gameId: string) => `/games/${encodeURIComponent(gameId)}`,
  },
  library: {
    list: "/library",
    detail: (entryId: string) => `/library/${encodeURIComponent(entryId)}`,
  },
  player: {
    profile: "/player",
    stats: "/player/stats",
    preferences: "/player/preferences",
  },
  coach: {
    sessions: "/coach/sessions",
    session: (sessionId: string) => `/coach/sessions/${encodeURIComponent(sessionId)}`,
    messages: (sessionId: string) => `/coach/sessions/${encodeURIComponent(sessionId)}/messages`,
    recommendations: "/coach/recommendations",
  },
} as const;
