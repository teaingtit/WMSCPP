import { getAuditSessions } from '@/actions/audit-actions';
import AuditSessionList from '@/components/audit/AuditSessionList';
import PageHeader from '@/components/ui/PageHeader';

export default async function AuditPage({ params }: { params: { warehouseId: string } }) {
  const sessions = await getAuditSessions(params.warehouseId);
console.log("Audit Sessions Data:", JSON.stringify(sessions, null, 2));
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Audit"
        subtitle="ระบบตรวจนับสินค้าและปรับปรุงยอดสต็อก"
        warehouseId={params.warehouseId}
      />
      <AuditSessionList warehouseId={params.warehouseId} sessions={sessions} />
    </div>
  );
}