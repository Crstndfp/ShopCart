import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  User,
} from 'lucide-react';
import { addressApi } from '../api/address.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import {
  formatAddressSummary,
  type AddressRecord,
  type CreateAddressPayload,
} from '../types/address.types.js';

export function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form Fields
  const [alias, setAlias] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [municipality, setMunicipality] = useState('Guatemala');
  const [department, setDepartment] = useState('Guatemala');
  const [postalCode, setPostalCode] = useState('01010');
  const [contactPhone, setContactPhone] = useState('');

  // Fetch Addresses
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await addressApi.listAddresses();
      setAddresses(data || []);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar las direcciones en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  // Modal Handlers
  const handleOpenModal = () => {
    setAlias('');
    setRecipientName('');
    setAddressLine1('');
    setAddressLine2('');
    setMunicipality('Guatemala');
    setDepartment('Guatemala');
    setPostalCode('01010');
    setContactPhone('');
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setModalFeedback(null);
  };

  const handleSubmitAddress = async (e: FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    if (contactPhone.trim().replace(/\D/g, '').length < 8) {
      setModalFeedback({
        type: 'error',
        message: 'El teléfono de contacto debe tener al menos 8 dígitos.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateAddressPayload = {
        alias: alias.trim(),
        recipientName: recipientName.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        municipality: municipality.trim(),
        department: department.trim(),
        postalCode: postalCode.trim() || null,
        contactPhone: contactPhone.trim(),
      };

      await addressApi.createAddress(payload);
      setModalFeedback({
        type: 'success',
        message: 'Dirección guardada exitosamente en tu libreta.',
      });

      void fetchAddresses();
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al guardar la dirección en el servidor.';
      setModalFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              RF-06 · LIBRETA DE DIRECCIONES
            </span>
            <span className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
              CLIENT
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Mis Direcciones de Entrega
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gestiona los lugares de recepción para tus pedidos y envíos en Guatemala.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-900 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva Dirección
        </button>
      </header>

      {/* Content: Loading / Error / Empty / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`addr-skel-${i}`}
              className="h-48 w-full rounded-2xl border border-[var(--border-subtle)] bg-surface animate-pulse"
            />
          ))}
          <span className="sr-only">Cargando direcciones...</span>
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
        >
          <AlertCircle className="h-10 w-10 text-crimson-600" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            Error al consultar direcciones
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void fetchAddresses()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400/10 text-brand-400">
            <MapPin className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            Aún no tienes direcciones registradas
          </h2>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
            Agrega tu primera dirección de entrega para agilizar el proceso de compra y recepción de pedidos.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Agregar mi primera dirección
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((addr) => (
            <article
              key={addr.IDAddress}
              className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs transition hover:border-primary/50"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                      {addr.Alias}
                    </span>
                  </div>
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    Activa
                  </span>
                </div>

                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-primary)]">
                    <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="font-semibold">{addr.RecipientName}</span>
                  </div>

                  <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                    <p className="leading-relaxed">
                      {formatAddressSummary(addr)}
                      {addr.PostalCode && (
                        <span className="ml-1 font-mono text-[11px] text-[var(--text-muted)]">
                          (CP: {addr.PostalCode})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="font-mono text-xs">{addr.ContactPhone}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE ADDRESS
         ========================================================================= */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nueva Dirección de Entrega"
        subtitle="Registra un destino en Guatemala para el despacho de tus compras."
      >
        <form onSubmit={handleSubmitAddress} className="space-y-4 text-xs">
          {/* Alias & Recipient */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="addr-alias" className="block font-semibold text-[var(--text-primary)]">
                Alias de Dirección (Ej. Casa, Oficina)
              </label>
              <input
                id="addr-alias"
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Casa, Oficina, Bodega..."
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="addr-recipient" className="block font-semibold text-[var(--text-primary)]">
                Nombre de Quien Recibe
              </label>
              <input
                id="addr-recipient"
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nombre y Apellidos..."
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Line 1 & Line 2 */}
          <div>
            <label htmlFor="addr-line1" className="block font-semibold text-[var(--text-primary)]">
              Dirección Línea 1 (Calle, Avenida, Número)
            </label>
            <input
              id="addr-line1"
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="12 Calle 5-43 Zona 10..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="addr-line2" className="block font-semibold text-[var(--text-primary)]">
              Dirección Línea 2 (Opcional: Apartamento, Nivel, Referencia)
            </label>
            <input
              id="addr-line2"
              type="text"
              maxLength={200}
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apto 4B, Edificio Reforma 10..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Municipality, Department & Postal Code */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="addr-muni" className="block font-semibold text-[var(--text-primary)]">
                Municipio
              </label>
              <input
                id="addr-muni"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="addr-dept" className="block font-semibold text-[var(--text-primary)]">
                Departamento
              </label>
              <input
                id="addr-dept"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="addr-postal" className="block font-semibold text-[var(--text-primary)]">
                Código Postal
              </label>
              <input
                id="addr-postal"
                type="text"
                maxLength={20}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label htmlFor="addr-phone" className="block font-semibold text-[var(--text-primary)]">
              Teléfono de Contacto (Mín. 8 dígitos)
            </label>
            <input
              id="addr-phone"
              type="tel"
              required
              minLength={8}
              maxLength={30}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+502 5555-1234"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Modal Feedback Alert */}
          {modalFeedback && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                modalFeedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-crimson-600/40 bg-crimson-950/40 text-red-300'
              }`}
            >
              {modalFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
              )}
              <p>{modalFeedback.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando en SQL Server...
                </>
              ) : (
                'Guardar Dirección'
              )}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
