export interface AuditLogEntry {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  detail: string | null;
  ipAddress: string | null;
  timestamp: number;
}
