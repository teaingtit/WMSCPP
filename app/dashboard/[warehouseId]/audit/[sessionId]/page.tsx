import { getAuditItems, getAuditSessionById } from '@/actions/audit-actions';
import CountingInterface from '@/components/audit/CountingInterface';
import VarianceReport from '@/components/audit/VarianceReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AuditDetailPage({ 
  params, 
  searchParams 
}: { 
  params: { warehouseId: string; sessionId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Fetch both items and session details concurrently for better performance
  const [items, session] = await Promise.all([
    getAuditItems(params.sessionId),
    getAuditSessionById(params.sessionId)
  ]);

  // If session is not found, render a 404 page
  if (!session) {
    notFound();
  }

  const isFinalized = session.status === 'FINALIZED';
  
  // Determine default tab: Default to 'review' unless 'counting' is explicitly requested
  const tabParam = searchParams?.tab;
  const defaultTab = (tabParam === 'counting' && !isFinalized) ? 'counting' : 'review';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/${params.warehouseId}/audit`} className="p-2 rounded-md hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-slate-500">สถานะ: <span className={`font-semibold ${isFinalized ? 'text-slate-600' : 'text-green-600'}`}>{session.status}</span></p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="counting" disabled={isFinalized}>1. Counting (โหมดตรวจนับ)</TabsTrigger>
          <TabsTrigger value="review">2. Review & Adjust (สรุปผลต่าง)</TabsTrigger>
        </TabsList>
        <TabsContent value="counting" className="mt-4 bg-white p-6 rounded-lg shadow-sm border">
          <CountingInterface items={items} sessionId={params.sessionId} />
        </TabsContent>
        <TabsContent value="review" className="mt-4 bg-white p-6 rounded-lg shadow-sm border">
          <VarianceReport items={items} sessionId={params.sessionId} warehouseId={params.warehouseId} isFinalized={isFinalized} />
        </TabsContent>
      </Tabs>
    </div>
  );
}