const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

app.setName('ShopFlow');

const isDev = !app.isPackaged;

let mainWindow;
let db;
let updateState;

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeFileName(fileName) {
  return String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';
}

function getManagedDirectory(subdir = '') {
  const userDataPath = app.getPath('userData');
  const dir = subdir ? path.join(userDataPath, subdir) : userDataPath;
  ensureDirectory(dir);
  return dir;
}

function buildManagedFilePath(subdir, fileName) {
  return path.join(getManagedDirectory(subdir), sanitizeFileName(fileName));
}

function encodeFileToBase64(filepath) {
  return fs.readFileSync(filepath).toString('base64');
}

function restoreBase64File(subdir, fileName, base64Data) {
  const targetPath = buildManagedFilePath(subdir, fileName);
  fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
  return targetPath;
}

function clearManagedDirectory(subdir) {
  const dir = path.join(app.getPath('userData'), subdir);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ensureDirectory(dir);
}

function decodeFileData(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data !== 'string') {
    return Buffer.from(String(data ?? ''), 'utf8');
  }

  const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return Buffer.from(dataUrlMatch[2], 'base64');
  }

  return Buffer.from(data, 'utf8');
}

function getMimeType(filepath) {
  switch (path.extname(filepath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumnExists(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function migrateLegacyUserData() {
  const currentUserDataPath = app.getPath('userData');

  ensureDirectory(currentUserDataPath);

  const hasCurrentData = fs.readdirSync(currentUserDataPath).length > 0;
  if (hasCurrentData) {
    return;
  }

  const appDataPath = app.getPath('appData');
  const legacyPaths = [
    path.join(appDataPath, 'Mechanic Shop Invoicing'),
    path.join(appDataPath, 'mechanic-shop-manager'),
  ].filter((legacyPath) => legacyPath !== currentUserDataPath);

  for (const legacyPath of legacyPaths) {
    if (!fs.existsSync(legacyPath)) {
      continue;
    }

    fs.cpSync(legacyPath, currentUserDataPath, {
      recursive: true,
      force: false,
      errorOnExist: false,
    });
    return;
  }
}

function resolveDatabasePath() {
  const userDataPath = app.getPath('userData');
  const currentDbPath = path.join(userDataPath, 'shopflow.db');
  const legacyDbPath = path.join(userDataPath, 'mechanic-shop.db');

  ensureDirectory(userDataPath);

  if (!fs.existsSync(currentDbPath) && fs.existsSync(legacyDbPath)) {
    fs.renameSync(legacyDbPath, currentDbPath);
  }

  return currentDbPath;
}

function isPortableBuild() {
  return process.platform === 'win32' && Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
}

function isUpdateSupported() {
  return !isDev && !isPortableBuild() && ['win32', 'darwin'].includes(process.platform);
}

function normalizeReleaseNotes(releaseNotes) {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((entry) => `${entry.version || ''}\n${entry.note || ''}`.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

function buildInitialUpdateState() {
  const supported = isUpdateSupported();

  return {
    status: supported ? 'idle' : 'unsupported',
    currentVersion: app.getVersion(),
    latestVersion: null,
    progress: null,
    releaseNotes: '',
    message: supported
      ? ''
      : isDev
        ? 'disabled_in_development'
        : isPortableBuild()
          ? 'portable_build_not_supported'
          : 'platform_not_supported',
  };
}

function broadcastUpdateState(nextPartial = {}) {
  updateState = {
    ...(updateState || buildInitialUpdateState()),
    ...nextPartial,
    currentVersion: app.getVersion(),
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:status', updateState);
  }

  return updateState;
}

function initializeAutoUpdater() {
  updateState = buildInitialUpdateState();

  if (!isUpdateSupported()) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateState({
      status: 'checking',
      progress: null,
      message: '',
    });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateState({
      status: 'available',
      latestVersion: info?.version || null,
      releaseNotes: normalizeReleaseNotes(info?.releaseNotes),
      progress: null,
      message: '',
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    broadcastUpdateState({
      status: 'not-available',
      latestVersion: info?.version || app.getVersion(),
      releaseNotes: normalizeReleaseNotes(info?.releaseNotes),
      progress: null,
      message: '',
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    broadcastUpdateState({
      status: 'downloading',
      progress: {
        percent: Number(progressObj?.percent || 0),
        bytesPerSecond: Number(progressObj?.bytesPerSecond || 0),
        transferred: Number(progressObj?.transferred || 0),
        total: Number(progressObj?.total || 0),
      },
      message: '',
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateState({
      status: 'downloaded',
      latestVersion: info?.version || updateState?.latestVersion || null,
      releaseNotes: normalizeReleaseNotes(info?.releaseNotes),
      progress: {
        percent: 100,
      },
      message: '',
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error);
    broadcastUpdateState({
      status: 'error',
      message: error?.message || 'update_error',
      progress: null,
    });
  });
}

// Initialize database
function initializeDatabase() {
  const dbPath = resolveDatabasePath();

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
      vehicle_make TEXT,
      vehicle_model TEXT,
      vehicle_year TEXT,
      license_plate TEXT,
      invoice_date DATE NOT NULL,
      due_date DATE,
      due_upon_receipt INTEGER DEFAULT 1,
      invoice_language TEXT DEFAULT 'en',
      status TEXT DEFAULT 'draft',
      notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid REAL DEFAULT 0,
      paid_at DATETIME,
      completed_at DATETIME,
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
      cost_price REAL,
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

    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      start_date DATE NOT NULL,
      frequency TEXT NOT NULL,
      next_due_date DATE NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);
    CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due ON recurring_expenses(next_due_date, active);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(quantity_in_stock);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
  `);

  ensureColumnExists('invoice_items', 'cost_price', 'REAL');
  ensureColumnExists('invoices', 'vehicle_make', 'TEXT');
  ensureColumnExists('invoices', 'vehicle_model', 'TEXT');
  ensureColumnExists('invoices', 'vehicle_year', 'TEXT');
  ensureColumnExists('invoices', 'license_plate', 'TEXT');
  ensureColumnExists('invoices', 'due_upon_receipt', 'INTEGER DEFAULT 1');
  ensureColumnExists('invoices', 'invoice_language', "TEXT DEFAULT 'en'");
  ensureColumnExists('invoices', 'paid_at', 'DATETIME');
  ensureColumnExists('invoices', 'completed_at', 'DATETIME');

  db.exec(`
    UPDATE invoice_items
    SET cost_price = (
      SELECT p.cost_price
      FROM products p
      WHERE p.id = invoice_items.product_id
    )
    WHERE product_id IS NOT NULL AND cost_price IS NULL;
  `);

  db.exec(`
    UPDATE invoices
    SET status = 'open'
    WHERE status = 'sent';
  `);

  // Initialize business settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM business_settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO business_settings (business_name, currency, language)
      VALUES (?, ?, ?)
    `).run('My Shop', 'PHP', 'en');
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
    const filepath = buildManagedFilePath(subdir, filename);
    fs.writeFileSync(filepath, decodeFileData(data));
    return filepath;
  } catch (error) {
    console.error('File save error:', error);
    throw error;
  }
});

ipcMain.handle('file:save-as', async (event, options = {}) => {
  try {
    const {
      defaultFileName = 'file',
      data,
      filters = [],
    } = options;

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('desktop'), defaultFileName),
      filters,
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const dir = path.dirname(result.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(result.filePath, decodeFileData(data));
    return result.filePath;
  } catch (error) {
    console.error('File save-as error:', error);
    throw error;
  }
});

ipcMain.handle('file:save-copy', async (event, sourcePath, defaultFileName) => {
  try {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return null;
    }

    const suggestedFileName = sanitizeFileName(
      defaultFileName || path.basename(sourcePath),
    );

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('desktop'), suggestedFileName),
      filters: [
        {
          name: path.extname(suggestedFileName).toLowerCase() === '.pdf'
            ? 'PDF Files'
            : 'All Files',
          extensions:
            path.extname(suggestedFileName).toLowerCase() === '.pdf'
              ? ['pdf']
              : ['*'],
        },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const dir = path.dirname(result.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, result.filePath);
    return result.filePath;
  } catch (error) {
    console.error('File save-copy error:', error);
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
    const fileBuffer = fs.readFileSync(filepath);
    const mimeType = getMimeType(filepath);

    if (mimeType.startsWith('image/')) {
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }

    return fileBuffer.toString('utf8');
  } catch (error) {
    console.error('File read error:', error);
    throw error;
  }
});

ipcMain.handle('app:getPath', async (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

ipcMain.handle('updates:get-state', async () => {
  return updateState || buildInitialUpdateState();
});

ipcMain.handle('updates:check', async () => {
  if (!isUpdateSupported()) {
    return broadcastUpdateState(buildInitialUpdateState());
  }

  try {
    await autoUpdater.checkForUpdates();
    return updateState;
  } catch (error) {
    console.error('Check for updates error:', error);
    return broadcastUpdateState({
      status: 'error',
      message: error?.message || 'update_check_failed',
      progress: null,
    });
  }
});

ipcMain.handle('updates:download', async () => {
  if (!isUpdateSupported()) {
    return broadcastUpdateState(buildInitialUpdateState());
  }

  if (!updateState || !['available', 'downloading'].includes(updateState.status)) {
    return updateState || buildInitialUpdateState();
  }

  try {
    await autoUpdater.downloadUpdate();
    return updateState;
  } catch (error) {
    console.error('Download update error:', error);
    return broadcastUpdateState({
      status: 'error',
      message: error?.message || 'update_download_failed',
      progress: null,
    });
  }
});

ipcMain.handle('updates:install', async () => {
  if (!isUpdateSupported()) {
    return broadcastUpdateState(buildInitialUpdateState());
  }

  if (!updateState || updateState.status !== 'downloaded') {
    return updateState || buildInitialUpdateState();
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return {
    success: true,
  };
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
      const labels = invoiceData.labels || {};
      const invoiceLocale = invoiceData.invoice_language === 'tl' ? 'fil-PH' : 'en-PH';
      const appFontPath = path.join(
        app.getAppPath(),
        'node_modules/.pnpm/next@16.2.1_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf',
      );
      const textFont = fs.existsSync(appFontPath) ? 'InvoiceFont' : 'Helvetica';
      const titleFont = fs.existsSync(appFontPath) ? 'InvoiceFont' : 'Helvetica-Bold';

      if (fs.existsSync(appFontPath)) {
        doc.registerFont('InvoiceFont', appFontPath);
      }

      // Header with logo and business info
      let currentY = 40;

      if (businessData.logo_path && fs.existsSync(businessData.logo_path)) {
        try {
          doc.image(businessData.logo_path, 40, currentY, { width: 72 });
          currentY += 82;
        } catch (e) {
          currentY += 20;
        }
      }

      // Business name and info
      doc.fontSize(22).font(titleFont).fillColor(primaryColor);
      doc.text(businessData.business_name, 40, currentY);
      currentY += 30;

      doc.fontSize(9).font(textFont).fillColor(textColor);
      if (businessData.address) {
        doc.text(businessData.address, 40, currentY);
        currentY += 13;
      }
      if (businessData.city || businessData.postal_code) {
        doc.text(`${businessData.city || ''} ${businessData.postal_code || ''}`.trim(), 40, currentY);
        currentY += 13;
      }
      if (businessData.phone) {
        doc.text(`${labels.phone || 'Phone'}: ${businessData.phone}`, 40, currentY);
        currentY += 11;
      }
      if (businessData.email) {
        doc.text(`${labels.email || 'Email'}: ${businessData.email}`, 40, currentY);
        currentY += 11;
      }
      if (businessData.tax_id) {
        doc.text(`${labels.taxId || 'Tax ID'}: ${businessData.tax_id}`, 40, currentY);
        currentY += 11;
      }

      // Invoice header on the right
      doc.fontSize(18).font(titleFont).fillColor(primaryColor);
      doc.text(labels.invoiceLabel || 'INVOICE', 330, 40, { width: 220, align: 'right' });

      doc.fontSize(9).font(textFont);
      doc.text(`${labels.invoiceNumber || 'Invoice #'}: ${invoiceData.invoice_number}`, 330, 72, {
        width: 220,
        align: 'right',
      });
      doc.text(
        `${labels.date || 'Date'}: ${new Date(invoiceData.invoice_date).toLocaleDateString(invoiceLocale)}`,
        330,
        88,
        { width: 220, align: 'right' },
      );
      doc.text(
        `${labels.dueDate || 'Due Date'}: ${
          invoiceData.due_upon_receipt
            ? labels.paymentDueUponReceipt || 'Payment Due Upon Receipt'
            : new Date(invoiceData.due_date).toLocaleDateString(invoiceLocale)
        }`,
        330,
        104,
        { width: 220, align: 'right' },
      );

      currentY = Math.max(currentY, 142);

      currentY += 12;

      const customerStartY = currentY;
      let customerY = customerStartY;
      doc.fontSize(10).font(titleFont).fillColor(primaryColor);
      doc.text(`${labels.billTo || 'BILL TO'}:`, 40, customerY);
      customerY += 16;

      doc.fontSize(10).font(titleFont).fillColor(textColor);
      doc.text(invoiceData.customer_name, 40, customerY);
      customerY += 14;

      doc.fontSize(9).font(textFont).fillColor(textColor);
      if (invoiceData.customer_phone) {
        doc.text(`${labels.phone || 'Phone'}: ${invoiceData.customer_phone}`, 40, customerY);
        customerY += 11;
      }
      if (invoiceData.customer_email) {
        doc.text(`${labels.email || 'Email'}: ${invoiceData.customer_email}`, 40, customerY);
        customerY += 11;
      }

      const vehicleLines = [
        invoiceData.vehicle_make
          ? `${labels.vehicleMake || 'Make'}: ${invoiceData.vehicle_make}`
          : null,
        invoiceData.vehicle_model
          ? `${labels.vehicleModel || 'Model'}: ${invoiceData.vehicle_model}`
          : null,
        invoiceData.vehicle_year
          ? `${labels.vehicleYear || 'Year'}: ${invoiceData.vehicle_year}`
          : null,
        invoiceData.license_plate
          ? `${labels.licensePlate || 'License Plate'}: ${invoiceData.license_plate}`
          : null,
      ].filter(Boolean);

      let vehicleY = customerStartY;
      if (vehicleLines.length > 0) {
        doc.fontSize(10).font(titleFont).fillColor(primaryColor);
        doc.text(`${labels.vehicleInformation || 'Vehicle Information'}:`, 300, vehicleY, {
          width: 250,
          align: 'left',
        });
        vehicleY += 16;

        doc.fontSize(9).font(textFont).fillColor(textColor);
        vehicleLines.forEach((line) => {
          doc.text(line, 300, vehicleY, { width: 250 });
          vehicleY += 11;
        });
      }

      currentY = Math.max(customerY, vehicleY) + 18;

      // Items table header
      const tableTop = currentY;
      const col1 = 40;
      const col2 = 326;
      const col3 = 388;
      const col4 = 474;

      doc.rect(col1 - 4, tableTop - 4, 514, 20).fill(lightGray);

      doc.fontSize(8.5).font(titleFont).fillColor(primaryColor);
      doc.text(labels.description || 'Description', col1, tableTop, { width: 250 });
      doc.text(labels.quantityShort || 'Qty', col2, tableTop, { width: 48, align: 'center' });
      doc.text(labels.unitPrice || 'Unit Price', col3, tableTop, { width: 72, align: 'right' });
      doc.text(labels.amount || 'Amount', col4, tableTop, { width: 62, align: 'right' });

      currentY = tableTop + 22;

      // Items
      doc.fontSize(9).font(textFont).fillColor(textColor);

      invoiceData.items.forEach((item) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        const itemDescription = item.description || '';
        const itemHeight = doc.heightOfString(itemDescription, { width: 250 });
        const rowHeight = Math.max(14, itemHeight);

        doc.text(itemDescription, col1, currentY, { width: 250 });
        doc.text(item.quantity.toString(), col2, currentY, { width: 48, align: 'center' });
        doc.text(formatCurrency(item.unit_price, businessData.currency, invoiceLocale), col3, currentY, {
          width: 72,
          align: 'right',
        });
        doc.text(formatCurrency(item.amount, businessData.currency, invoiceLocale), col4, currentY, {
          width: 62,
          align: 'right',
        });

        currentY += rowHeight + 8;
      });

      currentY += 6;

      // Total section
      const totalBoxTop = currentY;
      const totalBoxLeft = 330;

      // Lines for totals
      doc.moveTo(totalBoxLeft, totalBoxTop).lineTo(536, totalBoxTop).stroke();

      currentY = totalBoxTop + 12;

      doc.fontSize(9).font(textFont);
      doc.text(`${labels.subtotal || 'Subtotal'}:`, totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.subtotal, businessData.currency, invoiceLocale), 464, currentY, {
        width: 72,
        align: 'right',
      });

      currentY += 18;

      if (invoiceData.tax_rate > 0) {
        doc.text(`${labels.tax || 'Tax/VAT'} (${invoiceData.tax_rate}%):`, totalBoxLeft, currentY);
        doc.text(formatCurrency(invoiceData.tax_amount, businessData.currency, invoiceLocale), 464, currentY, {
          width: 72,
          align: 'right',
        });
        currentY += 18;
      }

      // Total line
      doc.moveTo(totalBoxLeft, currentY).lineTo(536, currentY).stroke();
      currentY += 8;

      doc.fontSize(12).font(titleFont).fillColor(primaryColor);
      doc.text(`${labels.total || 'TOTAL'}:`, totalBoxLeft, currentY);
      doc.text(formatCurrency(invoiceData.total, businessData.currency, invoiceLocale), 452, currentY, {
        width: 84,
        align: 'right',
      });

      // Notes section
      if (invoiceData.notes) {
        currentY += 28;
        doc.fontSize(9).font(titleFont).fillColor(primaryColor);
        doc.text(`${labels.notes || 'Notes'}:`, 40, currentY);
        currentY += 12;
        doc.fontSize(8.5).font(textFont).fillColor(textColor);
        doc.text(invoiceData.notes, 40, currentY, { width: 496 });
      }

      // Footer
      doc.fontSize(8).font(textFont).fillColor('#999999');
      doc.text(labels.thankYou || 'Thank you for your business!', 40, 776, {
        width: 515,
        align: 'center',
      });

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
    // Read all data from database
    const businessSettings = db.prepare('SELECT * FROM business_settings LIMIT 1').all();
    const products = db.prepare('SELECT * FROM products').all();
    const invoices = db.prepare('SELECT * FROM invoices').all();
    const invoiceItems = db.prepare('SELECT * FROM invoice_items').all();
    const lowStockAlerts = db.prepare('SELECT * FROM low_stock_alerts').all();
    const expenses = db.prepare('SELECT * FROM expenses').all();
    const income = db.prepare('SELECT * FROM income').all();
    const recurringExpenses = db.prepare('SELECT * FROM recurring_expenses').all();
    const auditLog = db.prepare('SELECT * FROM audit_log').all();

    const logoAsset =
      businessSettings[0]?.logo_path && fs.existsSync(businessSettings[0].logo_path)
        ? {
            fileName: path.basename(businessSettings[0].logo_path),
            data: encodeFileToBase64(businessSettings[0].logo_path),
          }
        : null;

    const invoicePdfAssets = invoices
      .filter((invoice) => invoice.pdf_path && fs.existsSync(invoice.pdf_path))
      .map((invoice) => ({
        invoiceId: invoice.id,
        fileName: path.basename(invoice.pdf_path),
        data: encodeFileToBase64(invoice.pdf_path),
      }));

    const exportData = {
      version: '1.3.0',
      exportDate: new Date().toISOString(),
      businessSettings,
      products,
      invoices,
      invoiceItems,
      lowStockAlerts,
      expenses,
      income,
      recurringExpenses,
      auditLog,
      assets: {
        logo: logoAsset,
        invoicePdfs: invoicePdfAssets,
      },
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
    
    if (!['1.0.0', '1.1.0', '1.2.0', '1.3.0'].includes(importData.version)) {
      throw new Error('Invalid export file version');
    }

    if (shouldClear) {
      // Clear existing data
      db.prepare('DELETE FROM low_stock_alerts').run();
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM income').run();
      db.prepare('DELETE FROM recurring_expenses').run();
      db.prepare('DELETE FROM audit_log').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM business_settings').run();
      clearManagedDirectory('logos');
      clearManagedDirectory('invoices');
    }

    let restoredLogoPath = null;
    if (importData.assets?.logo?.data && importData.assets?.logo?.fileName) {
      restoredLogoPath = restoreBase64File(
        'logos',
        importData.assets.logo.fileName,
        importData.assets.logo.data,
      );
    }

    const restoredInvoicePdfPaths = new Map();
    if (Array.isArray(importData.assets?.invoicePdfs)) {
      for (const pdfAsset of importData.assets.invoicePdfs) {
        if (!pdfAsset?.invoiceId || !pdfAsset?.fileName || !pdfAsset?.data) {
          continue;
        }

        const restoredPdfPath = restoreBase64File(
          'invoices',
          pdfAsset.fileName,
          pdfAsset.data,
        );
        restoredInvoicePdfPaths.set(pdfAsset.invoiceId, restoredPdfPath);
      }
    }

    // Import business settings
    if (importData.businessSettings && importData.businessSettings.length > 0) {
      const bs = importData.businessSettings[0];
      db.prepare(`
        INSERT OR REPLACE INTO business_settings 
        (id, business_name, logo_path, address, city, postal_code, phone, email, tax_id, currency, vat_rate, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bs.id, bs.business_name, restoredLogoPath || null, bs.address, bs.city, bs.postal_code, 
        bs.phone, bs.email, bs.tax_id, bs.currency, bs.vat_rate, bs.language, bs.created_at, bs.updated_at
      );
    }

    // Import products
    if (importData.products) {
      const insertProduct = db.prepare(`
        INSERT OR REPLACE INTO products 
        (id, name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const product of importData.products) {
        insertProduct.run(
          product.id,
          product.name,
          product.description,
          product.cost_price,
          product.selling_price,
          product.quantity_in_stock,
          product.low_stock_threshold,
          product.sku,
          product.category,
          product.unit,
          product.created_at,
          product.updated_at
        );
      }
    }

    // Import invoices
    if (importData.invoices) {
      const insertInvoice = db.prepare(`
        INSERT OR REPLACE INTO invoices 
        (id, invoice_number, customer_name, customer_phone, customer_email, vehicle_make, vehicle_model, vehicle_year, license_plate, invoice_date, due_date, due_upon_receipt, invoice_language, status, notes, subtotal, tax_amount, tax_rate, total, paid, paid_at, completed_at, payment_method, pdf_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const invoice of importData.invoices) {
        insertInvoice.run(
          invoice.id,
          invoice.invoice_number,
          invoice.customer_name,
          invoice.customer_phone,
          invoice.customer_email,
          invoice.vehicle_make ?? null,
          invoice.vehicle_model ?? null,
          invoice.vehicle_year ?? null,
          invoice.license_plate ?? null,
          invoice.invoice_date,
          invoice.due_date,
          invoice.due_upon_receipt ?? 1,
          invoice.invoice_language || 'en',
          invoice.status,
          invoice.notes,
          invoice.subtotal,
          invoice.tax_amount,
          invoice.tax_rate,
          invoice.total,
          invoice.paid,
          invoice.paid_at ?? null,
          invoice.completed_at ?? null,
          invoice.payment_method,
          restoredInvoicePdfPaths.get(invoice.id) || null,
          invoice.created_at,
          invoice.updated_at
        );
      }
    }

    // Import invoice items
    if (importData.invoiceItems) {
      const insertItem = db.prepare(`
        INSERT OR REPLACE INTO invoice_items
        (id, invoice_id, product_id, item_type, description, quantity, unit_price, cost_price, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of importData.invoiceItems) {
        insertItem.run(
          item.id, item.invoice_id, item.product_id, item.item_type, item.description,
          item.quantity,
          item.unit_price,
          item.cost_price ?? null,
          item.amount,
          item.created_at
        );
      }
    }

    // Import low stock alerts
    if (importData.lowStockAlerts) {
      const insertAlert = db.prepare(`
        INSERT OR REPLACE INTO low_stock_alerts
        (id, product_id, threshold, current_stock, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const alert of importData.lowStockAlerts) {
        insertAlert.run(
          alert.id,
          alert.product_id,
          alert.threshold,
          alert.current_stock,
          alert.status,
          alert.created_at,
          alert.updated_at,
        );
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

    // Import recurring expenses
    if (importData.recurringExpenses) {
      const insertRecurringExpense = db.prepare(`
        INSERT OR REPLACE INTO recurring_expenses
        (id, category, description, amount, payment_method, notes, start_date, frequency, next_due_date, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const recurringExpense of importData.recurringExpenses) {
        insertRecurringExpense.run(
          recurringExpense.id,
          recurringExpense.category,
          recurringExpense.description ?? '',
          recurringExpense.amount,
          recurringExpense.payment_method,
          recurringExpense.notes,
          recurringExpense.start_date,
          recurringExpense.frequency,
          recurringExpense.next_due_date,
          recurringExpense.active ?? 1,
          recurringExpense.created_at,
          recurringExpense.updated_at,
        );
      }
    }

    // Import audit log
    if (importData.auditLog) {
      const insertAuditLog = db.prepare(`
        INSERT OR REPLACE INTO audit_log
        (id, action, entity_type, entity_id, changes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const entry of importData.auditLog) {
        insertAuditLog.run(
          entry.id,
          entry.action,
          entry.entity_type,
          entry.entity_id,
          entry.changes,
          entry.created_at,
        );
      }
    }

    return { success: true, message: 'Data imported successfully', restartRequired: true };
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
});

function formatCurrency(amount, currency = 'PHP', locale = 'en-PH') {
  const normalizedAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    }).format(normalizedAmount);
  } catch (error) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    }).format(normalizedAmount);
  }
}

function createWindow() {
  const windowIconPath = path.join(__dirname, '..', 'assets', 'app-loco.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: fs.existsSync(windowIconPath) ? windowIconPath : undefined,
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

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastUpdateState(updateState || buildInitialUpdateState());
  });

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
      const shortcutPath = path.join(desktopPath, 'ShopFlow.lnk');
      
      const ps = `
        $WshShell = New-Object -ComObject WScript.Shell;
        $shortcut = $WshShell.CreateShortcut('${shortcutPath}');
        $shortcut.TargetPath = '${appPath}';
        $shortcut.WorkingDirectory = '${path.dirname(appPath)}';
        $shortcut.Description = 'ShopFlow business operations app';
        $shortcut.IconLocation = '${appPath}';
        $shortcut.Save();
      `;
      
      execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
      console.log('Desktop shortcut created successfully (Windows)');
    } else if (platform === 'darwin') {
      // macOS: Create alias for the app
      const appsPath = path.join(os.homedir(), 'Applications');
      const appName = 'ShopFlow.app';
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
      const shortcutPath = path.join(desktopPath, 'ShopFlow.desktop');
      const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=ShopFlow
Exec=${appPath}
Comment=Business operations app for shops
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
  migrateLegacyUserData();
  initializeDatabase();
  initializeAutoUpdater();
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
