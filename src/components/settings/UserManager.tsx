'use client';

import { useState, useRef } from 'react';
import { createUser, deleteUser, reactivateUser } from '@/actions/user-actions';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Warehouse, Mail, Lock, Unlock, RefreshCw, User } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';

interface UserManagerProps {
  users: any[];
  warehouses: any[]; // รับรายชื่อคลังมาให้เลือก
}

export default function UserManager({ users, warehouses }: UserManagerProps) {
  const loading = false;
  const [inviteMode, setInviteMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { setIsLoading } = useGlobalLoading();

  async function handleCreate(formData: FormData) {
    setIsLoading(true);
    try {
      if (inviteMode) {
        formData.set('verify_email', 'on');
      }

      const result = await createUser(null, formData);
      notify.ok(result);
      if (result.success) {
        formRef.current?.reset();
        setInviteMode(false);
      }
    } catch (err: any) {
      notify.error(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ยืนยันที่จะระงับ/ลบผู้ใช้นี้?')) return;
    setIsLoading(true);
    try {
      const result = await deleteUser(id);
      notify.ok(result);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReactivate(id: string) {
    if (!confirm('ยืนยันที่จะเปิดใช้งานผู้ใช้นี้อีกครั้ง?')) return;
    setIsLoading(true);
    try {
      const result = await reactivateUser(id);
      notify.ok(result);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. Form สร้าง User */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Users className="text-indigo-600" size={20} /> เพิ่มผู้ใช้งานใหม่
        </h3>

        <form ref={formRef} action={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name Fields */}
          <div className="md:col-span-1">
            <label htmlFor="first_name" className="block text-xs font-bold text-slate-500 mb-1">
              ชื่อจริง (First Name)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="สมชาย"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <label htmlFor="last_name" className="block text-xs font-bold text-slate-500 mb-1">
              นามสกุล (Last Name)
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="ใจดี"
            />
          </div>

          {/* Email */}
          <div className="md:col-span-1">
            <label htmlFor="email" className="block text-xs font-bold text-slate-500 mb-1">
              อีเมล (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="user@example.com"
              />
            </div>
          </div>

          {/* Role */}
          <div className="md:col-span-1">
            <label htmlFor="role" className="block text-xs font-bold text-slate-500 mb-1">
              บทบาท (Role)
            </label>
            <select
              id="role"
              name="role"
              aria-label="เลือกบทบาท"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="staff">Staff (พนักงานคลัง)</option>
              <option value="manager">Manager (ผู้จัดการ)</option>
              <option value="admin">Admin (ผู้ดูแลระบบ)</option>
            </select>
          </div>

          {/* Password Section */}
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="verify_email"
                name="verify_email"
                checked={inviteMode}
                onChange={(e) => setInviteMode(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="verify_email"
                className="text-sm font-bold text-slate-700 cursor-pointer select-none"
              >
                ส่งอีเมลเชิญ (ให้ User ตั้งรหัสผ่านเอง)
              </label>
            </div>

            {!inviteMode && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label htmlFor="password" className="block text-xs font-bold text-slate-500 mb-1">
                  กำหนดรหัสผ่าน (Password)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required={!inviteMode}
                  minLength={6}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="ตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  * หากไม่เลือกส่งอีเมล Admin ต้องแจ้งรหัสผ่านนี้ให้ผู้ใช้ทราบ
                </p>
              </div>
            )}

            {inviteMode && (
              <div className="text-sm text-indigo-600 flex items-center gap-2 animate-in fade-in">
                <Mail size={16} /> ระบบจะส่งลิงก์ยืนยันตัวตนไปยังอีเมลที่ระบุ
              </div>
            )}
          </div>

          {/* Warehouses */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2">
              <Warehouse size={14} /> คลังสินค้าที่เข้าถึงได้ (สำหรับ Staff)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {warehouses.map((wh) => (
                <label
                  key={wh.id}
                  className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    name="warehouses"
                    value={wh.code}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{wh.code}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Button
              disabled={loading}
              className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200"
            >
              {loading ? (
                <RefreshCw className="animate-spin" />
              ) : inviteMode ? (
                'ส่งคำเชิญ'
              ) : (
                'สร้างผู้ใช้'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. User List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">รายชื่อผู้ใช้งาน ({users.length})</h3>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table data-stack="true" className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-4">ชื่อ / อีเมล</th>
                <th className="p-4">บทบาท</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">คลังสินค้า</th>
                <th className="p-4 text-right">ดําเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isBanned = u.is_banned || !u.is_active;
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isBanned ? 'bg-red-50/50 grayscale-[0.5]' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                            isBanned ? 'bg-slate-400' : 'bg-indigo-500'
                          }`}
                        >
                          {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">
                            {u.full_name || u.email.split('@')[0]}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'manager'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin'
                          ? 'ผู้ดูแลระบบ'
                          : u.role === 'manager'
                          ? 'ผู้จัดการ'
                          : 'พนักงาน'}
                      </span>
                    </td>
                    <td className="p-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600">
                          <Lock size={12} /> ระงับการใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-600">
                          ใช้งานอยู่
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {u.role === 'admin' ? 'ทุกคลัง' : u.allowed_warehouses.join(', ') || '-'}
                    </td>
                    <td className="p-4 text-right">
                      {isBanned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(u.id)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 font-bold"
                          title="เปิดใช้งานอีกครั้ง"
                        >
                          <Unlock size={16} /> เปิดใช้งานคืน
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ระงับการใช้งาน / ลบ"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
