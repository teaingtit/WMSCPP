# my-mcp-server — Postgres MCP server

สรุปสั้น ๆ:
- โค้ดใน `src/index.ts` เป็น MCP (Model Context Protocol) server ที่เชื่อมต่อกับ PostgreSQL และให้ resource + tools ผ่าน stdio

การเตรียมและรัน (local):
1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `DATABASE_URL` ให้ถูกต้อง
2. ติดตั้ง dependencies:

```bash
npm install
```

3. สร้าง build แล้วรัน:

```bash
npm run build
npm start
```

หมายเหตุ: `start` รัน `dist/index.js` (project ใช้ TypeScript)

การทดสอบด้วยคำสั่ง SQL (ตัวอย่าง):
- เครื่องมืออ่าน: ส่งชื่อ tool เป็น `query` และ `sql: "SELECT ..."`
- เครื่องมือแก้ไข (ADMIN): ส่งชื่อ tool เป็น `execute_write_operation` — ระมัดระวัง

การใช้งานร่วมกับ GitHub Copilot (แนวทาง):
1. รัน MCP server ใน workspace (ตามขั้นตอนข้างต้น)
2. ติดตั้งและลงชื่อเข้าใช้งาน GitHub Copilot ใน VS Code
3. Copilot รุ่นที่รองรับ "Local Tools" / Model Context Protocol จะสามารถเรียกใช้ external tools ได้ — โดยทั่วไปคุณต้องเปิดใช้งาน experimental/local-tools ในการตั้งค่า Copilot หรือ Copilot Labs
4. เมื่อตั้งค่าเรียบร้อย Copilot จะเรียก MCP server ที่รันอยู่ (stdin/stdout) เพื่อเข้าถึง resource และ tools ที่เซิร์ฟเวอร์ประกาศ

หมายเหตุสำคัญ:
- ขั้นตอนการเชื่อมต่อกับ Copilot ต่างกันไปตามเวอร์ชันของ extension (Copilot / Copilot Labs / Copilot X). ถ้าต้องการ ผมช่วยตรวจสอบการตั้งค่าของ Copilot ที่คุณใช้อยู่หรือสร้างไฟล์ช่วยกำหนดค่า (เช่น ตัวอย่าง `local-tools` config) ให้ได้
- อย่าเปิด `execute_write_operation` ให้สาธารณะโดยไม่มีการควบคุมสิทธิ์

ต้องการให้ผม:
- สร้างตัวอย่างไฟล์ config สำหรับ Copilot (ถ้าคุณบอกเวอร์ชันของ extension)
- หรือช่วยรันเซิร์ฟเวอร์และลองเรียก `query` ตัวอย่างให้ดู
