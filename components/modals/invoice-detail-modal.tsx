'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import InvoicePreview from '@/components/invoice-preview';

interface InvoiceDetailModalProps {
  invoice: any;
  onClose: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose }) => {
  const { formatCurrency, formatDate, t } = useLanguage();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadInvoiceDetails();
  }, [invoice]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);

      // Get invoice details
      const invData = await db.get(
        'SELECT * FROM invoices WHERE id = ?',
        [invoice.id]
      );
      setInvoiceData(invData);

      // Get invoice items
      const itemsData = await db.query(
        `SELECT ii.*, p.name as product_name FROM invoice_items ii
         LEFT JOIN products p ON ii.product_id = p.id
         WHERE ii.invoice_id = ?`,
        [invoice.id]
      );
      setItems(itemsData);

      // Get business settings
      const settings = await db.get('SELECT * FROM business_settings LIMIT 1');
      setBusinessSettings(settings);
    } catch (error) {
      console.error('Error loading invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (invoiceData) {
      setShowPreview(true);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl p-6">
          <p className="text-center text-muted-foreground">{t('loadingInvoiceDetails')}</p>
        </Card>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl p-6">
          <p className="text-center text-muted-foreground">{t('invoiceNotFound')}</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
            <h2 className="text-xl font-bold">{invoiceData.invoice_number}</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                {t('print')}
              </Button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer & Dates */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('customer')}</p>
                <p className="font-semibold text-lg">{invoiceData.customer_name}</p>
                {invoiceData.customer_phone && (
                  <p className="text-sm text-muted-foreground">{invoiceData.customer_phone}</p>
                )}
                {invoiceData.customer_email && (
                  <p className="text-sm text-muted-foreground">{invoiceData.customer_email}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('dates')}</p>
                <p className="text-sm">
                  <span className="font-medium">{t('invoiceDate')}:</span> {formatDate(invoiceData.invoice_date)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('dueDate')}:</span> {formatDate(invoiceData.due_date)}
                </p>
                <p className="text-sm mt-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {invoiceData.status === 'paid'
                      ? t('paid')
                      : invoiceData.status === 'draft'
                        ? t('draft')
                        : t('sent')}
                  </span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-semibold mb-3">{t('items')}</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">{t('description')}</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">{t('quantityShort')}</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">{t('unitPrice')}</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">{t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-2 text-sm">
                          {item.product_name || item.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="font-medium">{t('subtotal')}:</span>
                  <span>{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                {invoiceData.tax_rate > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="font-medium">{t('taxLabel')} ({invoiceData.tax_rate}%):</span>
                    <span>{formatCurrency(invoiceData.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 bg-primary/10 px-3 rounded-lg">
                  <span className="font-bold">{t('total')}:</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(invoiceData.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('notes')}</p>
                <p className="text-sm p-3 bg-muted/30 rounded-lg">{invoiceData.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invoice Preview */}
      {showPreview && invoiceData && (
        <InvoicePreview
          invoice={{
            ...invoiceData,
            items: items
          }}
          businessSettings={businessSettings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default InvoiceDetailModal;
