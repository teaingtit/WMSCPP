# Unit Tests for WMS Application

This directory contains comprehensive unit tests for all features in the Warehouse Management System (WMS) application.

## Test Structure

```
test/
├── actions/              # Server action tests
│   ├── auth-actions.test.ts
│   ├── inbound-actions.test.ts
│   ├── outbound-actions.test.ts
│   ├── transfer-actions.test.ts
│   ├── warehouse-actions.test.ts
│   ├── audit-actions.test.ts
│   ├── bulk-import-actions.test.ts
│   ├── bulk-import-validation.test.ts
│   ├── bulk-schema-actions.test.ts
│   ├── dashboard-actions.test.ts
│   ├── export-actions.test.ts
│   ├── history-actions.test.ts
│   ├── product-search-actions.test.ts
│   ├── schema-version-actions.test.ts
│   ├── settings-actions.test.ts
│   ├── status-actions.test.ts
│   ├── user-actions.test.ts
│   └── (inventory-actions: covered via inventory page / e2e as needed)
├── database/
│   └── database.test.ts  # DB helpers / queries
├── utils/
│   └── test-helpers.ts   # Test utilities and mocks
├── setup.ts              # Test setup configuration
├── TransferTargetForm.test.tsx
└── TypeError.test.ts
```

## Test Coverage

### Authentication (`auth-actions.test.ts`)

- ✅ Login with valid credentials
- ✅ Login validation (email format, password requirements)
- ✅ Invalid login credentials handling
- ✅ Connection error handling
- ✅ Logout functionality

### Inbound Operations (`inbound-actions.test.ts`)

- ✅ Fetch product categories
- ✅ Fetch category details
- ✅ Fetch inbound options
- ✅ Fetch warehouse lots, carts, and levels
- ✅ Submit inbound transaction
- ✅ Location validation
- ✅ Product validation
- ✅ Quantity validation
- ✅ Bulk inbound operations

### Outbound Operations (`outbound-actions.test.ts`)

- ✅ Search stock for outbound
- ✅ Submit outbound transaction
- ✅ Quantity validation
- ✅ Stock availability checks
- ✅ Status restriction checks
- ✅ Bulk outbound operations

### Transfer Operations (`transfer-actions.test.ts`)

- ✅ Get stock by ID
- ✅ Search stock for transfer
- ✅ Internal transfer
- ✅ Cross-warehouse transfer
- ✅ Transfer validation (same location, status restrictions)
- ✅ Bulk transfer operations
- ✅ Preflight validation

### Warehouse Management (`warehouse-actions.test.ts`)

- ✅ Fetch active warehouses
- ✅ Warehouse listing

### Audit Operations (`audit-actions.test.ts`)

- ✅ Create audit session
- ✅ Duplicate session name validation
- ✅ Fetch inventory items
- ✅ Fetch audit sessions
- ✅ Fetch audit items
- ✅ Update audit item count
- ✅ Negative count validation
- ✅ Closed session validation
- ✅ Finalize audit session
- ✅ Update audit session

### Bulk Import (`bulk-import-actions.test.ts`)

- ✅ Download master templates (category, product)
- ✅ Download inbound template
- ✅ Import master data (category, product)
- ✅ Import inbound stock
- ✅ Permission validation
- ✅ Template validation
- ✅ Warehouse validation

### Export Operations (`export-actions.test.ts`)

- ✅ Export inventory to Excel
- ✅ Warehouse code lookup
- ✅ Error handling (warehouse not found, no stock)
- ✅ Excel file generation

### Dashboard (`dashboard-actions.test.ts`)

- ✅ Get dashboard warehouses (admin, staff roles)
- ✅ Get dashboard statistics
- ✅ Warehouse filtering by role
- ✅ Error handling

### History (`history-actions.test.ts`)

- ✅ Fetch transaction history (simple mode)
- ✅ Filter by transaction type
- ✅ Warehouse validation
- ✅ Error handling

### Product Search (`product-search-actions.test.ts`)

- ✅ Search products by query
- ✅ Warehouse and category filtering

### Schema Version (`schema-version-actions.test.ts`)

- ✅ Get next schema version
- ✅ Schema version handling for categories

### Bulk Schema (`bulk-schema-actions.test.ts`)

- ✅ Bulk schema operations and validation

### Settings (`settings-actions.test.ts`)

- ✅ Get warehouses, categories, products
- ✅ Create product
- ✅ Delete product (soft delete with stock check)
- ✅ Create warehouse
- ✅ Create category
- ✅ Delete category
- ✅ Update category units
- ✅ Add/remove units from category
- ✅ Duplicate validation

### Status Management (`status-actions.test.ts`)

- ✅ Get status definitions
- ✅ Get default status
- ✅ Create status definition
- ✅ Update status definition
- ✅ Delete status definition (with usage check)
- ✅ Apply entity status
- ✅ Remove entity status
- ✅ Get inventory status data
- ✅ Get lot statuses

### User Management (`user-actions.test.ts`)

- ✅ Get users (admin only)
- ✅ Create user (with password, email invite)
- ✅ Delete user (soft/hard delete based on history)
- ✅ Reactivate user
- ✅ Permission validation
- ✅ Self-deletion prevention

### Database (`database/database.test.ts`)

- ✅ DB helpers and query behavior (as applicable)

## Running Tests

```bash
# Run all tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run tests with coverage
npm run test:unit:coverage

# Run specific test file (single run)
npm run test:unit:run -- test/actions/auth-actions.test.ts

# Run in watch mode
npm run test:unit -- test/actions/auth-actions.test.ts
```

## Test Utilities

The `test/utils/test-helpers.ts` file provides:

- `createMockSupabaseClient()` - Creates a mocked Supabase client
- `createMockUser()` - Creates a mock user object
- `createMockFormData()` - Creates a mock FormData object
- `mockNextNavigation()` - Mocks Next.js navigation functions

## Mocking Strategy

All tests use mocks for:

- **Supabase Client**: Mocked to avoid actual database calls
- **Next.js Navigation**: `redirect`, `revalidatePath` are mocked
- **Authentication**: User authentication is mocked
- **File Operations**: Excel file operations are mocked

## Test Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies are mocked to ensure fast, reliable tests
3. **Coverage**: Tests cover both success and error scenarios
4. **Validation**: Input validation is thoroughly tested
5. **Edge Cases**: Edge cases like empty arrays, null values, and errors are tested

## Notes

- Tests use Vitest as the test runner
- React Testing Library is used for component tests
- All server actions are tested with mocked Supabase clients
- Error scenarios are tested to ensure proper error handling
- Permission checks are validated in relevant tests
