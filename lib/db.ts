import {
  safeDbQuery,
  safeDbGet,
  safeDbRun,
  getElectronAPI,
  safeFileSave,
  safeFileExists,
} from './electron-api';
import {
  getLocalDateInputValue,
  getMonthDateRange,
} from './date-utils';

// Database utility functions for the renderer process
export const db = {
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return safeDbQuery(sql, params);
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return safeDbGet(sql, params);
  },

  async run(sql: string, params: any[] = []) {
    return safeDbRun(sql, params);
  },

  async exec(sql: string) {
    try {
      const api = getElectronAPI();
      if (!api?.database?.exec) {
        console.warn('[DB] Database API not available');
        return null;
      }
      return await api.database.exec(sql);
    } catch (error) {
      console.error('[DB] Exec error:', error);
      throw error;
    }
  },
};

export const file = {
  async save(filename: string, data: any, subdir?: string) {
    return safeFileSave(filename, data, subdir);
  },

  async exists(filepath: string) {
    return safeFileExists(filepath);
  },

  async saveCopy(sourcePath: string, defaultFileName?: string) {
    try {
      const api = getElectronAPI();
      if (!api?.file?.saveCopy) {
        console.warn('[File] File save-copy API not available');
        return null;
      }
      return await api.file.saveCopy(sourcePath, defaultFileName);
    } catch (error) {
      console.error('[File] Save-copy error:', error);
      throw error;
    }
  },

  async read(filepath: string) {
    try {
      const api = getElectronAPI();
      if (!api?.file?.read) {
        console.warn('[File] File API not available');
        return null;
      }
      return await api.file.read(filepath);
    } catch (error) {
      console.error('[File] Read error:', error);
      throw error;
    }
  },
};

export const app = {
  async getPath(name: string) {
    try {
      const api = getElectronAPI();
      if (!api?.app?.getPath) {
        console.warn('[App] App API not available');
        return null;
      }
      return await api.app.getPath(name);
    } catch (error) {
      console.error('[App] getPath error:', error);
      throw error;
    }
  },
};

const normalizeAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const INVOICE_NUMBER_RETRY_LIMIT = 5;

const getInvoiceDateParts = (invoiceDate: string | Date = getLocalDateInputValue()) => {
  if (typeof invoiceDate === 'string') {
    const match = invoiceDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        dateInput: `${match[1]}-${match[2]}-${match[3]}`,
        year: match[1],
        month: match[2],
        day: match[3],
      };
    }
  }

  const dateInput = getLocalDateInputValue(
    invoiceDate instanceof Date ? invoiceDate : new Date(),
  );
  const [year, month, day] = dateInput.split('-');
  return { dateInput, year, month, day };
};

export const getInvoiceNumberPrefix = (
  invoiceDate: string | Date = getLocalDateInputValue(),
) => {
  const { year, month, day } = getInvoiceDateParts(invoiceDate);
  return `INV-${year}${month}${day}-`;
};

export const isInvoiceNumberCollisionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('SQLITE_CONSTRAINT') ||
    message.includes('UNIQUE constraint failed: invoices.invoice_number')
  );
};

export const clampStockQuantity = (quantity: unknown) =>
  Math.max(0, normalizeAmount(quantity));

export interface InvoiceStockUsageInput {
  productId: number;
  quantityUsed: number;
  invoiceId?: number | null;
  invoiceNumber?: string | null;
  description?: string | null;
}

export interface InvoiceStockUsageResult {
  productId: number;
  quantityUsed: number;
  quantityBefore: number;
  quantityAfter: number;
  shortfallQuantity: number;
  needsStockUpdate: boolean;
}

export interface MonthlyFinancialSummary {
  salesRevenue: number;
  additionalIncome: number;
  revenue: number;
  productCosts: number;
  additionalExpenses: number;
  salaryPayments: number;
  costs: number;
  profit: number;
  invoiceCount: number;
}

// Business Settings
export async function getBusinessSettings() {
  return db.get('SELECT * FROM business_settings LIMIT 1');
}

export async function updateBusinessSettings(data: any) {
  const updates = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(data);
  
  return db.run(
    `UPDATE business_settings SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    values
  );
}

// Products
export async function getProducts() {
  return db.query('SELECT * FROM products ORDER BY name ASC');
}

export async function getProduct(id: number) {
  return db.get('SELECT * FROM products WHERE id = ?', [id]);
}

export async function createProduct(product: any) {
  const { name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit } = product;
  return db.run(
    `INSERT INTO products (name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit]
  );
}

