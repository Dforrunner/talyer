import {
  defaultLanguage,
  supportedLanguages,
  translations,
  type Language,
  type TranslationKey,
} from '@/lib/translations';

export interface InvoiceVehicleInfo {
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  license_plate?: string | null;
}

const invoiceTranslationKeys = {
  invoiceLabel: 'invoiceLabel',
  invoiceNumber: 'invoiceNumber',
  date: 'date',
  dueDate: 'dueDate',
  paymentDueUponReceipt: 'paymentDueUponReceipt',
  billTo: 'billTo',
  phone: 'phone',
  email: 'email',
  taxId: 'taxId',
  description: 'description',
  quantityShort: 'quantityShort',
  unitPrice: 'unitPrice',
  amount: 'amount',
  subtotal: 'subtotal',
  tax: 'tax',
  total: 'total',
  notes: 'notes',
  thankYou: 'thankYou',
  vehicleInformation: 'vehicleInformation',
  vehicleMake: 'vehicleMake',
  vehicleModel: 'vehicleModel',
  vehicleYear: 'vehicleYear',
  licensePlate: 'licensePlate',
  openInvoice: 'openInvoice',
} satisfies Record<string, TranslationKey>;

export function resolveInvoiceLanguage(value?: string | null): Language {
  if (value && value in supportedLanguages) {
    return value as Language;
  }

  return defaultLanguage;
}

export function getInvoiceTranslator(language?: string | null) {
  const resolvedLanguage = resolveInvoiceLanguage(language);

  return (key: keyof typeof invoiceTranslationKeys) =>
    translations[resolvedLanguage][invoiceTranslationKeys[key]] ??
    translations[defaultLanguage][invoiceTranslationKeys[key]] ??
    key;
}

export function formatInvoiceCurrency(
  amount: number | null | undefined,
  currency = 'PHP',
  language?: string | null,
) {
  const resolvedLanguage = resolveInvoiceLanguage(language);
  const normalizedAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

  return new Intl.NumberFormat(supportedLanguages[resolvedLanguage].locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizedAmount);
}

export function formatInvoiceDate(
  value: Date | string | number,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const resolvedLanguage = resolveInvoiceLanguage(language);

  return new Intl.DateTimeFormat(
    supportedLanguages[resolvedLanguage].locale,
    options,
  ).format(new Date(value));
}

export function buildVehicleInfoLines(
  invoice: InvoiceVehicleInfo,
  language?: string | null,
) {
  const t = getInvoiceTranslator(language);
  const fields = [
    invoice.vehicle_make
      ? `${t('vehicleMake')}: ${invoice.vehicle_make}`
      : null,
    invoice.vehicle_model
      ? `${t('vehicleModel')}: ${invoice.vehicle_model}`
      : null,
    invoice.vehicle_year
      ? `${t('vehicleYear')}: ${invoice.vehicle_year}`
      : null,
    invoice.license_plate
      ? `${t('licensePlate')}: ${invoice.license_plate}`
      : null,
  ].filter(Boolean) as string[];

  return fields;
}

export function buildInvoicePdfLabels(language?: string | null) {
  const t = getInvoiceTranslator(language);

  return {
    invoiceLabel: t('invoiceLabel'),
    invoiceNumber: t('invoiceNumber'),
    date: t('date'),
    dueDate: t('dueDate'),
    paymentDueUponReceipt: t('paymentDueUponReceipt'),
    billTo: t('billTo'),
    phone: t('phone'),
    email: t('email'),
    taxId: t('taxId'),
    description: t('description'),
    quantityShort: t('quantityShort'),
    unitPrice: t('unitPrice'),
    amount: t('amount'),
    subtotal: t('subtotal'),
    tax: t('tax'),
    total: t('total'),
    notes: t('notes'),
    thankYou: t('thankYou'),
    vehicleInformation: t('vehicleInformation'),
    vehicleMake: t('vehicleMake'),
    vehicleModel: t('vehicleModel'),
    vehicleYear: t('vehicleYear'),
    licensePlate: t('licensePlate'),
    openInvoice: t('openInvoice'),
  };
}
