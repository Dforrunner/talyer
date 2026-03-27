"use client";

import { X, Printer } from "lucide-react";
import { AppBrand } from "@/components/ui/app-brand";
import { Button } from "@/components/ui/button";
import { useFilePreview } from "@/hooks/use-file-preview";
import { useLanguage } from "@/hooks/use-language";
import { buildInvoicePrintHtml } from "@/lib/invoice-print-html";
import {
  buildVehicleInfoLines,
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceTranslator,
  resolveInvoiceLanguage,
} from "@/lib/invoice-utils";

interface InvoiceItem {
  id?: string | number;
  description: string;
  product_name?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoicePreviewProps {
  invoice: any;
  businessSettings: any;
  onClose: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  businessSettings,
  onClose,
}) => {
  const { t } = useLanguage();
  const logoSrc = useFilePreview(businessSettings?.logo_path);
  const invoiceLanguage = resolveInvoiceLanguage(invoice?.invoice_language);
  const invoiceT = getInvoiceTranslator(invoiceLanguage);
  const vehicleInfoLines = buildVehicleInfoLines(invoice, invoiceLanguage);
  const hasVehicleInfo = vehicleInfoLines.length > 0;
  const currency = businessSettings?.currency || "PHP";

  const formatMoney = (amount: number | null | undefined) =>
    formatInvoiceCurrency(amount, currency, invoiceLanguage);

  const formatDocDate = (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => formatInvoiceDate(value, invoiceLanguage, options);

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=900");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(
      buildInvoicePrintHtml({
        invoice,
        businessSettings,
        logoSrc,
        fallbackBusinessName: t("shopManager"),
        logoAlt: t("logo"),
      }),
    );
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const dueDateLabel = invoice?.due_upon_receipt
    ? invoiceT("paymentDueUponReceipt")
    : formatDocDate(invoice?.due_date || invoice?.invoice_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="space-y-2">
            <AppBrand compact subtitle={t("invoicePreview")} />
            <h2 className="text-lg font-semibold">{t('invoicePreview')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {t('print')}
            </Button>
            <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-auto bg-gray-100 p-4">
          <div
            className="bg-white p-8"
            style={{
              width: '8.5in',
              minHeight: '11in',
              boxShadow: '0 0 20px rgba(0,0,0,0.2)',
              fontSize: '13px',
              fontFamily: 'Arial, sans-serif',
              color: '#333',
              lineHeight: '1.5',
            }}
          >
            <div
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #2c3e50',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <div>
                  {logoSrc && (
                    <img
                      src={logoSrc}
                      alt={t('logo')}
                      style={{
                        maxWidth: '120px',
                      maxHeight: '80px',
                        marginBottom: '10px',
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      marginBottom: '5px',
                    }}
                  >
                    {businessSettings?.business_name || t('shopManager')}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      lineHeight: '1.6',
                    }}
                  >
                    {businessSettings?.address && <div>{businessSettings.address}</div>}
                    {(businessSettings?.city || businessSettings?.postal_code) && (
                      <div>
                        {businessSettings.city} {businessSettings.postal_code}
                      </div>
                    )}
                    {businessSettings?.phone && (
                      <div>
                        {invoiceT('phone')}: {businessSettings.phone}
                      </div>
                    )}
                    {businessSettings?.email && (
                      <div>
                        {invoiceT('email')}: {businessSettings.email}
                      </div>
                    )}
                    {businessSettings?.tax_id && (
                      <div>
                        {invoiceT('taxId')}: {businessSettings.tax_id}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      marginBottom: '10px',
                    }}
                  >
                    {invoiceT('invoiceLabel').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <strong>{invoiceT('invoiceNumber')}:</strong>{' '}
                    {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <strong>{invoiceT('date')}:</strong>{' '}
                    {formatDocDate(invoice.invoice_date)}
                  </div>
                  <div style={{ fontSize: '13px', maxWidth: '220px' }}>
                    <strong>{invoiceT('dueDate')}:</strong> {dueDateLabel}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: hasVehicleInfo ? '1fr 1fr' : '1fr',
                gap: '20px',
                marginTop: '14px',
                marginBottom: '24px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#2c3e50',
                    marginBottom: '8px',
                  }}
                >
                  {invoiceT('billTo').toUpperCase()}:
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                  }}
                >
                  {invoice.customer_name}
                </div>
                {invoice.customer_phone && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {invoiceT('phone')}: {invoice.customer_phone}
                  </div>
                )}
                {invoice.customer_email && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {invoiceT('email')}: {invoice.customer_email}
                  </div>
                )}
              </div>

              {hasVehicleInfo && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      marginBottom: '8px',
                    }}
                  >
                    {invoiceT('vehicleInformation').toUpperCase()}:
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                    {vehicleInfoLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <table
              style={{
                width: '100%',
                marginBottom: '20px',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #2c3e50',
                  }}
                >
                  <th
                    style={{
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #2c3e50',
                    }}
                  >
                    {invoiceT('description')}
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      width: '72px',
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #2c3e50',
                    }}
                  >
                    {invoiceT('quantityShort')}
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      width: '106px',
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #2c3e50',
                    }}
                  >
                    {invoiceT('unitPrice')}
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      width: '112px',
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #2c3e50',
                    }}
                  >
                    {invoiceT('amount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: InvoiceItem, index: number) => (
                  <tr
                    key={item.id ?? index}
                    style={{ borderBottom: '1px solid #ddd' }}
                  >
                    <td style={{ padding: '10px 8px', textAlign: 'left' }}>
                      {item.description || item.product_name}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {formatMoney(item.unit_price)}
                    </td>
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                      }}
                    >
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ float: 'right', width: '280px', marginBottom: '20px' }}>
              <div
                style={{
                  borderTop: '1px solid #ddd',
                  paddingTop: '10px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span>{invoiceT('subtotal')}:</span>
                  <span>{formatMoney(invoice.subtotal)}</span>
                </div>

                {Number(invoice.tax_rate) > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span>
                      {invoiceT('tax')} ({invoice.tax_rate}%):
                    </span>
                    <span>{formatMoney(invoice.tax_amount)}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '2px solid #2c3e50',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#2c3e50',
                  }}
                >
                  <span>{invoiceT('total').toUpperCase()}:</span>
                  <span>{formatMoney(invoice.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ clear: 'both' }} />

            {invoice.notes && (
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #ddd',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  {invoiceT('notes')}:
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {invoice.notes}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #ddd',
                textAlign: 'center',
                fontSize: '11px',
                color: '#999',
              }}
            >
              <div>{invoiceT('thankYou')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