export async function updateProduct(id: number, product: any) {
  const updates = Object.keys(product)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = [...Object.values(product), id];
  
  return db.run(
    `UPDATE products SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
}

export async function deleteProduct(id: number) {
  return db.run('DELETE FROM products WHERE id = ?', [id]);
}

export async function getLowStockProducts() {
  return db.query(
    `SELECT * FROM products WHERE quantity_in_stock <= low_stock_threshold ORDER BY quantity_in_stock ASC`
  );
}

export async function updateProductStock(id: number, quantity: number) {
  return db.run(
    'UPDATE products SET quantity_in_stock = MAX(quantity_in_stock + ?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [quantity, id]
  );
}

export async function ensureStockAdjustmentSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      invoice_id INTEGER,
      adjustment_type TEXT NOT NULL,
      quantity_short REAL NOT NULL DEFAULT 0,
      recorded_stock_before REAL NOT NULL DEFAULT 0,
      recorded_stock_after REAL NOT NULL DEFAULT 0,
      quantity_used REAL NOT NULL DEFAULT 0,
      note TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product
      ON stock_adjustments(product_id, resolved);
    CREATE INDEX IF NOT EXISTS idx_stock_adjustments_invoice
      ON stock_adjustments(invoice_id);
  `);

  const recordedStockAfterColumn = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM pragma_table_info('stock_adjustments')
     WHERE name = 'recorded_stock_after'`,
  );

  if (!recordedStockAfterColumn?.count) {
    await db.run(
      'ALTER TABLE stock_adjustments ADD COLUMN recorded_stock_after REAL NOT NULL DEFAULT 0',
    );
  }
}

export async function applyInvoiceStockUsage({
  productId,
  quantityUsed,
  invoiceId = null,
  invoiceNumber = null,
  description = null,
}: InvoiceStockUsageInput): Promise<InvoiceStockUsageResult | null> {
  const normalizedQuantityUsed = clampStockQuantity(quantityUsed);
  const product = await db.get<{ id: number; quantity_in_stock: number }>(
    'SELECT id, quantity_in_stock FROM products WHERE id = ?',
    [productId],
  );

  if (!product) {
    return null;
  }

  const quantityBefore = normalizeAmount(product.quantity_in_stock);
  const availableQuantity = clampStockQuantity(quantityBefore);
  const quantityAfter = Math.max(0, quantityBefore - normalizedQuantityUsed);
  const shortfallQuantity = Math.max(
    0,
    normalizedQuantityUsed - availableQuantity,
  );

  await db.run(
    `UPDATE products
     SET quantity_in_stock = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [quantityAfter, productId],
  );

  const result: InvoiceStockUsageResult = {
    productId,
    quantityUsed: normalizedQuantityUsed,
    quantityBefore,
    quantityAfter,
    shortfallQuantity,
    needsStockUpdate: shortfallQuantity > 0,
  };

  if (result.needsStockUpdate) {
    await ensureStockAdjustmentSchema();
    const note = [
      invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice',
      description ? `item: ${description}` : null,
      'used more stock than the app had recorded; stock was set to 0.',
    ]
      .filter(Boolean)
      .join(' - ');

    const existingAdjustment = invoiceId
      ? await db.get<{ id: number }>(
          `SELECT id
           FROM stock_adjustments
           WHERE invoice_id = ?
             AND product_id = ?
             AND adjustment_type = 'invoice_shortfall'
             AND resolved = 0
           ORDER BY id ASC
           LIMIT 1`,
          [invoiceId, productId],
        )
      : null;

    if (existingAdjustment?.id) {
      await db.run(
        `UPDATE stock_adjustments
         SET quantity_short = quantity_short + ?,
             quantity_used = quantity_used + ?,
             recorded_stock_after = ?,
             note = ?
         WHERE id = ?`,
        [
          shortfallQuantity,
          normalizedQuantityUsed,
          quantityAfter,
          note,
          existingAdjustment.id,
        ],
      );
    } else {
      await db.run(
        `INSERT INTO stock_adjustments (
          product_id, invoice_id, adjustment_type, quantity_short,
          recorded_stock_before, recorded_stock_after, quantity_used, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          invoiceId,
          'invoice_shortfall',
          shortfallQuantity,
          quantityBefore,
          quantityAfter,
          normalizedQuantityUsed,
          note,
        ],
      );
    }
  }

  return result;
}

// Invoices
export async function getInvoices(limit?: number) {
  let query = 'SELECT * FROM invoices ORDER BY invoice_date DESC, id DESC';
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  return db.query(query);
}

export async function getInvoice(id: number) {
  return db.get('SELECT * FROM invoices WHERE id = ?', [id]);
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  return db.get('SELECT * FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
}

export async function generateInvoiceNumber(
  invoiceDate: string | Date = getLocalDateInputValue(),
  options: { attemptOffset?: number } = {},
) {
  const prefix = getInvoiceNumberPrefix(invoiceDate);
  const maxSequenceRow = await db.get<{ max_sequence: number | null }>(
    `SELECT MAX(CAST(SUBSTR(invoice_number, ?) AS INTEGER)) as max_sequence
     FROM invoices
     WHERE invoice_number LIKE ?`,
    [prefix.length + 1, `${prefix}%`],
  );

  const maxSequence = normalizeAmount(maxSequenceRow?.max_sequence);
  const sequence = String(
    maxSequence + 1 + (options.attemptOffset || 0),
  ).padStart(4, '0');
  return `${prefix}${sequence}`;
}

export async function createInvoice(invoice: any) {
  const { invoice_number, customer_name, customer_phone, customer_email, customer_address, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total } = invoice;
  return db.run(
    `INSERT INTO invoices (invoice_number, customer_name, customer_phone, customer_email, customer_address, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [invoice_number, customer_name, customer_phone, customer_email, customer_address, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total]
  );
}

export async function updateInvoice(id: number, invoice: any) {
  const updates = Object.keys(invoice)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = [...Object.values(invoice), id];
  
  return db.run(
    `UPDATE invoices SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
}

export async function deleteInvoice(id: number) {
  return db.run('DELETE FROM invoices WHERE id = ?', [id]);
}

// Invoice Items
export async function getInvoiceItems(invoiceId: number) {
  return db.query(
    `SELECT ii.*, p.name as product_name FROM invoice_items ii
     LEFT JOIN products p ON ii.product_id = p.id
     WHERE ii.invoice_id = ? ORDER BY ii.id ASC`,
    [invoiceId]
  );
}

export async function createInvoiceItem(item: any) {
  const {
    invoice_id,
    product_id,
    item_type,
    description,
    quantity,
    unit_price,
    cost_price,
    amount,
  } = item;
  return db.run(
    `INSERT INTO invoice_items (invoice_id, product_id, item_type, description, quantity, unit_price, cost_price, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoice_id, product_id, item_type, description, quantity, unit_price, cost_price ?? null, amount]
  );
}

export async function deleteInvoiceItem(id: number) {
  return db.run('DELETE FROM invoice_items WHERE id = ?', [id]);
}

// Revenue and Profit
export async function getMonthlyRevenue(year: number, month: number) {
  const { startDate, endDate } = getMonthDateRange(year, month);
  
  return db.get(
    `SELECT 
       SUM(total) as total_revenue,
       COUNT(*) as invoice_count
     FROM invoices
     WHERE DATE(COALESCE(paid_at, completed_at, invoice_date)) >= ?
       AND DATE(COALESCE(paid_at, completed_at, invoice_date)) <= ?
       AND (status = 'paid' OR paid = 1)`,
    [startDate, endDate]
  );
}

export async function getMonthlyCosts(year: number, month: number) {
  const { startDate, endDate } = getMonthDateRange(year, month);
  
  return db.get(
    `SELECT SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)) as total_cost
     FROM invoice_items ii
     JOIN invoices i ON ii.invoice_id = i.id
     LEFT JOIN products p ON ii.product_id = p.id
     WHERE ii.product_id IS NOT NULL
       AND DATE(COALESCE(i.paid_at, i.completed_at, i.invoice_date)) >= ?
       AND DATE(COALESCE(i.paid_at, i.completed_at, i.invoice_date)) <= ?
       AND (i.status = 'paid' OR i.paid = 1)`,
    [startDate, endDate]
  );
}

export async function getMonthlyAdditionalIncome(year: number, month: number) {
  const { startDate, endDate } = getMonthDateRange(year, month);

  return db.get(
    `SELECT SUM(amount) as total_income
     FROM income
     WHERE income_date >= ? AND income_date <= ?`,
    [startDate, endDate]
  );
}

export async function getMonthlyAdditionalExpenses(year: number, month: number) {
  const { startDate, endDate } = getMonthDateRange(year, month);

  return db.get(
    `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE expense_date >= ? AND expense_date <= ?`,
    [startDate, endDate]
  );
}

export async function getMonthlySalaryPayments(year: number, month: number) {
  const { startDate, endDate } = getMonthDateRange(year, month);

  await ensureSalarySchema();

  return db.get(
    `SELECT SUM(amount) as total_salary_payments
     FROM salary_payments
     WHERE paid_at >= ? AND paid_at <= ?`,
    [startDate, endDate]
  );
}

export async function ensureSalarySchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT,
      default_pay_type TEXT NOT NULL DEFAULT 'daily',
      default_rate REAL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY,
      employee_id INTEGER,
      invoice_id INTEGER,
      employee_name TEXT NOT NULL,
      pay_type TEXT NOT NULL DEFAULT 'daily',
      job_reference TEXT,
      amount REAL NOT NULL,
      paid_at DATE NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

  `);

  const employeeIdColumn = await db.get(
    `SELECT COUNT(*) as count
     FROM pragma_table_info('salary_payments')
     WHERE name = 'employee_id'`,
  );

  if (!employeeIdColumn?.count) {
    await db.run('ALTER TABLE salary_payments ADD COLUMN employee_id INTEGER');
  }

  const invoiceIdColumn = await db.get(
    `SELECT COUNT(*) as count
     FROM pragma_table_info('salary_payments')
     WHERE name = 'invoice_id'`,
  );

  if (!invoiceIdColumn?.count) {
    await db.run('ALTER TABLE salary_payments ADD COLUMN invoice_id INTEGER');
  }

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_salary_payments_paid_at ON salary_payments(paid_at);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_name);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_invoice_id ON salary_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_employees_active_name ON employees(active, name);
  `);

  await db.run(
    `INSERT OR IGNORE INTO employees (name)
     SELECT DISTINCT employee_name
     FROM salary_payments
     WHERE employee_name IS NOT NULL AND TRIM(employee_name) != ''`,
  );

  await db.run(
    `UPDATE salary_payments
     SET employee_id = (
       SELECT employees.id
       FROM employees
       WHERE employees.name = salary_payments.employee_name
     )
     WHERE employee_id IS NULL`,
  );
}

