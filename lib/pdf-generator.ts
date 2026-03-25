// PDF generation utility - runs in main process
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
}

export interface BusinessData {
  business_name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  currency?: string;
  logo_path?: string;
}

export function generateInvoicePDF(
  invoiceData: InvoiceData,
  businessData: BusinessData,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#2C3E50';
      const textColor = '#333333';
      const lightGray = '#F5F5F5';

      // Header with logo and business info
      let currentY = 50;

      if (businessData.logo_path && fs.existsSync(businessData.logo_path)) {
        doc.image(businessData.logo_path, 50, currentY, { width: 80 });
        currentY += 90;
      }

      // Business name and info
      doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text(businessData.business_name, 50, currentY);
      currentY += 35;

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      if (businessData.address) {
        doc.text(businessData.address, 50, currentY);
        currentY += 15;
      }
      if (businessData.city || businessData.postal_code) {
        doc.text(`${businessData.city || ''} ${businessData.postal_code || ''}`.trim(), 50, currentY);
        currentY += 15;
      }
      if (businessData.phone) {
        doc.text(`Phone: ${businessData.phone}`, 50, currentY);
        currentY += 12;
      }
      if (businessData.email) {
        doc.text(`Email: ${businessData.email}`, 50, currentY);
        currentY += 12;
      }
      if (businessData.tax_id) {
        doc.text(`Tax ID: ${businessData.tax_id}`, 50, currentY);
        currentY += 12;
      }

      // Invoice header on the right
      doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('INVOICE', 350, 50);

      doc.fontSize(11).font('Helvetica');
      doc.text(`Invoice #: ${invoiceData.invoice_number}`, 350, 80, { align: 'left' });
      doc.text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString()}`, 350, 100);
      doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 350, 120);

      currentY = Math.max(currentY, 160);

      // Bill to section
      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('BILL TO:', 50, currentY);
      currentY += 20;

      doc.fontSize(11).font('Helvetica-Bold').fillColor(textColor);
      doc.text(invoiceData.customer_name, 50, currentY);
      currentY += 16;

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      if (invoiceData.customer_phone) {
        doc.text(`Phone: ${invoiceData.customer_phone}`, 50, currentY);
        currentY += 12;
      }
      if (invoiceData.customer_email) {
        doc.text(`Email: ${invoiceData.customer_email}`, 50, currentY);
        currentY += 12;
      }

      currentY += 20;

      // Items table header
      const tableTop = currentY;
      const col1 = 50;
      const col2 = 350;
      const col3 = 420;
      const col4 = 500;

      doc.rect(col1 - 5, tableTop - 5, 520, 20).fill(lightGray);

      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('Description', col1, tableTop);
      doc.text('Qty', col2, tableTop);
      doc.text('Unit Price', col3, tableTop);
      doc.text('Amount', col4, tableTop);

      currentY = tableTop + 25;

      // Items
      doc.fontSize(10).font('Helvetica').fillColor(textColor);

      invoiceData.items.forEach((item) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(item.description, col1, currentY, { width: 250 });
        doc.text(item.quantity.toString(), col2, currentY);
        doc.text(formatCurrency(item.unit_price, businessData.currency), col3, currentY);
        doc.text(formatCurrency(item.amount, businessData.currency), col4, currentY);

        currentY += 20;
      });

      currentY += 10;

      // Total section
      const totalBoxTop = currentY;
      const totalBoxLeft = 350;

      // Lines for totals
      doc.moveTo(totalBoxLeft, totalBoxTop).lineTo(550, totalBoxTop).stroke();

      currentY = totalBoxTop + 15;

      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.subtotal, businessData.currency), 480, currentY, { align: 'right' });

      currentY += 20;

      if (invoiceData.tax_rate > 0) {
        doc.text(`Tax/VAT (${invoiceData.tax_rate}%):`, totalBoxLeft, currentY);
        doc.text(formatCurrency(invoiceData.tax_amount, businessData.currency), 480, currentY, { align: 'right' });
        currentY += 20;
      }

      // Total line
      doc.moveTo(totalBoxLeft, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('TOTAL:', totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.total, businessData.currency), 480, currentY, { align: 'right' });

      // Notes section
      if (invoiceData.notes) {
        currentY += 40;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('Notes:', 50, currentY);
        currentY += 15;
        doc.fontSize(9).font('Helvetica').fillColor(textColor);
        doc.text(invoiceData.notes, 50, currentY, { width: 480 });
      }

      // Footer
      doc.fontSize(8).fillColor('#999999');
      doc.text('Thank you for your business!', 50, 750, { align: 'center' });
      doc.text('This is a computer-generated invoice. No signature required.', 50, 765, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });

      doc.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: any = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: '$',
    AUD: '$',
    JPY: '¥',
    CHF: 'CHF'
  };
  const symbol = symbols[currency] || '$';
  return `${symbol}${amount.toFixed(2)}`;
}
