# Installation Guide - Mechanic Shop Invoicing System

## For Non-Technical Users

This guide will help you install and set up the Mechanic Shop Invoicing System on your Windows, Mac, or Linux computer.

## Step 1: Download the Application

1. Visit the project releases page or download location
2. Download the installer for your operating system:
   - **Windows**: Download the `.exe` installer
   - **macOS**: Download the `.dmg` installer  
   - **Linux**: Download the `.AppImage` or distribution-specific package

## Step 2: Install the Application

### Windows
1. Double-click the downloaded `.exe` file
2. Follow the on-screen installation wizard
3. Click "Install" when prompted
4. Wait for the installation to complete
5. Check "Launch application" to start it immediately, or click "Finish"

### macOS
1. Double-click the downloaded `.dmg` file
2. Drag the "Mechanic Shop Invoicing" app into the Applications folder
3. Wait for the copy process to complete
4. Go to Applications folder and double-click "Mechanic Shop Invoicing" to launch

### Linux
1. Make the file executable:
   - Right-click the `.AppImage` file
   - Select "Properties" → "Permissions" 
   - Check "Allow executing file as program"
2. Double-click to run, or from terminal:
   ```bash
   chmod +x ./Mechanic-Shop-Invoicing-*.AppImage
   ./Mechanic-Shop-Invoicing-*.AppImage
   ```

## Step 3: Desktop Shortcut (Automatic)

When you launch the application for the first time, it automatically creates a desktop shortcut. You'll see:
- **Windows**: A "Mechanic Shop Invoicing.lnk" icon on your Desktop
- **macOS**: A "Mechanic Shop Invoicing" alias on your Desktop
- **Linux**: A "Mechanic-Shop-Invoicing.desktop" file on your Desktop

From now on, you can simply **double-click this desktop icon** to launch the application anytime!

## Step 4: Initial Setup

1. When you first open the application, go to **Business Settings** (in the sidebar)
2. Enter your mechanic shop details:
   - Business name
   - Address
   - Phone number
   - Email
   - Tax ID (optional)
   - Upload your business logo (optional)
3. Click **Save Settings**

## Step 5: Add Your Inventory

1. Go to **Inventory** in the sidebar
2. Click **Add Product**
3. Enter product details:
   - Product name
   - Cost price
   - Selling price
   - Quantity in stock
4. Click **Add Product** to save
5. Repeat for all your parts and products

## Step 6: Create Your First Invoice

1. Go to **Create Invoice** in the sidebar
2. Enter customer information (optional)
3. Select products from inventory or add labor work
4. Review the invoice preview
5. Click **Create Invoice**
6. Invoice is automatically saved and a PDF is generated

## File Storage Locations

All your data is stored locally on your computer (no cloud services):

### Windows
```
C:\Users\[YourUsername]\AppData\Local\mechanic-shop-invoicing\
```

### macOS
```
~/Library/Application Support/mechanic-shop-invoicing/
```

### Linux
```
~/.local/share/mechanic-shop-invoicing/
```

Your data includes:
- SQLite database with all invoices, products, and settings
- PDF files of generated invoices
- Business logo image

## Uninstalling the Application

### Windows
1. Go to Control Panel → Programs → Programs and Features
2. Find "Mechanic Shop Invoicing"
3. Click Uninstall and follow the prompts

### macOS
1. Open Applications folder
2. Drag "Mechanic Shop Invoicing" to the Trash
3. Empty the Trash

### Linux
1. If installed via package manager:
   ```bash
   sudo apt remove mechanic-shop-invoicing
   ```
2. If running AppImage, simply delete the file

## Getting Help

If you encounter any issues:

1. Check the QUICK_REFERENCE.md for common tasks
2. Review DESKTOP_SHORTCUT.md for shortcut help
3. Ensure all your data is backed up before reinstalling
4. Contact technical support with error messages from the application

## Tips for Non-Technical Users

- The application saves all data automatically
- Invoices are stored as PDFs in your Documents folder for easy sharing
- You can close the application anytime - data is safely saved
- The desktop shortcut makes it easy to return to the app
- All currency amounts are in Philippine Pesos (₱)
