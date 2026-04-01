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

interface BuildInvoicePrintHtmlOptions {
  invoice: any;
  businessSettings: any;
  logoSrc?: string | null;
  fallbackBusinessName?: string;
  logoAlt?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderOptionalLine = (value?: string | null) =>
  value ? `<div>${escapeHtml(value)}</div>` : "";

const formatBusinessAddress = (businessSettings: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
} | null | undefined) =>
  [businessSettings?.address, businessSettings?.city, businessSettings?.postal_code]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

export function buildInvoicePrintHtml({
  invoice,
  businessSettings,
  logoSrc,
  fallbackBusinessName = "ShopFlow",
  logoAlt = "Logo",
}: BuildInvoicePrintHtmlOptions) {
  const invoiceLanguage = resolveInvoiceLanguage(invoice?.invoice_language);
  const invoiceT = getInvoiceTranslator(invoiceLanguage);
  const vehicleInfoLines = buildVehicleInfoLines(invoice, invoiceLanguage);
  const hasVehicleInfo = vehicleInfoLines.length > 0;
  const currency = businessSettings?.currency || "PHP";
  const dueDateLabel = invoice?.due_upon_receipt
    ? invoiceT("paymentDueUponReceipt")
    : formatInvoiceDate(invoice?.due_date || invoice?.invoice_date, invoiceLanguage);
  const businessAddress = formatBusinessAddress(businessSettings);

  const formatMoney = (amount: number | null | undefined) =>
    formatInvoiceCurrency(amount, currency, invoiceLanguage);
  const outputItems = filterInvoiceLineItemsForOutput(invoice?.items || []);
  const { laborItems, partsMaterialItems } = splitInvoiceItemsByType(
    outputItems,
  );

  const renderItemsTable = (
    title: string,
    items: any[],
    emptyLabel: string,
    subtotalLabel: string,
  ) => {
    const sectionSubtotal = calculateInvoiceItemsSubtotal(items);
    const itemRows =
      items.length > 0
        ? items
            .map(
              (item: any) => `
                <tr>
                  <td class="cell cell-left">${escapeHtml(
                    getInvoiceItemDescription(item),
                  )}</td>
                  <td class="cell cell-center">${escapeHtml(
                    item?.quantity ?? "",
                  )}</td>
                  <td class="cell cell-right">${escapeHtml(
                    formatMoney(item?.unit_price),
                  )}</td>
                  <td class="cell cell-right cell-strong">${escapeHtml(
                    formatMoney(item?.amount),
                  )}</td>
                </tr>
              `,
            )
            .join("")
        : `
            <tr>
              <td class="cell cell-empty" colspan="4">${escapeHtml(
                emptyLabel,
              )}</td>
            </tr>
          `;

    return `
      <div class="table-section">
        <div class="table-section-title">${escapeHtml(title.toUpperCase())}</div>
        <div class="table-shell">
          <table class="table">
            <thead>
              <tr class="thead-row">
                <th class="head-cell head-left">${escapeHtml(
                  invoiceT("description"),
                )}</th>
                <th class="head-cell head-center" style="width:72px">${escapeHtml(
                  invoiceT("quantityShort"),
                )}</th>
                <th class="head-cell head-right" style="width:106px">${escapeHtml(
                  invoiceT("unitPrice"),
                )}</th>
                <th class="head-cell head-right" style="width:112px">${escapeHtml(
                  invoiceT("amount"),
                )}</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="section-subtotal">
            <div class="section-subtotal-line">
              <span>${escapeHtml(subtotalLabel)}:</span>
              <span>${escapeHtml(formatMoney(sectionSubtotal))}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="${escapeHtml(invoiceLanguage)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(invoice?.invoice_number || invoiceT("invoiceLabel"))}</title>
    <style>
      @page {
        size: A4;
        margin: 8mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #333;
        line-height: 1.25;
        background: #fff;
      }

      .document {
        width: 100%;
        max-width: 100%;
      }

      .header {
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 2px solid #2c3e50;
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
      }

      .business-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }

      .business-name {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
        line-height: 1.1;
      }

      .business-meta {
        font-size: 10px;
        color: #666;
        line-height: 1.3;
      }

      .logo {
        display: block;
        max-width: 100px;
        max-height: 62px;
        object-fit: contain;
        flex-shrink: 0;
      }

      .doc-meta {
        text-align: right;
      }

      .doc-title {
        font-size: 26px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .doc-line {
        font-size: 11px;
        margin-bottom: 2px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: ${hasVehicleInfo ? "1fr 1fr" : "1fr"};
        gap: 12px;
        margin-top: 6px;
        margin-bottom: 10px;
      }

      .section-label {
        font-size: 10px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .customer-name {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 2px;
      }

      .muted {
        font-size: 10px;
        color: #666;
        line-height: 1.25;
      }

      .table {
        width: 100%;
        margin-bottom: 6px;
        border-collapse: collapse;
      }

      .table-section {
        margin-bottom: 10px;
      }

      .table-shell {
        border: 1px solid #d8dee6;
        border-radius: 6px;
        overflow: hidden;
        padding: 0 6px 5px;
      }

      .table-section-title {
        font-size: 10px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .thead-row {
        background: #f5f5f5;
        border-bottom: 2px solid #2c3e50;
      }

      .head-cell {
        padding: 4px 6px;
        font-size: 8px;
        font-weight: 700;
        white-space: nowrap;
        border-bottom: 2px solid #2c3e50;
      }

      .cell {
        padding: 4px 6px;
        border-bottom: 1px solid #ddd;
      }

      .cell-left {
        text-align: left;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.2;
      }

      .head-left {
        text-align: left;
      }

      .cell-center,
      .head-center {
        text-align: center;
      }

      .cell-right,
      .head-right {
        text-align: right;
      }

      .cell-strong {
        font-weight: 700;
      }

      .cell-empty {
        text-align: center;
        color: #666;
        font-style: italic;
      }

      .section-subtotal {
        width: 240px;
        margin-left: auto;
        padding-top: 5px;
      }

      .section-subtotal-line {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        font-weight: 700;
        color: #2c3e50;
      }

      .summary {
        width: 240px;
        margin-left: auto;
        margin-top: 10px;
        margin-bottom: 10px;
      }

      .summary-inner {
        border-top: 1px solid #ddd;
        padding-top: 5px;
        margin-bottom: 6px;
      }

      .summary-line {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 4px;
        font-size: 11px;
      }

      .summary-total {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-top: 6px;
        border-top: 2px solid #2c3e50;
        font-size: 15px;
        font-weight: 700;
        color: #2c3e50;
      }

      .notes {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
      }

      .notes-body {
        font-size: 10px;
        color: #666;
        white-space: pre-wrap;
        line-height: 1.25;
      }

      .footer {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 10px;
        color: #999;
      }

      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="document">
      <div class="header">
        <div class="header-row">
          <div>
            <div class="business-head">
              ${
                logoSrc
                  ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(logoAlt)}" />`
                  : ""
              }
              <div class="business-name">${escapeHtml(
                businessSettings?.business_name || fallbackBusinessName,
              )}</div>
            </div>
            <div class="business-meta">
              ${renderOptionalLine(businessAddress)}
              ${
                businessSettings?.phone
                  ? `<div>${escapeHtml(invoiceT("phone"))}: ${escapeHtml(
                      businessSettings.phone,
                    )}</div>`
                  : ""
              }
              ${
                businessSettings?.email
                  ? `<div>${escapeHtml(invoiceT("email"))}: ${escapeHtml(
                      businessSettings.email,
                    )}</div>`
                  : ""
              }
              ${
                businessSettings?.tax_id
                  ? `<div>${escapeHtml(invoiceT("taxId"))}: ${escapeHtml(
                      businessSettings.tax_id,
                    )}</div>`
                  : ""
              }
            </div>
          </div>

          <div class="doc-meta">
            <div class="doc-title">${escapeHtml(
              invoiceT("invoiceLabel").toUpperCase(),
            )}</div>
            <div class="doc-line"><strong>${escapeHtml(
              invoiceT("invoiceNumber"),
            )}:</strong> ${escapeHtml(invoice?.invoice_number || "")}</div>
            <div class="doc-line"><strong>${escapeHtml(
              invoiceT("date"),
            )}:</strong> ${escapeHtml(
              formatInvoiceDate(invoice?.invoice_date, invoiceLanguage),
            )}</div>
            <div class="doc-line"><strong>${escapeHtml(
              invoiceT("dueDate"),
            )}:</strong> ${escapeHtml(dueDateLabel)}</div>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div class="section-label">${escapeHtml(
            `${invoiceT("billTo").toUpperCase()}:`,
          )}</div>
          <div class="customer-name">${escapeHtml(invoice?.customer_name || "")}</div>
          ${
            invoice?.customer_phone
              ? `<div class="muted">${escapeHtml(invoiceT("phone"))}: ${escapeHtml(
                  invoice.customer_phone,
                )}</div>`
              : ""
          }
          ${
            invoice?.customer_email
              ? `<div class="muted">${escapeHtml(invoiceT("email"))}: ${escapeHtml(
                  invoice.customer_email,
                )}</div>`
              : ""
          }
        </div>

        ${
          hasVehicleInfo
            ? `<div>
                <div class="section-label">${escapeHtml(
                  `${invoiceT("vehicleInformation").toUpperCase()}:`,
                )}</div>
                <div class="muted">
                  ${vehicleInfoLines
                    .map((line) => `<div>${escapeHtml(line)}</div>`)
                    .join("")}
                </div>
              </div>`
            : ""
        }
      </div>

      ${renderItemsTable(
        invoiceT("labor"),
        laborItems,
        invoiceT("noLaborAddedYet"),
        invoiceT("laborSubtotal"),
      )}
      ${renderItemsTable(
        invoiceT("partsMaterials"),
        partsMaterialItems,
        invoiceT("noPartsMaterialsAddedYet"),
        invoiceT("partsMaterialsSubtotal"),
      )}

      <div class="summary">
        <div class="summary-inner">
          ${
            Number(invoice?.tax_rate) > 0
              ? `<div class="summary-line">
                  <span>${escapeHtml(invoiceT("subtotal"))}:</span>
                  <span>${escapeHtml(formatMoney(invoice?.subtotal))}</span>
                </div>
                <div class="summary-line">
                  <span>${escapeHtml(invoiceT("tax"))} (${escapeHtml(
                    invoice?.tax_rate,
                  )}%):</span>
                  <span>${escapeHtml(formatMoney(invoice?.tax_amount))}</span>
                </div>`
              : ""
          }
          <div class="summary-total">
            <span>${escapeHtml(invoiceT("totalAmount").toUpperCase())}:</span>
            <span>${escapeHtml(formatMoney(invoice?.total))}</span>
          </div>
        </div>
      </div>

      ${
        invoice?.notes
          ? `<div class="notes">
              <div class="section-label">${escapeHtml(invoiceT("notes"))}:</div>
              <div class="notes-body">${escapeHtml(invoice.notes)}</div>
            </div>`
          : ""
      }

      <div class="footer">${escapeHtml(invoiceT("thankYou"))}</div>
    </div>
  </body>
</html>`;
}
