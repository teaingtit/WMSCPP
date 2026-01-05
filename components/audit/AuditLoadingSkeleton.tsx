import React from 'react';

export default function AuditLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto pb-20 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-12 w-full sm:w-48 bg-slate-200 rounded-xl animate-pulse" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="h-16 w-full bg-white rounded-2xl border border-slate-200 mb-6 p-4 flex items-center">
        <div className="h-10 w-full max-w-md bg-slate-100 rounded-xl animate-pulse" />
      </div>

      {/* Dashboard Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-2 w-full bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs & List Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-[400px] bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
