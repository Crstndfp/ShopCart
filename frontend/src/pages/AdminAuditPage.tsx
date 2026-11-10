import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Eye,
  FileText,
  Filter,
  History,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { auditApi } from '../api/audit.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import {
  formatJsonSnapshot,
  getActionTypeMeta,
  validateConfigValue,
  type AuditLogItem,
  type ConfigurationItem,
} from '../types/audit.types.js';

const SYSTEM_CONFIG_KEYS = [
  'SISTEMA_IVA_PORCENTAJE',
  'INVENTARIO_RESERVA_MINUTOS',
  'CARRITO_ABANDONADO_HORAS',
  'AUTH_ACCESS_TOKEN_MINUTOS',
  'AUTH_REFRESH_TOKEN_DIAS',
  'SISTEMA_MONEDA_ISO',
];

export function AdminAuditPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'configs'>('logs');

  // -------------------------------------------------------------
  // Audit Logs States
  // -------------------------------------------------------------
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsLimit] = useState<number>(20);
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Selected Log for JSON Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // -------------------------------------------------------------
  // Configurations States
  // -------------------------------------------------------------
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState<boolean>(true);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [configSuccessMessage, setConfigSuccessMessage] = useState<string | null>(null);

  // Selected Config for Edit Modal
  const [selectedConfig, setSelectedConfig] = useState<ConfigurationItem | null>(null);
  const [newConfigValue, setNewConfigValue] = useState<string>('');
  const [isSubmittingConfig, setIsSubmittingConfig] = useState<boolean>(false);
  const [configEditError, setConfigEditError] = useState<string | null>(null);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const res = await auditApi.listLogs({
        page: logsPage,
        limit: logsLimit,
        module: moduleFilter === 'ALL' ? undefined : moduleFilter,
      });
      let items = res.items || [];
      if (actionFilter !== 'ALL') {
        items = items.filter((i) => i.ActionType === actionFilter);
      }
      setLogs(items);
      setTotalLogs(res.total || 0);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar la bitácora de auditoría en SQL Server.';
      setLogsError(msg);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logsPage, logsLimit, moduleFilter, actionFilter]);

  // Fetch Configurations
  const fetchConfigurations = useCallback(async () => {
    setIsLoadingConfigs(true);
    setConfigsError(null);
    try {
      const loaded: ConfigurationItem[] = [];
      for (const key of SYSTEM_CONFIG_KEYS) {
        try {
          const cfg = await auditApi.getConfiguration(key);
          if (cfg) loaded.push(cfg);
        } catch {
          // Ignore individual missing config gracefully
        }
      }
      setConfigurations(loaded);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar los parámetros del sistema.';
      setConfigsError(msg);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    void fetchConfigurations();
  }, [fetchConfigurations]);

  // Handle Update Configuration Submit
  const handleUpdateConfigSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedConfig) return;

    setConfigEditError(null);
    const validation = validateConfigValue(selectedConfig.DataType, newConfigValue);
    if (!validation.isValid) {
      setConfigEditError(validation.error || 'Valor inválido para el tipo de dato.');
      return;
    }

    setIsSubmittingConfig(true);
    try {
      const updated = await auditApi.updateConfiguration(selectedConfig.ConfigKey, {
        newValue: newConfigValue.trim(),
      });

      setConfigurations((prev) =>
        prev.map((c) => (c.ConfigKey === updated.ConfigKey ? updated : c))
      );
      setConfigSuccessMessage(
        `Parámetro "${selectedConfig.ConfigKey}" actualizado a "${updated.ConfigValue}" exitosamente.`
      );
      setSelectedConfig(null);
      // Refresh audit logs to reflect configuration change
      void fetchAuditLogs();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al actualizar el parámetro en SQL Server.';
      setConfigEditError(msg);
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  const totalLogsPages = Math.ceil(totalLogs / logsLimit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-400">
              <History className="h-3.5 w-3.5" />
              RF-09 · AUDITORÍA Y CONFIGURACIÓN GLOBAL
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
              Don Arturo · Seguridad y Gobernanza
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Bitácora de Auditoría y Parámetros Globales
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Supervisión inmutable de cambios (OldValues vs. NewValues en JSON) y ajuste en caliente de variables del negocio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void fetchAuditLogs();
            void fetchConfigurations();
          }}
          disabled={isLoadingLogs || isLoadingConfigs}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {isLoadingLogs || isLoadingConfigs ? (
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
          ) : (
            <RotateCcw className="h-4 w-4 text-teal-400" />
          )}
          Actualizar Todo
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'logs'
              ? 'border-teal-500 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Bitácora de Auditoría ({totalLogs})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('configs')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'configs'
              ? 'border-teal-500 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          Parámetros Globales ({configurations.length})
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                <span>Módulo:</span>
              </div>
              <select
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setLogsPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos los Módulos</option>
                <option value="CATALOG">CATALOG (Productos y Categorías)</option>
                <option value="INVENTORY">INVENTORY (Stock y Kardex)</option>
                <option value="ORDERS">ORDERS (Pedidos y Devoluciones)</option>
                <option value="COUPONS">COUPONS (Cupones y Descuentos)</option>
                <option value="USERS">USERS (Usuarios y Roles)</option>
                <option value="CONFIGURATIONS">CONFIGURATIONS (Parámetros)</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Acción:</span>
              </div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setLogsPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-teal-500"
              >
                <option value="ALL">Todas las Acciones</option>
                <option value="CREATE">CREATE (Creación)</option>
                <option value="UPDATE">UPDATE (Modificación)</option>
                <option value="DELETE">DELETE (Baja / Eliminación)</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE (Estado)</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              Mostrando página {logsPage} de {totalLogsPages}
            </span>
          </div>

          {/* Error Alert */}
          {logsError && (
            <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-4 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-crimson-400" />
              <span>{logsError}</span>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    ID / Fecha
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    Módulo / Entidad
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                    Tipo de Acción
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                    Detalle JSON
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-teal-400" />
                      Cargando registros inmutables de auditoría...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      <History className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      No se encontraron registros de auditoría para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => {
                    const actionMeta = getActionTypeMeta(item.ActionType);
                    return (
                      <tr
                        key={item.IDAuditLog}
                        className="transition-colors hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold text-teal-400">
                            #{item.IDAuditLog}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            {new Date(item.LoggedAt).toLocaleString('es-GT', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">
                            {item.UserName || 'Sistema Autónomo'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.UserEmail || 'Proceso Backend'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-semibold text-slate-300">
                            {item.Module}
                          </span>
                          <div className="mt-1 text-xs text-slate-400">
                            {item.EntityName} (ID: {item.EntityID})
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${actionMeta.badgeClass}`}
                          >
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/60 px-3 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-900/60"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver Snapshot
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Logs Pagination */}
          {totalLogsPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Página {logsPage} de {totalLogsPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={logsPage >= totalLogsPages}
                  onClick={() => setLogsPage((p) => Math.min(totalLogsPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: System Configurations */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          {configSuccessMessage && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <span>{configSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setConfigSuccessMessage(null)}
                className="text-xs text-emerald-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          )}

          {configsError && (
            <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-4 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-crimson-400" />
              <span>{configsError}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Info className="h-4 w-4 text-teal-400" />
              Gobernanza de Parámetros Operativos
            </div>
            <p className="mt-1">
              Las modificaciones realizadas a estos valores aplican de forma inmediata en las transacciones de SQL Server y quedan registradas automáticamente en la bitácora `AuditLog`.
            </p>
          </div>

          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    Clave del Parámetro
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    Descripción de Negocio
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                    Tipo de Dato
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                    Valor Configurado
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                    Gobernanza
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {isLoadingConfigs ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-teal-400" />
                      Cargando parámetros globales de sistema...
                    </td>
                  </tr>
                ) : configurations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No se encontraron parámetros registrados.
                    </td>
                  </tr>
                ) : (
                  configurations.map((cfg) => (
                    <tr
                      key={cfg.IDConfiguration}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-teal-400 text-xs">
                        {cfg.ConfigKey}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {cfg.Description || 'Parámetro de ejecución de sistema'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-400">
                          {cfg.DataType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                        {cfg.ConfigValue}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {cfg.IsEditable ? (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Editable
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                            Solo Lectura
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {cfg.IsEditable ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConfig(cfg);
                              setNewConfigValue(cfg.ConfigValue);
                              setConfigEditError(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/60 px-3 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-900/60"
                          >
                            <Sliders className="h-3 w-3" />
                            Editar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">
                            <Lock className="inline h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Audit Log JSON Snapshot Viewer */}
      {selectedLog && (
        <ModalDialog
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Detalle de Auditoría #${selectedLog.IDAuditLog} · ${selectedLog.EntityName}`}
          subtitle={`Acción: ${selectedLog.ActionType} · Módulo: ${selectedLog.Module} · Por: ${
            selectedLog.UserName || 'Sistema'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span>
                Fecha del Evento:{' '}
                <strong className="text-white">
                  {new Date(selectedLog.LoggedAt).toLocaleString('es-GT')}
                </strong>
              </span>
              <span>
                ID Registro:{' '}
                <strong className="font-mono text-teal-400">{selectedLog.EntityID}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Previous Value */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                  <Code2 className="h-3.5 w-3.5 text-orange-400" />
                  Estado Previo (PreviousValueJson):
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                  {formatJsonSnapshot(selectedLog.PreviousValueJson)}
                </pre>
              </div>

              {/* New Value */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                  <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                  Nuevo Estado (NewValueJson):
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                  {formatJsonSnapshot(selectedLog.NewValueJson)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Modal 2: Edit Configuration */}
      {selectedConfig && (
        <ModalDialog
          isOpen={true}
          onClose={() => setSelectedConfig(null)}
          title={`Editar Parámetro: ${selectedConfig.ConfigKey}`}
          subtitle={selectedConfig.Description || 'Ajuste de variable de negocio'}
        >
          <form onSubmit={handleUpdateConfigSubmit} className="space-y-4">
            {configEditError && (
              <div className="flex items-center gap-2 rounded-lg border border-crimson-600/40 bg-crimson-950/30 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-400" />
                <span>{configEditError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Tipo de Dato Esperado:
              </label>
              <input
                type="text"
                disabled
                value={`${selectedConfig.DataType} (Validación estricta)`}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Nuevo Valor del Parámetro:
              </label>
              <input
                type="text"
                required
                value={newConfigValue}
                onChange={(e) => setNewConfigValue(e.target.value)}
                placeholder="Ingrese nuevo valor..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-teal-500/20 bg-teal-950/20 p-3 text-xs text-teal-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Info className="h-4 w-4 text-teal-400" />
                Garantía Transaccional y Auditoría
              </div>
              <p className="mt-1 text-slate-400">
                Esta acción ejecutará `dbo.SP_Configurations_Update` y registrará automáticamente un evento `UPDATE` en la tabla `dbo.AuditLog` con su ID de usuario.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedConfig(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-teal-500 disabled:opacity-50"
              >
                {isSubmittingConfig ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Guardar Nuevo Parámetro
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  );
}
