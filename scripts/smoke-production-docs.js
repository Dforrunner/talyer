#!/usr/bin/env node

/**
 * Dependency-free smoke check for release documentation.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exitCode = 1;
}

const files = {
  'README.md': read('README.md'),
  'INSTALL_GUIDE.md': read('INSTALL_GUIDE.md'),
};

const combined = `${files['README.md']}\n${files['INSTALL_GUIDE.md']}`;

const requiredPhrases = [
  'App Settings > Data Management',
  'Breaking change',
  'Data migration',
  'Automatic backup',
  'Manual restore',
  'shopflow.db',
];

for (const phrase of requiredPhrases) {
  if (!combined.includes(phrase)) {
    fail(`Missing required release/data-safety phrase: ${phrase}`);
  }
}

const staleStandaloneRoutePhrases = [
  'Open Data Management',
  'Use `Data Management`',
  'from `Data Management`',
];

for (const phrase of staleStandaloneRoutePhrases) {
  if (combined.includes(phrase)) {
    fail(`Found stale standalone Data Management wording: ${phrase}`);
  }
}

if (!files['README.md'].includes('pnpm exec next build --webpack')) {
  fail('README verification should include pnpm exec next build --webpack.');
}

if (!files['INSTALL_GUIDE.md'].includes('Replace all existing data')) {
  fail('Install guide should name the replace-all import option.');
}

if (!process.exitCode) {
  console.log('[pass] Release documentation smoke checks passed.');
}
