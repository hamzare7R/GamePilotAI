export type ConnectionStatus = "active" | "error" | "revoked";

export type MailConnection = {
  id: string;
  userId: string;
  emailAddress: string;
  encryptedRefreshToken: string;
  status: ConnectionStatus;
  historyId: string | null;
  watchExpiration: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
};

export type MailNotification = {
  id: string;
  gmailMessageId: string;
  serviceName: string;
  messageCategory: string;
  senderDomain: string;
  senderAddress: string;
  receivedAt: Date | null;
  processingStatus: string;
  createdAt: Date;
};

export type ConnectedServiceSummary = {
  serviceName: string;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  notificationCount: number;
};

export type MailSummary = {
  totalNotifications: number;
  detectedServices: number;
  securityNotifications: number;
  lastActivity: Date | null;
};

export type SyncEvent = {
  id: string;
  eventType: string;
  status: string;
  errorCode: string | null;
  createdAt: Date;
};

export type AdminMailSummary = {
  totalConnections: number;
  activeConnections: number;
  disconnectedAccounts: number;
  pubsubEvents: number;
  successfulSyncs: number;
  failedSyncs: number;
  serviceCounts: Array<{ serviceName: string; connections: number; notifications: number }>;
  lastActivity: Date | null;
};