export async function getMonthlyFinancialSummary(
  year: number,
  month: number,
): Promise<MonthlyFinancialSummary> {
  const [revenue, costs, additionalIncome, additionalExpenses, salaryPayments] =
    await Promise.all([
      getMonthlyRevenue(year, month),
      getMonthlyCosts(year, month),
      getMonthlyAdditionalIncome(year, month),
      getMonthlyAdditionalExpenses(year, month),
      getMonthlySalaryPayments(year, month),
    ]);

  const salesRevenue = normalizeAmount(revenue?.total_revenue);
  const productCosts = normalizeAmount(costs?.total_cost);
  const extraIncome = normalizeAmount(additionalIncome?.total_income);
  const extraExpenses = normalizeAmount(additionalExpenses?.total_expenses);
  const salaryCosts = normalizeAmount(salaryPayments?.total_salary_payments);
  const totalRevenue = salesRevenue + extraIncome;
  const totalCosts = productCosts + extraExpenses + salaryCosts;

  return {
    salesRevenue: roundCurrency(salesRevenue),
    additionalIncome: roundCurrency(extraIncome),
    revenue: roundCurrency(totalRevenue),
    productCosts: roundCurrency(productCosts),
    additionalExpenses: roundCurrency(extraExpenses),
    salaryPayments: roundCurrency(salaryCosts),
    costs: roundCurrency(totalCosts),
    profit: roundCurrency(totalRevenue - totalCosts),
    invoiceCount: normalizeAmount(revenue?.invoice_count),
  };
}

