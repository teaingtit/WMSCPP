/**
 * Pure functions for Bulk Inbound flow.
 * No React, no I/O — easy to unit test with Vitest.
 */

/** Shape of the report state derived from import API response */
export interface BulkInboundReport {
  total: number;
  failed: number;
  errors: string[];
}

/** Minimal type for importInboundStock result (server action response) */
export interface ImportInboundResult {
  success: boolean;
  message?: string;
  report?: {
    total?: number;
    success?: number;
    failed?: number;
    errors?: string[];
  };
}

/** Minimal type for downloadInboundTemplate result */
export interface DownloadTemplateResult {
  base64?: string | null;
  fileName?: string;
}

/**
 * Builds FormData for importInboundStock from known params and file.
 * Pure: no side effects, no async.
 */
export function buildInboundFormData(
  warehouseId: string,
  categoryId: string,
  userId: string,
  file: File,
): FormData {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('warehouseId', warehouseId);
  formData.append('categoryId', categoryId);
  formData.append('userId', userId);
  return formData;
}

/**
 * Maps import API result to UI report state.
 * Pure: no side effects.
 */
export function mapImportResultToReport(result: ImportInboundResult): BulkInboundReport {
  if (result.success) {
    return {
      total: result.report?.total ?? 0,
      failed: 0,
      errors: [],
    };
  }
  return {
    total: result.report?.total ?? 0,
    failed: result.report?.failed ?? 1,
    errors: result.report?.errors?.length
      ? result.report.errors
      : [result.message ?? 'Unknown error'],
  };
}

/**
 * Triggers a browser download from a base64 data URL.
 * Side-effect only; can be replaced in tests with a no-op or mock.
 */
export function triggerDownloadFromBase64(base64: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Returns whether download can proceed (category selected).
 * Pure predicate for validation.
 */
export function canDownload(selectedCategoryId: string): boolean {
  return selectedCategoryId.trim() !== '';
}

/**
 * Returns whether upload can proceed (category selected and file present).
 * Pure predicate for validation.
 */
export function canUpload(selectedCategoryId: string, file: File | null): boolean {
  return selectedCategoryId.trim() !== '' && file != null;
}
