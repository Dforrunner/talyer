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

export interface InvoiceLineItem {
  type?: string | null;
  description?: string | null;
  product_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
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
  labor: 'labor',
  partsMaterials: 'partsMaterials',
  laborSubtotal: 'laborSubtotal',
  partsMaterialsSubtotal: 'partsMaterialsSubtotal',
  subtotal: 'subtotal',
  tax: 'tax',
  totalAmount: 'totalAmount',
  total: 'total',
  notes: 'notes',
  thankYou: 'thankYou',
  vehicleInformation: 'vehicleInformation',
  vehicleMake: 'vehicleMake',
  vehicleModel: 'vehicleModel',
  vehicleYear: 'vehicleYear',
  licensePlate: 'licensePlate',
  noLaborAddedYet: 'noLaborAddedYet',
  noPartsMaterialsAddedYet: 'noPartsMaterialsAddedYet',
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

export function getInvoiceItemDescription(item: InvoiceLineItem) {
  return String(item.description || item.product_name || '');
}

export function shouldRenderInvoiceLineItem(item: InvoiceLineItem) {
  const description = getInvoiceItemDescription(item).trim();
  const unitPrice = Number(item.unit_price) || 0;
  const amount = Number(item.amount) || 0;

  return Boolean(description || unitPrice > 0 || amount > 0);
}

export function filterInvoiceLineItemsForOutput(items: InvoiceLineItem[] = []) {
  return items.filter(shouldRenderInvoiceLineItem);
}

export function splitInvoiceItemsByType(items: InvoiceLineItem[] = []) {
  const laborItems: InvoiceLineItem[] = [];
  const partsMaterialItems: InvoiceLineItem[] = [];

  items.forEach((item) => {
    if (item.type === 'labor') {
      laborItems.push(item);
      return;
    }

    partsMaterialItems.push(item);
  });

  return { laborItems, partsMaterialItems };
}

export function calculateInvoiceItemsSubtotal(items: InvoiceLineItem[] = []) {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
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
    labor: t('labor'),
    partsMaterials: t('partsMaterials'),
    laborSubtotal: t('laborSubtotal'),
    partsMaterialsSubtotal: t('partsMaterialsSubtotal'),
    subtotal: t('subtotal'),
    tax: t('tax'),
    totalAmount: t('totalAmount'),
    total: t('total'),
    notes: t('notes'),
    thankYou: t('thankYou'),
    vehicleInformation: t('vehicleInformation'),
    vehicleMake: t('vehicleMake'),
    vehicleModel: t('vehicleModel'),
    vehicleYear: t('vehicleYear'),
    licensePlate: t('licensePlate'),
    noLaborAddedYet: t('noLaborAddedYet'),
    noPartsMaterialsAddedYet: t('noPartsMaterialsAddedYet'),
    openInvoice: t('openInvoice'),
  };
}
