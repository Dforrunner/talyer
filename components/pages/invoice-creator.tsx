'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Eye } from 'lucide-react';
import { db } from '@/lib/db';
import { safePdfGenerate } from '@/lib/electron-api';
import InvoicePreview from '@/components/invoice-preview';

interface Product {
  id: number;
  name: string;
  selling_price: number;
  quantity_in_stock: number;
}

interface InvoiceItem {
  id: string;
  type: 'product' | 'labor';
  product_id?: number;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

const InvoiceCreatorPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [invoice, setInvoice] = useState<Invoice>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    invoice_date: today,
    due_date: today,
    notes: '',
    items: [],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const prods = await db.query('SELECT id, name, selling_price, quantity_in_stock FROM products WHERE quantity_in_stock > 0 ORDER BY name');
      setProducts(prods || []);

      const settings = await db.get('SELECT * FROM business_settings LIMIT 1');
      if (settings) {
        setBusinessSettings(settings);
        
        if (settings.vat_rate > 0) {
          setInvoice(prev => ({
            ...prev,
            tax_rate: settings.vat_rate
          }));
        }
      } else {
        console.log('[InvoiceCreator] No business settings found, using defaults');
        setBusinessSettings(null);
      }
    } catch (error) {
      console.error('[InvoiceCreator] Error loading data:', error);
      // Set empty defaults if data loading fails
      setProducts([]);
      setBusinessSettings(null);
    }
  };

  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleAddProduct = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'product',
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    };
    const newItems = [...invoice.items, newItem];
    const totals = calculateTotals(newItems, invoice.tax_rate);
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  const handleAddLabor = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'labor',
      description: 'Labor Work',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    };
    const newItems = [...invoice.items, newItem];
    const totals = calculateTotals(newItems, invoice.tax_rate);
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    const newItems = invoice.items.map(item => {
      if (item.id === id) {
        let updated: any = { ...item, [field]: value };
        
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.product_name = product.name;
            updated.unit_price = product.selling_price;
          }
        }
        
        if (['quantity', 'unit_price'].includes(field)) {
          updated.amount = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        
        return updated;
      }
      return item;
    });

    const totals = calculateTotals(newItems, invoice.tax_rate);
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  const handleRemoveItem = (id: string) => {
    const newItems = invoice.items.filter(item => item.id !== id);
    const totals = calculateTotals(newItems, invoice.tax_rate);
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  const handleInvoiceChange = (field: string, value: any) => {
    const updated: any = { ...invoice, [field]: value };
    
    if (field === 'tax_rate') {
      const totals = calculateTotals(invoice.items, value);
      Object.assign(updated, totals);
    }
    
    setInvoice(updated);
  };

  const handleSaveInvoice = async () => {
    if (!invoice.customer_name.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (invoice.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      setSaving(true);

      const invoiceNumber = await db.get(
        'SELECT COUNT(*) as count FROM invoices WHERE DATE(invoice_date) = ?',
        [invoice.invoice_date]
      );
      const sequence = String((invoiceNumber?.count || 0) + 1).padStart(4, '0');
      const today = new Date(invoice.invoice_date);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const generatedInvoiceNumber = `INV-${year}${month}${day}-${sequence}`;

      const result = await db.run(
        `INSERT INTO invoices (invoice_number, customer_name, customer_phone, customer_email, invoice_date, due_date, notes, subtotal, tax_amount, tax_rate, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          generatedInvoiceNumber,
          invoice.customer_name,
          invoice.customer_phone,
          invoice.customer_email,
          invoice.invoice_date,
          invoice.due_date,
          invoice.notes,
          invoice.subtotal,
          invoice.tax_amount,
          invoice.tax_rate,
          invoice.total
        ]
      );

      const invoiceId = result.lastID;

      for (const item of invoice.items) {
        await db.run(
          `INSERT INTO invoice_items (invoice_id, product_id, item_type, description, quantity, unit_price, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.product_id || null,
            item.type,
            item.description || item.product_name || '',
            item.quantity,
            item.unit_price,
            item.amount
          ]
        );

        if (item.type === 'product' && item.product_id) {
          await db.run(
            'UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      try {
        const pdfPath = await safePdfGenerate(
          {
            invoice_number: generatedInvoiceNumber,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            notes: invoice.notes,
            subtotal: invoice.subtotal,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            total: invoice.total,
            items: invoice.items.map(item => ({
              description: item.product_name || item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.amount
            }))
          },
          businessSettings || {}
        );

        if (pdfPath) {
          await db.run(
            'UPDATE invoices SET pdf_path = ? WHERE id = ?',
            [pdfPath, invoiceId]
          );
        }
      } catch (error) {
        console.error('[InvoiceCreator] Error generating PDF:', error);
      }

      alert(`Invoice ${generatedInvoiceNumber} created successfully!`);
      
      setInvoice({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
        subtotal: 0,
        tax_rate: businessSettings?.vat_rate || 0,
        tax_amount: 0,
        total: 0,
      });

      await loadData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
          <p className="text-muted-foreground mt-1">Fill in the form below to create an invoice</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowPreview(true)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>
      </div>

      {/* Main Layout - Invoice Style Form */}
      <div className="max-w-5xl mx-auto">
        {/* Professional Invoice Form - Mimics the actual invoice layout */}
        <Card className="border-2 border-primary/20 overflow-hidden">
          <div className="p-12 bg-white space-y-6">
            
            {/* Header Section - Business Info */}
            {businessSettings && (
              <div className="flex justify-between items-start pb-6 border-b-2 border-gray-200">
                <div>
                  {businessSettings?.logo_path && (
                    <img 
                      src={businessSettings.logo_path} 
                      alt="Logo" 
                      className="max-w-[120px] max-h-[80px] mb-3"
                    />
                  )}
                  <div className="text-2xl font-bold text-gray-800">
                    {businessSettings?.business_name}
                  </div>
                  <div className="text-sm text-gray-600 mt-2 space-y-1">
                    {businessSettings?.address && <div>{businessSettings.address}</div>}
                    {(businessSettings?.city || businessSettings?.postal_code) && (
                      <div>{businessSettings.city} {businessSettings.postal_code}</div>
                    )}
                    {businessSettings?.phone && <div>Phone: {businessSettings.phone}</div>}
                    {businessSettings?.email && <div>Email: {businessSettings.email}</div>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-800 mb-3">INVOICE</div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-semibold">Invoice Date:</span>
                      <input
                        type="date"
                        value={invoice.invoice_date}
                        onChange={(e) => handleInvoiceChange('invoice_date', e.target.value)}
                        className="block w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <span className="font-semibold">Due Date:</span>
                      <input
                        type="date"
                        value={invoice.due_date}
                        onChange={(e) => handleInvoiceChange('due_date', e.target.value)}
                        className="block w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Section */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
                  BILL TO:
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Customer Name *</label>
                    <Input
                      value={invoice.customer_name}
                      onChange={(e) => handleInvoiceChange('customer_name', e.target.value)}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Phone</label>
                    <Input
                      value={invoice.customer_phone}
                      onChange={(e) => handleInvoiceChange('customer_phone', e.target.value)}
                      placeholder="(Optional)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Email</label>
                    <Input
                      value={invoice.customer_email}
                      onChange={(e) => handleInvoiceChange('customer_email', e.target.value)}
                      placeholder="(Optional)"
                      type="email"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Summary Sidebar */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-sm font-semibold text-gray-800 mb-4">INVOICE SUMMARY</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                      <span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
                    <span className="font-bold text-gray-800">TOTAL:</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(invoice.total)}</span>
                  </div>

                  {invoice.tax_rate === 0 && businessSettings?.vat_rate > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleInvoiceChange('tax_rate', businessSettings.vat_rate)}
                      className="w-full mt-4"
                    >
                      Enable Tax ({businessSettings.vat_rate}%)
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
                ITEMS & SERVICES
              </div>
              
              {invoice.items.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 p-3 bg-gray-100 rounded font-semibold text-sm text-gray-700">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Items */}
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 p-3 border border-gray-200 rounded items-center">
                      <div className="col-span-5">
                        {item.type === 'product' ? (
                          <select
                            value={item.product_id || ''}
                            onChange={(e) => handleItemChange(item.id, 'product_id', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="Labor description"
                            className="text-sm"
                          />
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity === 1 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? 1 : parseFloat(e.target.value) || 0)}
                          placeholder="1"
                          min="0.1"
                          step="0.1"
                          className="text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>

                      <div className="col-span-2 font-semibold text-right">
                        {formatCurrency(item.amount)}
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded">
                  No items added yet
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddProduct}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddLabor}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Labor
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold text-gray-800 mb-2 block">Additional Notes</label>
              <textarea
                value={invoice.notes}
                onChange={(e) => handleInvoiceChange('notes', e.target.value)}
                placeholder="Optional notes for the customer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
              <Button
                onClick={handleSaveInvoice}
                disabled={saving || invoice.items.length === 0}
                className="flex-1"
              >
                {saving ? 'Creating...' : 'Create Invoice'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="flex-1"
              >
                View Preview
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoice Preview Modal */}
      {showPreview && (
        <InvoicePreview
          invoice={{
            ...invoice,
            invoice_number: 'PREVIEW',
            id: 0
          }}
          businessSettings={businessSettings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default InvoiceCreatorPage;
