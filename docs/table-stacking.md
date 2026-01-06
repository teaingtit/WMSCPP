# แนวทางการใช้ `data-stack="true"`

ไฟล์นี้อธิบายเมื่อใดและอย่างไรที่ควรเพิ่มแอตทริบิวต์ `data-stack="true"` ให้กับตาราง เพื่อให้ `TableStacker` แปลงตารางเป็นการ์ดสำหรับหน้าจอเล็ก

## วัตถุประสงค์

- ทำให้ตารางกว้าง (หลายคอลัมน์) อ่านได้บนมือถือ โดยแปลงแต่ละแถวเป็นการ์ดที่มีหัว (header) และรายการ label/value

## ควรใส่ `data-stack="true"` เมื่อ

- ตารางเป็นตารางข้อมูลอ่านอย่างเดียว (read-only) หรือไม่มีการจัดการคัดเลือกหลายแถว (multi-row selection)
- ตารางมีหลายคอลัมน์ที่ทำให้เกิด horizontal scroll บนมือถือ
- แต่ละแถวมีค่าที่สำคัญชัดเจนในคอลัมน์แรก (จะกลายเป็นหัวการ์ด)
- ต้องการแสดงข้อมูลแบบ vertical list บนมือถือ เพื่อความสะดวกในการอ่านและการสแกนข้อมูล

## ไม่ควรใส่เมื่อ

- ตารางเป็น interactive grid ที่ต้องการ sorting/selection/inline-editing ที่ซับซ้อน — ควรออกแบบ view แยกสำหรับมือถือ
- มีปุ่มหรือ control ในแต่ละ cell ที่ต้องการพื้นที่หรือ behavior เฉพาะ (เช่น drag/drop, inline forms)

## แนวปฏิบัติที่ดี

- ถ้าเป็นไปได้ ให้กำหนด `caption` หรือ `aria-label` บนตารางเพื่อให้ `TableStacker` สามารถตั้ง `aria-label` ให้กับกลุ่มการ์ดได้
- คอลัมน์แรกของตารางจะถูกใช้เป็นหัวการ์ด — ให้แน่ใจว่าคอลัมน์นี้มีข้อความสรุปเพียงพอ
- หลีกเลี่ยงการใส่ HTML interactive ซ้อนใน cell (เช่น complex controls) ที่อาจไม่ทำงานดีเมื่อถูกแปลงเป็นการ์ด
- ทดสอบ keyboard navigation และ screen reader หลังแปลง (TableStacker จะเพิ่ม `role="list"` / `role="listitem"` และ `tabindex="0"` ให้การ์ด)

## ตัวอย่าง (JSX)

ตารางที่ใช้คอมโพเนนต์ `Table` (ไม่ต้องเปลี่ยน, ใส่แอตทริบิวต์ที่เรียกใช้คอมโพเนนต์แทน):

```tsx
// ถ้าใช้ `Table` component
<Table data-stack="true" aria-label="รายการสินค้า">
  <TableHeader>
    <TableRow>
      <TableHead>ชื่อสินค้า</TableHead>
      <TableHead>ตำแหน่ง</TableHead>
      <TableHead className="text-right">จำนวน</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((it) => (
      <TableRow key={it.id}>
        <TableCell>{it.name}</TableCell>
        <TableCell>{it.location}</TableCell>
        <TableCell className="text-right">{it.qty}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

หรือถ้าใช้ raw `<table>`:

```tsx
<table data-stack="true" aria-label="ประวัติการเคลื่อนไหว">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

## การทดสอบ

- รัน TypeScript และ unit tests:

```bash
npx tsc --noEmit
npm run test:unit
```

- ตรวจสอบพฤติกรรมบนมือถือด้วย Playwright หรือ DevTools (responsive emulation):

```bash
npx playwright test --project=chromium
```

หรือเปิดหน้าในเบราว์เซอร์แล้วสลับเป็น responsive/mobile ด้วย DevTools

## หมายเหตุสำหรับทีม

- การใส่ `data-stack="true"` เป็นการตัดสินใจเชิง UX — ถ้าตารางมีการโต้ตอบซับซ้อน ให้ออกแบบ view สำหรับมือถือโดยเฉพาะแทนการแปลงอัตโนมัติ
- ถ้าต้องการให้ `TableStacker` ปรับพฤติกรรมสำหรับตารางใด ๆ เพิ่มเติม (เช่น กำหนด field เป็น header อื่น) แจ้งผมเพื่อเพิ่ม small API (data attributes) และตัวอย่างการใช้งาน

---

ไฟล์นี้ถูกสร้างเพื่อเป็นแนวทางสั้น ๆ — ผมสามารถขยายเป็นไฟล์ README ภาษาอังกฤษ/ไทยพร้อมตัวอย่าง UI snapshot ได้ถ้าต้องการ
