export interface AuditLogEntry {
  timestamp: string;
  eventType: 'AUTH_FAILED' | 'ACCOUNT_LOCKED' | 'ACCESS_DENIED' | 'AUTH_SUCCESS' | 'PASSWORD_BRUTE_FORCE_ATTEMPT';
  email?: string;
  ip: string;
  endpoint: string;
  details: string;
}

const auditMemoryLogs: AuditLogEntry[] = [];
const MAX_LOGS = 200;

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  audit: (entry: Omit<AuditLogEntry, 'timestamp'>) => {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    auditMemoryLogs.unshift(fullEntry);
    if (auditMemoryLogs.length > MAX_LOGS) {
      auditMemoryLogs.pop();
    }
    console.warn(`[AUDIT_SECURITY] [${fullEntry.eventType}] IP: ${fullEntry.ip} - User: ${fullEntry.email || 'anonymous'} - Path: ${fullEntry.endpoint} - ${fullEntry.details}`);
  },
  getAuditLogs: () => [...auditMemoryLogs],
};
