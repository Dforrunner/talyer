# Quick Reference Guide

## Main Menu Navigation

| Button | Feature | What It Does |
|--------|---------|-------------|
| 🏠 Dashboard | Overview | See your shop stats at a glance |
| 📦 Inventory | Products | Manage all your shop products |
| 🧾 Create Invoice | New Invoice | Make a new invoice for customers |
| 📋 Invoice History | Past Invoices | Find and view old invoices |
| 📈 Revenue Tracking | Analytics | See monthly profits and trends |
| ⚙️ Business Settings | Config | Set up your shop info |

---

## Quick Tasks

### Create Your First Invoice
1. Click **Create Invoice**
2. Enter customer name (required)
3. Click **Add Product** or **Add Labor**
4. Select product OR type labor description + cost
5. Review total on right side
6. Click **Create Invoice**
✓ Invoice saved, PDF generated, inventory updated!

### Add a Product to Inventory
1. Go to **Inventory**
2. Click **Add Product**
3. Fill in:
   - Product Name (e.g., "Brake Pads")
   - SKU (e.g., "BP-001")
   - Cost Price (what you pay)
   - Selling Price (what you charge)
   - Quantity in Stock
   - Low Stock Alert Level
4. Click **Add Product**
✓ Product saved and ready to use!

### Check Why Stock Alert Shows
1. Look at red badge on **Inventory** in sidebar
2. Click **Inventory** tab
3. Products with ⚠️ are below their alert level
4. Click product to edit and restock

### Print an Invoice
1. Go to **Invoice History**
2. Find the invoice
3. Click the 👁️ eye icon to view
4. Click **Print** button
5. Choose printer and print

### See Monthly Profits
1. Click **Revenue Tracking**
2. Select year from dropdown (top right)
3. See cards: Revenue, Costs, Profit, Margin%
4. Charts show trends through the year
5. Bottom table breaks down each month

---

## Keyboard & Tips

### Product Entry Tips
- **SKU**: Use a code like "BP-001" (Brake Pads - 001)
- **Categories**: Group similar items (Brakes, Oil, Filters, etc.)
- **Units**: Select the right unit (pcs=pieces, box=box, pair=pair)
- **Prices**: Cost must be entered, Selling can be higher for profit

### Invoice Tips
- **Dates**: Auto-filled (today + 30 days), can change if needed
- **Products**: Selecting one auto-fills the price
- **Labor**: Type any description + your hourly or fixed rate
- **Tax**: Optional, enable in Business Settings first
- **Notes**: Add instructions, late fees, payment terms, etc.

### Searching
- **Inventory Search**: Type product name or SKU
- **Invoice Search**: Type invoice number or customer name
- **Filter**: Use dropdown to narrow results

---

## Common Prices to Know

### Settings Page
- **Business Name**: Your shop's legal name
- **VAT/Tax Rate**: Percentage to add (0% if not needed)
- **Currency**: Your money type (USD, EUR, etc.)
- **Logo**: Upload a square image (200x200px is best)

### Product Pricing Formula
```
Profit Margin = (Selling Price - Cost Price) / Selling Price × 100%

Example:
- Cost Price: $50
- Selling Price: $80
- Profit: $30
- Profit Margin: $30 ÷ $80 = 37.5%
```

---

## What Happens Automatically

✓ **Invoice Creation**
- Invoice number auto-generated
- Products stock decreases automatically
- PDF saved to computer
- Date recorded in database

✓ **Low Stock Alerts**
- Sidebar badge updates every 30 seconds
- Products highlighted in Inventory table
- Dashboard shows count
- You choose the alert level per product

✓ **PDF Generation**
- Professional design with your logo
- Customer info and date
- All line items and amounts
- Tax if enabled
- Saved with invoice number as filename
- Location: AppData/mechanic-shop-invoicing/invoices/

✓ **Revenue Tracking**
- Calculates automatically from invoices
- Only counts paid invoices (not drafts)
- Costs from product items only (labor = revenue only)
- Monthly reports auto-generated

---

## Important Reminders

### Before First Use
- [ ] Setup Business Settings with your shop name
- [ ] Upload your logo if you have one
- [ ] Set your default tax rate (if applicable)
- [ ] Choose your currency

