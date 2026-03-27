# ShopFlow

Business operations desktop app for invoices, inventory, customer contacts, expenses, reporting, and workflow management.

ShopFlow is built for a non-technical owner using one local computer. It runs locally with SQLite and does not require accounts, passwords, or cloud setup.
It works especially well for mechanic and service shops, while keeping the brand broad enough to grow beyond invoicing.

## What The App Does

- Create draft invoices when a vehicle arrives
- Keep updating active jobs over time until the repair is finished
- Complete invoices, print them, and download PDF copies
- Track products, prices, stock, and low-stock warnings
- Track extra income and expenses, including recurring expenses
- Show revenue, costs, and profit by month
- Save customer contact details automatically from invoice history
- Reuse customer details to prefill a new draft invoice
- Export and import the full app data for backup or transfer
- Switch the app and invoice language between English and Tagalog
- Check for app updates from inside the app

## Main Features

### Invoicing
- Draft-first invoice workflow for active service jobs
- Optional vehicle details: make, model, year, and plate number
- Product and labor line items
- Invoice preview, print, and PDF download
- Invoice language selection
- Autosave while editing
- Active Invoices page for work in progress
- Invoice History with created date, payment date, filters, and sorting

### Inventory
- Product creation and editing
- Optional SKU with automatic SKU generation
- Cost price, selling price, quantity, low-stock threshold
- Search, filters, and sortable columns
- Stock decreases when items are used on invoices

### Contacts
- Customer Contacts page sourced from invoice history
- Search and sort customer records
- Start a new invoice draft using saved customer and vehicle details

### Finance
- Extra expenses and income tracking
- Recurring expenses for rent, utilities, food, and similar costs
- Monthly profit that includes sales, extra income, product costs, and extra expenses
- Revenue Tracking charts and sortable monthly breakdown table

### Data & Setup
- Business Settings for shop details, logo, VAT rate, and language
- Data export/import for backup and moving to another computer
- Local file storage for logo and invoice PDFs
- In-app update check and install flow for installed releases

## Who This Is For

This app is intended for:
- a service shop owner, especially mechanic shops
- one main local device
- no user accounts
- no server setup
- no technical knowledge required for daily use

That design choice is intentional.

## Daily Workflow

1. Set up the shop in `Business Settings`
2. Add products in `Inventory`
3. Create a draft invoice when a vehicle arrives
4. Update the draft from `Active Invoices` while the work is ongoing
5. Complete the invoice when the vehicle is ready
6. Print or download the invoice PDF
7. Mark the invoice as paid from `Invoice History`
8. Check reports in `Revenue Tracking`
9. Export a backup from `Data Management`

## Installation

For simple user-facing install steps, read [INSTALL_GUIDE.md](./INSTALL_GUIDE.md).

### Developer Setup

Requirements:
- Node.js 20+
- pnpm
- macOS or Windows

Install:

```bash
pnpm install
```

Run in development:

```bash
pnpm dev
```

Build locally:

```bash
pnpm build
```

## Updates

The app is configured to use GitHub Releases from:

- `https://github.com/Dforrunner/talyer`

Inside the app, the user can:
- open `Business Settings`
- click `Check for Updates`
- download an available update
- click `Install and Restart`

Important:
- auto-update works best on installed builds
- Windows users should install the `nsis` build, not just the portable copy
- macOS updates work best when the app is installed in `Applications`

## Release Process

### GitHub Actions Release

This repo now includes a release workflow:

- [.github/workflows/release.yml](./.github/workflows/release.yml)

To publish a new version:

1. Update `version` in [package.json](./package.json)
2. Commit the change
3. Create and push a version tag

```bash
git tag vX.Y.Z
git push origin main --tags
```

GitHub Actions will build and publish release artifacts for macOS and Windows using GitHub Releases.

### Manual Local Release

If you want to publish from your own machine instead of GitHub Actions:

```bash
export GITHUB_TOKEN=your_github_token
pnpm run release
```

## Data Storage

The app stores data locally in the Electron app data folder.

It includes:
- SQLite database
- business logo
- generated invoice PDFs
- imported/exported app data

## Tech Stack

- Next.js 16
- React 19
- Electron 41
- better-sqlite3
- PDFKit
- Tailwind CSS 4
- Radix UI
- Recharts
- electron-builder
- electron-updater

## Current Production Notes

The app is functionally ready for a real local service-shop workflow, especially for mechanic businesses.

Remaining practical release caveats:
- macOS notarization is still needed for the smoothest public macOS distribution
- portable Windows builds do not support the in-app updater
- GitHub Releases must contain the built artifacts and update metadata for updater checks to succeed

## Verification

Recently verified locally with:

- `pnpm exec tsc --noEmit`
- `pnpm exec next build --webpack`
- `pnpm exec electron-builder --mac zip`
- `node -c public/electron.js`
- `node -c public/preload.js`
