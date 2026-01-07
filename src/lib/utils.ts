import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isValid, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidUUID = (uuid: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export function formatAttributeKey(key: string): string {
  // Common mappings
  const map: Record<string, string> = {
    lot: 'Lot No.',
    batch: 'Batch',
    exp: 'Expiry Date',
    expiry: 'Expiry Date',
    mfg: 'Mfg. Date',
    serial: 'Serial No.',
    sn: 'S/N',
    color: 'Color',
    size: 'Size',
    uom: 'Unit',
    qty: 'Quantity',
    po: 'PO Number',
    so: 'SO Number',
    ref: 'Reference',
    note: 'Note',
    reason: 'Reason',
    location: 'Location',
    supplier: 'Supplier',
    customer: 'Customer',
  };

  if (map[key.toLowerCase()]) {
    return map[key.toLowerCase()];
  }

  // Fallback: snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1') // camelCase to space
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAttributeValue(value: any): string {
  if (value === null || value === undefined) return '-';

  // Check if it's a date string
  if (
    typeof value === 'string' &&
    (value.match(/^\d{4}-\d{2}-\d{2}$/) || value.match(/^\d{4}-\d{2}-\d{2}T/))
  ) {
    const date = parseISO(value);
    if (isValid(date)) {
      return format(date, 'dd MMM yyyy', { locale: th });
    }
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
