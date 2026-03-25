# Mechanic Shop Invoicing & Inventory Management System

A professional, production-ready invoicing and inventory management system built specifically for mechanic shops. This is a desktop application that runs locally on Windows and Mac, with all data stored locally using SQLite.

## Features

### Core Features
- **Professional Invoice Creation** - Create detailed invoices with products and custom labor entries
- **Inventory Management** - Full CRUD operations for managing shop products and stock levels
- **Invoice History** - Complete history of all invoices with search and filtering
- **PDF Generation** - Automatically generate professional, print-ready invoices as PDFs
- **Revenue Tracking** - Monthly and yearly profit/loss analysis with charts
- **Low Stock Alerts** - Real-time notifications when inventory falls below thresholds
- **Business Settings** - Customize business info, logo, tax rates, and more

### Advanced Features
- **Auto Invoice Numbering** - Sequential invoice numbers with date prefixes
- **Tax/VAT Management** - Optional tax calculation on invoices
- **Automatic Stock Updates** - Stock automatically decreases when items are used in invoices
- **Product Categories** - Organize products by category
- **Multiple Currency Support** - Support for USD, EUR, GBP, CAD, AUD, JPY, CHF
- **Customer Tracking** - Store customer contact information
- **Local Storage** - All data stored locally - no cloud required
- **Data Persistence** - SQLite database for reliable data storage

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm (or pnpm/yarn)
- Windows or macOS operating system

### Installation Steps

