// app/not-found.tsx
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center p-4">
      <div className="bg-card p-8 rounded-3xl shadow-xl border border-border max-w-lg w-full">
        <div className="w-20 h-20 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={40} />
        </div>

        <h2 className="text-2xl font-black text-foreground mb-2">404 - Page Not Found</h2>
        <p className="text-muted-foreground mb-8 font-medium">
          ไม่พบหน้าที่คุณต้องการ หรือคุณอาจไม่มีสิทธิ์เข้าถึงคลังสินค้านี้
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Home size={18} /> กลับไปหน้าเลือกคลัง
        </Link>
      </div>
    </div>
  );
}
