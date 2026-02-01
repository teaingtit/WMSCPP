/**
 * Inventory Page Helper Utilities
 *
 * Extracted logic from the inventory page for better testability and reusability.
 */

// Maximum number of location IDs to include in a single query
// to avoid oversized requests that may fail
export const MAX_LOCATION_IDS = 2000;

// Dummy UUID used when no locations exist (to satisfy .in() requirements)
export const EMPTY_LOCATION_SENTINEL = '00000000-0000-0000-0000-000000000000';

export interface LocationQueryResult {
  /** Location IDs to use in the stocks query */
  ids: string[];
  /** Whether locations were capped to MAX_LOCATION_IDS */
  wasCapped: boolean;
  /** Original count before capping */
  originalCount: number;
  /** Whether there are no locations at all */
  isEmpty: boolean;
}

/**
 * Prepares location IDs for the stocks query.
 *
 * - Caps at MAX_LOCATION_IDS to avoid oversized requests
 * - Returns a sentinel UUID when empty to satisfy PostgREST .in() requirements
 * - Tracks whether capping occurred for warning display
 *
 * @param locationIds - Raw location IDs from the database
 * @returns Processed location query result with metadata
 */
export function prepareLocationIdsForQuery(locationIds: string[]): LocationQueryResult {
  const originalCount = locationIds.length;
  const isEmpty = originalCount === 0;

  if (isEmpty) {
    return {
      ids: [EMPTY_LOCATION_SENTINEL],
      wasCapped: false,
      originalCount: 0,
      isEmpty: true,
    };
  }

  const wasCapped = originalCount > MAX_LOCATION_IDS;
  const ids = wasCapped ? locationIds.slice(0, MAX_LOCATION_IDS) : locationIds;

  return {
    ids,
    wasCapped,
    originalCount,
    isEmpty: false,
  };
}

/**
 * Error patterns that indicate a headers overflow or fetch failure.
 * These typically occur when Supabase response headers exceed Node's limit (~32KB),
 * often due to large session cookies.
 */
const HEADERS_OVERFLOW_PATTERNS = [
  /headers overflow/i,
  /UND_ERR_HEADERS_OVERFLOW/i,
  /fetch failed/i,
  /ECONNRESET/i,
  /socket hang up/i,
  /network error/i,
  /request aborted/i,
];

/**
 * Detects if an error is related to headers overflow or fetch failure.
 *
 * @param error - Error object or error-like object with message/details
 * @returns true if the error matches headers overflow patterns
 */
export function isHeadersOverflowError(
  error: { message?: string; details?: string } | null | undefined,
): boolean {
  if (!error) return false;

  const message = error.message ?? '';
  const details = error.details ?? '';
  const combined = `${message} ${details}`;

  return HEADERS_OVERFLOW_PATTERNS.some((pattern) => pattern.test(combined));
}

export interface FormattedError {
  message: string;
  details?: string;
  isHeadersOverflow: boolean;
}

/**
 * Formats an error from the inventory loading process.
 *
 * - Extracts message and details from various error shapes
 * - Detects headers overflow for special handling
 *
 * @param err - Unknown error from catch block
 * @returns Formatted error with metadata
 */
export function formatInventoryError(err: unknown): FormattedError {
  let message: string;
  let details: string | undefined;

  if (err instanceof Error) {
    message = err.message;
    // Some errors have a details property - use bracket notation for index access
    const errRecord = err as unknown as Record<string, unknown>;
    details = typeof errRecord['details'] === 'string' ? errRecord['details'] : undefined;
  } else if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    message = typeof errObj['message'] === 'string' ? errObj['message'] : String(err);
    details = typeof errObj['details'] === 'string' ? errObj['details'] : undefined;
  } else {
    message = String(err);
  }

  // Build error info object conditionally to satisfy exactOptionalPropertyTypes
  const errorInfo: { message?: string; details?: string } = { message };
  if (details !== undefined) {
    errorInfo.details = details;
  }
  const isHeadersOverflow = isHeadersOverflowError(errorInfo);

  const result: FormattedError = {
    message,
    isHeadersOverflow,
  };
  if (details !== undefined) {
    result.details = details;
  }
  return result;
}

/**
 * Formats Supabase query error response.
 *
 * @param error - Supabase error object from query result
 * @returns Formatted error with metadata
 */
export function formatSupabaseError(
  error: { message?: string; details?: string; code?: string } | null,
): FormattedError | null {
  if (!error) return null;

  const message = error.message ?? 'Unknown database error';
  const details = typeof error.details === 'string' ? error.details : undefined;

  // Build error info object conditionally to satisfy exactOptionalPropertyTypes
  const errorInfo: { message?: string; details?: string } = { message };
  if (details !== undefined) {
    errorInfo.details = details;
  }
  const isHeadersOverflow = isHeadersOverflowError(errorInfo);

  const result: FormattedError = {
    message,
    isHeadersOverflow,
  };
  if (details !== undefined) {
    result.details = details;
  }
  return result;
}

export interface StockTransformOptions {
  /** Map of attribute keys to their display labels */
  attributeLabelMap: Record<string, string>;
}

/**
 * Transforms raw stock data from database to UI-compatible format.
 *
 * - Maps plural join names (products, locations) to singular (product, location)
 * - Flattens nested properties for easier access
 * - Resolves attribute keys to display labels
 *
 * @param stock - Raw stock record from Supabase
 * @param options - Transform options including attribute label map
 * @returns Transformed stock object for UI components
 */
export function transformStockForUI(
  stock: Record<string, unknown>,
  options: StockTransformOptions,
): Record<string, unknown> {
  const { attributeLabelMap } = options;

  // Resolve attribute keys to display labels
  const resolvedAttributes: Record<string, unknown> = {};
  const rawAttributes = stock['attributes'] as Record<string, unknown> | undefined;

  if (rawAttributes) {
    Object.entries(rawAttributes).forEach(([key, value]) => {
      const label = attributeLabelMap[key] || key;
      resolvedAttributes[label] = value;
    });
  }

  const products = stock['products'] as Record<string, unknown> | undefined;
  const locations = stock['locations'] as Record<string, unknown> | undefined;

  return {
    ...stock,
    id: String(stock['id']),
    // Map plural (DB) to singular (UI Component Expectation)
    product: products,
    location: locations,
    // Flatten nested data to top-level for UI compatibility
    lot: locations?.['lot'],
    cart: locations?.['cart'],
    level: locations?.['level'],
    sku: products?.['sku'],
    name: products?.['name'],
    image_url: products?.['image_url'],
    attributes: resolvedAttributes,
  };
}

/**
 * Builds attribute label map from product categories.
 *
 * @param categories - Array of product categories with form_schema
 * @returns Map of attribute keys to display labels
 */
export function buildAttributeLabelMap(
  categories: Array<{ form_schema?: Array<{ key?: string; label?: string }> }>,
): Record<string, string> {
  const labelMap: Record<string, string> = {};

  categories.forEach((cat) => {
    if (Array.isArray(cat.form_schema)) {
      cat.form_schema.forEach((field) => {
        if (field.key && field.label) {
          labelMap[field.key] = field.label;
        }
      });
    }
  });

  return labelMap;
}