export async function getMonthlyProfit(year: number, month: number) {
  return getMonthlyFinancialSummary(year, month);
}

// Audit Log
export async function logAction(action: string, entityType: string, entityId: number, changes?: any) {
  return db.run(
    `INSERT INTO audit_log (action, entity_type, entity_id, changes)
     VALUES (?, ?, ?, ?)`,
    [action, entityType, entityId, changes ? JSON.stringify(changes) : null]
  );
}

declare global {
  interface Window {
    electronAPI: {
      database: {
        query: (sql: string, params?: any[]) => Promise<any[]>;
        get: (sql: string, params?: any[]) => Promise<any>;
        run: (sql: string, params?: any[]) => Promise<any>;
        exec: (sql: string) => Promise<any>;
      };
      file: {
        save: (filename: string, data: any, subdir?: string) => Promise<string>;
        saveAs: (options: {
          defaultFileName: string;
          data: any;
          filters?: Array<{
            name: string;
            extensions: string[];
          }>;
        }) => Promise<string | null>;
        saveCopy: (
          sourcePath: string,
          defaultFileName?: string,
        ) => Promise<string | null>;
        exists: (filepath: string) => Promise<boolean>;
        read: (filepath: string) => Promise<string>;
      };
      pdf: {
        generate: (invoiceData: any, businessData: any) => Promise<string>;
      };
      data: {
        export: () => Promise<string>;
        import: (jsonData: string, shouldClear?: boolean) => Promise<any>;
      };
      app: {
        getPath: (name: string) => Promise<string>;
        getVersion: () => Promise<string>;
      };
      updates: {
        getState: () => Promise<any>;
        check: () => Promise<any>;
        download: () => Promise<any>;
        install: () => Promise<any>;
        onStatusChange: (callback: (payload: any) => void) => () => void;
      };
    };
  }
}