1. **Download or Clone the Project**
   ```bash
   git clone <repository-url>
   cd mechanic-shop-invoicing
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Start Development Mode**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   This will start the Next.js dev server on port 3000 and automatically launch the Electron app.

4. **Build for Production**
   ```bash
   pnpm build
   # or
   npm run build
   ```

## Usage Guide

### Getting Started

1. **Configure Business Settings** (First Time Setup)
   - Click on "Business Settings" in the sidebar
   - Enter your business name, address, phone, email
   - Optional: Upload your business logo (PNG/JPG, 200x200px)
   - Set your default VAT/Tax rate
   - Choose your currency

2. **Add Products to Inventory**
   - Go to "Inventory" tab
   - Click "Add Product"
   - Enter product details:
     - Product Name
     - SKU (Stock Keeping Unit)
     - Cost Price (what you pay)
     - Selling Price (what you charge)
     - Quantity in Stock
     - Low Stock Threshold (alerts when stock falls below this)
   - Click "Add Product"

3. **Create Your First Invoice**
   - Click "Create Invoice" in the sidebar
   - Enter customer information (name, phone, email)
   - Set invoice date (defaults to today)
   - Set due date (defaults to 30 days from today)
   - Add items:
     - **Add Product**: Select from your inventory (stock auto-updates)
     - **Add Labor**: Add custom labor work with description and cost
   - Review the summary on the right
   - Click "Create Invoice"

4. **View & Manage Invoices**
   - Go to "Invoice History"
   - Search by invoice number or customer name
   - Filter by status (Draft, Sent, Paid)
   - View detailed invoice information
   - Print or export as PDF
   - Mark invoices as paid

5. **Monitor Revenue**
   - Go to "Revenue Tracking"
   - View monthly revenue, costs, and profit
   - See profit margin percentages
   - Charts show trends over time
   - Change year using the dropdown

6. **Check Inventory Status**
   - Dashboard shows low stock items count
   - Sidebar displays alert badge when items are low
   - Inventory page highlights low stock items with warning icons
   - Set custom thresholds per product

### Dashboard Overview
The dashboard provides a quick overview of:
- Total products in inventory
- Low stock items count
- Total invoices created
- Monthly revenue
- Quick action shortcuts

## Database Schema

### Tables
- **business_settings** - Business information and configuration
- **products** - Inventory items with pricing and stock
- **invoices** - Invoice records with customer and financial data
- **invoice_items** - Line items within invoices
- **low_stock_alerts** - Tracking for low stock alerts
- **audit_log** - System activity logging

### Data Storage
- Database: `~/.config/mechanic-shop-invoicing/mechanic-shop.db`
- Invoices: `~/.config/mechanic-shop-invoicing/invoices/`
- Logo: Stored in app data directory
- All data is local - no internet required

## Keyboard Shortcuts & Tips

- **Dashboard**: Quick overview of your shop
- **Inventory**: Manage all products
- **Create Invoice**: Make new invoices
- **Invoice History**: Find and manage past invoices
- **Revenue Tracking**: Analyze business performance
- **Business Settings**: Update shop information

## Features in Detail

### Invoice Creation
- **Products**: Select from inventory with auto-populated pricing
- **Labor**: Add custom labor work with any description and cost
- **Tax/VAT**: Optional tax calculation based on business settings
- **Notes**: Add customer-specific notes
- **Auto Stock Update**: Product quantities decrease when added to invoices

### Inventory Management
- **Search & Filter**: Find products by name or SKU
- **Category Organization**: Filter by product categories
- **Cost Tracking**: Monitor profit margins (selling price - cost price)
- **Low Stock Alerts**: Visual indicators for items below threshold
- **Bulk Edit**: Quickly update product information

### Reporting & Analytics
- **Monthly Revenue**: See income by month
- **Profit Analysis**: Calculate profit margin percentages
- **Cost Tracking**: Monitor business expenses
- **Invoice Metrics**: Average invoice value and total count
- **Year Selection**: View any year's data

### PDF Generation
- **Professional Design**: Print-ready invoices
- **Business Branding**: Logo and business info on each invoice
- **Automatic Naming**: PDFs named by invoice number
- **Local Storage**: All PDFs stored locally for archive

## Troubleshooting

### Issue: App won't start
**Solution**: Make sure you've installed all dependencies with `pnpm install`

### Issue: Database errors
**Solution**: The database is created automatically on first run. If you get an error, check that you have write permissions in your user data directory.

### Issue: PDF generation fails
**Solution**: Ensure you have sufficient disk space in your user data directory

### Issue: Low stock alerts not showing
**Solution**: 
- Make sure you've set low stock thresholds for your products
- The sidebar badge updates every 30 seconds
- Manual refresh by navigating to Inventory page

### Issue: Logo not displaying
**Solution**:
- Use PNG or JPG format
- Recommended size: 200x200px
- Re-upload the logo if it doesn't appear

## Security & Privacy

- All data stored locally on your computer
- No internet connection required
- No data sent to any server
- Complete control over your business information
- SQLite database can be backed up like any file

## Backup & Recovery

### Backup Your Data
1. Close the application
2. Copy the entire data directory:
   - Windows: `%APPDATA%/mechanic-shop-invoicing/`
   - macOS: `~/Library/Application Support/mechanic-shop-invoicing/`
3. Store the backup in a safe location

### Restore from Backup
1. Close the application
2. Replace the data directory with your backup
3. Restart the application

## Future Enhancements

Potential features for future updates:
- Customer database with history
- Recurring invoice templates
- Email invoice sending
- Payment tracking
- Backup to cloud storage
- Multi-user support
- Invoice customization templates
- Expense tracking
- Vehicle service records

## Support & Troubleshooting

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed: `pnpm install`
3. Try restarting the application
4. Check that you have sufficient disk space
5. Verify database isn't corrupted (close app and restart)

## Technical Details

### Stack
- **Frontend**: React 19 with Next.js 16
- **Desktop**: Electron 33
- **Database**: SQLite3 (better-sqlite3)
- **PDF Generation**: PDFKit
- **UI Components**: shadcn/ui with Radix UI
- **Charts**: Recharts
- **Styling**: Tailwind CSS 4

### Architecture
- Single-user desktop application
- Main process handles database and file operations
- Renderer process handles UI
- IPC communication between processes
- Local-only data storage

## License

Commercial license - All rights reserved

## Version

Version 1.0.0 - Initial Release

---

**Ready to manage your shop efficiently!** Start by setting up your business information and adding your first products to the inventory.
