'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Download,
  Eye,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { db, file } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { generateInvoicePdfForInvoice } from '@/lib/invoice-pdf';
import InvoiceDetailModal from '@/components/modals/invoice-detail-modal';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  created_at: string;
  paid_at: string | null;
  total: number;
  status: 'draft' | 'open' | 'paid';
  pdf_path: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  license_plate: string | null;
}

interface InvoiceHistoryPageProps {
  onEditInvoice: (invoiceId: number) => void;
}

const InvoiceHistoryPage: React.FC<InvoiceHistoryPageProps> = ({
  onEditInvoice,
}) => {
  const { formatCurrency, formatDate, t } = useLanguage();
  const { showAlert, showConfirm } = useAppDialog();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    void loadInvoices();
  }, []);

  useEffect(() => {
    let nextInvoices = invoices;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();

      nextInvoices = nextInvoices.filter((invoice) => {
        const vehicleText = [
          invoice.vehicle_year,
          invoice.vehicle_make,
          invoice.vehicle_model,
          invoice.license_plate,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return (
          invoice.invoice_number.toLowerCase().includes(query) ||
          invoice.customer_name.toLowerCase().includes(query) ||
          vehicleText.includes(query)
        );
      });
    }

    if (filterStatus !== 'all') {
      nextInvoices = nextInvoices.filter((invoice) => invoice.status === filterStatus);
    }

    setFilteredInvoices(nextInvoices);
  }, [filterStatus, invoices, searchTerm]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const result = await db.query(
        `SELECT id, invoice_number, customer_name, invoice_date, created_at,
                paid_at, total, status, pdf_path, vehicle_make, vehicle_model,
                vehicle_year, license_plate
         FROM invoices
         ORDER BY created_at DESC, id DESC`,
      );
      setInvoices(result || []);
    } catch (error) {
      console.error('[InvoiceHistory] Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      let pdfPath = invoice.pdf_path;

      if (!pdfPath || !(await file.exists(pdfPath))) {
        const generated = await generateInvoicePdfForInvoice(invoice.id);
        pdfPath = generated.pdfPath;
      }

      if (!pdfPath) {
        throw new Error(t('errorDownloadingPdf'));
      }

      const savedPath = await file.saveCopy(
        pdfPath,
        `${invoice.invoice_number || 'invoice'}.pdf`,
      );

      if (savedPath) {
        await showAlert({
          title: t('pdfCopySavedAt'),
          description: savedPath,
          confirmLabel: t('close'),
        });
      }

      await loadInvoices();
    } catch (error) {
      console.error('[InvoiceHistory] Error downloading PDF:', error);
      await showAlert({
        title: t('errorDownloadingPdf'),
        confirmLabel: t('close'),
      });
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('deleteConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await db.exec('BEGIN');

      try {
        const invoiceItems = await db.query(
          `SELECT product_id, quantity
           FROM invoice_items
           WHERE invoice_id = ? AND product_id IS NOT NULL`,
          [id],
        );

        for (const item of invoiceItems || []) {
          await db.run(
            'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
            [item.quantity, item.product_id],
          );
        }

        await db.run('DELETE FROM invoices WHERE id = ?', [id]);
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      await loadInvoices();
    } catch (error) {
      console.error('[InvoiceHistory] Error deleting invoice:', error);
      await showAlert({
        title: t('errorDeletingInvoice'),
        confirmLabel: t('close'),
      });
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    try {
      await db.run(
        `UPDATE invoices
         SET status = 'paid', paid = 1, paid_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id],
      );
      await loadInvoices();
    } catch (error) {
      console.error('[InvoiceHistory] Error updating invoice:', error);
      await showAlert({
        title: t('errorUpdatingInvoice'),
        confirmLabel: t('close'),
      });
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    if (status === 'paid') {
      return {
        label: t('paid'),
        className: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="h-3 w-3" />,
      };
    }

    if (status === 'draft') {
      return {
        label: t('draft'),
        className: 'bg-blue-100 text-blue-700',
        icon: <Clock className="h-3 w-3" />,
      };
    }

    return {
      label: t('openInvoice'),
      className: 'bg-amber-100 text-amber-700',
      icon: <Clock className="h-3 w-3" />,
    };
  };

  const getTotalRevenue = () =>
    filteredInvoices
      .filter((invoice) => invoice.status !== 'draft')
      .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

  const getDraftCount = () =>
    filteredInvoices.filter((invoice) => invoice.status === 'draft').length;

  const getVehicleSummary = (invoice: Invoice) =>
    [
      invoice.vehicle_year,
      invoice.vehicle_make,
      invoice.vehicle_model,
      invoice.license_plate ? `(${invoice.license_plate})` : null,
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('invoiceHistory')}</h1>
        <p className="mt-1 text-muted-foreground">{t('invoiceHistoryDesc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('totalInvoices')}</p>
          <p className="mt-1 text-2xl font-bold">{filteredInvoices.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrency(getTotalRevenue())}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('draftInvoices')}</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {getDraftCount()}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            placeholder={t('searchInvoiceOrCustomer')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="open">{t('openInvoice')}</option>
            <option value="paid">{t('paid')}</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="w-px px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  {t('invoiceNumber')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  {t('customer')}
                </th>
                <th className="w-px px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  {t('receivedDate')}
                </th>
                <th className="w-px px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  {t('createdDate')}
                </th>
                <th className="w-px px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  {t('paymentDate')}
                </th>
                <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                  {t('amount')}
                </th>
                <th className="w-px px-6 py-3 text-center text-sm font-semibold whitespace-nowrap">
                  {t('status')}
                </th>
                <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    {t('loadingInvoices')}
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    {t('noInvoices')}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-sm">
                          {invoice.invoice_number}
                        </div>
                        {invoice.license_plate && (
                          <div className="text-xs text-muted-foreground">
                            {invoice.license_plate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{invoice.customer_name}</div>
                        {getVehicleSummary(invoice) && (
                          <div className="text-xs text-muted-foreground">
                            {getVehicleSummary(invoice)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetails(true);
                            }}
                            title={t('viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDownloadPDF(invoice)}
                            title={t('downloadPdfCopy')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditInvoice(invoice.id)}
                              title={t('editDraft')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleMarkAsPaid(invoice.id)}
                              title={t('markAsPaid')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteInvoice(invoice.id)}
                            title={t('delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showDetails && selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

export default InvoiceHistoryPage;
