// Report type definitions
export type ReportType = 'INVENTORY_SUMMARY' | 'TRANSACTION_SUMMARY';

// Cron presets for UI
export const CRON_PRESETS = [
  { label: 'ทุกวัน เวลา 8:00', value: '0 8 * * *' },
  { label: 'ทุกวันจันทร์ เวลา 8:00', value: '0 8 * * 1' },
  { label: 'วันที่ 1 ของเดือน เวลา 8:00', value: '0 8 1 * *' },
  { label: 'ทุกวันศุกร์ เวลา 17:00', value: '0 17 * * 5' },
] as const;

// Report type labels in Thai
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  INVENTORY_SUMMARY: 'สรุปสินค้าคงคลัง',
  TRANSACTION_SUMMARY: 'สรุปการเคลื่อนไหวสินค้า',
};
