#!/usr/bin/env node

/**
 * Production Validation Script
 * Run: node scripts/validate-production.js
 * 
 * This script verifies that all production-critical components are properly configured
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: '✓ Electron Main Process',
    files: ['public/electron.js'],
    validate: (content) => {
      return content.includes('const isDev = !app.isPackaged') &&
             content.includes('ipcMain.handle(\'database:') &&
             content.includes('ipcMain.handle(\'data:export\'') &&
             content.includes('ipcMain.handle(\'data:import\'');
    }
  },
  {
    name: '✓ Preload Script',
    files: ['public/preload.js'],
    validate: (content) => {
      return content.includes('contextBridge.exposeInMainWorld') &&
             content.includes('data: {') &&
             content.includes('export:') &&
             content.includes('import:');
    }
  },
  {
    name: '✓ Database API Wrapper',
    files: ['lib/electron-api.ts'],
    validate: (content) => {
      return content.includes('safeDbQuery') &&
             content.includes('safeDbGet') &&
             content.includes('safeDbRun') &&
             content.includes('safeDataExport') &&
             content.includes('safeDataImport') &&
             content.includes('export const isElectron = () =>');
    }
  },
  {
    name: '✓ App Page Routing',
    files: ['app/page.tsx'],
    validate: (content) => {
      return content.includes('data-management') &&
             content.includes('onNavigate') &&
             content.includes('isElectron()');
    }
  },
  {
    name: '✓ Data Management Page',
    files: ['components/pages/data-management.tsx'],
    validate: (content) => {
      return content.includes('safeDataExport') &&
             content.includes('safeDataImport') &&
             content.includes('handleExport') &&
             content.includes('handleImport');
    }
  },
  {
    name: '✓ Dashboard Quick Actions',
    files: ['components/pages/dashboard.tsx'],
    validate: (content) => {
      return content.includes('onNavigate') &&
             content.includes('onClick={() => onNavigate') &&
             content.includes('invoices') &&
             content.includes('inventory') &&
             content.includes('revenue-tracking');
    }
  },
  {
    name: '✓ Business Settings Null Handling',
    files: ['components/pages/business-settings.tsx'],
    validate: (content) => {
      return content.includes('const loadSettings = async () =>') &&
             content.includes('setSettings({') &&
             content.includes('business_name: ""') &&
             content.includes('currency: "PHP"') &&
             content.includes('setPendingLogoUpload(null)');
    }
  },
  {
    name: '✓ Invoice Creator Null Handling',
    files: ['components/pages/invoice-creator.tsx'],
    validate: (content) => {
      return content.includes('setBusinessSettings(null)') &&
             content.includes('setProducts([])') &&
             content.includes('createEmptyInvoice(') &&
             content.includes('lastSavedSnapshotRef.current');
    }
  },
  {
    name: '✓ Package.json Configuration',
    files: ['package.json'],
    validate: (content) => {
      const json = JSON.parse(content);
      return json.main === 'public/electron.js' &&
             json.build?.appId === 'com.dforrunner.shopflow' &&
             json.build?.productName === 'ShopFlow' &&
             json.scripts?.dev?.includes('concurrently') &&
             json.dependencies?.['better-sqlite3'] &&
             json.dependencies?.['pdfkit'];
    }
  },
  {
    name: '✓ Type Definitions Updated',
    files: ['lib/db.ts'],
    validate: (content) => {
      return content.includes('data: {') &&
             content.includes('export:') &&
             content.includes('import:');
    }
  }
];

console.log('\n🚀 Production Readiness Validation\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

checks.forEach(check => {
  try {
    const file = check.files[0];
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`✗ ${check.name} - File not found: ${file}`);
      failed++;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (check.validate(content)) {
      console.log(`${check.name}`);
      passed++;
    } else {
      console.log(`✗ ${check.name} - Validation failed`);
      failed++;
    }
  } catch (error) {
    console.log(`✗ ${check.name} - Error: ${error.message}`);
    failed++;
  }
});

console.log('=' .repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All production checks passed! Ready to ship.\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the implementation.\n');
  process.exit(1);
}
