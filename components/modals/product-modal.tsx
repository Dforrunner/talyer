'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AppBrand } from '@/components/ui/app-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import {
  buildProductSkuPrefix,
  generateProductSku,
  normalizeSku,
} from '@/lib/sku-utils';

interface Product {
  id?: number;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
  low_stock_threshold: number;
  sku: string | null;
  category: string;
  unit: string;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    cost_price: 0,
    selling_price: 0,
    quantity_in_stock: 0,
    low_stock_threshold: 5,
    sku: '',
    category: '',
    unit: 'unit',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profitMargin =
    formData.selling_price > 0
      ? ((formData.selling_price - formData.cost_price) / formData.selling_price) * 100
      : 0;

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        sku: product.sku || '',
      });
    }
  }, [product]);

  const autoSkuPreview = buildProductSkuPrefix({
    name: formData.name,
    category: formData.category,
    unit: formData.unit,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['cost_price', 'selling_price', 'quantity_in_stock', 'low_stock_threshold'].includes(name)
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        setError(t('productNameRequired'));
        return;
      }

      if (formData.cost_price < 0 || formData.selling_price < 0) {
        setError(t('pricesCannotBeNegative'));
        return;
      }

      const normalizedManualSku = normalizeSku(formData.sku || '');
      const finalSku = normalizedManualSku
        ? normalizedManualSku
        : await generateProductSku(
            {
              name: formData.name,
              category: formData.category,
              unit: formData.unit,
            },
            product?.id,
          );

      if (product?.id) {
        // Update existing product
        await db.run(
          `UPDATE products SET 
            name = ?, description = ?, cost_price = ?, selling_price = ?,
            quantity_in_stock = ?, low_stock_threshold = ?, sku = ?, category = ?, unit = ?
           WHERE id = ?`,
          [
            formData.name,
            formData.description,
            formData.cost_price,
            formData.selling_price,
            formData.quantity_in_stock,
            formData.low_stock_threshold,
            finalSku,
            formData.category,
            formData.unit,
            product.id
          ]
        );
      } else {
        // Create new product
        await db.run(
          `INSERT INTO products (name, description, cost_price, selling_price, quantity_in_stock, low_stock_threshold, sku, category, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            formData.name,
            formData.description,
            formData.cost_price,
            formData.selling_price,
            formData.quantity_in_stock,
            formData.low_stock_threshold,
            finalSku,
            formData.category,
            formData.unit
          ]
        );
      }

      onSave();
    } catch (err: any) {
      const message =
        typeof err?.message === 'string' &&
        err.message.toLowerCase().includes('unique')
          ? t('skuAlreadyExists')
          : err?.message || t('errorSavingProduct');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <div className="space-y-2">
            <AppBrand compact subtitle={t('productInformation')} />
            <h2 className="text-xl font-bold">{product?.id ? t('editProduct') : t('addNewProduct')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Product Info Section */}
          <div>
            <h3 className="font-semibold mb-4">{t('productInformation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('productName')} *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('productName')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('sku')}</label>
                <Input
                  name="sku"
                  value={formData.sku || ''}
                  onChange={handleChange}
                  placeholder={t('skuOptionalPlaceholder')}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('skuAutoGenerateHelp')}
                </p>
                {!(formData.sku || '').trim() && formData.name.trim() && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('skuPreviewLabel')} {autoSkuPreview}-001
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">{t('description')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('optionalDescription')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('category')}</label>
                <Input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder={t('category')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('unitLabel')}</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="unit">{t('unitLabel')}</option>
                  <option value="pcs">{t('pieceUnit')}</option>
                  <option value="box">{t('boxUnit')}</option>
                  <option value="pair">{t('pairUnit')}</option>
                  <option value="set">{t('setUnit')}</option>
                  <option value="liter">{t('literUnit')}</option>
                  <option value="kg">{t('kilogramUnit')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="font-semibold mb-4">{t('pricing')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('costPrice')} (₱) *</label>
                <Input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price === 0 ? '' : formData.cost_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('sellingPrice')} (₱) *</label>
                <Input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price === 0 ? '' : formData.selling_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              {formData.selling_price > formData.cost_price && formData.selling_price > 0 && (
                <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  {t('profitMargin')}: {profitMargin.toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          {/* Stock Section */}
          <div>
            <h3 className="font-semibold mb-4">{t('stockManagement')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('quantityInStock')}</label>
                <Input
                  type="number"
                  name="quantity_in_stock"
                  value={formData.quantity_in_stock}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('lowStockThreshold')}</label>
                <Input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  placeholder="5"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('alertWhenStockFallsBelowThis')}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('savingSettings') : product?.id ? t('updateProduct') : t('addProduct')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductModal;
