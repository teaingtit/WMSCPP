import { getAuditSessions } from '@/actions/audit-actions';
import AuditSessionList from '@/components/audit/AuditSessionList';
import PageHeader from '@/components/ui/PageHeader';

export default async function AuditPage({ params }: { params: Promise<{ warehouseId: string }> }) {
  const { warehouseId } = await params;
  const sessions = await getAuditSessions(warehouseId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Audit"
        subtitle="ระบบตรวจนับสินค้าและปรับปรุงยอดสต็อก"
        warehouseId={warehouseId}
      />
      <AuditSessionList warehouseId={warehouseId} sessions={sessions} />
    </div>
  );
}
