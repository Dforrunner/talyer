'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { PenSquare, CarFront, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { normalizePhilippinePhone } from '@/lib/phone-utils';

interface ActiveInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  invoice_date: string;
  subtotal: number;
  total: number;
  updated_at: string;
  created_at: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  license_plate: string | null;
}

interface ActiveInvoicesPageProps {
  onEditInvoice: (invoiceId: number) => void;
}

const ActiveInvoicesPage: React.FC<ActiveInvoicesPageProps> = ({
  onEditInvoice,
}) => {
  const { formatCurrency, formatDate, t } = useLanguage();
  const { showAlert, showConfirm } = useAppDialog();
  const [invoices, setInvoices] = useState<ActiveInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const result = await db.query(
        `SELECT id, invoice_number, customer_name, customer_phone, customer_email,
                invoice_date, subtotal, total,
                updated_at, created_at, vehicle_make, vehicle_model, vehicle_year,
                license_plate
         FROM invoices
         WHERE status = 'draft'
         ORDER BY updated_at DESC, id DESC`,
      );
      setInvoices(
        (result || []).map((invoice: ActiveInvoice) => ({
          ...invoice,
          customer_phone: normalizePhilippinePhone(invoice.customer_phone || ''),
        })),
      );
    } catch (error) {
      console.error('[ActiveInvoices] Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const vehicleSummary = [
      invoice.vehicle_year,
      invoice.vehicle_make,
      invoice.vehicle_model,
      invoice.license_plate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const query = searchTerm.toLowerCase();

    return (
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.customer_name.toLowerCase().includes(query) ||
      (invoice.customer_phone || '').toLowerCase().includes(query) ||
      (invoice.customer_email || '').toLowerCase().includes(query) ||
      vehicleSummary.includes(query)
    );
  });

  const renderVehicleSummary = (invoice: ActiveInvoice) => {
    const parts = [
      invoice.vehicle_year,
      invoice.vehicle_make,
      invoice.vehicle_model,
    ].filter(Boolean);

    if (invoice.license_plate) {
      parts.push(`(${invoice.license_plate})`);
    }

    return parts.length > 0 ? parts.join(' ') : t('noVehicleInfo');
  };

  const getDaysOpenLabel = (invoiceDate: string) => {
    const openedDate = new Date(invoiceDate);
    const today = new Date();
    openedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysOpen = Math.max(
      0,
      Math.floor((today.getTime() - openedDate.getTime()) / 86400000),
    );

    return daysOpen === 0 ? t('openedToday') : `${daysOpen} ${t('daysOpen')}`;
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    const confirmed = await showConfirm({
      title: t('deleteDraftConfirm'),
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
          [invoiceId],
        );

        for (const item of invoiceItems || []) {
          await db.run(
            'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
            [item.quantity, item.product_id],
          );
        }

        await db.run('DELETE FROM invoices WHERE id = ?', [invoiceId]);
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      await loadInvoices();
    } catch (error) {
      console.error('[ActiveInvoices] Error deleting invoice:', error);
      await showAlert({
        title: t('errorDeletingInvoice'),
        confirmLabel: t('close'),
      });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('activeInvoices')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('activeInvoicesDesc')}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <Input
            placeholder={t('searchActiveInvoices')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">
          {t('loadingInvoices')}
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {t('noActiveInvoices')}
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.invoice_number}
                  </p>
                  <h2 className="text-xl font-semibold mt-1">
                    {invoice.customer_name}
                  </h2>
                  {invoice.customer_phone && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {invoice.customer_phone}
                    </p>
                  )}
                  {invoice.customer_email && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.customer_email}
                    </p>
                  )}
                </div>
                <span className="inline-flex rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">
                  {t('draft')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('receivedDate')}</p>
                  <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('lastUpdated')}</p>
                  <p className="font-medium">{formatDate(invoice.updated_at)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground flex items-center gap-2">
                    <CarFront className="w-4 h-4" />
                    {t('vehicleInformation')}
                  </p>
                  <p className="font-medium">{renderVehicleSummary(invoice)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('createdDate')}</p>
                  <p className="font-medium">{formatDate(invoice.created_at)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getDaysOpenLabel(invoice.invoice_date)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('total')}</p>
                  <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={() => onEditInvoice(invoice.id)}
                  className="gap-2"
                >
                  <PenSquare className="w-4 h-4" />
                  {t('continueWorking')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDeleteInvoice(invoice.id)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteDraft')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveInvoicesPage;