### Regular Maintenance
- [ ] Add new products as you stock them
- [ ] Update low stock thresholds
- [ ] Review revenue monthly
- [ ] Check low stock alerts regularly

### Backups (Very Important!)
- **How**: Copy the folder `AppData/mechanic-shop-invoicing/`
- **When**: Monthly or after major changes
- **Where**: External drive or second location
- **Why**: Protects against computer problems

---

## Where Files Are Saved

### Windows
- **Data**: `C:\Users\YourName\AppData\Local\mechanic-shop-invoicing\`
- **Database**: `mechanic-shop.db` (same folder)
- **PDFs**: `invoices\` subfolder
- **Logo**: Same data folder

### macOS
- **Data**: `~/Library/Application Support/mechanic-shop-invoicing/`
- **Database**: `mechanic-shop.db` (same folder)
- **PDFs**: `invoices\` subfolder
- **Logo**: Same data folder

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Low stock alerts not showing" | Set low stock threshold for product, wait 30 sec |
| "Logo not appearing" | Use PNG/JPG, re-upload, restart app |
| "Can't create invoice" | Fill in customer name (required field) |
| "Stock didn't decrease" | Used product item (not labor), check product selected |
| "Can't find old invoice" | Search by invoice number or customer name |
| "PDF not generating" | Check disk space, restart app |
| "Database locked error" | Close app completely, wait 5 sec, restart |
| "Can't edit finished invoice" | Invoices locked, create new one instead |

---

## Data Fields Explanation

### Product Fields
- **Name**: What you call it (e.g., "Synthetic Oil 5W-30")
- **SKU**: Unique identifier you create (e.g., "OIL-5W30-1")
- **Cost Price**: What it cost you to buy
- **Selling Price**: What you charge customers
- **Quantity**: How many you have in stock
- **Low Stock Threshold**: Alert at this level (e.g., 5 units)
- **Category**: Type of product (optional, for organization)

### Invoice Fields
- **Invoice Number**: Auto-created (INV-20260325-0001)
- **Customer Name**: Who you're billing (required)
- **Invoice Date**: When you created it (defaults to today)
- **Due Date**: When payment is due (defaults to 30 days)
- **Items**: Products/labor used
- **Subtotal**: Total before tax
- **Tax**: Only if enabled in settings
- **Total**: Final amount customer owes
- **Notes**: Special instructions or terms

---

## Status Meanings

### Invoice Status
- **Draft**: Not finalized, can be modified
- **Sent**: Sent to customer, ready for payment
- **Paid**: Payment received, archived

### Stock Status
- **Normal**: Above low stock threshold ✓
- **Low Stock**: Below threshold ⚠️ (shows alert)
- **Out of Stock**: Zero quantity (0)

---

## Sample Invoice Breakdown

```
Business: John's Auto Repair
Customer: Sarah Smith

Items:
  1. Brake Pads (product)     4 × $25.00 = $100.00
  2. Labor: Brake Service    2 × $50.00 = $100.00

Subtotal:                              $200.00
Tax (10%):                              $20.00
                                 ─────────────
TOTAL:                                 $220.00
```

After invoice created:
- ✓ Brake Pads stock reduced by 4 units
- ✓ Invoice saved with number INV-20260325-0001
- ✓ PDF created: "INV-20260325-0001.pdf"
- ✓ Recorded in Invoice History
- ✓ Revenue tracked in monthly totals

---

## Monthly Checklist

- [ ] Review revenue report
- [ ] Check low stock items
- [ ] Restock low items
- [ ] Backup data to external drive
- [ ] Update business info if changed
- [ ] Review profit margins
- [ ] Analyze revenue trends
- [ ] Follow up on unpaid invoices

---

## Help & Support

### In the App
- Hover over fields to see hints
- Fields marked with * are required
- Status badges explain current state
- Search helps find anything

### Common Searches
- "recent invoices" → go to Invoice History
- "how much profit" → go to Revenue Tracking
- "products need ordering" → check Inventory low stock
- "customer balance" → search in Invoice History

---

**Everything you need to run your shop efficiently!**

For detailed help, see **README.md**
For installation help, see **SETUP.md**
