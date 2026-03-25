# Getting Started - 5 Minute Setup

Welcome! Your professional mechanic shop invoicing system is ready to use. Follow these simple steps to get started.

## Step 1: Install (2 minutes)

### If you haven't installed yet:

```bash
# 1. Download/clone the project
# 2. Open terminal/command prompt in project folder

# 3. Install everything (one time only)
pnpm install

# OR if pnpm not installed:
npm install -g pnpm
pnpm install
```

### Already installed? Just start it:
```bash
pnpm dev
```

The app will automatically:
1. Start Next.js development server
2. Launch the Electron app
3. Create the database
4. Show the Dashboard

## Step 2: Setup Your Business (2 minutes)

When you first open the app:

1. Click **Business Settings** in the left sidebar
2. Enter your business information:
   - Business Name (e.g., "John's Auto Repair")
   - Address and contact info
   - Phone and email
3. Optional: Upload your logo (PNG/JPG)
4. Set your currency and tax rate
5. Click **Save Settings**

✓ You're configured!

## Step 3: Add Your First Product (1 minute)

1. Click **Inventory** in sidebar
2. Click **Add Product** button
3. Fill in:
   - **Product Name**: e.g., "Brake Pads"
   - **SKU**: e.g., "BP-001" (your code)
   - **Cost Price**: $30 (what you pay)
   - **Selling Price**: $50 (what you charge)
   - **Quantity in Stock**: 10
   - **Low Stock Alert**: 3 (warn when below this)
4. Click **Add Product**

✓ Product ready to use!

## Step 4: Create Your First Invoice (1 minute)

1. Click **Create Invoice** in sidebar
2. Enter customer name (required)
3. Leave dates as defaults (today + 30 days)
4. Click **Add Product** → Select the Brake Pads
5. It auto-fills the price
6. Click **Create Invoice**

What happens automatically:
- ✓ Invoice number created: `INV-20260325-0001`
- ✓ PDF generated and saved
- ✓ Stock decreased by 1 unit (9 remaining)
- ✓ Invoice saved to history

## Step 5: Review Your Invoices (Done!)

1. Click **Invoice History** in sidebar
2. You'll see your first invoice listed
3. Click the 👁️ icon to view details
4. Click **Print** to print it

## What You Can Do Now

### Dashboard
- See your shop overview
- Total products count
- Total invoices created
- Monthly revenue summary
- Low stock alerts

### Inventory
- ✓ Add/edit/delete products
- ✓ Search by name or SKU
- ✓ See all stock levels
- ✓ Get alerts for low stock

### Create Invoice
- ✓ Add products (auto-pricing)
- ✓ Add custom labor
- ✓ Set customer details
- ✓ Enable/disable tax
- ✓ Add notes
- ✓ Print to PDF

### Invoice History
- ✓ See all invoices
- ✓ Search by number or customer
- ✓ Filter by status
- ✓ View details
- ✓ Print or download PDF

### Revenue Tracking
- ✓ See monthly profit
- ✓ Track expenses
- ✓ View profit margin
- ✓ Compare years
- ✓ See trends with charts

## That's It!

You now have a complete invoicing system. Here are some next steps:

1. **Add more products** to your inventory
2. **Set low stock thresholds** (alerts when needed)
3. **Create invoices** for your customers
4. **Check revenue monthly** to see profit
5. **Backup your data** regularly

## Common First-Time Questions

### Q: Where is my data saved?
**A**: In your user folder:
- Windows: `C:\Users\YourName\AppData\Local\mechanic-shop-invoicing\`
- macOS: `~/Library/Application Support/mechanic-shop-invoicing/`

### Q: How do I backup my data?
**A**: Copy the entire mechanic-shop-invoicing folder to an external drive weekly.

### Q: Can I edit an invoice after creating it?
**A**: The current version locks completed invoices. Create a new one if you need changes.

### Q: What if I forget to set a product category?
**A**: Categories are optional - you can leave blank. You can edit later in Inventory.

### Q: How is inventory stock updated?
**A**: When you add a product to an invoice, the stock automatically decreases by that quantity.

### Q: Can multiple people use this?
**A**: No, currently it's single-user. Only one person can use it at a time.

### Q: What happens to my PDFs?
**A**: They're saved locally on your computer in the invoices folder. You can email or print them.

### Q: Can I email invoices to customers?
**A**: Currently you print or save as PDF. Email is planned for a future version.

### Q: Is my data safe?
**A**: Yes! All data is local on your computer. No internet, no cloud, no third parties.

## Need Help?

- **Detailed Guide**: See `README.md`
- **Installation Issues**: See `SETUP.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`

## Quick Tips

1. **Use consistent SKU format** - Makes searching easier
2. **Set low stock thresholds** - Avoids running out
3. **Review revenue monthly** - Track your profit
4. **Backup weekly** - Prevents data loss
5. **Add customer phone numbers** - Useful for follow-up

## Next Features to Try

Once you're comfortable:
- [ ] Upload your logo in Business Settings
- [ ] Add 10+ products to inventory
- [ ] Create invoices with both products and labor
- [ ] Enable tax/VAT in settings
- [ ] Check revenue tracking for profit analysis
- [ ] Add notes to invoices for special instructions

## You're Ready!

Everything is installed and configured. Start creating invoices and managing your shop's inventory.

**The app will auto-save everything** - no need to manually save.

---

## Support Checklist

If something isn't working:

- [ ] Is the app fully started? (Wait for main window)
- [ ] Do you have pnpm dependencies? (Run `pnpm install`)
- [ ] Is database showing errors? (Restart the app)
- [ ] Is PDF not generating? (Check disk space)
- [ ] Did you fill all required fields? (Customer name is required for invoices)

## Still Need Help?

Check these files in order:
1. `QUICK_REFERENCE.md` - Quick answers
2. `README.md` - Detailed documentation
3. `SETUP.md` - Installation troubleshooting

---

**Congratulations! Your mechanic shop invoicing system is ready to go! 🎉**

Start creating invoices now and enjoy tracking your profits automatically.
