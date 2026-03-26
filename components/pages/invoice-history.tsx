'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Download, Trash2, CheckCircle, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { safeFileExists } from '@/lib/electron-api';
import { useLanguage } from '@/hooks/use-language';
import InvoiceDetailModal from '@/components/modals/invoice-detail-modal';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  total: number;
  status: string;
  pdf_path: string;
}

const InvoiceHistoryPage: React.FC = () => {
  const { formatCurrency, formatDate, t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, filterStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const result = await db.query(
        'SELECT id, invoice_number, customer_name, invoice_date, total, status, pdf_path FROM invoices ORDER BY invoice_date DESC'
      );
      setInvoices(result);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    setFilteredInvoices(filtered);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      if (invoice.pdf_path && await safeFileExists(invoice.pdf_path)) {
        // File already exists, just open it
        alert(`${t('pdfSavedAt')} ${invoice.pdf_path}`);
      } else {
        // Regenerate PDF
        alert(t('generatingPdf'));
        // For now, just alert
      }
    } catch (error) {
      console.error('[InvoiceHistory] Error downloading PDF:', error);
      alert(t('errorDownloadingPdf'));
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await db.run('DELETE FROM invoices WHERE id = ?', [id]);
        await loadInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert(t('errorDeletingInvoice'));
      }
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    try {
      await db.run('UPDATE invoices SET status = ? WHERE id = ?', ['paid', id]);
      await loadInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert(t('errorUpdatingInvoice'));
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  const getTotalRevenue = () => {
    return filteredInvoices
      .filter(inv => inv.status !== 'draft')
      .reduce((sum, inv) => sum + inv.total, 0);
  };

  const getDraftCount = () => {
    return filteredInvoices.filter(inv => inv.status === 'draft').length;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('invoiceHistory')}</h1>
        <p className="text-muted-foreground mt-1">{t('invoiceHistoryDesc')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('totalInvoices')}</p>
          <p className="text-2xl font-bold mt-1">{filteredInvoices.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(getTotalRevenue())}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('draftInvoices')}</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{getDraftCount()}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder={t('searchInvoiceOrCustomer')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="sent">{t('sent')}</option>
            <option value="paid">{t('paid')}</option>
          </select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('invoiceNumber')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('customer')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('date')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('amount')}</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">{t('status')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {t('loadingInvoices')}
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{invoice.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'draft'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {invoice.status === 'paid' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {invoice.status === 'paid'
                          ? t('paid')
                          : invoice.status === 'draft'
                            ? t('draft')
                            : t('sent')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(invoice)}
                          title={t('viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          title={t('downloadPdf')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {invoice.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            title={t('markAsPaid')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          title={t('delete')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Detail Modal */}
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
