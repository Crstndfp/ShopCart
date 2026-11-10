export interface AuditLogItem {
  IDAuditLog: number;
  IDUser: number | null;
  UserName: string | null;
  UserEmail: string | null;
  Module: string;
  EntityName: string;
  EntityID: string;
  ActionType: string;
  PreviousValueJson: string | null;
  NewValueJson: string | null;
  LoggedAt: string;
}

export interface AuditLogListResponse {
  statusCode: number;
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  module?: string;
  entityName?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ConfigurationItem {
  IDConfiguration: number;
  ConfigKey: string;
  ConfigValue: string;
  DataType: string;
  Description: string | null;
  IsEditable: boolean;
  UpdatedAt: string | null;
}

export interface UpdateConfigurationPayload {
  newValue: string;
}

export interface ActionTypeMeta {
  label: string;
  badgeClass: string;
}

export const ACTION_TYPE_META: Record<string, ActionTypeMeta> = {
  CREATE: {
    label: 'Creación',
    badgeClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
  },
  UPDATE: {
    label: 'Modificación',
    badgeClass: 'border-sky-500/40 bg-sky-950/80 text-sky-300',
  },
  DELETE: {
    label: 'Eliminación',
    badgeClass: 'border-crimson-600/40 bg-crimson-950/80 text-red-300',
  },
  STATUS_CHANGE: {
    label: 'Cambio de Estado',
    badgeClass: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
  },
};

export function getActionTypeMeta(action: string): ActionTypeMeta {
  return (
    ACTION_TYPE_META[action] || {
      label: action,
      badgeClass: 'border-slate-500/40 bg-slate-900/80 text-slate-300',
    }
  );
}

export function formatJsonSnapshot(rawJson: string | null): string {
  if (!rawJson) return 'N/A';
  try {
    const parsed = JSON.parse(rawJson);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawJson;
  }
}

export function validateConfigValue(
  dataType: string,
  value: string
): { isValid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'El valor no puede estar vacío.' };
  }

  if (dataType === 'INTEGER') {
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < 0) {
      return { isValid: false, error: 'Debe ser un número entero mayor o igual a 0.' };
    }
  }

  if (dataType === 'DECIMAL') {
    const num = Number(trimmed);
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: 'Debe ser un número decimal mayor o igual a 0.' };
    }
  }

  return { isValid: true };
}
