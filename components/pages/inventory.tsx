'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTableHeader } from '@/components/ui/sortable-table-header';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { getNextSortConfig, sortRows, type SortConfig } from '@/lib/table-sort';
import ProductModal from '@/components/modals/product-modal';

interface Product {
  id: number;
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

interface InventoryPageProps {
  onLowStockUpdate?: (count: number) => void;
}

type ProductSortKey =
  | 'name'
  | 'sku'
  | 'category'
  | 'cost_price'
  | 'selling_price'
  | 'quantity_in_stock';

const InventoryPage: React.FC<InventoryPageProps> = ({ onLowStockUpdate }) => {
  const { formatCurrency, t } = useLanguage();
  const { showConfirm } = useAppDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig<ProductSortKey>>({
    key: 'name',
    direction: 'asc',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await db.query('SELECT * FROM products ORDER BY name ASC');
      setProducts(result);
      
      // Update low stock count
      const lowStock = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE quantity_in_stock <= low_stock_threshold'
      );
      if (onLowStockUpdate) {
        onLowStockUpdate(lowStock[0]?.count || 0);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('deleteProductConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await db.run('DELETE FROM products WHERE id = ?', [id]);
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      (product.sku || '').toLowerCase().includes(query);
    const matchesCategory =
      filterCategory === 'all' || product.category === filterCategory;
    const isLowStock = product.quantity_in_stock <= product.low_stock_threshold;
    const matchesStock =
      filterStock === 'all' ||
      (filterStock === 'low' ? isLowStock : !isLowStock);

    return matchesSearch && matchesCategory && matchesStock;
  });
  const sortedProducts = sortRows(filteredProducts, sortConfig, (product, key) => {
    switch (key) {
      case 'name':
        return product.name;
      case 'sku':
        return product.sku || '';
      case 'category':
        return product.category;
      case 'cost_price':
        return Number(product.cost_price) || 0;
      case 'selling_price':
        return Number(product.selling_price) || 0;
      case 'quantity_in_stock':
        return Number(product.quantity_in_stock) || 0;
      default:
        return '';
    }
  });

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const stockOptions = [
    { value: 'all', label: t('allStockLevels') },
    { value: 'low', label: t('lowStockAlert') },
    { value: 'healthy', label: t('inStockOnly') },
  ];

  const handleSaveProduct = async () => {
    await loadProducts();
    setShowModal(false);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('inventoryManagement')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageProductsStock')}</p>
        </div>
        <Button onClick={handleAddProduct} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('addProduct')}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder={t('searchByNameOrSku')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? t('allCategories') : cat}
              </option>
            ))}
          </select>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {stockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground flex items-center">
            {t('showing')} {filteredProducts.length} {t('of')} {products.length} {t('products')}
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left">
                  <SortableTableHeader
                    label={t('productName')}
                    sortKey="name"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('sku')}
                    sortKey="sku"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('category')}
                    sortKey="category"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('costPrice')}
                    sortKey="cost_price"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('sellingPrice')}
                    sortKey="selling_price"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('quantityInStock')}
                    sortKey="quantity_in_stock"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as ProductSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {t('loadingProducts')}
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {t('noProductsStart')}
                  </td>
                </tr>
              ) : (
                sortedProducts.map(product => {
                  const isLowStock = product.quantity_in_stock <= product.low_stock_threshold;
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        isLowStock ? 'bg-destructive/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isLowStock && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{product.sku || '-'}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">{product.category}</td>
                      <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(product.cost_price)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold whitespace-nowrap">{formatCurrency(product.selling_price)}</td>
                      <td className={`px-6 py-4 text-sm text-right font-semibold whitespace-nowrap ${isLowStock ? 'text-destructive' : ''}`}>
                        {product.quantity_in_stock} {product.unit}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            className="gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteProduct(product.id)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowModal(false)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

export default InventoryPage;
