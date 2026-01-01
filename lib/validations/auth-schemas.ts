// lib/schemas/auth-schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง (เช่น user@wms.com)'),
  password: z
    .string()
    .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
});

export type LoginFormData = z.infer<typeof loginSchema>;