/**
 * Synchronizes programmatic ARIA validity state (`aria-invalid`) with the visual
 * `:user-invalid` CSS state (and provides a WeakMap fallback if `:user-invalid`
 * is not supported in older environments).
 */
export function syncInputAriaState(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
  const supportsUserInvalid =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:user-invalid)');

  if (supportsUserInvalid) {
    const isUserInvalid = input.matches(':user-invalid');
    if (isUserInvalid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
    return;
  }

  // Fallback for environments without native :user-invalid
  const isValid = input.checkValidity();
  input.classList.toggle('user-invalid-fallback', !isValid);
  input.classList.toggle('user-valid-fallback', isValid);
  if (!isValid) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

export function handleFieldBlur(
  event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
): void {
  syncInputAriaState(event.currentTarget);
}

export function handleFieldInput(
  event: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
): void {
  const target = event.currentTarget;
  if (target.hasAttribute('aria-invalid') || target.classList.contains('user-invalid-fallback')) {
    syncInputAriaState(target);
  }
}
