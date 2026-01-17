/**
 * Location Helper Utilities
 * Provides backward compatibility and helper functions for the new hierarchical location system
 */

import { Location, LocationDisplay } from '@/types/inventory';

/**
 * Get legacy location fields for backward compatibility
 * Maps new structure (zone/aisle/bin_code) to old structure (lot/cart/level)
 */
export function getLegacyLocationFields(location: Location) {
  return {
    lot: location.zone || location.attributes?.['lot'] || null,
    cart: location.aisle || location.attributes?.['cart'] || null,
    level: location.bin_code || location.attributes?.['level'] || null,
  };
}

/**
 * Build human-readable location path
 * Example: "Zone A > Aisle 1 > Bin L1"
 */
export function buildLocationDisplayPath(location: Location): string {
  const parts = [];
  if (location.zone) parts.push(`Zone ${location.zone}`);
  if (location.aisle) parts.push(`Aisle ${location.aisle}`);
  if (location.bin_code) parts.push(`Bin ${location.bin_code}`);
  return parts.join(' > ') || location.code;
}

/**
 * Convert Location to LocationDisplay for UI
 */
export function toLocationDisplay(location: Location): LocationDisplay {
  return {
    id: location.id,
    code: location.code,
    fullPath: buildLocationDisplayPath(location),
    depth: location.depth,
    zone: location.zone ?? undefined,
    aisle: location.aisle ?? undefined,
    bin_code: location.bin_code ?? undefined,
  };
}

/**
 * Get location type label based on depth
 */
export function getLocationTypeLabel(depth: number): string {
  switch (depth) {
    case 0:
      return 'Zone';
    case 1:
      return 'Aisle';
    case 2:
      return 'Bin';
    default:
      return 'Unknown';
  }
}

/**
 * Get location icon based on depth
 */
export function getLocationIcon(depth: number): string {
  switch (depth) {
    case 0:
      return 'grid-3x3'; // Zone
    case 1:
      return 'arrow-right'; // Aisle
    case 2:
      return 'package'; // Bin
    default:
      return 'map-pin';
  }
}

/**
 * Validate location hierarchy
 * Returns error message if invalid, null if valid
 */
export function validateLocationHierarchy(location: Partial<Location>): string | null {
  const { depth, parent_id, zone, aisle, bin_code } = location;

  if (depth === 0) {
    if (parent_id) return 'Zone (depth 0) cannot have parent';
    if (!zone) return 'Zone must have zone code';
  } else if (depth === 1) {
    if (!parent_id) return 'Aisle (depth 1) must have parent Zone';
    if (!aisle) return 'Aisle must have aisle code';
  } else if (depth === 2) {
    if (!parent_id) return 'Bin (depth 2) must have parent Aisle';
    if (!bin_code) return 'Bin must have bin_code';
  }

  return null;
}

/**
 * Build location code suggestion based on hierarchy
 */
export function suggestLocationCode(
  depth: number,
  zone?: string,
  aisle?: string,
  bin_code?: string,
): string {
  if (depth === 0 && zone) return `ZONE-${zone}`;
  if (depth === 1 && zone && aisle) return `${zone}-${aisle}`;
  if (depth === 2 && zone && aisle && bin_code) return `${zone}-${aisle}-${bin_code}`;
  return '';
}

/**
 * Parse location path to extract components
 * Example: "/A/A1/A1-L1/" -> { zone: "A", aisle: "A1", bin: "A1-L1" }
 */
export function parseLocationPath(path: string): {
  zone?: string | undefined;
  aisle?: string | undefined;
  bin?: string | undefined;
} {
  const parts = path.split('/').filter(Boolean);
  return {
    zone: parts[0] ?? undefined,
    aisle: parts[1] ?? undefined,
    bin: parts[2] ?? undefined,
  };
}
