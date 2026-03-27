"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, Plus, Printer, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { db, file } from "@/lib/db";
import { useFilePreview } from "@/hooks/use-file-preview";
import {
  supportedLanguages,
  type Language,
  useLanguage,
} from "@/hooks/use-language";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { getLocalDateInputValue } from "@/lib/date-utils";
import { buildInvoicePrintHtml } from "@/lib/invoice-print-html";
import { generateInvoicePdfForInvoice } from "@/lib/invoice-pdf";
import { normalizePhilippinePhone } from "@/lib/phone-utils";
import InvoicePreview from "@/components/invoice-preview";

interface Product {
  id: number;
  name: string;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
}

interface InvoiceItem {
  id: string;
  type: "product" | "labor";
  product_id?: number;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  amount: number;
}

interface InvoiceForm {
  id: number | null;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  license_plate: string;
  invoice_date: string;
  due_date: string;
  due_upon_receipt: boolean;
  invoice_language: Language;
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: "draft" | "open" | "paid";
}

interface InvoiceCreatorPageProps {
  invoiceId?: number | null;
  onDraftSaved?: (invoiceId: number) => void;
  onInvoiceCompleted?: (invoiceId: number) => void;
  onEditorStateChange?: (state: {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
  }) => void;
}

interface SaveInvoiceOptions {
  silent?: boolean;
}

const createItemId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildInvoiceSnapshot = (invoice: InvoiceForm) =>
  JSON.stringify({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name.trim(),
    customer_phone: normalizePhilippinePhone(invoice.customer_phone),
    customer_email: invoice.customer_email.trim(),
    vehicle_make: invoice.vehicle_make.trim(),
    vehicle_model: invoice.vehicle_model.trim(),
    vehicle_year: invoice.vehicle_year.trim(),
    license_plate: invoice.license_plate.trim(),
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    due_upon_receipt: invoice.due_upon_receipt,
    invoice_language: invoice.invoice_language,
    notes: invoice.notes.trim(),
    subtotal: Number(invoice.subtotal) || 0,
    tax_rate: Number(invoice.tax_rate) || 0,
    tax_amount: Number(invoice.tax_amount) || 0,
    total: Number(invoice.total) || 0,
    status: invoice.status,
    items: invoice.items.map((item) => ({
      type: item.type,
      product_id: item.product_id || null,
      product_name: item.product_name || "",
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      cost_price: Number(item.cost_price) || 0,
      amount: Number(item.amount) || 0,
    })),
  });

const hasMeaningfulInvoiceContent = (invoice: InvoiceForm) =>
  Boolean(
    invoice.customer_name.trim() ||
    invoice.customer_phone.trim() ||
    invoice.customer_email.trim() ||
    invoice.vehicle_make.trim() ||
    invoice.vehicle_model.trim() ||
    invoice.vehicle_year.trim() ||
    invoice.license_plate.trim() ||
    invoice.notes.trim() ||
    invoice.items.length > 0,
  );

const createEmptyInvoice = (
  language: Language,
  defaultTaxRate = 0,
): InvoiceForm => {
  const today = getLocalDateInputValue();

  return {
    id: null,
    invoice_number: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    license_plate: "",
    invoice_date: today,
    due_date: today,
    due_upon_receipt: true,
    invoice_language: language,
    notes: "",
    items: [],
    subtotal: 0,
    tax_rate: defaultTaxRate,
    tax_amount: 0,
    total: 0,
    status: "draft",
  };
};

