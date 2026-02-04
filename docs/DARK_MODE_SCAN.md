# Dark Mode Scan – Uncovered Components

Components and pages that still use hardcoded light-only styles (`bg-white`, `bg-slate-50`, `text-slate-7/8/900`, `border-slate-200`, etc.) and need theme-aware classes for dark mode.

## Replacement guide (quick reference)

| Light-only                                             | Theme-aware (light + dark)            |
| ------------------------------------------------------ | ------------------------------------- |
| `bg-white`                                             | `bg-card` or `bg-background`          |
| `bg-slate-50`                                          | `bg-muted` or `bg-card`               |
| `bg-slate-100`                                         | `bg-muted`                            |
| `text-slate-700` / `text-slate-800` / `text-slate-900` | `text-foreground`                     |
| `text-slate-500` / `text-slate-600`                    | `text-muted-foreground`               |
| `border-slate-200` / `border-slate-100`                | `border-border`                       |
| `hover:bg-slate-50` / `hover:bg-slate-100`             | `hover:bg-accent` or `hover:bg-muted` |

---

## Already fixed (this session)

- Dashboard layout, warehouse layout, settings layout
- WarehouseHeader, TopNav
- Dashboard page section header
- **SearchInput** – input + clear button (bg-muted, border-border, text-foreground, hover:bg-accent)
- **LoginForm** – labels, Input, footer text (text-muted-foreground, bg-muted, border-border)
- **not-found.tsx** – page bg, card, icon, heading, link (bg-background, bg-card, bg-primary)
- **BaseCartDrawer** – panel bg-card, header/footer border-border, content bg-muted/30, close hover
- **AuditLoadingSkeleton** – all skeleton blocks (bg-card, bg-muted, border-border)
- **TransactionConfirmModal** – modal container, secondary button (bg-card, border-border, text-foreground)

---

## High priority (user-facing, shared) – remaining

- **StockStatusCard** – cards, table row hover, footer
- **LocationSelector** – select bg/border
- **PaginationControls** – button bg/border/text

---

## Inventory & stock

- **InventoryCard** – card, borders, badge
- **StockDetailModal** – multiple panels, inputs, borders
- **StockItemCard**, **StockItemCardV2**, **StockPositionGroup**, **StockLotSection**, **StockLotSectionV2**
- **InventoryCheckbox**, **InventoryDashboard**
- **CartDrawer**, **LotStatusModal**, **StockQuantityList**
- **StatusTab**, **NotesTab**, **HistoryTab**, **StatusAndNotesModal**
- **BulkOutboundModal**, **BulkTransferModal**

---

## Transfer

- **TransferSourceSelector** – container, input, list, row hover
- **TransferTargetForm** – many panels (bg-slate-50, bg-white, border-slate-\*)

---

## Inbound / outbound

- **BulkInboundManager** – container, form area, input
- **DynamicInboundForm**, **ProductAutocomplete**
- **outbound/page.tsx** – sections, inputs, queue list

---

## Audit

- **audit/[sessionId]/page.tsx** – buttons, input, table, empty state
- **AuditSessionList**, **CountingInterface**, **VarianceReport**

---

## Settings

- **CategoryManager** – sticky headers, list cards, borders
- **SchemaVersionHistory**, **SchemaBuilder**, **SchemaFieldCard**
- **SettingsTabs** – select, TabsList
- **ProductManager**, **UserManager**, **StatusManager**, **UnitsBuilder**
- **VisualSchemaDesigner**, **EffectSelector**, **BulkSchemaEditor**
- **CategoryForm**, **EditCategoryForm**, **FieldPropertyPanel**, **FieldPalette**
- **WarehouseList**, **DimensionConfig**, **WarehouseManager**

---

## Other

- **TerminalLogView** – empty state
- **HistoryFilterBar** – input/select
- **History page** – table row hover
- **SuccessReceiptModal**, **NotesManager**
- **ActionMenu** – (partially has dark:)
- **AsyncSelect**, **BottomSheet**, **FloatingActionButton**, **ExportButton**
- **Breadcrumb**, **MobileNav**
- **dashboard/not-found.tsx**, **dashboard/[warehouseId]/not-found.tsx**
- **global-error.tsx** (has some dark: already)
