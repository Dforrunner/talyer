# Quick Start Setup Guide

## What You Have

A complete, production-ready invoicing and inventory management system for mechanic shops built with:
- **Electron Desktop App** - Runs on Windows and macOS
- **SQLite Database** - All data stored locally
- **React UI** - Modern, user-friendly interface
- **PDF Generation** - Professional invoices

## System Requirements

- **OS**: Windows 10+ or macOS 10.13+
- **RAM**: 2GB minimum (4GB recommended)
- **Disk Space**: 500MB for installation + space for data
- **Node.js**: 18.0.0 or higher (for development)

## Installation (Development)

### 1. Install Node.js
Download from https://nodejs.org/ (LTS version recommended)

### 2. Clone/Download Project
```bash
cd /path/to/project
```

### 3. Install Dependencies
```bash
pnpm install
```
If pnpm is not installed:
```bash
npm install -g pnpm
pnpm install
```

### 4. Start Development Mode
```bash
pnpm dev
```

The app will:
1. Start the Next.js development server (port 3000)
2. Automatically launch the Electron app window
3. Initialize SQLite database in your user data directory

### 5. Default Locations
- **Database**: 
  - Windows: `C:\Users\[YourUsername]\AppData\Local\mechanic-shop-invoicing\`
  - macOS: `~/Library/Application Support/mechanic-shop-invoicing/`
- **PDFs**: Same location under `invoices/` subdirectory

## Building for Distribution

### Create Executable
```bash
pnpm build
```

This will:
1. Build Next.js production bundle
2. Create Electron installers using electron-builder
3. Generate:
   - Windows: `.exe` installer
   - macOS: `.dmg` installer

### Distributable Files
Located in the `dist/` directory:
- `mechanic-shop-invoicing-1.0.0.exe` (Windows)
- `mechanic-shop-invoicing-1.0.0.dmg` (macOS)

## First Time Setup

1. **Launch Application**
   - Open the installed app or run `pnpm dev`
   - App will create database automatically

2. **Configure Business Settings**
   - Click "Business Settings" in sidebar
   - Enter shop name, address, phone, email
   - Upload logo (optional)
   - Set tax rate if applicable
   - Choose currency

3. **Add Products**
   - Go to "Inventory"
   - Click "Add Product"
   - Fill in:
     - Product Name (e.g., "Brake Pads")
     - SKU (e.g., "BP-001")
     - Cost Price
     - Selling Price
     - Quantity in Stock
     - Low Stock Threshold (when to alert)

4. **Create First Invoice**
   - Click "Create Invoice"
   - Add customer info
   - Add products or labor
   - Click "Create Invoice"
   - PDF auto-generated and saved

## Database Structure

### Auto-Created Tables

The system automatically creates these tables on first run:

```sql
-- Business Configuration
business_settings (id, business_name, logo_path, address, city, postal_code, phone, email, tax_id, currency, vat_rate)

-- Products/Inventory
products (id, name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit)

-- Invoices
invoices (id, invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, status, notes, subtotal, tax_amount, tax_rate, total, paid, payment_method, pdf_path)

-- Invoice Items
invoice_items (id, invoice_id, product_id, item_type, description, quantity, unit_price, amount)

-- Low Stock Tracking
low_stock_alerts (id, product_id, threshold, current_stock, status)

-- Activity Log
audit_log (id, action, entity_type, entity_id, changes)
```

All tables are created automatically - no manual setup needed.

## Troubleshooting Installation

### "Module not found" Error
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### "Port 3000 already in use"
The app will automatically try port 3001, 3002, etc. Or kill the process:

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

### "Electron failed to start"
Make sure you're running from the correct directory with all dependencies installed.

### "Database locked" Error
- Close all instances of the app
- Wait a few seconds
- Restart the app

## Development Tips

### File Structure
```
project/
├── app/
│   ├── page.tsx          # Main app entry
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── pages/           # Feature pages
│   ├── modals/          # Modal dialogs
│   ├── sidebar.tsx      # Navigation
│   └── invoice-preview.tsx
├── lib/
│   ├── db.ts            # Database utilities
│   ├── pdf-generator.ts # PDF generation
│   └── utils.ts         # Helper functions
├── public/
│   ├── electron.js      # Main Electron process
│   └── preload.js       # IPC bridge
└── package.json
```

### Adding Features

To add a new feature:

1. **Create Component**
   - Add component in `components/pages/your-feature.tsx`
   - Use existing page components as template

2. **Add Database Functions**
   - Add SQL queries to `lib/db.ts`
   - Use db.query(), db.get(), or db.run()

3. **Add Navigation**
   - Add menu item to `Sidebar` component
   - Update page routing in `app/page.tsx`

4. **Test**
   - Run `pnpm dev`
   - Test new feature in Electron app

## Environmental Setup

No environment variables needed for local development. Everything uses local storage.

For production builds, the system automatically:
- Uses the user's AppData/Application Support directory
- Creates necessary subdirectories
- Initializes database if missing

## Important Notes

### Data Storage
- All data is stored **locally only**
- No internet connection required
- No data sent to any server
- You have complete control of your data

### Backups
Regular backups recommended:
```bash
# Windows
xcopy "%APPDATA%\mechanic-shop-invoicing" "D:\Backups\mechanic-shop-backup" /Y /S

# macOS
cp -r ~/Library/Application\ Support/mechanic-shop-invoicing ~/Backups/
```

### Performance
- Application is optimized for local use
- Can handle 10,000+ invoices efficiently
- Database auto-indexes frequently searched fields
- Charts and reports generated on-demand

## Deployment

### For Personal Use
1. Run `pnpm dev` during development
2. Run `pnpm build` to create installer
3. Distribute the `.exe` or `.dmg` file

### For Multiple Machines
1. Build the app: `pnpm build`
2. Share the installer with users
3. Each installation maintains separate database
4. For shared data, users must manually export/import

## Support

For issues:
1. Check the troubleshooting section
2. Review console logs (Dev Tools → F12)
3. Verify database integrity
4. Try reinstalling dependencies

## What's Included

- Complete invoice management system
- Inventory tracking with low stock alerts
- Professional PDF generation
- Revenue and profit analysis
- Business settings configuration
- Local SQLite database
- Modern React UI with Tailwind CSS
- Electron desktop app framework

## Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Start app: `pnpm dev`
3. ✅ Configure business settings
4. ✅ Add products to inventory
5. ✅ Create first invoice
6. ✅ View invoice history
7. ✅ Check revenue tracking

**You're ready to manage your mechanic shop!**

---

For detailed usage instructions, see **README.md**