const InvoiceCreatorPage: React.FC<InvoiceCreatorPageProps> = ({
  invoiceId = null,
  onDraftSaved,
  onInvoiceCompleted,
  onEditorStateChange,
}) => {
  const { formatCurrency, language, t } = useLanguage();
  const { showAlert } = useAppDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [invoice, setInvoice] = useState<InvoiceForm>(
    createEmptyInvoice(language),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving">(
    "saved",
  );
  const logoSrc = useFilePreview(businessSettings?.logo_path);
  const lastSavedSnapshotRef = useRef(buildInvoiceSnapshot(invoice));
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadData(invoiceId);
  }, [invoiceId]);

  useEffect(() => {
    if (
      !invoice.id &&
      !hasMeaningfulInvoiceContent(invoice) &&
      invoice.invoice_language !== language
    ) {
      setInvoice((current) => ({
        ...current,
        invoice_language: language,
      }));
    }
  }, [invoice, language]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const dirty =
      buildInvoiceSnapshot(invoice) !== lastSavedSnapshotRef.current;
    setHasUnsavedChanges(dirty);

    if (!saving) {
      setSaveStatus(dirty ? "dirty" : "saved");
    }
  }, [invoice, loading, saving]);

  useEffect(() => {
    onEditorStateChange?.({
      hasUnsavedChanges,
      isSaving: saving,
    });
  }, [hasUnsavedChanges, onEditorStateChange, saving]);

  useEffect(() => {
    return () => {
      onEditorStateChange?.({
        hasUnsavedChanges: false,
        isSaving: false,
      });
    };
  }, [onEditorStateChange]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges && !saving) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, saving]);

  useEffect(() => {
    if (
      loading ||
      saving ||
      !hasUnsavedChanges ||
      !hasMeaningfulInvoiceContent(invoice)
    ) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void saveInvoice("draft", { silent: true });
    }, 1500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, invoice, loading, saving]);

  const loadData = async (targetInvoiceId: number | null) => {
    try {
      setLoading(true);

      const [productRows, settings] = await Promise.all([
        db.query(
          "SELECT id, name, cost_price, selling_price, quantity_in_stock FROM products ORDER BY name",
        ),
        db.get("SELECT * FROM business_settings LIMIT 1"),
      ]);

      setProducts(productRows || []);
      setBusinessSettings(
        settings
          ? {
              ...settings,
              phone: normalizePhilippinePhone(settings.phone || ""),
            }
          : null,
      );

      if (targetInvoiceId) {
        const [invoiceRow, itemRows] = await Promise.all([
          db.get("SELECT * FROM invoices WHERE id = ?", [targetInvoiceId]),
          db.query(
            `SELECT ii.*, p.name as product_name
             FROM invoice_items ii
             LEFT JOIN products p ON ii.product_id = p.id
             WHERE ii.invoice_id = ?
             ORDER BY ii.id ASC`,
            [targetInvoiceId],
          ),
        ]);

        if (invoiceRow) {
          const loadedInvoice: InvoiceForm = {
            id: invoiceRow.id,
            invoice_number: invoiceRow.invoice_number || "",
            customer_name: invoiceRow.customer_name || "",
            customer_phone: normalizePhilippinePhone(
              invoiceRow.customer_phone || "",
            ),
            customer_email: invoiceRow.customer_email || "",
            vehicle_make: invoiceRow.vehicle_make || "",
            vehicle_model: invoiceRow.vehicle_model || "",
            vehicle_year: invoiceRow.vehicle_year || "",
            license_plate: invoiceRow.license_plate || "",
            invoice_date: invoiceRow.invoice_date || getLocalDateInputValue(),
            due_date:
              invoiceRow.due_date ||
              invoiceRow.invoice_date ||
              getLocalDateInputValue(),
            due_upon_receipt: Boolean(invoiceRow.due_upon_receipt),
            invoice_language:
              invoiceRow.invoice_language in supportedLanguages
                ? invoiceRow.invoice_language
                : language,
            notes: invoiceRow.notes || "",
            items: (itemRows || []).map((item: any) => ({
              id: createItemId(),
              type:
                item.item_type === "labor"
                  ? ("labor" as const)
                  : ("product" as const),
              product_id: item.product_id ?? undefined,
              product_name: item.product_name || undefined,
              description: item.description || "",
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.unit_price) || 0,
              cost_price: Number(item.cost_price) || 0,
              amount: Number(item.amount) || 0,
            })),
            subtotal: Number(invoiceRow.subtotal) || 0,
            tax_rate: Number(invoiceRow.tax_rate) || 0,
            tax_amount: Number(invoiceRow.tax_amount) || 0,
            total: Number(invoiceRow.total) || 0,
            status:
              invoiceRow.status === "paid" || invoiceRow.status === "open"
                ? invoiceRow.status
                : "draft",
          };
          lastSavedSnapshotRef.current = buildInvoiceSnapshot(loadedInvoice);
          setHasUnsavedChanges(false);
          setSaveStatus("saved");
          setInvoice(loadedInvoice);
          return;
        }
      }

      const emptyInvoice = createEmptyInvoice(
        language,
        Number(settings?.vat_rate) > 0 ? Number(settings.vat_rate) : 0,
      );
      lastSavedSnapshotRef.current = buildInvoiceSnapshot(emptyInvoice);
      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      setInvoice(emptyInvoice);
    } catch (error) {
      console.error("[InvoiceCreator] Error loading data:", error);
      setProducts([]);
      setBusinessSettings(null);
      const emptyInvoice = createEmptyInvoice(language);
      lastSavedSnapshotRef.current = buildInvoiceSnapshot(emptyInvoice);
      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      setInvoice(emptyInvoice);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
    const total = subtotal + taxAmount;

    return { subtotal, tax_amount: taxAmount, total };
  };

  const updateInvoiceState = (next: Partial<InvoiceForm>) => {
    setInvoice((current) => ({ ...current, ...next }));
  };

  const handleInvoiceFieldChange = (
    field: keyof InvoiceForm,
    value: string | boolean | number,
  ) => {
    setInvoice((current) => {
      let normalizedValue = value;

      if (field === "tax_rate") {
        normalizedValue = Number(value) || 0;
      }

      if (field === "due_upon_receipt") {
        normalizedValue = Boolean(value);
      }

      const next = {
        ...current,
        [field]: normalizedValue,
      } as InvoiceForm;

      if (field === "tax_rate") {
        return {
          ...next,
          ...calculateTotals(next.items, Number(normalizedValue)),
        };
      }

      if (field === "invoice_date" && next.due_upon_receipt) {
        next.due_date = String(normalizedValue);
      }

      if (field === "due_upon_receipt" && normalizedValue) {
        next.due_date = next.invoice_date;
      }

      return next;
    });
  };

  const handleAddItem = (type: "product" | "labor") => {
    const newItem: InvoiceItem = {
      id: createItemId(),
      type,
      description: type === "labor" ? t("laborWork") : "",
      quantity: 1,
      unit_price: 0,
      cost_price: 0,
      amount: 0,
    };

    setInvoice((current) => {
      const items = [...current.items, newItem];
      return {
        ...current,
        items,
        ...calculateTotals(items, current.tax_rate),
      };
    });
  };

  const handleItemChange = (
    itemId: string,
    field: keyof InvoiceItem,
    value: string | number | undefined,
  ) => {
    setInvoice((current) => {
      const items = current.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const updated: InvoiceItem = {
          ...item,
          [field]: value,
        } as InvoiceItem;

        if (field === "product_id") {
          const selectedProduct = products.find(
            (product) => product.id === Number(value),
          );

          if (selectedProduct) {
            updated.product_id = selectedProduct.id;
            updated.product_name = selectedProduct.name;
            updated.description = selectedProduct.name;
            updated.unit_price = Number(selectedProduct.selling_price) || 0;
            updated.cost_price = Number(selectedProduct.cost_price) || 0;
          } else {
            updated.product_id = undefined;
            updated.product_name = undefined;
            updated.description = "";
            updated.unit_price = 0;
            updated.cost_price = 0;
          }
        }

        if (
          field === "quantity" ||
          field === "unit_price" ||
          field === "product_id"
        ) {
          updated.amount =
            (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0);
        }

        return updated;
      });

      return {
        ...current,
        items,
        ...calculateTotals(items, current.tax_rate),
      };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setInvoice((current) => {
      const items = current.items.filter((item) => item.id !== itemId);
      return {
        ...current,
        items,
        ...calculateTotals(items, current.tax_rate),
      };
    });
  };

  const generateInvoiceNumber = async (invoiceDate: string) => {
    const count = await db.get(
      "SELECT COUNT(*) as count FROM invoices WHERE DATE(invoice_date) = ?",
      [invoiceDate],
    );

    const date = new Date(invoiceDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const sequence = String((count?.count || 0) + 1).padStart(4, "0");

    return `INV-${year}${month}${day}-${sequence}`;
  };

  const validateInvoice = async (
    targetStatus: "draft" | "open",
    options: SaveInvoiceOptions = {},
  ) => {
    const shouldAlert = !options.silent;

    if (!invoice.customer_name.trim()) {
      if (shouldAlert) {
        await showAlert({
          title: t("pleaseEnterCustomerName"),
          confirmLabel: t("close"),
        });
      }
      return false;
    }

    if (targetStatus === "open" && invoice.items.length === 0) {
      if (shouldAlert) {
        await showAlert({
          title: t("pleaseAddAtLeastOneItem"),
          confirmLabel: t("close"),
        });
      }
      return false;
    }

    for (const item of invoice.items) {
      if (item.type === "product" && !item.product_id) {
        if (shouldAlert) {
          await showAlert({
            title: t("selectProductBeforeSaving"),
            confirmLabel: t("close"),
          });
        }
        return false;
      }

      if (item.type === "labor" && !item.description.trim()) {
        if (shouldAlert) {
          await showAlert({
            title: t("enterItemDescription"),
            confirmLabel: t("close"),
          });
        }
        return false;
      }

      if (
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        if (shouldAlert) {
          await showAlert({
            title: t("enterValidItemQuantity"),
            confirmLabel: t("close"),
          });
        }
        return false;
      }

      if (
        !Number.isFinite(Number(item.unit_price)) ||
        Number(item.unit_price) < 0
      ) {
        if (shouldAlert) {
          await showAlert({
            title: t("errorSavingInvoice"),
            confirmLabel: t("close"),
          });
        }
        return false;
      }
    }

    return true;
  };

  const saveInvoice = async (
    targetStatus: "draft" | "open",
    options: SaveInvoiceOptions = {},
  ) => {
    if (!(await validateInvoice(targetStatus, options))) {
      return null;
    }

    try {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      setSaving(true);
      setSaveStatus("saving");

      let savedInvoiceId = invoice.id;
      let savedInvoiceNumber = invoice.invoice_number;

      await db.exec("BEGIN");

      try {
        if (savedInvoiceId) {
          const previousItems = await db.query(
            `SELECT product_id, quantity
             FROM invoice_items
             WHERE invoice_id = ? AND product_id IS NOT NULL`,
            [savedInvoiceId],
          );

          for (const item of previousItems || []) {
            await db.run(
              "UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?",
              [item.quantity, item.product_id],
            );
          }
        } else {
          savedInvoiceNumber = await generateInvoiceNumber(
            invoice.invoice_date,
          );
        }

        const dueDate =
          invoice.due_upon_receipt || !invoice.due_date
            ? invoice.invoice_date
            : invoice.due_date;
        const totals = calculateTotals(invoice.items, invoice.tax_rate);
        const completedAt =
          targetStatus === "open" ? new Date().toISOString() : null;

        if (savedInvoiceId) {
          await db.run(
            `UPDATE invoices
             SET invoice_number = ?, customer_name = ?, customer_phone = ?,
                 customer_email = ?, vehicle_make = ?, vehicle_model = ?,
                 vehicle_year = ?, license_plate = ?, invoice_date = ?,
                 due_date = ?, due_upon_receipt = ?, invoice_language = ?,
                 notes = ?, subtotal = ?, tax_amount = ?, tax_rate = ?, total = ?,
                 status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              savedInvoiceNumber,
              invoice.customer_name.trim(),
              normalizePhilippinePhone(invoice.customer_phone),
              invoice.customer_email.trim(),
              invoice.vehicle_make.trim(),
              invoice.vehicle_model.trim(),
              invoice.vehicle_year.trim(),
              invoice.license_plate.trim(),
              invoice.invoice_date,
              dueDate,
              invoice.due_upon_receipt ? 1 : 0,
              invoice.invoice_language,
              invoice.notes.trim(),
              totals.subtotal,
              totals.tax_amount,
              invoice.tax_rate,
              totals.total,
              targetStatus,
              completedAt,
              savedInvoiceId,
            ],
          );

          await db.run("DELETE FROM invoice_items WHERE invoice_id = ?", [
            savedInvoiceId,
          ]);
        } else {
          const result = await db.run(
            `INSERT INTO invoices (
              invoice_number, customer_name, customer_phone, customer_email,
              vehicle_make, vehicle_model, vehicle_year, license_plate,
              invoice_date, due_date, due_upon_receipt, invoice_language,
              status, notes, subtotal, tax_amount, tax_rate, total, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              savedInvoiceNumber,
              invoice.customer_name.trim(),
              normalizePhilippinePhone(invoice.customer_phone),
              invoice.customer_email.trim(),
              invoice.vehicle_make.trim(),
              invoice.vehicle_model.trim(),
              invoice.vehicle_year.trim(),
              invoice.license_plate.trim(),
              invoice.invoice_date,
              dueDate,
              invoice.due_upon_receipt ? 1 : 0,
              invoice.invoice_language,
              targetStatus,
              invoice.notes.trim(),
              totals.subtotal,
              totals.tax_amount,
              invoice.tax_rate,
              totals.total,
              completedAt,
            ],
          );

          savedInvoiceId = result.lastID;
        }

        for (const item of invoice.items) {
          await db.run(
            `INSERT INTO invoice_items (
              invoice_id, product_id, item_type, description, quantity,
              unit_price, cost_price, amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              savedInvoiceId,
              item.product_id || null,
              item.type,
              (item.description || item.product_name || "").trim(),
              Number(item.quantity) || 0,
              Number(item.unit_price) || 0,
              Number(item.cost_price) || 0,
              Number(item.amount) || 0,
            ],
          );

          if (item.type === "product" && item.product_id) {
            await db.run(
              "UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?",
              [item.quantity, item.product_id],
            );
          }
        }

        await db.exec("COMMIT");

        if (!savedInvoiceId) {
          throw new Error("Invoice was not saved");
        }

        if (targetStatus === "open" || !options.silent) {
          await generateInvoicePdfForInvoice(savedInvoiceId);
        }

        const persistedDraft: InvoiceForm = {
          ...invoice,
          id: savedInvoiceId,
          invoice_number: savedInvoiceNumber || "",
          customer_phone: normalizePhilippinePhone(invoice.customer_phone),
          due_date: dueDate,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total: totals.total,
          status: targetStatus,
        };

        lastSavedSnapshotRef.current = buildInvoiceSnapshot(persistedDraft);

        setInvoice((current) => {
          const nextInvoice = {
            ...current,
            id: savedInvoiceId,
            invoice_number: savedInvoiceNumber || "",
            customer_phone: normalizePhilippinePhone(current.customer_phone),
            due_date: dueDate,
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            total: totals.total,
            status: targetStatus,
          };

          return buildInvoiceSnapshot(current) ===
            buildInvoiceSnapshot(nextInvoice)
            ? current
            : nextInvoice;
        });

        if (targetStatus === "draft") {
          if (!options.silent) {
            await showAlert({
              title:
              savedInvoiceNumber
                ? t(invoice.id ? "draftUpdated" : "draftSaved")
                : t("draftSaved"),
              confirmLabel: t("close"),
            });
          }
          onDraftSaved?.(savedInvoiceId);
        } else {
          await showAlert({
            title: t("invoiceCompletedSuccess"),
            confirmLabel: t("close"),
          });
          onInvoiceCompleted?.(savedInvoiceId);
        }

        setHasUnsavedChanges(false);
        setSaveStatus("saved");
        return savedInvoiceId;
      } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("[InvoiceCreator] Error saving invoice:", error);
      setSaveStatus("dirty");
      if (!options.silent) {
        await showAlert({
          title:
            error instanceof Error ? error.message : t("errorSavingInvoice"),
          confirmLabel: t("close"),
        });
      }
    } finally {
      setSaving(false);
    }

    return null;
  };

  const ensureDraftSavedForOutput = async () => {
    if (!hasMeaningfulInvoiceContent(invoice)) {
      return null;
    }

    if (invoice.id && !hasUnsavedChanges) {
      return invoice.id;
    }

    return await saveInvoice("draft", { silent: true });
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const savedInvoiceId = await ensureDraftSavedForOutput();

      if (!savedInvoiceId) {
        return;
      }

      const generated = await generateInvoicePdfForInvoice(savedInvoiceId);
      if (!generated.pdfPath) {
        return;
      }

      await file.saveCopy(
        generated.pdfPath,
        `${generated.invoice.invoice_number || "invoice"}.pdf`,
      );
    } catch (error) {
      console.error("[InvoiceCreator] Error downloading PDF:", error);
      await showAlert({
        title: t("errorDownloadingPdf"),
        confirmLabel: t("close"),
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintInvoice = async () => {
    const printWindow = window.open("", "", "height=600,width=900");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${t(
        "printInvoice",
      )}</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">${t(
        "loading",
      )}...</body></html>`,
    );
    printWindow.document.close();

    try {
      const savedInvoiceId = await ensureDraftSavedForOutput();

      if (!savedInvoiceId && !hasMeaningfulInvoiceContent(invoice)) {
        printWindow.close();
        return;
      }

      const printableInvoice = {
        ...invoice,
        invoice_number: invoice.invoice_number || t("draft"),
        due_date: invoice.due_upon_receipt
          ? invoice.invoice_date
          : invoice.due_date,
      };

      printWindow.document.open();
      printWindow.document.write(
        buildInvoicePrintHtml({
          invoice: printableInvoice,
          businessSettings,
          logoSrc,
          fallbackBusinessName: t("shopManager"),
          logoAlt: t("logo"),
        }),
      );
      printWindow.document.close();

      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error("[InvoiceCreator] Error printing invoice:", error);
      printWindow.close();
      await showAlert({
        title: t("errorSavingInvoice"),
        confirmLabel: t("close"),
      });
    }
  };

  const previewInvoice = {
    ...invoice,
    invoice_number: invoice.invoice_number || t("draft"),
    due_date: invoice.due_upon_receipt
      ? invoice.invoice_date
      : invoice.due_date,
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center text-muted-foreground">
          {t("loading")}
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {invoice.id ? t("editDraft") : t("createInvoice")}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {t("createInvoicePageDesc")}
            </p>
            <p
              className={`mt-2 text-sm ${
                saveStatus === "saving"
                  ? "text-amber-600"
                  : hasUnsavedChanges
                    ? "text-blue-600"
                    : "text-emerald-600"
              }`}
            >
              {saveStatus === "saving"
                ? t("autosavingChanges")
                : hasUnsavedChanges
                  ? t("unsavedChanges")
                  : t("allChangesSaved")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handlePrintInvoice()}
              disabled={saving || downloadingPdf}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {t("print")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownloadPdf()}
              disabled={saving || downloadingPdf}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t("downloadPdfCopy")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={saving || downloadingPdf}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {t("preview")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void saveInvoice("draft")}
              disabled={saving || downloadingPdf}
            >
              {saving
                ? t("savingDraft")
                : invoice.id
                  ? t("saveDraftChanges")
                  : t("saveDraft")}
            </Button>
            <Button
              onClick={() => void saveInvoice("open")}
              disabled={saving || downloadingPdf}
            >
              {saving ? t("completingInvoice") : t("completeInvoice")}
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl">
          <Card className="overflow-hidden border-2 border-primary/20">
            <div className="space-y-8 bg-white p-8 lg:p-12">
              <div className="flex flex-col gap-8 border-b-2 border-gray-200 pb-6 lg:flex-row lg:justify-between">
                <div>
                  {logoSrc && (
                    <img
                      src={logoSrc}
                      alt={t("logo")}
                      className="mb-3 max-h-[80px] max-w-[120px]"
                    />
                  )}
                  <div className="text-2xl font-bold text-gray-800">
                    {businessSettings?.business_name || t("shopManager")}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {businessSettings?.address && (
                      <div>{businessSettings.address}</div>
                    )}
                    {(businessSettings?.city ||
                      businessSettings?.postal_code) && (
                      <div>
                        {businessSettings.city} {businessSettings.postal_code}
                      </div>
                    )}
                    {businessSettings?.phone && (
                      <div>
                        {t("phone")}: {businessSettings.phone}
                      </div>
                    )}
                    {businessSettings?.email && (
                      <div>
                        {t("email")}: {businessSettings.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 text-sm lg:min-w-[320px]">
                  <div>
                    <span className="font-semibold">{t("invoiceNumber")}:</span>
                    <div className="mt-1 rounded-md border border-input bg-muted/40 px-3 py-2">
                      {invoice.invoice_number || t("draft")}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      {t("invoiceLanguage")}
                    </label>
                    <select
                      value={invoice.invoice_language}
                      onChange={(event) =>
                        handleInvoiceFieldChange(
                          "invoice_language",
                          event.target.value as Language,
                        )
                      }
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      {(Object.keys(supportedLanguages) as Language[]).map(
                        (langKey) => (
                          <option key={langKey} value={langKey}>
                            {t(supportedLanguages[langKey].labelKey)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      {t("receivedDate")}
                    </label>
                    <Input
                      type="date"
                      value={invoice.invoice_date}
                      onChange={(event) =>
                        handleInvoiceFieldChange(
                          "invoice_date",
                          event.target.value,
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={invoice.due_upon_receipt}
                      onChange={(event) =>
                        handleInvoiceFieldChange(
                          "due_upon_receipt",
                          event.target.checked,
                        )
                      }
                    />
                    {t("paymentDueUponReceipt")}
                  </label>
                  {!invoice.due_upon_receipt && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {t("dueDate")}
                      </label>
                      <Input
                        type="date"
                        value={invoice.due_date}
                        onChange={(event) =>
                          handleInvoiceFieldChange(
                            "due_date",
                            event.target.value,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 border-b-2 border-gray-300 pb-2 text-sm font-semibold text-gray-800">
                      {t("billTo").toUpperCase()}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600">
                          {t("customerName")} *
                        </label>
                        <Input
                          value={invoice.customer_name}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "customer_name",
                              event.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("phone")}
                        </label>
                        <PhoneInput
                          value={invoice.customer_phone}
                          onValueChange={(value) =>
                            handleInvoiceFieldChange("customer_phone", value)
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("email")}
                        </label>
                        <Input
                          type="email"
                          value={invoice.customer_email}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "customer_email",
                              event.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 border-b-2 border-gray-300 pb-2 text-sm font-semibold text-gray-800">
                      {t("vehicleInformation").toUpperCase()}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("vehicleMake")}
                        </label>
                        <Input
                          value={invoice.vehicle_make}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "vehicle_make",
                              event.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("vehicleModel")}
                        </label>
                        <Input
                          value={invoice.vehicle_model}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "vehicle_model",
                              event.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("vehicleYear")}
                        </label>
                        <Input
                          value={invoice.vehicle_year}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "vehicle_year",
                              event.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          {t("licensePlate")}
                        </label>
                        <Input
                          value={invoice.license_plate}
                          onChange={(event) =>
                            handleInvoiceFieldChange(
                              "license_plate",
                              event.target.value?.toUpperCase(),
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <div className="mb-4 text-sm font-semibold text-gray-800">
                    {t("invoiceSummary").toUpperCase()}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t("subtotal")}:</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          invoice.subtotal,
                          businessSettings?.currency || "PHP",
                        )}
                      </span>
                    </div>
                    {Number(invoice.tax_rate) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {t("taxLabel")} ({invoice.tax_rate}%):
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            invoice.tax_amount,
                            businessSettings?.currency || "PHP",
                          )}
                        </span>
                      </div>
                    )}
                    <div className="border-t-2 border-gray-300 pt-3">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">
                          {t("total").toUpperCase()}:
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(
                            invoice.total,
                            businessSettings?.currency || "PHP",
                          )}
                        </span>
                      </div>
                    </div>
                    {Number(invoice.tax_rate) === 0 &&
                      Number(businessSettings?.vat_rate) > 0 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleInvoiceFieldChange(
                              "tax_rate",
                              Number(businessSettings.vat_rate) || 0,
                            )
                          }
                          className="mt-4 w-full"
                        >
                          {t("enableTax")} ({businessSettings.vat_rate}%)
                        </Button>
                      )}
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {t("taxLabel")} (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoice.tax_rate}
                        onChange={(event) =>
                          handleInvoiceFieldChange(
                            "tax_rate",
                            Number(event.target.value) || 0,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 border-b-2 border-gray-300 pb-2 text-sm font-semibold text-gray-800">
                  {t("itemsServices").toUpperCase()}
                </div>

                {invoice.items.length > 0 ? (
                  <div className="mb-4 space-y-3">
                    <div className="grid grid-cols-12 gap-3 rounded bg-gray-100 p-3 text-sm font-semibold text-gray-700">
                      <div className="col-span-5">{t("description")}</div>
                      <div className="col-span-2 whitespace-nowrap">{t("quantityShort")}</div>
                      <div className="col-span-2 whitespace-nowrap">{t("unitPrice")}</div>
                      <div className="col-span-2 whitespace-nowrap">{t("amount")}</div>
                      <div className="col-span-1" />
                    </div>

                    {invoice.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 items-center gap-3 rounded border border-gray-200 p-3"
                      >
                        <div className="col-span-5">
                          {item.type === "product" ? (
                            <select
                              value={item.product_id || ""}
                              onChange={(event) =>
                                handleItemChange(
                                  item.id,
                                  "product_id",
                                  event.target.value
                                    ? Number(event.target.value)
                                    : undefined,
                                )
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">{t("selectProduct")}</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {t("availableQuantity")}: {product.quantity_in_stock}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={item.description}
                              onChange={(event) =>
                                handleItemChange(
                                  item.id,
                                  "description",
                                  event.target.value,
                                )
                              }
                              placeholder={t("laborDescription")}
                              className="text-sm"
                            />
                          )}
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleItemChange(
                                item.id,
                                "quantity",
                                Number(event.target.value) || 0,
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            placeholder="0.00"
                            onChange={(event) =>
                              handleItemChange(
                                item.id,
                                "unit_price",
                                Number(event.target.value) || "",
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2 text-right font-semibold">
                          {formatCurrency(
                            item.amount,
                            businessSettings?.currency || "PHP",
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded bg-gray-50 p-6 text-center text-gray-500">
                    {t("noItemsAddedYet")}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddItem("product")}
                    className="flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("addProduct")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddItem("labor")}
                    className="flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("addLabor")}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">
                  {t("notes")}
                </label>
                <textarea
                  value={invoice.notes}
                  onChange={(event) =>
                    updateInvoiceState({ notes: event.target.value })
                  }
                  rows={4}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t("notesOptional")}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showPreview && (
        <InvoicePreview
          invoice={previewInvoice}
          businessSettings={businessSettings}
          onClose={() => {
            setShowPreview(false);
          }}
        />
      )}
    </>
  );
};

export default InvoiceCreatorPage;
