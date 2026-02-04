import { getHistory } from '@/actions/history-actions';
import { HistoryMode, HistoryFilter, TransactionEntry } from '@/types/history';
import { History, ArrowRight, ArrowLeft, RefreshCw, User, GitCommit } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import HistoryFilterBar from '@/components/history/HistoryFilterBar';
import TerminalLogView from '@/components/history/TerminalLogView';
import { formatAttributeKey, formatAttributeValue } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ warehouseId: string }>;
  searchParams: Promise<{
    mode?: string;
    q?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const { warehouseId } = await params;
  const resolved = await searchParams;
  const mode = (resolved.mode === 'detailed' ? 'detailed' : 'simple') as HistoryMode;

  const filter: HistoryFilter = {};
  if (resolved.q) filter.search = resolved.q;
  if (resolved.type) filter.type = resolved.type;
  if (resolved.startDate) filter.startDate = resolved.startDate;
  if (resolved.endDate) filter.endDate = resolved.endDate;

  // Fetch data
  const logs = await getHistory(warehouseId, 100, mode, filter);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <History className="text-indigo-600" />
            ประวัติการทำรายการ (Audit Log)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Warehouse: <span className="font-bold text-indigo-600">{warehouseId}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Entries Found
          </div>
          <div className="text-3xl font-black text-slate-800">{logs.length}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <HistoryFilterBar />

      {/* Content */}
      {mode === 'detailed' ? (
        <TerminalLogView logs={logs} />
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table data-stack="true" className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-bold border-b border-border uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Date/Time</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Product Detail</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Route / Details</th>
                  <th className="px-6 py-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <History size={24} className="opacity-30" />
                        </div>
                        <p>ไม่พบรายการที่ค้นหา ({mode} mode)</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs
                    .filter((l) => l.category === 'TRANSACTION')
                    .map((log) => {
                      const tx = log as TransactionEntry;
                      return (
                        <tr key={tx.id} className="hover:bg-accent/80 transition-colors">
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            <div className="font-medium text-foreground">
                              {format(new Date(tx.date), 'dd MMM yyyy', { locale: th })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(tx.date), 'HH:mm:ss')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                tx.type === 'INBOUND'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : tx.type === 'OUTBOUND'
                                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                                  : tx.type === 'TRANSFER' || tx.type === 'TRANSFER_OUT'
                                  ? 'bg-orange-50 text-orange-600 border-orange-100'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {tx.type === 'INBOUND' && <ArrowRight size={10} />}
                              {tx.type === 'OUTBOUND' && <ArrowLeft size={10} />}
                              {(tx.type === 'TRANSFER' || tx.type === 'TRANSFER_OUT') && (
                                <RefreshCw size={10} />
                              )}
                              {(tx.type === 'ADJUST' || tx.type === 'AUDIT') && (
                                <GitCommit size={10} />
                              )}
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground">{tx.product}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <div className="font-mono text-xs text-muted-foreground bg-muted inline-block px-1 rounded">
                                {tx.sku}
                              </div>
                              {tx.attributes &&
                                Object.entries(tx.attributes).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="text-xs font-mono px-1 rounded bg-amber-50 text-amber-700 border border-amber-100 flex items-center"
                                  >
                                    <span className="opacity-70 mr-1">
                                      {formatAttributeKey(key)}:
                                    </span>
                                    <span className="font-semibold">
                                      {formatAttributeValue(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-foreground text-base">
                              {Number(tx.quantity).toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">{tx.uom}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span
                                className="text-muted-foreground max-w-[120px] truncate"
                                title={tx.from}
                              >
                                {tx.from}
                              </span>
                              <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                              <span
                                className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded max-w-[120px] truncate"
                                title={tx.to}
                              >
                                {tx.to}
                              </span>
                            </div>
                            {mode === 'simple' &&
                              tx.details &&
                              tx.details !== tx.from &&
                              tx.details !== tx.to && (
                                <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                  {tx.details}
                                </div>
                              )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <User size={12} />
                              </div>
                              <span
                                className="text-xs text-muted-foreground truncate max-w-[100px]"
                                title={tx.user}
                              >
                                {tx.user.split('@')[0]}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
