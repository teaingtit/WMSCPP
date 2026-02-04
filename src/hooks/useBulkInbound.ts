'use client';

import { useState, useCallback } from 'react';
import type { BulkInboundReport } from '@/components/inbound/bulk-inbound-utils';
import {
  buildInboundFormData,
  mapImportResultToReport,
  triggerDownloadFromBase64,
  canDownload,
  canUpload,
} from '@/components/inbound/bulk-inbound-utils';
import { downloadInboundTemplate, importInboundStock } from '@/actions/bulk-import-actions';
import { notify } from '@/lib/ui-helpers';

/** Result type from downloadInboundTemplate action */
export interface DownloadTemplateResult {
  base64?: string | null;
  fileName?: string;
}

/** Result type from importInboundStock action */
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

/** Injectable dependencies for the hook (easy to mock in Vitest) */
export interface BulkInboundDeps {
  downloadTemplate: (warehouseId: string, categoryId: string) => Promise<DownloadTemplateResult>;
  importStock: (formData: FormData) => Promise<ImportInboundResult>;
  notify: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    ok: (res: { success: boolean; message?: string }) => void;
  };
}

export interface UseBulkInboundParams {
  warehouseId: string;
  userId: string;
  /** Optional: inject deps for testing; defaults to real actions and notify */
  deps?: BulkInboundDeps;
}

export interface UseBulkInboundReturn {
  selectedCat: string;
  setSelectedCat: (value: string) => void;
  report: BulkInboundReport | null;
  loading: boolean;
  handleDownload: () => Promise<void>;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearReport: () => void;
}

/**
 * Encapsulates bulk inbound state and handlers.
 * Dependencies are injectable so tests can pass vi.mocked implementations.
 */
export function useBulkInbound({
  warehouseId,
  userId,
  deps,
}: UseBulkInboundParams): UseBulkInboundReturn {
  const [selectedCat, setSelectedCatState] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BulkInboundReport | null>(null);

  const { downloadTemplate, importStock, notify: notifyDeps } = deps ?? getDefaultBulkInboundDeps();

  const setSelectedCat = useCallback((value: string) => {
    setSelectedCatState(value);
    setReport(null);
  }, []);

  const clearReport = useCallback(() => setReport(null), []);

  const handleDownload = useCallback(async () => {
    if (!canDownload(selectedCat)) {
      notifyDeps.error('กรุณาเลือกหมวดหมู่สินค้าก่อน');
      return;
    }
    try {
      setLoading(true);
      const res = await downloadTemplate(warehouseId, selectedCat);
      if (res?.base64) {
        triggerDownloadFromBase64(res.base64, res.fileName ?? 'Inbound_Template.xlsx');
        notifyDeps.success('ดาวน์โหลด Template สำเร็จ');
      } else {
        notifyDeps.error('ไม่สามารถสร้าง Template ได้');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดาวน์โหลด';
      notifyDeps.error(message);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, selectedCat, downloadTemplate, notifyDeps]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!canUpload(selectedCat, file ?? null)) return;

      setLoading(true);
      setReport(null);

      const formData = buildInboundFormData(warehouseId, selectedCat, userId, file!);

      try {
        const res = await importStock(formData);
        if (res.success) {
          notifyDeps.ok(res);
          setReport(mapImportResultToReport(res));
        } else {
          notifyDeps.error('การนำเข้าข้อมูลไม่สำเร็จ');
          setReport(mapImportResultToReport(res));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้า';
        notifyDeps.error(message);
        setReport({ total: 0, failed: 1, errors: [message] });
      } finally {
        setLoading(false);
      }

      e.target.value = '';
    },
    [warehouseId, userId, selectedCat, importStock, notifyDeps],
  );

  return {
    selectedCat,
    setSelectedCat,
    report,
    loading,
    handleDownload,
    handleUpload,
    clearReport,
  };
}

/** Default deps: use module imports (vi.mock in tests replaces these). */
function getDefaultBulkInboundDeps(): BulkInboundDeps {
  return {
    downloadTemplate: downloadInboundTemplate,
    importStock: importInboundStock,
    notify: {
      success: notify.success,
      error: notify.error,
      ok: notify.ok,
    },
  };
}
