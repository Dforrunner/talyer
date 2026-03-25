'use client';

import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { useRef } from 'react';

interface InvoiceItem {
  id: string;
  type: 'product' | 'labor';
  product_id?: number;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoicePreviewProps {
  invoice: any;
  businessSettings: any;
  onClose: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice, businessSettings, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=600,width=900');
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = businessSettings?.currency || 'PHP';
    const symbols: any = {
      PHP: '₱',
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: '$',
      AUD: '$',
      JPY: '¥',
      CHF: 'CHF'
    };
    const symbol = symbols[currency] || '₱';
    return `${symbol}${amount.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area - Simulates US Letter Paper */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          <div
            ref={printRef}
            className="bg-white p-12"
            style={{
              width: '8.5in',
              minHeight: '11in',
              boxShadow: '0 0 20px rgba(0,0,0,0.2)',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              color: '#333',
              lineHeight: '1.5'
            }}
          >
            {/* Header Section */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #2c3e50' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  {/* Logo */}
                  {businessSettings?.logo_path && (
                    <img
                      src={businessSettings.logo_path}
                      alt="Logo"
                      style={{ maxWidth: '120px', maxHeight: '80px', marginBottom: '10px' }}
                    />
                  )}
                  {/* Business Name */}
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
                    {businessSettings?.business_name || 'Your Shop'}
                  </div>
                  {/* Business Details */}
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                    {businessSettings?.address && (
                      <div>{businessSettings.address}</div>
                    )}
                    {(businessSettings?.city || businessSettings?.postal_code) && (
                      <div>
                        {businessSettings.city} {businessSettings.postal_code}
                      </div>
                    )}
                    {businessSettings?.phone && (
                      <div>Phone: {businessSettings.phone}</div>
                    )}
                    {businessSettings?.email && (
                      <div>Email: {businessSettings.email}</div>
                    )}
                    {businessSettings?.tax_id && (
                      <div>Tax ID: {businessSettings.tax_id}</div>
                    )}
                  </div>
                </div>

                {/* Invoice Title and Number */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                    INVOICE
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <strong>Invoice #:</strong> {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>
                BILL TO:
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>
                {invoice.customer_name}
              </div>
              {invoice.customer_phone && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Phone: {invoice.customer_phone}
                </div>
              )}
              {invoice.customer_email && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Email: {invoice.customer_email}
                </div>
              )}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #2c3e50' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #2c3e50' }}>
                    Description
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', width: '80px', borderBottom: '2px solid #2c3e50' }}>
                    Qty
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', width: '100px', borderBottom: '2px solid #2c3e50' }}>
                    Unit Price
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', width: '100px', borderBottom: '2px solid #2c3e50' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map((item: InvoiceItem, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left' }}>
                      {item.product_name || item.description}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div style={{ float: 'right', width: '280px', marginBottom: '20px' }}>
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.tax_rate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Tax/VAT ({invoice.tax_rate}%):</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
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
                    color: '#2c3e50'
                  }}
                >
                  <span>TOTAL:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Clear float */}
            <div style={{ clear: 'both' }}></div>

            {/* Notes */}
            {invoice.notes && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Notes:</div>
                <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'pre-wrap' }}>
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '11px', color: '#999' }}>
              <div>Thank you for your business!</div>
              <div style={{ marginTop: '4px' }}>This is a computer-generated invoice. No signature required.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
