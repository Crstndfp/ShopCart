export interface AddressRecord {
  IDAddress: number;
  IDUser: number;
  Alias: string;
  RecipientName: string;
  AddressLine1: string;
  AddressLine2: string | null;
  Municipality: string;
  Department: string;
  PostalCode: string | null;
  ContactPhone: string;
  IsActive: boolean;
}

export interface CreateAddressPayload {
  alias: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string | null;
  municipality: string;
  department: string;
  postalCode?: string | null;
  contactPhone: string;
}

export function formatAddressSummary(addr: {
  AddressLine1?: string;
  AddressLine2?: string | null;
  Municipality?: string;
  Department?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  municipality?: string;
  department?: string;
}): string {
  const line1 = addr.AddressLine1 ?? addr.addressLine1 ?? '';
  const line2 = addr.AddressLine2 ?? addr.addressLine2 ?? null;
  const muni = addr.Municipality ?? addr.municipality ?? '';
  const dept = addr.Department ?? addr.department ?? '';
  const parts = [
    line1,
    line2,
    muni && dept ? `${muni}, ${dept}` : muni || dept,
  ].filter(Boolean);

  return parts.join(' · ');
}
