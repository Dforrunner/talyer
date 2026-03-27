import { db } from '@/lib/db';
import { safePdfGenerate } from '@/lib/electron-api';
import { buildInvoicePdfLabels } from '@/lib/invoice-utils';
import { normalizePhilippinePhone } from '@/lib/phone-utils';

export async function getInvoiceWithItems(invoiceId: number) {
  const [invoice, items, businessSettings] = await Promise.all([
    db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]),
    db.query(
      `SELECT ii.*, p.name as product_name
       FROM invoice_items ii
       LEFT JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.id ASC`,
      [invoiceId],
    ),
    db.get('SELECT * FROM business_settings LIMIT 1'),
  ]);

  return {
    invoice,
    items: items || [],
    businessSettings,
  };
}

export async function generateInvoicePdfForInvoice(invoiceId: number) {
  const { invoice, items, businessSettings } = await getInvoiceWithItems(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const pdfPath = await safePdfGenerate(
    {
      ...invoice,
      customer_phone: normalizePhilippinePhone(invoice.customer_phone || ''),
      labels: buildInvoicePdfLabels(invoice.invoice_language),
      items: items.map((item: any) => ({
        description: item.description || item.product_name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
    },
    businessSettings
      ? {
          ...businessSettings,
          phone: normalizePhilippinePhone(businessSettings.phone || ''),
        }
      : {},
  );

  if (pdfPath) {
    await db.run(
      'UPDATE invoices SET pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pdfPath, invoiceId],
    );
  }

  return {
    invoice,
    items,
    businessSettings,
    pdfPath,
  };
}
