import { useEffect, useState } from 'react';

export interface CountryCodeOption {
  code: string;
  name: string;
  flag: string;
}

export const CENTRAL_AMERICA_COUNTRIES: CountryCodeOption[] = [
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
];

export interface PhoneInputWithCountryProps {
  id?: string;
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Formats raw digits into a standard 8-digit masked phone number: "1234-5678"
 */
export function formatPhoneNumberMask(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

/**
 * Parses an initial combined phone string (e.g. "+502 5555-1234" or "55551234")
 * into country code and local formatted number.
 */
export function parseInitialPhone(fullPhone: string): {
  countryCode: string;
  localNumber: string;
} {
  const trimmed = fullPhone.trim();
  for (const country of CENTRAL_AMERICA_COUNTRIES) {
    if (trimmed.startsWith(country.code)) {
      const rest = trimmed.slice(country.code.length).trim();
      return {
        countryCode: country.code,
        localNumber: formatPhoneNumberMask(rest),
      };
    }
  }
  // Default to Guatemala
  return {
    countryCode: '+502',
    localNumber: formatPhoneNumberMask(trimmed),
  };
}

export function PhoneInputWithCountry({
  id = 'phone-input',
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = '5555-1234',
  className = '',
}: PhoneInputWithCountryProps) {
  const parsed = parseInitialPhone(value);
  const [countryCode, setCountryCode] = useState<string>(parsed.countryCode);
  const [localNumber, setLocalNumber] = useState<string>(parsed.localNumber);

  useEffect(() => {
    const next = parseInitialPhone(value);
    setCountryCode(next.countryCode);
    setLocalNumber(next.localNumber);
  }, [value]);

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const combined = localNumber ? `${newCode} ${localNumber}` : '';
    onChange(combined);
  };

  const handleNumberChange = (raw: string) => {
    const formatted = formatPhoneNumberMask(raw);
    setLocalNumber(formatted);
    const combined = formatted ? `${countryCode} ${formatted}` : '';
    onChange(combined);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Country Code Dropdown */}
      <div className="relative shrink-0">
        <select
          value={countryCode}
          disabled={disabled}
          onChange={(e) => handleCountryChange(e.target.value)}
          aria-label="Código de país"
          className="h-10 rounded-xl border border-[var(--border-strong)] bg-canvas px-2.5 py-1.5 font-mono text-xs font-semibold text-[var(--text-primary)] focus:border-primary focus:outline-hidden disabled:opacity-50"
        >
          {CENTRAL_AMERICA_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} ({c.name})
            </option>
          ))}
        </select>
      </div>

      {/* Masked 8-digit Phone Input */}
      <div className="relative flex-1">
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          maxLength={9} // 8 digits + 1 hyphen
          className="h-10 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden disabled:opacity-50"
        />
      </div>
    </div>
  );
}
