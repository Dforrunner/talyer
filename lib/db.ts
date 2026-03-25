import { safeDbQuery, safeDbGet, safeDbRun, getElectronAPI } from './electron-api';

// Database utility functions for the renderer process
export const db = {
  async query(sql: string, params: any[] = []) {
    return safeDbQuery(sql, params);
  },

  async get(sql: string, params: any[] = []) {
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

import { safeFileSave, safeFileExists } from './electron-api';

export const file = {
  async save(filename: string, data: any, subdir?: string) {
    return safeFileSave(filename, data, subdir);
  },

  async exists(filepath: string) {
    return safeFileExists(filepath);
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
    'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
    [quantity, id]
  );
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

export async function generateInvoiceNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const count = await db.get(
    'SELECT COUNT(*) as count FROM invoices WHERE invoice_date >= date(?)',
    [new Date().toISOString().split('T')[0]]
  );
  
  const sequence = String((count?.count || 0) + 1).padStart(4, '0');
  return `INV-${year}${month}${day}-${sequence}`;
}

export async function createInvoice(invoice: any) {
  const { invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total } = invoice;
  return db.run(
    `INSERT INTO invoices (invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total]
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
  const { invoice_id, product_id, item_type, description, quantity, unit_price, amount } = item;
  return db.run(
    `INSERT INTO invoice_items (invoice_id, product_id, item_type, description, quantity, unit_price, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [invoice_id, product_id, item_type, description, quantity, unit_price, amount]
  );
}

export async function deleteInvoiceItem(id: number) {
  return db.run('DELETE FROM invoice_items WHERE id = ?', [id]);
}

// Revenue and Profit
export async function getMonthlyRevenue(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  return db.get(
    `SELECT 
       SUM(total) as total_revenue,
       COUNT(*) as invoice_count
     FROM invoices
     WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'draft'`,
    [startDate, endDate]
  );
}

export async function getMonthlyCosts(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  return db.get(
    `SELECT SUM(ii.quantity * ii.unit_price) as total_cost
     FROM invoice_items ii
     JOIN invoices i ON ii.invoice_id = i.id
     WHERE ii.product_id IS NOT NULL AND i.invoice_date >= ? AND i.invoice_date <= ? AND i.status != 'draft'`,
    [startDate, endDate]
  );
}

export async function getMonthlyProfit(year: number, month: number) {
  const revenue = await getMonthlyRevenue(year, month);
  const costs = await getMonthlyCosts(year, month);
  
  const totalRevenue = revenue?.total_revenue || 0;
  const totalCost = costs?.total_cost || 0;
  
  return {
    revenue: totalRevenue,
    costs: totalCost,
    profit: totalRevenue - totalCost,
    invoiceCount: revenue?.invoice_count || 0,
  };
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
      };
    };
  }
}
