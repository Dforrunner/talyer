'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { db } from '@/lib/db';

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
}

interface IncomeEntry {
  id: number;
  category: string;
  description: string;
  amount: number;
  income_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
}

const ExpensesIncomePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const expensesData = await db.query('SELECT * FROM expenses ORDER BY expense_date DESC');
      setExpenses(expensesData || []);

      const incomeData = await db.query('SELECT * FROM income ORDER BY income_date DESC');
      setIncomeEntries(incomeData || []);
    } catch (error) {
      console.error('[ExpensesIncome] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category.trim() || !formData.description.trim() || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (activeTab === 'expenses') {
        if (editingId) {
          await db.run(
            'UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [formData.category, formData.description, parseFloat(formData.amount), formData.date, formData.payment_method, formData.notes, editingId]
          );
        } else {
          await db.run(
            'INSERT INTO expenses (category, description, amount, expense_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [formData.category, formData.description, parseFloat(formData.amount), formData.date, formData.payment_method, formData.notes]
          );
        }
      } else {
        if (editingId) {
          await db.run(
            'UPDATE income SET category = ?, description = ?, amount = ?, income_date = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [formData.category, formData.description, parseFloat(formData.amount), formData.date, formData.payment_method, formData.notes, editingId]
          );
        } else {
          await db.run(
            'INSERT INTO income (category, description, amount, income_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [formData.category, formData.description, parseFloat(formData.amount), formData.date, formData.payment_method, formData.notes]
          );
        }
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error saving:', error);
      alert('Error saving data');
    }
  };

  const handleEdit = (item: Expense | IncomeEntry) => {
    setFormData({
      category: item.category,
      description: item.description,
      amount: item.amount.toString(),
      date: activeTab === 'expenses' ? (item as Expense).expense_date : (item as IncomeEntry).income_date,
      payment_method: item.payment_method || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      const table = activeTab === 'expenses' ? 'expenses' : 'income';
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error deleting:', error);
      alert('Error deleting entry');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const expenseCategories = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Insurance', 'Salary', 'Transportation', 'Other'];
  const incomeCategories = ['Service', 'Sales', 'Other Income'];

  const displayItems = activeTab === 'expenses' ? expenses : incomeEntries;
  const categories = activeTab === 'expenses' ? expenseCategories : incomeCategories;

  const totalAmount = displayItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses & Income</h1>
          <p className="text-muted-foreground mt-1">Track additional business expenses and income</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'expenses' ? 'default' : 'outline'}
          onClick={() => { setActiveTab('expenses'); setShowForm(false); }}
        >
          Expenses
        </Button>
        <Button
          variant={activeTab === 'income' ? 'default' : 'outline'}
          onClick={() => { setActiveTab('income'); setShowForm(false); }}
        >
          Income
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit' : 'Add'} {activeTab === 'expenses' ? 'Expense' : 'Income'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₱) *</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <Input
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                placeholder="Cash, Check, Card..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSubmit}>Save</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {activeTab === 'expenses' ? 'Expenses' : 'Income'} Summary
          </h2>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total {activeTab === 'expenses' ? 'Expenses' : 'Income'}</p>
            <p className="text-2xl font-bold text-primary">₱{totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : displayItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No {activeTab} recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>{item.description}</div>
                      {item.payment_method && <div className="text-xs text-muted-foreground">{item.payment_method}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(activeTab === 'expenses' ? (item as Expense).expense_date : (item as IncomeEntry).income_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">₱{item.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExpensesIncomePage;
