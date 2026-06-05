#!/usr/bin/env node

/**
 * Prints the release checklist for the current package version.
 *
 * This is documentation, not a test. Use validate-production.js and the smoke
 * scripts for automated checks.
 */

const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
);

console.log(`
ShopFlow Production Checklist
Version: ${packageJson.version}

Required automated checks
[ ] pnpm typecheck
[ ] pnpm exec next build --webpack
[ ] node scripts/validate-production.js
[ ] node scripts/smoke-production-docs.js
[ ] node scripts/smoke-translation-coverage.js
[ ] node -c public/electron.js
[ ] node -c public/preload.js

Release classification
[ ] Breaking change: No / Workflow-training change / Potential breaking change / Breaking change: Yes
[ ] Data migration: None / Additive / Transforming
[ ] Import-export format change: No / Backward compatible / Requires migration notes
[ ] Owner-facing release notes explain the change in plain language

Migration and backup gate
[ ] Old database fixture tested
[ ] New database fixture tested
[ ] Migration rerun verified
[ ] Record counts verified for products, invoices, invoice items, active jobs, salary payments, employees, expenses, income, and settings
[ ] Relationships verified for invoice items to invoices/products and salary payments to employees/invoices
[ ] Automatic backup created before migration
[ ] Backup folder contains shopflow.db and managed asset folders when present: logos/ and invoices/
[ ] Manual restore steps documented for the owner
[ ] Rollback behavior verified after a simulated migration failure

Import-export gate
[ ] Invalid JSON does not mutate existing data
[ ] Invalid table rows do not mutate existing data
[ ] Replace-all import creates a backup before deleting current records
[ ] Merge import preserves existing unrelated records
[ ] Older supported backup JSON files import successfully
[ ] Logo and invoice PDFs restore only after database import succeeds

Desktop release checks
[ ] Windows installer tested on a clean Windows 10/11 profile
[ ] macOS DMG tested on a clean macOS 11+ profile
[ ] Installed app opens without developer server
[ ] In-app updater tested on an installed build
[ ] Portable Windows build is not advertised as updater-compatible

Daily workflow smoke checks
[ ] Add shop details in Business Settings
[ ] Create a draft invoice/job
[ ] Continue that job from Active Invoices
[ ] Add product and labor line items
[ ] Complete or mark paid
[ ] Print/download PDF
[ ] Find the finished job in Invoice History
[ ] Export backup from App Settings > Data Management
[ ] Import backup on a separate profile or test machine

Do not publish a schema-changing or import/export-changing release until the
migration and import-export gates above are complete.
`);
