'use client';

import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { AppBrand } from '@/components/ui/app-brand';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import InvoicePreview from '@/components/invoice-preview';
import {
  buildVehicleInfoLines,
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceTranslator,
  resolveInvoiceLanguage,
} from '@/lib/invoice-utils';
import { normalizePhilippinePhone } from '@/lib/phone-utils';

interface InvoiceDetailModalProps {
  invoice: { id: number };
  onClose: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  const { t } = useLanguage();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    void loadInvoiceDetails();
  }, [invoice.id]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);

      const [invData, itemsData, settings] = await Promise.all([
        db.get('SELECT * FROM invoices WHERE id = ?', [invoice.id]),
        db.query(
          `SELECT ii.*, p.name as product_name
           FROM invoice_items ii
           LEFT JOIN products p ON ii.product_id = p.id
           WHERE ii.invoice_id = ?
           ORDER BY ii.id ASC`,
          [invoice.id],
        ),
        db.get('SELECT * FROM business_settings LIMIT 1'),
      ]);

      setInvoiceData(
        invData
          ? {
              ...invData,
              customer_phone: normalizePhilippinePhone(invData.customer_phone || ''),
            }
          : null,
      );
      setItems(itemsData || []);
      setBusinessSettings(
        settings
          ? {
              ...settings,
              phone: normalizePhilippinePhone(settings.phone || ''),
            }
          : null,
      );
    } catch (error) {
      console.error('[InvoiceDetailModal] Error loading invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6">
          <p className="text-center text-muted-foreground">
            {t('loadingInvoiceDetails')}
          </p>
        </Card>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6">
          <p className="text-center text-muted-foreground">
            {t('invoiceNotFound')}
          </p>
        </Card>
      </div>
    );
  }

  const invoiceLanguage = resolveInvoiceLanguage(invoiceData.invoice_language);
  const invoiceT = getInvoiceTranslator(invoiceLanguage);
  const formatMoney = (amount: number | null | undefined) =>
    formatInvoiceCurrency(
      amount,
      businessSettings?.currency || 'PHP',
      invoiceLanguage,
    );
  const formatDocDate = (
    value: Date | string | number | null | undefined,
    options?: Intl.DateTimeFormatOptions,
  ) =>
    value ? formatInvoiceDate(value, invoiceLanguage, options) : '-';
  const vehicleLines = buildVehicleInfoLines(invoiceData, invoiceLanguage);
  const dueDateText = invoiceData.due_upon_receipt
    ? invoiceT('paymentDueUponReceipt')
    : formatDocDate(invoiceData.due_date);

  const statusLabel =
    invoiceData.status === 'paid'
      ? t('paid')
      : invoiceData.status === 'draft'
        ? t('draft')
        : t('openInvoice');

  const statusClass =
    invoiceData.status === 'paid'
      ? 'bg-green-100 text-green-700'
      : invoiceData.status === 'draft'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background p-6">
            <div>
              <AppBrand compact subtitle={t('invoiceHistory')} className="mb-3" />
              <h2 className="text-xl font-bold">{invoiceData.invoice_number}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {invoiceData.customer_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                {t('print')}
              </Button>
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t('customer')}
                  </p>
                  <p className="text-lg font-semibold">{invoiceData.customer_name}</p>
                  {invoiceData.customer_phone && (
                    <p className="text-sm text-muted-foreground">
                      {invoiceData.customer_phone}
                    </p>
                  )}
                  {invoiceData.customer_email && (
                    <p className="text-sm text-muted-foreground">
                      {invoiceData.customer_email}
                    </p>
                  )}
                </div>

                {vehicleLines.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      {t('vehicleInformation')}
                    </p>
                    <div className="space-y-1 text-sm">
                      {vehicleLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t('status')}</span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="grid gap-3 rounded-lg border border-border p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('receivedDate')}</span>
                    <span className="text-right font-medium">
                      {formatDocDate(invoiceData.invoice_date)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('dueDate')}</span>
                    <span className="text-right font-medium">{dueDateText}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('createdDate')}</span>
                    <span className="text-right font-medium">
                      {formatDocDate(invoiceData.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('paymentDate')}</span>
                    <span className="text-right font-medium">
                      {formatDocDate(invoiceData.paid_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('invoiceLanguage')}</span>
                    <span className="text-right font-medium">
                      {invoiceLanguage === 'tl' ? t('tagalog') : t('english')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">{t('items')}</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        {t('description')}
                      </th>
                      <th className="w-px px-4 py-2 text-right text-sm font-semibold whitespace-nowrap">
                        {t('quantityShort')}
                      </th>
                      <th className="w-px px-4 py-2 text-right text-sm font-semibold whitespace-nowrap">
                        {t('unitPrice')}
                      </th>
                      <th className="w-px px-4 py-2 text-right text-sm font-semibold whitespace-nowrap">
                        {t('amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-sm text-muted-foreground"
                        >
                          {t('noItemsAddedYet')}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-2 text-sm">
                            {item.description || item.product_name}
                          </td>
                          <td className="px-4 py-2 text-right text-sm whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right text-sm whitespace-nowrap">
                            {formatMoney(item.unit_price)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium whitespace-nowrap">
                            {formatMoney(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between border-b border-border py-2">
                  <span className="font-medium">{t('subtotal')}:</span>
                  <span>{formatMoney(invoiceData.subtotal)}</span>
                </div>
                {Number(invoiceData.tax_rate) > 0 && (
                  <div className="flex justify-between border-b border-border py-2">
                    <span className="font-medium">
                      {t('taxLabel')} ({invoiceData.tax_rate}%):
                    </span>
                    <span>{formatMoney(invoiceData.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between rounded-lg bg-primary/10 px-3 py-3">
                  <span className="font-bold">{t('total')}:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatMoney(invoiceData.total)}
                  </span>
                </div>
              </div>
            </div>

            {invoiceData.notes && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  {t('notes')}
                </p>
                <p className="rounded-lg bg-muted/30 p-3 text-sm">
                  {invoiceData.notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {showPreview && (
        <InvoicePreview
          invoice={{ ...invoiceData, items }}
          businessSettings={businessSettings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default InvoiceDetailModal;
