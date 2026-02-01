'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSchemaHistory,
  revertToVersion,
  type SchemaVersion,
} from '@/actions/schema-version-actions';
import { Clock, RotateCcw, User, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/ui-helpers';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface SchemaVersionHistoryProps {
  categoryId: string;
  categoryName: string;
}

export default function SchemaVersionHistory({
  categoryId,
  categoryName,
}: SchemaVersionHistoryProps) {
  const [versions, setVersions] = useState<SchemaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const result = await getSchemaHistory(categoryId);
    if (!mountedRef.current) return;
    if (result.success) {
      setVersions(result.data ?? []);
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSchemaHistory(categoryId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setVersions(result.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const handleRevert = async (version: number) => {
    if (
      !confirm(
        `ต้องการย้อนกลับไปใช้ Schema เวอร์ชัน ${version} หรือไม่?\n\nการกระทำนี้จะสร้างเวอร์ชันใหม่ด้วย Schema เดิม`,
      )
    ) {
      return;
    }

    setReverting(version);
    const result = await revertToVersion(categoryId, version);
    setReverting(null);

    if (result.success) {
      notify.ok({ success: true, message: result.message });
      loadHistory(); // Reload to show new version
    } else {
      notify.ok({ success: false, message: result.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <FileText size={48} className="mx-auto mb-4 opacity-50" />
        <p>ยังไม่มีประวัติการเปลี่ยนแปลง Schema</p>
      </div>
    );
  }

  const currentVersion = versions[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <Clock size={18} />
          ประวัติการเปลี่ยนแปลง Schema: {categoryName}
        </h3>
        <p className="text-sm text-indigo-600 mt-1">
          เวอร์ชันปัจจุบัน: v{currentVersion?.version ?? 1} ({versions.length} เวอร์ชันทั้งหมด)
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {versions.map((version, index) => {
          const isCurrent = index === 0;
          const isReverting = reverting === version.version;

          return (
            <div
              key={version.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isCurrent
                  ? 'bg-indigo-50 border-indigo-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-indigo-200'
              }`}
            >
              {/* Version Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    v{version.version}
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                      ปัจจุบัน
                    </span>
                  )}
                </div>

                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevert(version.version)}
                    disabled={isReverting}
                    className="text-xs"
                  >
                    {isReverting ? (
                      <>กำลังย้อนกลับ...</>
                    ) : (
                      <>
                        <RotateCcw size={14} className="mr-1" />
                        ย้อนกลับ
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock size={14} />
                  <span>
                    {formatDistanceToNow(new Date(version.created_at), {
                      addSuffix: true,
                      locale: th,
                    })}
                  </span>
                  <span className="text-slate-400">
                    ({new Date(version.created_at).toLocaleString('th-TH')})
                  </span>
                </div>

                {version.created_by && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} />
                    <span>User ID: {version.created_by.substring(0, 8)}...</span>
                  </div>
                )}

                {version.change_notes && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                    <strong>หมายเหตุ:</strong> {version.change_notes}
                  </div>
                )}
              </div>

              {/* Schema Summary */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  จำนวนฟิลด์: {version.schema.length} ฟิลด์
                  {version.schema.length > 0 && (
                    <span className="ml-2">
                      ({version.schema.filter((f) => f.scope === 'PRODUCT').length} PRODUCT,{' '}
                      {version.schema.filter((f) => f.scope === 'LOT').length} LOT)
                    </span>
                  )}
                </div>
              </div>

              {/* Warning for old versions */}
              {!isCurrent && currentVersion && version.version < currentVersion.version - 5 && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>เวอร์ชันนี้เก่ามาก การย้อนกลับอาจส่งผลกระทบต่อข้อมูลที่มีอยู่</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
