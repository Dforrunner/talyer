import {
  buildVehicleInfoLines,
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceTranslator,
  resolveInvoiceLanguage,
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

export function buildInvoicePrintHtml({
  invoice,
  businessSettings,
  logoSrc,
  fallbackBusinessName = "Shop Manager",
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

  const formatMoney = (amount: number | null | undefined) =>
    formatInvoiceCurrency(amount, currency, invoiceLanguage);

  const itemRows = (invoice?.items || [])
    .map((item: any) => {
      const description = item?.description || item?.product_name || "";

      return `
        <tr>
          <td class="cell cell-left">${escapeHtml(description)}</td>
          <td class="cell cell-center">${escapeHtml(item?.quantity ?? "")}</td>
          <td class="cell cell-right">${escapeHtml(formatMoney(item?.unit_price))}</td>
          <td class="cell cell-right cell-strong">${escapeHtml(formatMoney(item?.amount))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${escapeHtml(invoiceLanguage)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(invoice?.invoice_number || invoiceT("invoiceLabel"))}</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #333;
        line-height: 1.5;
        background: #fff;
      }

      .document {
        width: 100%;
        max-width: 100%;
      }

      .header {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 2px solid #2c3e50;
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
      }

      .business-name {
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 5px;
      }

      .business-meta {
        font-size: 12px;
        color: #666;
        line-height: 1.6;
      }

      .logo {
        display: block;
        max-width: 120px;
        max-height: 80px;
        margin-bottom: 10px;
      }

      .doc-meta {
        text-align: right;
      }

      .doc-title {
        font-size: 32px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .doc-line {
        font-size: 13px;
        margin-bottom: 4px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: ${hasVehicleInfo ? "1fr 1fr" : "1fr"};
        gap: 20px;
        margin-top: 14px;
        margin-bottom: 24px;
      }

      .section-label {
        font-size: 12px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 8px;
      }

      .customer-name {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .muted {
        font-size: 12px;
        color: #666;
      }

      .table {
        width: 100%;
        margin-bottom: 20px;
        border-collapse: collapse;
      }

      .thead-row {
        background: #f5f5f5;
        border-bottom: 2px solid #2c3e50;
      }

      .head-cell {
        padding: 10px 8px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        border-bottom: 2px solid #2c3e50;
      }

      .cell {
        padding: 10px 8px;
        border-bottom: 1px solid #ddd;
      }

      .cell-left,
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

      .summary {
        width: 280px;
        margin-left: auto;
        margin-bottom: 20px;
      }

      .summary-inner {
        border-top: 1px solid #ddd;
        padding-top: 10px;
        margin-bottom: 8px;
      }

      .summary-line {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 8px;
      }

      .summary-total {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-top: 10px;
        border-top: 2px solid #2c3e50;
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
      }

      .notes {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }

      .notes-body {
        font-size: 12px;
        color: #666;
        white-space: pre-wrap;
      }

      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 11px;
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
            ${
              logoSrc
                ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(logoAlt)}" />`
                : ""
            }
            <div class="business-name">${escapeHtml(
              businessSettings?.business_name || fallbackBusinessName,
            )}</div>
            <div class="business-meta">
              ${renderOptionalLine(businessSettings?.address)}
              ${
                businessSettings?.city || businessSettings?.postal_code
                  ? `<div>${escapeHtml(
                      [businessSettings?.city, businessSettings?.postal_code]
                        .filter(Boolean)
                        .join(" "),
                    )}</div>`
                  : ""
              }
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

      <div class="summary">
        <div class="summary-inner">
          <div class="summary-line">
            <span>${escapeHtml(invoiceT("subtotal"))}:</span>
            <span>${escapeHtml(formatMoney(invoice?.subtotal))}</span>
          </div>
          ${
            Number(invoice?.tax_rate) > 0
              ? `<div class="summary-line">
                  <span>${escapeHtml(invoiceT("tax"))} (${escapeHtml(
                    invoice?.tax_rate,
                  )}%):</span>
                  <span>${escapeHtml(formatMoney(invoice?.tax_amount))}</span>
                </div>`
              : ""
          }
          <div class="summary-total">
            <span>${escapeHtml(invoiceT("total").toUpperCase())}:</span>
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
