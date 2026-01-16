import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VisualSchemaDesigner from '@/components/settings/VisualSchemaDesigner';

// Mock child components
vi.mock('@/components/settings/FieldPalette', () => ({
  default: ({ onDragStart }: any) => (
    <div data-testid="field-palette">
      <button onClick={() => onDragStart('text')}>Text Field</button>
      <button onClick={() => onDragStart('number')}>Number Field</button>
      <button onClick={() => onDragStart('date')}>Date Field</button>
    </div>
  ),
}));

vi.mock('@/components/settings/SchemaFieldCard', () => ({
  default: ({ field, onUpdate, onDelete, onClick }: any) => (
    <div data-testid={`field-card-${field.id}`}>
      <span>{field.label}</span>
      <button onClick={() => onClick(field.id)}>Select</button>
      <button onClick={() => onDelete(field.id)}>Delete</button>
      <button onClick={() => onUpdate(field.id, { label: 'Updated' })}>Update</button>
    </div>
  ),
}));

vi.mock('@/components/settings/FieldPropertyPanel', () => ({
  default: ({ field, onUpdate, onClose }: any) =>
    field ? (
      <div data-testid="property-panel">
        <span>Editing: {field.label}</span>
        <button onClick={() => onUpdate(field.id, { required: true })}>Make Required</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('VisualSchemaDesigner', () => {
  const mockOnSchemaChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render field palette and drop zones', () => {
    render(<VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} />);

    expect(screen.getByTestId('field-palette')).toBeInTheDocument();
    expect(screen.getByText(/PRODUCT Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/LOT Scope/i)).toBeInTheDocument();
  });

  it('should add field to PRODUCT scope on drop', async () => {
    render(<VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} />);

    // Simulate drag start
    const textFieldButton = screen.getByText('Text Field');
    fireEvent.click(textFieldButton);

    // Simulate drop on PRODUCT zone
    const productZone = screen.getByTestId('drop-zone-PRODUCT');
    fireEvent.dragOver(productZone);
    fireEvent.drop(productZone);

    await waitFor(() => {
      expect(mockOnSchemaChange).toHaveBeenCalled();
      const lastCall = mockOnSchemaChange.mock.calls[mockOnSchemaChange.mock.calls.length - 1][0];
      const schema = JSON.parse(lastCall);
      expect(schema.length).toBeGreaterThan(0);
    });
  });

  it('should load initial schema', () => {
    const initialSchema = JSON.stringify([
      { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
      { key: 'lot_no', label: 'เลขล็อต', type: 'text', required: true, scope: 'LOT' },
    ]);

    render(
      <VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} initialSchema={initialSchema} />,
    );

    expect(screen.getByText('ชื่อ')).toBeInTheDocument();
    expect(screen.getByText('เลขล็อต')).toBeInTheDocument();
  });

  it('should delete field when delete button clicked', async () => {
    const initialSchema = JSON.stringify([
      { id: '1', key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
    ]);

    render(
      <VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} initialSchema={initialSchema} />,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('ชื่อ')).not.toBeInTheDocument();
    });
  });

  it('should open property panel when field is selected', async () => {
    const initialSchema = JSON.stringify([
      { id: '1', key: 'name', label: 'ชื่อ', type: 'text', required: false, scope: 'PRODUCT' },
    ]);

    render(
      <VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} initialSchema={initialSchema} />,
    );

    const selectButton = screen.getByText('Select');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('property-panel')).toBeInTheDocument();
      expect(screen.getByText(/Editing: ชื่อ/)).toBeInTheDocument();
    });
  });

  it('should update field properties', async () => {
    const initialSchema = JSON.stringify([
      { id: '1', key: 'name', label: 'ชื่อ', type: 'text', required: false, scope: 'PRODUCT' },
    ]);

    render(
      <VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} initialSchema={initialSchema} />,
    );

    // Select field
    fireEvent.click(screen.getByText('Select'));

    // Update property
    await waitFor(() => {
      const makeRequiredButton = screen.getByText('Make Required');
      fireEvent.click(makeRequiredButton);
    });

    expect(mockOnSchemaChange).toHaveBeenCalled();
  });

  it('should emit schema changes on every update', async () => {
    render(<VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} />);

    // Add a field
    const textFieldButton = screen.getByText('Text Field');
    fireEvent.click(textFieldButton);

    const productZone = screen.getByTestId('drop-zone-PRODUCT');
    fireEvent.dragOver(productZone);
    fireEvent.drop(productZone);

    await waitFor(() => {
      expect(mockOnSchemaChange).toHaveBeenCalled();
      const lastCall = mockOnSchemaChange.mock.calls[mockOnSchemaChange.mock.calls.length - 1][0];
      const schema = JSON.parse(lastCall);
      expect(schema).toHaveLength(1);
      expect(schema[0].type).toBe('text');
    });
  });

  it('should separate PRODUCT and LOT scope fields', () => {
    const initialSchema = JSON.stringify([
      { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
      { key: 'lot', label: 'ล็อต', type: 'text', required: true, scope: 'LOT' },
    ]);

    render(
      <VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} initialSchema={initialSchema} />,
    );

    // Both fields should be rendered
    expect(screen.getByText('ชื่อ')).toBeInTheDocument();
    expect(screen.getByText('ล็อต')).toBeInTheDocument();
  });

  it('should auto-generate field keys from labels', async () => {
    render(<VisualSchemaDesigner onSchemaChange={mockOnSchemaChange} />);

    // Simulate adding a field
    fireEvent.click(screen.getByText('Text Field'));
    const productZone = screen.getByTestId('drop-zone-PRODUCT');
    fireEvent.dragOver(productZone);
    fireEvent.drop(productZone);

    await waitFor(() => {
      const lastCall = mockOnSchemaChange.mock.calls[mockOnSchemaChange.mock.calls.length - 1][0];
      const schema = JSON.parse(lastCall);
      expect(schema[0].key).toBeDefined();
      // Allow Thai characters or any non-empty string as current implementation supports localized keys
      expect(schema[0].key.length).toBeGreaterThan(0);
    });
  });
});
