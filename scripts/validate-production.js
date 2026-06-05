#!/usr/bin/env node

/**
 * Production validation for the current ShopFlow app structure.
 *
 * This script intentionally checks stable behavior signals instead of stale
 * route strings. It does not replace typecheck, build, lint, or manual release
 * testing; run those separately before publishing.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packageJson = readJson('package.json');

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readFile(relativePath));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function hasAll(content, patterns) {
  return patterns.every((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(content);
    }

    return content.includes(pattern);
  });
}

function hasNone(content, patterns) {
  return patterns.every((pattern) => !content.includes(pattern));
}

function runCheck(check) {
  try {
    const missingFiles = check.files.filter((file) => !fileExists(file));
    if (missingFiles.length > 0) {
      return {
        ok: false,
        name: check.name,
        detail: `Missing file(s): ${missingFiles.join(', ')}`,
      };
    }

    const contents = Object.fromEntries(
      check.files.map((file) => [file, readFile(file)]),
    );
    const result = check.validate(contents);

    if (result === true) {
      return { ok: true, name: check.name };
    }

    return {
      ok: false,
      name: check.name,
      detail: typeof result === 'string' ? result : 'Validation failed',
    };
  } catch (error) {
    return {
      ok: false,
      name: check.name,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

const requiredChecks = [
  {
    name: 'Electron main process exposes the required desktop APIs',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) =>
      hasAll(electron, [
        'const isDev = !app.isPackaged',
        "ipcMain.handle('database:query'",
        "ipcMain.handle('database:get'",
        "ipcMain.handle('database:run'",
        "ipcMain.handle('data:export'",
        "ipcMain.handle('data:import'",
        "ipcMain.handle('app:getVersion'",
        "ipcMain.handle('updates:check'",
        'resolveDatabasePath',
        'mechanic-shop.db',
        'shopflow.db',
      ]) || 'Missing one or more Electron IPC, updater, or database path safeguards.',
  },
  {
    name: 'Preload exposes database, data, app, update, file, and PDF APIs',
    files: ['public/preload.js'],
    validate: ({ 'public/preload.js': preload }) =>
      hasAll(preload, [
        'contextBridge.exposeInMainWorld',
        'database:',
        'data:',
        'app:',
        'updates:',
        'file:',
        'pdf:',
        'export:',
        'import:',
      ]) || 'Preload API surface is incomplete.',
  },
  {
    name: 'Renderer uses the safe Electron API wrapper for data operations',
    files: ['lib/electron-api.ts'],
    validate: ({ 'lib/electron-api.ts': api }) =>
      hasAll(api, [
        'safeDbQuery',
        'safeDbGet',
        'safeDbRun',
        'safeDataExport',
        'safeDataImport',
        'safeAppGetVersion',
        'safeUpdatesCheck',
        'export const isElectron',
      ]) || 'Safe wrapper is missing required database, backup, app, or update helpers.',
  },
  {
    name: 'App shell routes backup and transfer through App Settings',
    files: ['app/page.tsx', 'components/sidebar.tsx', 'components/pages/app-settings.tsx'],
    validate: (files) => {
      const page = files['app/page.tsx'];
      const sidebar = files['components/sidebar.tsx'];
      const settings = files['components/pages/app-settings.tsx'];

      if (
        !hasAll(page, [
          "| 'app-settings'",
          "import('@/components/pages/app-settings')",
          "case 'app-settings'",
        ])
      ) {
        return 'app/page.tsx does not expose App Settings as a route.';
      }

      if (!hasNone(page, ["| 'data-management'", "case 'data-management'"])) {
        return 'app/page.tsx still exposes the stale standalone data-management route.';
      }

      if (!hasAll(sidebar, ["id: 'app-settings'", "backupTransfer"])) {
        return 'Sidebar does not expose App Settings / Backup & Transfer.';
      }

      if (sidebar.includes("id: 'data-management'")) {
        return 'Sidebar still exposes stale standalone Data Management.';
      }

      if (
        !hasAll(settings, [
          'safeDataExport',
          'safeDataImport',
          'shouldClearData',
          'appUpdates',
          'transferDataBetweenComputers',
        ])
      ) {
        return 'App Settings does not contain backup/restore and update controls.';
      }

      return true;
    },
  },
  {
    name: 'Dashboard quick actions navigate to core workflows',
    files: ['components/pages/dashboard.tsx'],
    validate: ({ 'components/pages/dashboard.tsx': dashboard }) =>
      hasAll(dashboard, [
        'onNavigate',
        "'invoices'",
        "'inventory'",
        "'revenue-tracking'",
      ]) || 'Dashboard quick actions are missing one or more core workflow routes.',
  },
  {
    name: 'Database schema includes current job, vehicle, salary, and finance fields',
    files: ['public/electron.js', 'lib/db.ts'],
    validate: (files) => {
      const combined = `${files['public/electron.js']}\n${files['lib/db.ts']}`;
      return (
        hasAll(combined, [
          'vehicle_make',
          'vehicle_model',
          'vehicle_year',
          'license_plate',
          'customer_address',
          'due_upon_receipt',
          'invoice_language',
          'paid_at',
          'completed_at',
          'employee_id',
          'invoice_id',
          'recurring_expenses',
          'cost_price',
        ]) || 'Current schema fields are missing from Electron initialization or renderer DB helpers.'
      );
    },
  },
  {
    name: 'Package configuration matches the Electron release target',
    files: ['package.json'],
    validate: () => {
      if (packageJson.main !== 'public/electron.js') {
        return 'package.json main must point at public/electron.js.';
      }

      if (packageJson.build?.appId !== 'com.dforrunner.shopflow') {
        return 'package.json build.appId is not com.dforrunner.shopflow.';
      }

      if (packageJson.build?.productName !== 'ShopFlow') {
        return 'package.json build.productName is not ShopFlow.';
      }

      if (!packageJson.scripts?.dev?.includes('concurrently')) {
        return 'dev script should start Next and Electron together.';
      }

      for (const dependency of ['better-sqlite3', 'pdfkit', 'electron-updater']) {
        if (!packageJson.dependencies?.[dependency]) {
          return `Missing production dependency: ${dependency}.`;
        }
      }

      return true;
    },
  },
  {
    name: 'Release and install docs include migration and restore gates',
    files: ['README.md', 'INSTALL_GUIDE.md'],
    validate: ({ 'README.md': readme, 'INSTALL_GUIDE.md': installGuide }) => {
      const combined = `${readme}\n${installGuide}`;
      return (
        hasAll(combined, [
          'App Settings > Data Management',
          'Breaking change',
          'Data migration',
          'Automatic backup',
          'Manual restore',
          'shopflow.db',
        ]) || 'Docs must describe current backup path and release migration gates.'
      );
    },
  },
  {
    name: 'Dependency-free smoke scripts are present',
    files: [
      'scripts/smoke-production-docs.js',
      'scripts/smoke-translation-coverage.js',
    ],
    validate: () => true,
  },
];

const advisoryChecks = [
  {
    name: 'Versioned migration ledger exists before schema-changing releases',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) =>
      /schema_migrations|app_metadata/.test(electron),
    recommendation:
      'Add schema_migrations or app_metadata in public/electron.js/lib/db.ts before shipping schema or data migrations.',
  },
  {
    name: 'Pre-update backup is implemented before schema/data migrations',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) =>
      /pre-update/.test(electron) && /fs\.cpSync|copyFileSync/.test(electron),
    recommendation:
      'Copy shopflow.db plus managed logos/ and invoices/ into userData/backups/pre-update/<timestamp>/ before any migration runs.',
  },
  {
    name: 'Data import database mutations run in one transaction',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) => {
      const importStart = electron.indexOf("ipcMain.handle('data:import'");
      const importEnd = electron.indexOf("function formatCurrency", importStart);
      const importBlock = importStart >= 0 && importEnd > importStart
        ? electron.slice(importStart, importEnd)
        : '';
      return /\.transaction\(|BEGIN TRANSACTION|db\.transaction/.test(importBlock);
    },
    recommendation:
      'Wrap replace/merge import DB writes in a single better-sqlite3 transaction and stage assets until the DB transaction succeeds.',
  },
  {
    name: 'Exports include both app version and backup schema version',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) =>
      /backupSchemaVersion/.test(electron) && /appVersion/.test(electron),
    recommendation:
      'Keep backup schema version separate from package/app version, and include both in exported JSON.',
  },
  {
    name: 'Data import accepts the current exported backup version',
    files: ['public/electron.js'],
    validate: ({ 'public/electron.js': electron }) => {
      const exportVersionMatch = electron.match(/version:\s*['"]([^'"]+)['"]/);
      const exportVersion = exportVersionMatch?.[1];
      if (!exportVersion) {
        return false;
      }

      const importStart = electron.indexOf("ipcMain.handle('data:import'");
      const importEnd = electron.indexOf('if (shouldClear)', importStart);
      const importValidationBlock = importStart >= 0 && importEnd > importStart
        ? electron.slice(importStart, importEnd)
        : '';

      return importValidationBlock.includes(`'${exportVersion}'`)
        || importValidationBlock.includes(`"${exportVersion}"`);
    },
    recommendation:
      'The import version allow-list must include the version written by data:export, otherwise fresh backups cannot be restored.',
  },
];

console.log('');
console.log(`ShopFlow production validation for v${packageJson.version}`);
console.log('='.repeat(64));

let passed = 0;
let failed = 0;

for (const check of requiredChecks) {
  const result = runCheck(check);
  if (result.ok) {
    console.log(`[pass] ${result.name}`);
    passed += 1;
  } else {
    console.log(`[fail] ${result.name}`);
    console.log(`       ${result.detail}`);
    failed += 1;
  }
}

console.log('-'.repeat(64));

const advisoryResults = advisoryChecks.map(runCheck);
const warnings = advisoryResults.filter((result) => !result.ok);

for (const warning of warnings) {
  const source = advisoryChecks.find((check) => check.name === warning.name);
  console.log(`[warn] ${warning.name}`);
  console.log(`       ${source?.recommendation || warning.detail}`);
}

console.log('='.repeat(64));
console.log(`Required checks: ${passed} passed, ${failed} failed`);
console.log(`Advisories: ${warnings.length} open`);

if (failed > 0) {
  console.log('');
  console.log('Production validation failed. Fix required checks before release.');
  process.exit(1);
}

console.log('');
console.log('Required production structure checks passed.');
console.log('Run typecheck, build, smoke scripts, and the release checklist before publishing.');

if (warnings.length > 0) {
  console.log('Open advisories must be resolved before any schema-changing or import/export-changing release.');
}
