"use client";

import { X, Printer } from "lucide-react";
import { AppBrand } from "@/components/ui/app-brand";
import { Button } from "@/components/ui/button";
import { useFilePreview } from "@/hooks/use-file-preview";
import { useLanguage } from "@/hooks/use-language";
import { buildInvoicePrintHtml } from "@/lib/invoice-print-html";
import {
  calculateInvoiceItemsSubtotal,
  buildVehicleInfoLines,
  filterInvoiceLineItemsForOutput,
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceItemDescription,
  getInvoiceTranslator,
  resolveInvoiceLanguage,
  splitInvoiceItemsByType,
} from "@/lib/invoice-utils";

interface InvoiceItem {
  id?: string | number;
  type?: "product" | "labor";
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

const formatBusinessAddress = (businessSettings: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
} | null | undefined) =>
  [businessSettings?.address, businessSettings?.city, businessSettings?.postal_code]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

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
  const businessAddress = formatBusinessAddress(businessSettings);

  const formatMoney = (amount: number | null | undefined) =>
    formatInvoiceCurrency(amount, currency, invoiceLanguage);

  const formatDocDate = (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => formatInvoiceDate(value, invoiceLanguage, options);
  const outputItems = filterInvoiceLineItemsForOutput(invoice?.items || []);
  const { laborItems, partsMaterialItems } = splitInvoiceItemsByType(
    outputItems,
  );

  const renderItemsTable = (
    title: string,
    items: InvoiceItem[],
    emptyLabel: string,
    subtotalLabel: string,
  ) => {
    const sectionSubtotal = calculateInvoiceItemsSubtotal(items);

    return (
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "#2c3e50",
            marginBottom: "4px",
          }}
        >
          {title.toUpperCase()}
        </div>
        <div
          style={{
            border: "1px solid #d8dee6",
            borderRadius: "6px",
            overflow: "hidden",
           paddingBottom: "6px",
          }}
        >
          <table
            style={{
              width: "100%",
              marginBottom: "6px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f5f5f5",
                  borderBottom: "2px solid #2c3e50",
                }}
              >
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "8px",
                    whiteSpace: "nowrap",
                    borderBottom: "2px solid #2c3e50",
                  }}
                >
                  {invoiceT("description")}
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "center",
                    fontWeight: "bold",
                    width: "72px",
                    fontSize: "8px",
                    whiteSpace: "nowrap",
                    borderBottom: "2px solid #2c3e50",
                  }}
                >
                  {invoiceT("quantityShort")}
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "right",
                    fontWeight: "bold",
                    width: "106px",
                    fontSize: "8px",
                    whiteSpace: "nowrap",
                    borderBottom: "2px solid #2c3e50",
                  }}
                >
                  {invoiceT("unitPrice")}
                </th>
                <th
                  style={{
                    padding: "4px 6px",
                    textAlign: "right",
                    fontWeight: "bold",
                    width: "112px",
                    fontSize: "8px",
                    whiteSpace: "nowrap",
                    borderBottom: "2px solid #2c3e50",
                  }}
                >
                  {invoiceT("amount")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item: InvoiceItem, index: number) => (
                  <tr
                    key={item.id ?? index}
                    style={{ borderBottom: "1px solid #ddd" }}
                  >
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "left",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        lineHeight: "1.2",
                      }}
                    >
                      {getInvoiceItemDescription(item)}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>
                      {formatMoney(item.unit_price)}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td
                    colSpan={4}
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    {emptyLabel}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "240px", paddingTop: "5px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  color: "#2c3e50",
                  paddingRight: "6px"
                }}
              >
                <span>{subtotalLabel}:</span>
                <span>{formatMoney(sectionSubtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            className="bg-white p-5"
            style={{
              width: '8.5in',
              minHeight: '11in',
              boxShadow: '0 0 20px rgba(0,0,0,0.2)',
              fontSize: '13px',
              fontFamily: 'Arial, sans-serif',
              color: '#333',
              lineHeight: '1.25',
            }}
          >
            <div
              style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '2px solid #2c3e50',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    {logoSrc && (
                      <img
                        src={logoSrc}
                        alt={t('logo')}
                        style={{
                          maxWidth: '100px',
                          maxHeight: '62px',
                          objectFit: 'contain',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#2c3e50',
                        lineHeight: '1.1',
                      }}
                    >
                      {businessSettings?.business_name || t('shopManager')}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#666',
                      lineHeight: '1.3',
                    }}
                  >
                    {businessAddress && <div>{businessAddress}</div>}
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
                      fontSize: '26px',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      marginBottom: '4px',
                    }}
                  >
                    {invoiceT('invoiceLabel').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                    <strong>{invoiceT('invoiceNumber')}:</strong>{' '}
                    {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                    <strong>{invoiceT('date')}:</strong>{' '}
                    {formatDocDate(invoice.invoice_date)}
                  </div>
                  <div style={{ fontSize: '11px', maxWidth: '220px' }}>
                    <strong>{invoiceT('dueDate')}:</strong> {dueDateLabel}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: hasVehicleInfo ? '1fr 1fr' : '1fr',
                gap: '12px',
                marginTop: '6px',
                marginBottom: '10px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#2c3e50',
                    marginBottom: '4px',
                  }}
                >
                  {invoiceT('billTo').toUpperCase()}:
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginBottom: '2px',
                  }}
                >
                  {invoice.customer_name}
                </div>
                {invoice.customer_phone && (
                  <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.25' }}>
                    {invoiceT('phone')}: {invoice.customer_phone}
                  </div>
                )}
                {invoice.customer_email && (
                  <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.25' }}>
                    {invoiceT('email')}: {invoice.customer_email}
                  </div>
                )}
              </div>

              {hasVehicleInfo && (
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      marginBottom: '4px',
                    }}
                  >
                    {invoiceT('vehicleInformation').toUpperCase()}:
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.25' }}>
                    {vehicleInfoLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {renderItemsTable(
              invoiceT("labor"),
              laborItems as InvoiceItem[],
              invoiceT("noLaborAddedYet"),
              invoiceT("laborSubtotal"),
            )}
            {renderItemsTable(
              invoiceT("partsMaterials"),
              partsMaterialItems as InvoiceItem[],
              invoiceT("noPartsMaterialsAddedYet"),
              invoiceT("partsMaterialsSubtotal"),
            )}

            <div style={{ float: 'right', width: '240px', marginTop: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  
                  paddingTop: '5px',
                  marginBottom: '6px',
                }}
              >
                {Number(invoice.tax_rate) > 0 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <span>{invoiceT('subtotal')}:</span>
                      <span>{formatMoney(invoice.subtotal)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <span>
                        {invoiceT('tax')} ({invoice.tax_rate}%):
                      </span>
                      <span>{formatMoney(invoice.tax_amount)}</span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '2px solid #2c3e50',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: '#2c3e50',
                  }}
                >
                  <span>{invoiceT('totalAmount').toUpperCase()}:</span>
                  <span>{formatMoney(invoice.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ clear: 'both' }} />

            {invoice.notes && (
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #ddd',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '10px' }}>
                  {invoiceT('notes')}:
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#666',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.25',
                  }}
                >
                  {invoice.notes}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid #ddd',
                textAlign: 'center',
                fontSize: '10px',
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
