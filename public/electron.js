const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow;
let db;

// Initialize database
function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'mechanic-shop.db');
  
  if (!fs.existsSync(app.getPath('userData'))) {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
  }

  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY,
      business_name TEXT,
      logo_path TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      phone TEXT,
      email TEXT,
      tax_id TEXT,
      currency TEXT DEFAULT 'PHP',
      vat_rate REAL DEFAULT 0,
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity_in_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      sku TEXT UNIQUE,
      category TEXT,
      unit TEXT DEFAULT 'unit',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      invoice_date DATE NOT NULL,
      due_date DATE,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid REAL DEFAULT 0,
      payment_method TEXT,
      pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      changes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS low_stock_alerts (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      threshold INTEGER NOT NULL,
      current_stock INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date DATE NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      income_date DATE NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(quantity_in_stock);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
  `);

  // Initialize business settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM business_settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO business_settings (business_name, currency, language)
      VALUES (?, ?, ?)
    `).run('My Mechanic Shop', 'PHP', 'en');
  }
}

// IPC Handlers
ipcMain.handle('database:query', async (event, query, params) => {
  try {
    if (query.toUpperCase().startsWith('SELECT')) {
      return db.prepare(query).all(...(params || []));
    } else {
      const result = db.prepare(query).run(...(params || []));
      return { lastID: result.lastInsertRowid, changes: result.changes };
    }
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('database:get', async (event, query, params) => {
  try {
    return db.prepare(query).get(...(params || []));
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('database:run', async (event, query, params) => {
  try {
    const result = db.prepare(query).run(...(params || []));
    return { lastID: result.lastInsertRowid, changes: result.changes };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('database:exec', async (event, query) => {
  try {
    db.exec(query);
    return { success: true };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('file:save', async (event, filename, data, subdir = '') => {
  try {
    const userDataPath = app.getPath('userData');
    const dir = subdir ? path.join(userDataPath, subdir) : userDataPath;
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, data);
    return filepath;
  } catch (error) {
    console.error('File save error:', error);
    throw error;
  }
});

ipcMain.handle('file:exists', async (event, filepath) => {
  try {
    return fs.existsSync(filepath);
  } catch (error) {
    console.error('File check error:', error);
    return false;
  }
});

ipcMain.handle('file:read', async (event, filepath) => {
  try {
    return fs.readFileSync(filepath, 'utf8');
  } catch (error) {
    console.error('File read error:', error);
    throw error;
  }
});

ipcMain.handle('app:getPath', async (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('pdf:generate', async (event, invoiceData, businessData) => {
  try {
    const userDataPath = app.getPath('userData');
    const pdfDir = path.join(userDataPath, 'invoices');
    
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, `${invoiceData.invoice_number}.pdf`);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#2C3E50';
      const textColor = '#333333';
      const lightGray = '#F5F5F5';

      // Header with logo and business info
      let currentY = 50;

      if (businessData.logo_path && fs.existsSync(businessData.logo_path)) {
        try {
          doc.image(businessData.logo_path, 50, currentY, { width: 80 });
          currentY += 90;
        } catch (e) {
          currentY += 20;
        }
      }

      // Business name and info
      doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text(businessData.business_name, 50, currentY);
      currentY += 35;

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      if (businessData.address) {
        doc.text(businessData.address, 50, currentY);
        currentY += 15;
      }
      if (businessData.city || businessData.postal_code) {
        doc.text(`${businessData.city || ''} ${businessData.postal_code || ''}`.trim(), 50, currentY);
        currentY += 15;
      }
      if (businessData.phone) {
        doc.text(`Phone: ${businessData.phone}`, 50, currentY);
        currentY += 12;
      }
      if (businessData.email) {
        doc.text(`Email: ${businessData.email}`, 50, currentY);
        currentY += 12;
      }
      if (businessData.tax_id) {
        doc.text(`Tax ID: ${businessData.tax_id}`, 50, currentY);
        currentY += 12;
      }

      // Invoice header on the right
      doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('INVOICE', 350, 50);

      doc.fontSize(11).font('Helvetica');
      doc.text(`Invoice #: ${invoiceData.invoice_number}`, 350, 80, { align: 'left' });
      doc.text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString()}`, 350, 100);
      doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 350, 120);

      currentY = Math.max(currentY, 160);

      // Bill to section
      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('BILL TO:', 50, currentY);
      currentY += 20;

      doc.fontSize(11).font('Helvetica-Bold').fillColor(textColor);
      doc.text(invoiceData.customer_name, 50, currentY);
      currentY += 16;

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      if (invoiceData.customer_phone) {
        doc.text(`Phone: ${invoiceData.customer_phone}`, 50, currentY);
        currentY += 12;
      }
      if (invoiceData.customer_email) {
        doc.text(`Email: ${invoiceData.customer_email}`, 50, currentY);
        currentY += 12;
      }

      currentY += 20;

      // Items table header
      const tableTop = currentY;
      const col1 = 50;
      const col2 = 350;
      const col3 = 420;
      const col4 = 500;

      doc.rect(col1 - 5, tableTop - 5, 520, 20).fill(lightGray);

      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('Description', col1, tableTop);
      doc.text('Qty', col2, tableTop);
      doc.text('Unit Price', col3, tableTop);
      doc.text('Amount', col4, tableTop);

      currentY = tableTop + 25;

      // Items
      doc.fontSize(10).font('Helvetica').fillColor(textColor);

      invoiceData.items.forEach((item) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(item.description, col1, currentY, { width: 250 });
        doc.text(item.quantity.toString(), col2, currentY);
        doc.text(formatCurrency(item.unit_price, businessData.currency), col3, currentY);
        doc.text(formatCurrency(item.amount, businessData.currency), col4, currentY);

        currentY += 20;
      });

      currentY += 10;

      // Total section
      const totalBoxTop = currentY;
      const totalBoxLeft = 350;

      // Lines for totals
      doc.moveTo(totalBoxLeft, totalBoxTop).lineTo(550, totalBoxTop).stroke();

      currentY = totalBoxTop + 15;

      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.subtotal, businessData.currency), 480, currentY, { align: 'right' });

      currentY += 20;

      if (invoiceData.tax_rate > 0) {
        doc.text(`Tax/VAT (${invoiceData.tax_rate}%):`, totalBoxLeft, currentY);
        doc.text(formatCurrency(invoiceData.tax_amount, businessData.currency), 480, currentY, { align: 'right' });
        currentY += 20;
      }

      // Total line
      doc.moveTo(totalBoxLeft, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('TOTAL:', totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.total, businessData.currency), 480, currentY, { align: 'right' });

      // Notes section
      if (invoiceData.notes) {
        currentY += 40;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('Notes:', 50, currentY);
        currentY += 15;
        doc.fontSize(9).font('Helvetica').fillColor(textColor);
        doc.text(invoiceData.notes, 50, currentY, { width: 480 });
      }

      // Footer
      doc.fontSize(8).fillColor('#999999');
      doc.text('Thank you for your business!', 50, 750, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(pdfPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      doc.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
});

// Export/Import functionality for data portability
ipcMain.handle('data:export', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'shop.db');
    
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found');
    }

    // Read all data from database
    const businessSettings = db.prepare('SELECT * FROM business_settings LIMIT 1').all();
    const products = db.prepare('SELECT * FROM products').all();
    const invoices = db.prepare('SELECT * FROM invoices').all();
    const invoiceItems = db.prepare('SELECT * FROM invoice_items').all();
    const lowStockAlerts = db.prepare('SELECT * FROM low_stock_alerts').all();
    const expenses = db.prepare('SELECT * FROM expenses').all();
    const income = db.prepare('SELECT * FROM income').all();

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      businessSettings,
      products,
      invoices,
      invoiceItems,
      lowStockAlerts,
      expenses,
      income
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
});

ipcMain.handle('data:import', async (event, jsonData, shouldClear = false) => {
  try {
    const importData = JSON.parse(jsonData);
    
    if (importData.version !== '1.0.0') {
      throw new Error('Invalid export file version');
    }

    if (shouldClear) {
      // Clear existing data
      db.prepare('DELETE FROM low_stock_alerts').run();
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM income').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM business_settings').run();
    }

    // Import business settings
    if (importData.businessSettings && importData.businessSettings.length > 0) {
      const bs = importData.businessSettings[0];
      db.prepare(`
        INSERT OR REPLACE INTO business_settings 
        (id, business_name, logo_path, address, city, postal_code, phone, email, tax_id, currency, vat_rate, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bs.id, bs.business_name, bs.logo_path, bs.address, bs.city, bs.postal_code, 
        bs.phone, bs.email, bs.tax_id, bs.currency, bs.vat_rate, bs.language, bs.created_at, bs.updated_at
      );
    }

    // Import products
    if (importData.products) {
      const insertProduct = db.prepare(`
        INSERT OR REPLACE INTO products 
        (id, name, category, cost_price, selling_price, quantity_in_stock, low_stock_threshold, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const product of importData.products) {
        insertProduct.run(
          product.id, product.name, product.category, product.cost_price, product.selling_price,
          product.quantity_in_stock, product.low_stock_threshold, product.created_at, product.updated_at
        );
      }
    }

    // Import invoices
    if (importData.invoices) {
      const insertInvoice = db.prepare(`
        INSERT OR REPLACE INTO invoices 
        (id, invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total, status, pdf_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const invoice of importData.invoices) {
        insertInvoice.run(
          invoice.id, invoice.invoice_number, invoice.customer_name, invoice.customer_phone,
          invoice.customer_email, invoice.invoice_date, invoice.due_date, invoice.notes,
          invoice.subtotal, invoice.tax_amount, invoice.tax_rate, invoice.total, invoice.status,
          invoice.pdf_path, invoice.created_at
        );
      }
    }

    // Import invoice items
    if (importData.invoiceItems) {
      const insertItem = db.prepare(`
        INSERT OR REPLACE INTO invoice_items
        (id, invoice_id, product_id, item_type, description, quantity, unit_price, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of importData.invoiceItems) {
        insertItem.run(
          item.id, item.invoice_id, item.product_id, item.item_type, item.description,
          item.quantity, item.unit_price, item.amount, item.created_at
        );
      }
    }

    // Import low stock alerts
    if (importData.lowStockAlerts) {
      const insertAlert = db.prepare(`
        INSERT OR REPLACE INTO low_stock_alerts
        (id, product_id, alert_threshold, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const alert of importData.lowStockAlerts) {
        insertAlert.run(alert.id, alert.product_id, alert.alert_threshold, alert.created_at);
      }
    }

    // Import expenses
    if (importData.expenses) {
      const insertExpense = db.prepare(`
        INSERT OR REPLACE INTO expenses
        (id, category, description, amount, expense_date, payment_method, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const expense of importData.expenses) {
        insertExpense.run(
          expense.id, expense.category, expense.description, expense.amount, expense.expense_date,
          expense.payment_method, expense.notes, expense.created_at, expense.updated_at
        );
      }
    }

    // Import income
    if (importData.income) {
      const insertIncome = db.prepare(`
        INSERT OR REPLACE INTO income
        (id, category, description, amount, income_date, payment_method, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const inc of importData.income) {
        insertIncome.run(
          inc.id, inc.category, inc.description, inc.amount, inc.income_date,
          inc.payment_method, inc.notes, inc.created_at, inc.updated_at
        );
      }
    }

    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
});

function formatCurrency(amount, currency = 'PHP') {
  const symbols = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: '$',
    AUD: '$',
    JPY: '¥',
    CHF: 'CHF'
  };
  const symbol = symbols[currency] || '₱';
  return `${symbol}${amount.toFixed(2)}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create desktop shortcut
function createDesktopShortcut() {
  const os = require('os');
  const { execSync } = require('child_process');
  
  const platform = process.platform;
  const appPath = app.getPath('exe');
  const desktopPath = path.join(os.homedir(), 'Desktop');
  
  try {
    if (platform === 'win32') {
      // Windows: Create .lnk shortcut using PowerShell
      const shortcutPath = path.join(desktopPath, 'Mechanic Shop Invoicing.lnk');
      
      const ps = `
        $WshShell = New-Object -ComObject WScript.Shell;
        $shortcut = $WshShell.CreateShortcut('${shortcutPath}');
        $shortcut.TargetPath = '${appPath}';
        $shortcut.WorkingDirectory = '${path.dirname(appPath)}';
        $shortcut.Description = 'Mechanic Shop Invoicing and Inventory System';
        $shortcut.IconLocation = '${appPath}';
        $shortcut.Save();
      `;
      
      execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
      console.log('Desktop shortcut created successfully (Windows)');
    } else if (platform === 'darwin') {
      // macOS: Create alias for the app
      const appsPath = path.join(os.homedir(), 'Applications');
      const appName = 'Mechanic Shop Invoicing.app';
      const appBundle = path.dirname(appPath);
      const shortcutPath = path.join(desktopPath, appName);
      
      try {
        execSync(`ln -sf "${appBundle}" "${shortcutPath}"`);
        console.log('Desktop shortcut created successfully (macOS)');
      } catch (error) {
        console.log('macOS: Desktop shortcut creation skipped, app is in Applications folder');
      }
    } else if (platform === 'linux') {
      // Linux: Create .desktop file
      const shortcutPath = path.join(desktopPath, 'Mechanic-Shop-Invoicing.desktop');
      const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=Mechanic Shop Invoicing
Exec=${appPath}
Comment=Invoicing and Inventory Management System for Mechanic Shops
Icon=application-x-executable
Categories=Utility;Office;
`;
      
      fs.writeFileSync(shortcutPath, desktopEntry);
      execSync(`chmod +x "${shortcutPath}"`);
      console.log('Desktop shortcut created successfully (Linux)');
    }
  } catch (error) {
    console.log('Desktop shortcut creation info: Some systems require additional permissions');
    console.log('Users can manually create a shortcut or pin the application to taskbar');
  }
}

app.on('ready', () => {
  initializeDatabase();
  createWindow();
  
  // Create desktop shortcut on first run
  const userDataPath = app.getPath('userData');
  const markerFile = path.join(userDataPath, '.shortcut_created');
  
  if (!fs.existsSync(markerFile)) {
    createDesktopShortcut();
    fs.writeFileSync(markerFile, 'created');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (db) {
    db.close();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
