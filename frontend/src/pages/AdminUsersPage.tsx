import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { userAdminApi } from '../api/user-admin.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { PhoneInputWithCountry } from '../components/ui/PhoneInputWithCountry.js';
import { translateBackendError } from '../utils/i18n-errors.js';
import {
  getRoleMeta,
  validatePasswordStrength,
  type CreateUserAdminPayload,
  type UserRecord,
} from '../types/user-admin.types.js';

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserRecord | null>(null);

  // Create Form State
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createRoleCode, setCreateRoleCode] = useState<'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT'>('OPERATOR');
  const [createPhone, setCreatePhone] = useState<string>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Role Edit Form State
  const [newRoleCode, setNewRoleCode] = useState<'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT'>('OPERATOR');
  const [isSubmittingRole, setIsSubmittingRole] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Status Edit Form State
  const [statusReason, setStatusReason] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const roleParam =
      roleFilter === 'ALL'
        ? undefined
        : (roleFilter as 'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT');

    const activeParam =
      statusFilter === 'ALL'
        ? undefined
        : statusFilter === 'ACTIVE';

    try {
      const res = await userAdminApi.listUsers({
        page,
        limit,
        role: roleParam,
        isActive: activeParam,
        q: appliedSearch || undefined,
      });

      setUsers(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? translateBackendError(err.message)
          : 'Error al consultar la lista de usuarios en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, roleFilter, statusFilter, appliedSearch]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Handle Search Submission
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery.trim());
    setPage(1);
  };

  // Create User Handler
  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const passwordValidation = validatePasswordStrength(createPassword);
    if (!passwordValidation.isValid) {
      setCreateError(passwordValidation.errors.join('. ') || 'La contraseña no cumple los requisitos mínimos.');
      return;
    }

    setIsSubmittingCreate(true);

    const payload: CreateUserAdminPayload = {
      fullName: createFullName.trim(),
      email: createEmail.trim().toLowerCase(),
      password: createPassword,
      roleCode: createRoleCode,
      phoneNumber: createPhone.trim() || undefined,
    };

    try {
      const created = await userAdminApi.createUser(payload);
      setSuccessMessage(`Usuario "${created.FullName}" (#${created.IDUser}) creado exitosamente con rol ${created.RoleCode}.`);
      setIsCreateOpen(false);
      // Reset form
      setCreateFullName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRoleCode('OPERATOR');
      setCreatePhone('');
      void fetchUsers();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? translateBackendError(err.message)
          : 'Error al crear la cuenta de usuario en SQL Server.';
      setCreateError(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Role Change Handler
  const handleRoleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    setRoleError(null);
    setIsSubmittingRole(true);

    try {
      const updated = await userAdminApi.updateRole(selectedUserForRole.IDUser, {
        roleCode: newRoleCode,
      });
      setSuccessMessage(`Rol de "${updated.FullName}" actualizado a ${updated.RoleCode}. Registro asentado en bitácora.`);
      setSelectedUserForRole(null);
      void fetchUsers();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? translateBackendError(err.message)
          : 'Error al actualizar el rol del usuario en SQL Server.';
      setRoleError(msg);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Status Change Handler (Deactivate / Activate)
  const handleStatusSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;

    setStatusActionError(null);

    const willBeActive = !selectedUserForStatus.IsActive;

    if (!willBeActive && statusReason.trim().length < 3) {
      setStatusActionError('Para desactivar una cuenta es obligatorio especificar un motivo (mínimo 3 caracteres).');
      return;
    }

    setIsSubmittingStatus(true);

    try {
      const updated = await userAdminApi.updateStatus(selectedUserForStatus.IDUser, {
        isActive: willBeActive,
        reason: willBeActive ? undefined : statusReason.trim(),
      });
      setSuccessMessage(
        `Cuenta de "${updated.FullName}" ${
          updated.IsActive ? 'reactivada exitosamente' : 'desactivada lógicamente con motivo registrado'
        }.`
      );
      setSelectedUserForStatus(null);
      void fetchUsers();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? translateBackendError(err.message)
          : 'Error al actualizar el estado de la cuenta en SQL Server.';
      setStatusActionError(msg);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // KPI calculations
  const kpiAdmins = users.filter((u) => u.RoleCode === 'ADMINISTRATOR').length;
  const kpiOperators = users.filter((u) => u.RoleCode === 'OPERATOR').length;
  const kpiClients = users.filter((u) => u.RoleCode === 'CLIENT').length;
  const kpiInactive = users.filter((u) => !u.IsActive).length;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-purple-300">
              <Users className="h-3.5 w-3.5" />
              RF-01 · GESTIÓN DE USUARIOS Y ROLES
            </span>
            <span className="rounded-md border border-[var(--border-subtle)] bg-surface px-2.5 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
              Don Arturo · Seguridad RBAC
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Administración de Usuarios y Permisos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Alta y control de cuentas operativas y administrativas, asignación de roles y control de acceso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchUsers()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-surface px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RotateCcw className="h-4 w-4 text-primary" />
            )}
            Actualizar
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700"
          >
            <UserPlus className="h-4 w-4" />
            Crear Usuario
          </button>
        </div>
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-surface p-4 text-xs text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-500 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-surface p-4 text-xs text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-crimson-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Métricas de cuentas de usuario">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Total Usuarios</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{total}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Cuentas registradas</span>
        </div>

        <div className="rounded-2xl border border-purple-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-purple-500 dark:text-purple-300">
            <span className="font-mono uppercase">Administradores</span>
            <ShieldCheck className="h-4 w-4 text-purple-500 dark:text-purple-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-300">{kpiAdmins}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Acceso total al sistema</span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-500 dark:text-amber-300">
            <span className="font-mono uppercase">Operadores</span>
            <Shield className="h-4 w-4 text-amber-500 dark:text-amber-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-300">{kpiOperators}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Logística y bodega</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-500 dark:text-emerald-300">
            <span className="font-mono uppercase">Clientes</span>
            <UserCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-300">{kpiClients}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Compradores B2C</span>
        </div>

        <div className="rounded-2xl border border-crimson-600/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-500 dark:text-red-300">
            <span className="font-mono uppercase">Inactivos</span>
            <UserX className="h-4 w-4 text-crimson-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-red-500 dark:text-red-300">{kpiInactive}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Bloqueados temporalmente</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-canvas pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-primary"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="ADMINISTRATOR">Solo Administradores</option>
            <option value="OPERATOR">Solo Operadores</option>
            <option value="CLIENT">Solo Clientes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
        <table className="w-full text-left text-xs text-[var(--text-secondary)]">
          <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Usuario / Correo
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Rol Asignado
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Teléfono
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                Estado
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Fecha Registro
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  Cargando directorio de usuarios en tiempo real...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <Users className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
                  No se encontraron usuarios registrados con los filtros aplicados.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleMeta = getRoleMeta(u.RoleCode);
                return (
                  <tr
                    key={u.IDUser}
                    className="transition-colors hover:bg-elevated/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">{u.FullName}</div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Mail className="h-3 w-3 text-[var(--text-muted)]" />
                        {u.Email}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${roleMeta.badgeClass}`}
                      >
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                      {u.PhoneNumber ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[var(--text-muted)]" />
                          <span className="font-mono">{u.PhoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">No registrado</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${
                          u.IsActive
                            ? 'border border-emerald-500/40 bg-emerald-950/80 text-emerald-300'
                            : 'border border-crimson-600/40 bg-crimson-950/80 text-red-300'
                        }`}
                      >
                        {u.IsActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-muted)]">
                      {new Date(u.CreatedAt).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForRole(u);
                            setNewRoleCode(u.RoleCode as any);
                            setRoleError(null);
                          }}
                          className="rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:border-primary"
                        >
                          Rol
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForStatus(u);
                            setStatusReason('');
                            setStatusActionError(null);
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                            u.IsActive
                              ? 'border-crimson-600/40 bg-crimson-950/40 text-red-300 hover:bg-crimson-900/60'
                              : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                        >
                          {u.IsActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <span className="text-xs text-[var(--text-muted)]">
            Página {page} de {totalPages} ({total} usuarios)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Create User */}
      {isCreateOpen && (
        <ModalDialog
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Crear Nueva Cuenta de Usuario"
          subtitle="Permite el alta directa de operadores, administradores o clientes con auditoría en SQL Server."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-surface p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Nombre Completo:
              </label>
              <input
                type="text"
                required
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
                placeholder="Ej. Roberto Menéndez"
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Correo Electrónico:
              </label>
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@shopcart.gt"
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Contraseña Inicial:
              </label>
              <input
                type="password"
                required
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 especial"
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Requisitos: Mín. 8 caracteres, al menos 1 letra mayúscula, 1 dígito numérico y 1 símbolo especial.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Rol de Sistema:
                </label>
                <select
                  value={createRoleCode}
                  onChange={(e) => setCreateRoleCode(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
                >
                  <option value="OPERATOR">OPERATOR (Operador Logístico)</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR (Control Total)</option>
                  <option value="CLIENT">CLIENT (Cliente B2C)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Teléfono (Código y 8 dígitos):
                </label>
                <div className="mt-1">
                  <PhoneInputWithCountry
                    value={createPhone}
                    onChange={setCreatePhone}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmittingCreate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Registrar Usuario
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Modal 2: Change Role */}
      {selectedUserForRole && (
        <ModalDialog
          isOpen={true}
          onClose={() => setSelectedUserForRole(null)}
          title={`Actualizar Rol: ${selectedUserForRole.FullName}`}
          subtitle={`Rol actual: ${selectedUserForRole.RoleCode}`}
        >
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            {roleError && (
              <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-surface p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                <span>{roleError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Seleccione el nuevo rol a asignar:
              </label>
              <select
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              >
                <option value="OPERATOR">OPERATOR (Operador Logístico / Bodega)</option>
                <option value="ADMINISTRATOR">ADMINISTRATOR (Administrador Global)</option>
                <option value="CLIENT">CLIENT (Cliente Estándar B2C)</option>
              </select>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-surface p-3 text-xs text-amber-400">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Cambio de Privilegios de Seguridad
              </div>
              <p className="mt-1 text-[var(--text-secondary)]">
                El cambio de rol entra en vigencia de inmediato en la base de datos y quedará registrado en la bitácora de auditoría.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingRole}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmittingRole ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar Cambio de Rol
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Modal 3: Toggle User Status */}
      {selectedUserForStatus && (
        <ModalDialog
          isOpen={true}
          onClose={() => setSelectedUserForStatus(null)}
          title={
            selectedUserForStatus.IsActive
              ? `Desactivar Cuenta: ${selectedUserForStatus.FullName}`
              : `Reactivar Cuenta: ${selectedUserForStatus.FullName}`
          }
          subtitle={`Estado actual: ${selectedUserForStatus.IsActive ? 'ACTIVO' : 'INACTIVO'}`}
        >
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            {statusActionError && (
              <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-surface p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                <span>{statusActionError}</span>
              </div>
            )}

            {selectedUserForStatus.IsActive ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Al desactivar la cuenta, el usuario no podrá iniciar sesión en la plataforma ni realizar compras u operaciones.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Motivo de Desactivación (Obligatorio, mín. 3 caracteres):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Ej. Sospecha de actividad inusual, solicitud formal de baja, etc."
                    className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-crimson-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                ¿Está seguro de que desea reactivar la cuenta de{' '}
                <strong className="text-[var(--text-primary)]">{selectedUserForStatus.FullName}</strong>? El usuario recuperará de inmediato sus privilegios de acceso.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedUserForStatus(null)}
                className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingStatus}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                  selectedUserForStatus.IsActive
                    ? 'bg-crimson-600 hover:bg-crimson-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmittingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {selectedUserForStatus.IsActive ? 'Confirmar Desactivación' : 'Confirmar Reactivación'}
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  );
}
