import * as XLSX from 'xlsx';
import { IReceipt } from '../../shared/types.ts';

export interface FlatReceiptRow {
  'Receipt ID': string;
  'Date': string;
  'Time': string;
  'Merchant': string;
  'Category': string;
  'Item Name': string;
  'Quantity': number;
  'Unit Price': number;
  'Line Total': number;
  'Subtotal': number;
  'VAT / Tax': number;
  'Discount': number;
  'Service Charge': number;
  'Receipt Grand Total': number;
  'Currency': string;
  'Payment Method': string;
  'Status': string;
  'Notes': string;
}

export function flattenReceiptsToRows(receipts: IReceipt[]): FlatReceiptRow[] {
  const rows: FlatReceiptRow[] = [];

  for (const r of receipts) {
    if (!r.items || r.items.length === 0) {
      // Row with empty item details
      rows.push({
        'Receipt ID': r._id,
        'Date': r.date,
        'Time': r.time || '',
        'Merchant': r.merchant,
        'Category': r.category,
        'Item Name': '(No items listed)',
        'Quantity': 1,
        'Unit Price': r.total,
        'Line Total': r.total,
        'Subtotal': r.subtotal,
        'VAT / Tax': r.tax,
        'Discount': r.discount,
        'Service Charge': r.serviceCharge || 0,
        'Receipt Grand Total': r.total,
        'Currency': r.currency,
        'Payment Method': r.paymentMethod || '',
        'Status': r.status,
        'Notes': r.notes || '',
      });
    } else {
      for (const item of r.items) {
        rows.push({
          'Receipt ID': r._id,
          'Date': r.date,
          'Time': r.time || '',
          'Merchant': r.merchant,
          'Category': r.category,
          'Item Name': item.name,
          'Quantity': item.quantity,
          'Unit Price': item.unitPrice,
          'Line Total': item.total,
          'Subtotal': r.subtotal,
          'VAT / Tax': r.tax,
          'Discount': r.discount,
          'Service Charge': r.serviceCharge || 0,
          'Receipt Grand Total': r.total,
          'Currency': r.currency,
          'Payment Method': r.paymentMethod || '',
          'Status': r.status,
          'Notes': r.notes || '',
        });
      }
    }
  }

  return rows;
}

export function generateCsv(rows: FlatReceiptRow[]): string {
  if (rows.length === 0) {
    return 'Receipt ID,Date,Time,Merchant,Category,Item Name,Quantity,Unit Price,Line Total,Subtotal,VAT / Tax,Discount,Service Charge,Receipt Grand Total,Currency,Payment Method,Status,Notes\n';
  }

  const headers = Object.keys(rows[0]) as (keyof FlatReceiptRow)[];
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const line = headers
      .map((header) => {
        const val = row[header] ?? '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',');
    csvLines.push(line);
  }

  // Prepend UTF-8 BOM so Excel opens Thai characters seamlessly
  return '\uFEFF' + csvLines.join('\n');
}

export function generateXlsxBuffer(rows: FlatReceiptRow[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts');

  // Auto-fit column widths
  const colWidths = [
    { wch: 15 }, // ID
    { wch: 12 }, // Date
    { wch: 8 },  // Time
    { wch: 24 }, // Merchant
    { wch: 14 }, // Category
    { wch: 28 }, // Item Name
    { wch: 8 },  // Qty
    { wch: 12 }, // Unit Price
    { wch: 12 }, // Line Total
    { wch: 12 }, // Subtotal
    { wch: 10 }, // Tax
    { wch: 10 }, // Discount
    { wch: 14 }, // Service Charge
    { wch: 18 }, // Grand Total
    { wch: 10 }, // Currency
    { wch: 16 }, // Payment Method
    { wch: 12 }, // Status
    { wch: 25 }, // Notes
  ];
  worksheet['!cols'] = colWidths;

  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buf as Buffer;
}
