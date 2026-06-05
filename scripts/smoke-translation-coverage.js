#!/usr/bin/env node

/**
 * Dependency-free translation key coverage check.
 *
 * It verifies:
 * - English and Tagalog dictionaries have the same keys.
 * - Static t('key') / t("key") calls are present in both dictionaries.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const translationPath = path.join(root, 'lib', 'translations.ts');

function listSourceFiles(dir) {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(absolutePath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && absolutePath !== translationPath) {
      results.push(absolutePath);
    }
  }

  return results;
}

function extractObjectLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Could not find marker: ${marker}`);
  }

  const start = source.indexOf('{', markerIndex);
  if (start < 0) {
    throw new Error(`Could not find object start for marker: ${marker}`);
  }

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Could not find object end for marker: ${marker}`);
}

function loadTranslations() {
  const source = fs.readFileSync(translationPath, 'utf8');
  const objectLiteral = extractObjectLiteral(source, 'export const translations =');
  return vm.runInNewContext(`(${objectLiteral})`);
}

function findUsedKeys() {
  const keyPattern = /\bt\(\s*['"]([A-Za-z0-9_]+)['"]\s*[),]/g;
  const files = [
    ...listSourceFiles(path.join(root, 'app')),
    ...listSourceFiles(path.join(root, 'components')),
    ...listSourceFiles(path.join(root, 'hooks')),
    ...listSourceFiles(path.join(root, 'lib')),
  ];
  const used = new Set();

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = keyPattern.exec(source))) {
      used.add(match[1]);
    }
  }

  return used;
}

function reportMissing(label, keys) {
  if (keys.length === 0) {
    return;
  }

  console.error(`[fail] ${label}:`);
  for (const key of keys) {
    console.error(`  - ${key}`);
  }
  process.exitCode = 1;
}

const translations = loadTranslations();
const enKeys = new Set(Object.keys(translations.en || {}));
const tlKeys = new Set(Object.keys(translations.tl || {}));
const usedKeys = findUsedKeys();

const missingInEnglish = [...usedKeys].filter((key) => !enKeys.has(key)).sort();
const missingInTagalog = [...usedKeys].filter((key) => !tlKeys.has(key)).sort();
const missingTagalogParity = [...enKeys].filter((key) => !tlKeys.has(key)).sort();
const missingEnglishParity = [...tlKeys].filter((key) => !enKeys.has(key)).sort();

reportMissing('Used keys missing from English translations', missingInEnglish);
reportMissing('Used keys missing from Tagalog translations', missingInTagalog);
reportMissing('English keys missing from Tagalog translations', missingTagalogParity);
reportMissing('Tagalog keys missing from English translations', missingEnglishParity);

if (!process.exitCode) {
  console.log(
    `[pass] Translation coverage passed: ${enKeys.size} en keys, ${tlKeys.size} tl keys, ${usedKeys.size} statically used keys.`,
  );
}
