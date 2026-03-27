import { db } from '@/lib/db';

interface ProductSkuInput {
  name: string;
  category?: string | null;
  unit?: string | null;
}

export function normalizeSku(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanSkuPart(value: string, fallback: string) {
  const normalized = normalizeSku(value).replace(/-/g, '');

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 4);
}

export function buildProductSkuPrefix({ name, category, unit }: ProductSkuInput) {
  const namePart = cleanSkuPart(name, 'ITEM');
  const categoryPart = cleanSkuPart(category || '', 'GEN');
  const unitPart = cleanSkuPart(unit || '', 'UNT');

  return `${categoryPart}-${namePart}-${unitPart}`;
}

export async function generateProductSku(
  input: ProductSkuInput,
  excludeProductId?: number,
) {
  const prefix = buildProductSkuPrefix(input);
  const params: Array<string | number> = [`${prefix}-%`];
  let sql = 'SELECT sku FROM products WHERE sku LIKE ?';

  if (excludeProductId) {
    sql += ' AND id != ?';
    params.push(excludeProductId);
  }

  const existingProducts = await db.query(sql, params);
  const existingSkuSet = new Set(
    existingProducts
      .map((product: { sku?: string | null }) => product.sku?.trim())
      .filter(Boolean),
  );

  let sequence = existingSkuSet.size + 1;
  let candidate = `${prefix}-${String(sequence).padStart(3, '0')}`;

  while (existingSkuSet.has(candidate)) {
    sequence += 1;
    candidate = `${prefix}-${String(sequence).padStart(3, '0')}`;
  }

  return candidate;
}
