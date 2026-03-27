'use client';

import { useEffect, useState } from 'react';
import { BookUser, CarFront, Mail, Phone, ReceiptText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTableHeader } from '@/components/ui/sortable-table-header';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { useLanguage } from '@/hooks/use-language';
import { db } from '@/lib/db';
import { normalizePhilippinePhone } from '@/lib/phone-utils';
import { type CustomerContactFields } from '@/lib/customer-contacts';
import { getNextSortConfig, sortRows, type SortConfig } from '@/lib/table-sort';

interface InvoiceContactRow {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  license_plate: string | null;
  invoice_date: string | null;
  created_at: string;
}

interface CustomerContactRecord extends CustomerContactFields {
  key: string;
  invoice_count: number;
  last_invoice_date: string;
  last_invoice_number: string;
}

interface CustomerContactsPageProps {
  onUseContact: (contact: CustomerContactFields) => void | Promise<void>;
}

type CustomerContactSortKey =
  | 'customer_name'
  | 'customer_phone'
  | 'customer_email'
  | 'vehicle'
  | 'last_invoice_date'
  | 'invoice_count';

const toText = (value: unknown) => String(value || '').trim();

const buildVehicleSummary = (contact: CustomerContactFields) =>
  [
    contact.vehicle_year,
    contact.vehicle_make,
    contact.vehicle_model,
    contact.license_plate ? `(${contact.license_plate})` : '',
  ]
    .filter(Boolean)
    .join(' ');

const buildContactKey = (row: InvoiceContactRow) => {
  const name = toText(row.customer_name).toLowerCase();
  const phone = normalizePhilippinePhone(toText(row.customer_phone)).toLowerCase();
  const email = toText(row.customer_email).toLowerCase();

  return `${name}::${phone}::${email}`;
};

const CustomerContactsPage: React.FC<CustomerContactsPageProps> = ({
  onUseContact,
}) => {
  const { formatDate, t } = useLanguage();
  const { showAlert } = useAppDialog();
  const [contacts, setContacts] = useState<CustomerContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<CustomerContactSortKey>>({
    key: 'customer_name',
    direction: 'asc',
  });

  useEffect(() => {
    void loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const rows = await db.query(
        `SELECT id, invoice_number, customer_name, customer_phone, customer_email,
                vehicle_make, vehicle_model, vehicle_year, license_plate,
                invoice_date, created_at
         FROM invoices
         WHERE TRIM(COALESCE(customer_name, '')) != ''
         ORDER BY COALESCE(NULLIF(invoice_date, ''), DATE(created_at)) DESC, id DESC`,
      );

      const grouped = new Map<string, CustomerContactRecord>();

      for (const row of (rows || []) as InvoiceContactRow[]) {
        const key = buildContactKey(row);
        const current = grouped.get(key);
        const nextFields: CustomerContactFields = {
          customer_name: toText(row.customer_name),
          customer_phone: normalizePhilippinePhone(toText(row.customer_phone)),
          customer_email: toText(row.customer_email),
          vehicle_make: toText(row.vehicle_make),
          vehicle_model: toText(row.vehicle_model),
          vehicle_year: toText(row.vehicle_year),
          license_plate: toText(row.license_plate).toUpperCase(),
        };
        const lastInvoiceDate = toText(row.invoice_date) || row.created_at;

        if (!current) {
          grouped.set(key, {
            key,
            ...nextFields,
            invoice_count: 1,
            last_invoice_date: lastInvoiceDate,
            last_invoice_number: toText(row.invoice_number),
          });
          continue;
        }

        grouped.set(key, {
          ...current,
          customer_phone: current.customer_phone || nextFields.customer_phone,
          customer_email: current.customer_email || nextFields.customer_email,
          vehicle_make: current.vehicle_make || nextFields.vehicle_make,
          vehicle_model: current.vehicle_model || nextFields.vehicle_model,
          vehicle_year: current.vehicle_year || nextFields.vehicle_year,
          license_plate: current.license_plate || nextFields.license_plate,
          invoice_count: current.invoice_count + 1,
        });
      }

      setContacts(
        Array.from(grouped.values()).sort((a, b) =>
          b.last_invoice_date.localeCompare(a.last_invoice_date),
        ),
      );
    } catch (error) {
      console.error('[CustomerContacts] Error loading contacts:', error);
      setContacts([]);
      await showAlert({
        title: t('error'),
        description: t('unableToLoadCustomerContacts'),
        confirmLabel: t('close'),
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      contact.customer_name.toLowerCase().includes(query) ||
      contact.customer_phone.toLowerCase().includes(query) ||
      contact.customer_email.toLowerCase().includes(query) ||
      buildVehicleSummary(contact).toLowerCase().includes(query) ||
      contact.last_invoice_number.toLowerCase().includes(query)
    );
  });

  const contactsWithPhone = contacts.filter((contact) => contact.customer_phone).length;
  const contactsWithEmail = contacts.filter((contact) => contact.customer_email).length;
  const sortedContacts = sortRows(filteredContacts, sortConfig, (contact, key) => {
    switch (key) {
      case 'customer_name':
        return contact.customer_name;
      case 'customer_phone':
        return contact.customer_phone;
      case 'customer_email':
        return contact.customer_email;
      case 'vehicle':
        return buildVehicleSummary(contact);
      case 'last_invoice_date':
        return contact.last_invoice_date;
      case 'invoice_count':
        return Number(contact.invoice_count) || 0;
      default:
        return '';
    }
  });

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('customerContacts')}</h1>
        <p className="mt-1 text-muted-foreground">{t('customerContactsDesc')}</p>
      </div>

      <Card className="p-4">
        <Input
          placeholder={t('searchCustomerContacts')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('customer')}
                    sortKey="customer_name"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('phone')}
                    sortKey="customer_phone"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey),
                      )
                    }
                  />
                </th>
                <th className="px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('email')}
                    sortKey="customer_email"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey),
                      )
                    }
                  />
                </th>
                <th className="px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('lastVehicle')}
                    sortKey="vehicle"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('lastInvoiceDate')}
                    sortKey="last_invoice_date"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey, 'desc'),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('totalVisits')}
                    sortKey="invoice_count"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as CustomerContactSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3  text-sm font-semibold whitespace-nowrap">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {t('loading')}
                  </td>
                </tr>
              ) : sortedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {t('noCustomerContacts')}
                  </td>
                </tr>
              ) : (
                sortedContacts.map((contact) => {
                  const vehicleSummary = buildVehicleSummary(contact);

                  return (
                    <tr
                      key={contact.key}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                            <BookUser className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {contact.customer_name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
                              {contact.last_invoice_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {contact.customer_phone ? (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {contact.customer_phone}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {contact.customer_email ? (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {contact.customer_email}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {vehicleSummary ? (
                          <span className="inline-flex items-center gap-2 text-foreground">
                            <CarFront className="h-4 w-4 text-muted-foreground" />
                            {vehicleSummary}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('noVehicleInfo')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(contact.last_invoice_date)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-muted-foreground" />
                          {contact.invoice_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button onClick={() => void onUseContact(contact)}>
                          {t('useOnInvoice')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CustomerContactsPage;
