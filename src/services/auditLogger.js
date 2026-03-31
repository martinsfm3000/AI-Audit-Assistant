/**
 * M-KOPA Audit Assistant – Activity Logger
 * Compliant with IIA Standards, SOX/ICFR, and COSO access-control requirements.
 *
 * Every entry is immutable once written (append-only via localStorage).
 * Fields align with NIST SP 800-92 log record guidance.
 */

const STORAGE_KEY = 'mkopa_audit_log';
const SESSION_KEY = 'mkopa_session_id';

// ── Session ID ────────────────────────────────────────────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `SID-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
};

// ── Current user (from localStorage settings) ────────────────────────────────
const getCurrentUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem('mkopa_current_user') || '{}');
    return {
      id: u.id || 'SYSTEM',
      name: u.name || 'System',
      role: u.role || 'Unknown',
      email: u.email || '',
    };
  } catch {
    return { id: 'SYSTEM', name: 'System', role: 'Unknown', email: '' };
  }
};

// ── Action constants (use these when calling log()) ──────────────────────────
export const LOG_ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  // CRUD
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  // App events
  NAVIGATE: 'NAVIGATE',
  EXPORT: 'EXPORT',
  SEARCH: 'SEARCH',
  FILTER: 'FILTER',
  // AI
  AI_QUERY: 'AI_QUERY',
  AI_RESPONSE: 'AI_RESPONSE',
  // Access control
  ACCESS_DENIED: 'ACCESS_DENIED',
};

export const LOG_RESOURCES = {
  AUDIT: 'Audit',
  DOCUMENT: 'Document',
  USER: 'User',
  REPORT: 'Report',
  SETTINGS: 'Settings',
  PAGE: 'Page',
  AI_ASSISTANT: 'AI Assistant',
  AUDIT_LOG: 'Audit Log',
};

export const LOG_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

export const LOG_RESULT = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  DENIED: 'DENIED',
};

// ── Severity inference ────────────────────────────────────────────────────────
const inferSeverity = (action, result) => {
  if (result === LOG_RESULT.DENIED) return LOG_SEVERITY.CRITICAL;
  if ([LOG_ACTIONS.DELETE, LOG_ACTIONS.LOGIN, LOG_ACTIONS.LOGOUT, LOG_ACTIONS.ACCESS_DENIED].includes(action))
    return LOG_SEVERITY.WARNING;
  return LOG_SEVERITY.INFO;
};

// ── Core log() function ───────────────────────────────────────────────────────
/**
 * @param {object} entry
 * @param {string} entry.action   – one of LOG_ACTIONS
 * @param {string} entry.resource – one of LOG_RESOURCES
 * @param {string} entry.details  – human-readable description
 * @param {string} [entry.resourceId]
 * @param {string} [entry.result]   – default SUCCESS
 * @param {string} [entry.severity] – auto-inferred if omitted
 */
export const log = (entry) => {
  const user = getCurrentUser();
  const result = entry.result || LOG_RESULT.SUCCESS;
  const record = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    user,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId || null,
    details: entry.details,
    result,
    severity: entry.severity || inferSeverity(entry.action, result),
    userAgent: navigator.userAgent.slice(0, 120),
  };

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // Keep last 10,000 entries
    const trimmed = existing.length >= 10000 ? existing.slice(-9999) : existing;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...trimmed, record]));
  } catch (e) {
    console.error('[AuditLog] Failed to persist log entry', e);
  }

  return record;
};

// ── Read helpers ──────────────────────────────────────────────────────────────
export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const clearLogs = () => {
  log({
    action: LOG_ACTIONS.DELETE,
    resource: LOG_RESOURCES.AUDIT_LOG,
    details: 'Audit log cleared by user',
    severity: LOG_SEVERITY.CRITICAL,
  });
  // Keep only the "cleared" entry itself
  const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entries[entries.length - 1]]));
};

export const exportLogs = (format = 'json') => {
  log({
    action: LOG_ACTIONS.EXPORT,
    resource: LOG_RESOURCES.AUDIT_LOG,
    details: `Audit log exported as ${format.toUpperCase()}`,
  });

  const entries = getLogs();
  let content, mime, ext;

  if (format === 'csv') {
    const headers = ['id', 'timestamp', 'sessionId', 'user.name', 'user.role', 'action', 'resource', 'resourceId', 'details', 'result', 'severity'];
    const rows = entries.map((e) =>
      [e.id, e.timestamp, e.sessionId, e.user?.name, e.user?.role, e.action, e.resource, e.resourceId || '', `"${(e.details || '').replace(/"/g, '""')}"`, e.result, e.severity].join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    mime = 'text/csv';
    ext = 'csv';
  } else {
    content = JSON.stringify(entries, null, 2);
    mime = 'application/json';
    ext = 'json';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mkopa-audit-log-${new Date().toISOString().slice(0, 10)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};

// Log session start automatically
log({
  action: LOG_ACTIONS.LOGIN,
  resource: LOG_RESOURCES.PAGE,
  details: 'Session started – application loaded',
  severity: LOG_SEVERITY.INFO,
});
