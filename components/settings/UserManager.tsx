'use client';

import { useState } from 'react';
import { createUser, deleteUser } from '@/actions/user-actions';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

interface UserManagerProps {
  users: any[];
  warehouses: any[]; // รับรายชื่อคลังมาให้เลือก
}

export default function UserManager({ users, warehouses }: UserManagerProps) {
  const [loading, setLoading] = useState(false);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createUser(formData);
    setLoading(false);
    
    if (result.success) {
      toast.success(result.message);
      // Reset Form (Simple way)
      (document.getElementById('create-user-form') as HTMLFormElement).reset();
    } else {
      toast.error(result.message);
    }
  }

  async function handleDelete(id: string) {
    if(!confirm('ยืนยันที่จะลบผู้ใช้นี้?')) return;
    
    const result = await deleteUser(id);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <div className="space-y-8">
        
      {/* 1. Form สร้าง User */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} className="text-indigo-600"/> เพิ่มผู้ใช้งานใหม่
        </h3>
        
        <form id="create-user-form" action={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="email" type="email" placeholder="Email" required className="border p-2 rounded" />
            <input name="password" type="password" placeholder="Password (min 6 chars)" required className="border p-2 rounded" />
            
           
            <select 
                name="role" 
                aria-label="เลือกบทบาทผู้ใช้งาน"
                className="border p-2 rounded focus:outline-indigo-500 bg-white" 
                defaultValue="staff"
            >    <option value="staff">Staff (Warehouse)</option>
                <option value="admin">Admin (Full Access)</option>
            </select>

            {/* Checkbox เลือกคลัง (แสดงเฉพาะตอนเป็น Staff ก็ได้ แต่เพื่อความง่ายแสดงหมด) */}
            <div className="md:col-span-2 border p-3 rounded bg-slate-50">
                <p className="text-sm text-slate-500 mb-2 font-bold flex items-center gap-1">
                    <Warehouse size={14}/> สิทธิ์เข้าถึงคลัง (สำหรับ Staff)
                </p>
                <div className="flex flex-wrap gap-3">
                    {warehouses.map(wh => (
                        <label key={wh.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="warehouses" value={wh.code} className="rounded text-indigo-600"/>
                            <span className="text-sm">{wh.code} - {wh.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2">
                <Button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? 'Processing...' : '+ Create User'}
                </Button>
            </div>
        </form>
      </div>

      {/* 2. User List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Warehouses</th>
                    <th className="p-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-4 font-medium">{u.email}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                {u.role.toUpperCase()}
                            </span>
                        </td>
                        <td className="p-4 text-slate-500">
                            {u.role === 'admin' ? 'ALL' : u.allowed_warehouses.join(', ') || '-'}
                        </td>
                        <td className="p-4 text-right">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(u.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                             >
                                <Trash2 size={16}/>
                             </Button>
                        </td>
                    </tr>
                ))}
                {users.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">ไม่พบข้อมูลผู้ใช้</td></tr>
                )}
            </tbody>
        </table>
      </div>

    </div>
  );
}