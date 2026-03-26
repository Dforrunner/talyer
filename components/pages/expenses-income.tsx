'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { getLocalDateInputValue } from '@/lib/date-utils';

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
  const { formatCurrency, formatDate, t } = useLanguage();
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
    date: getLocalDateInputValue(),
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
      alert(t('fillRequiredFields'));
      return;
    }

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert(t('enterValidAmount'));
      return;
    }

    try {
      if (activeTab === 'expenses') {
        if (editingId) {
          await db.run(
            'UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [formData.category, formData.description, amount, formData.date, formData.payment_method, formData.notes, editingId]
          );
        } else {
          await db.run(
            'INSERT INTO expenses (category, description, amount, expense_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [formData.category, formData.description, amount, formData.date, formData.payment_method, formData.notes]
          );
        }
      } else {
        if (editingId) {
          await db.run(
            'UPDATE income SET category = ?, description = ?, amount = ?, income_date = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [formData.category, formData.description, amount, formData.date, formData.payment_method, formData.notes, editingId]
          );
        } else {
          await db.run(
            'INSERT INTO income (category, description, amount, income_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [formData.category, formData.description, amount, formData.date, formData.payment_method, formData.notes]
          );
        }
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error saving:', error);
      alert(t('errorSavingData'));
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
    if (!window.confirm(t('deleteEntryConfirm'))) return;

    try {
      const table = activeTab === 'expenses' ? 'expenses' : 'income';
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error deleting:', error);
      alert(t('errorDeletingEntry'));
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      date: getLocalDateInputValue(),
      payment_method: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const expenseCategories = [
    t('rentCategory'),
    t('utilitiesCategory'),
    t('suppliesCategory'),
    t('maintenanceCategory'),
    t('insuranceCategory'),
    t('salaryCategory'),
    t('transportationCategory'),
    t('otherCategory'),
  ];
  const incomeCategories = [t('serviceCategory'), t('salesCategory'), t('otherIncomeCategory')];

  const displayItems = activeTab === 'expenses' ? expenses : incomeEntries;
  const categories = activeTab === 'expenses' ? expenseCategories : incomeCategories;

  const totalAmount = displayItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('expensesIncome')}</h1>
          <p className="text-muted-foreground mt-1">{t('expensesIncomeDesc')}</p>
        </div>
        <Button
          onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }

            setEditingId(null);
            setFormData({
              category: '',
              description: '',
              amount: '',
              date: getLocalDateInputValue(),
              payment_method: '',
              notes: '',
            });
            setShowForm(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'expenses' ? t('addExpense') : t('addIncome')}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'expenses' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('expenses');
            resetForm();
          }}
        >
          {t('expense')}
        </Button>
        <Button
          variant={activeTab === 'income' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('income');
            resetForm();
          }}
        >
          {t('income')}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId
              ? activeTab === 'expenses' ? t('editExpense') : t('editIncome')
              : activeTab === 'expenses' ? t('addExpense') : t('addIncome')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('category')} *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('amount')} (₱) *</label>
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
              <label className="block text-sm font-medium mb-1">{t('date')} *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('paymentMethod')}</label>
              <Input
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                placeholder={t('paymentMethod')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{t('description')} *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('briefDescription')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{t('notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('additionalNotes')}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSubmit}>{t('save')}</Button>
              <Button variant="outline" onClick={resetForm}>{t('cancel')}</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {activeTab === 'expenses' ? t('expensesSummary') : t('incomeSummary')}
          </h2>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {activeTab === 'expenses' ? t('totalExpenses') : t('totalIncome')}
            </p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
        ) : displayItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {activeTab === 'expenses' ? t('noExpensesRecorded') : t('noIncomeRecorded')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('category')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('description')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('date')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('amount')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('actions')}</th>
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
                      {formatDate(activeTab === 'expenses' ? (item as Expense).expense_date : (item as IncomeEntry).income_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(item.amount)}</td>
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
