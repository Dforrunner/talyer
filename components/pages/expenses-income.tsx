'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTableHeader } from '@/components/ui/sortable-table-header';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { Plus, Trash2, Edit2, Repeat } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { getNextSortConfig, sortRows, type SortConfig } from '@/lib/table-sort';
import {
  addRecurringInterval,
  getLocalDateInputValue,
  isDateOnOrBefore,
  type RecurringFrequency,
} from '@/lib/date-utils';

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

interface RecurringExpense {
  id: number;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  notes: string;
  start_date: string;
  frequency: RecurringFrequency;
  next_due_date: string;
  active: number;
  created_at: string;
  updated_at: string;
}

interface ExpenseIncomeFormState {
  category: string;
  description: string;
  amount: string;
  date: string;
  payment_method: string;
  notes: string;
  isRecurring: boolean;
  recurring_frequency: RecurringFrequency;
}

type EntrySortKey = 'category' | 'description' | 'date' | 'amount';

const createEmptyFormData = (): ExpenseIncomeFormState => ({
  category: '',
  description: '',
  amount: '',
  date: getLocalDateInputValue(),
  payment_method: '',
  notes: '',
  isRecurring: false,
  recurring_frequency: 'monthly',
});

const ExpensesIncomePage: React.FC = () => {
  const { formatCurrency, formatDate, t } = useLanguage();
  const { showAlert, showConfirm } = useAppDialog();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRecurringId, setEditingRecurringId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig<EntrySortKey>>({
    key: 'date',
    direction: 'desc',
  });
  const [formData, setFormData] = useState<ExpenseIncomeFormState>(
    createEmptyFormData(),
  );

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setFilterCategory('all');
    setSearchTerm('');
  }, [activeTab]);

  const getFrequencyLabel = (frequency: RecurringFrequency) => {
    switch (frequency) {
      case 'daily':
        return t('daily');
      case 'weekly':
        return t('weekly');
      case 'monthly':
        return t('monthly');
      case 'yearly':
        return t('yearly');
      default:
        return frequency;
    }
  };

  const processRecurringExpenses = async () => {
    const today = getLocalDateInputValue();
    const dueRecurringExpenses = (await db.query(
      `SELECT * FROM recurring_expenses
       WHERE active = 1 AND next_due_date <= ?
       ORDER BY next_due_date ASC`,
      [today],
    )) as RecurringExpense[];

    if (!dueRecurringExpenses.length) {
      return;
    }

    await db.exec('BEGIN');
    try {
      for (const recurringExpense of dueRecurringExpenses) {
        let nextDueDate = recurringExpense.next_due_date;

        while (isDateOnOrBefore(nextDueDate, today)) {
          await db.run(
            `INSERT INTO expenses (category, description, amount, expense_date, payment_method, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              recurringExpense.category,
              recurringExpense.description || '',
              recurringExpense.amount,
              nextDueDate,
              recurringExpense.payment_method || '',
              recurringExpense.notes || '',
            ],
          );

          nextDueDate = addRecurringInterval(
            nextDueDate,
            recurringExpense.frequency,
          );
        }

        await db.run(
          `UPDATE recurring_expenses
           SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [nextDueDate, recurringExpense.id],
        );
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await processRecurringExpenses();

      const expensesData = await db.query(
        'SELECT * FROM expenses ORDER BY expense_date DESC, id DESC',
      );
      setExpenses(expensesData || []);

      const incomeData = await db.query(
        'SELECT * FROM income ORDER BY income_date DESC, id DESC',
      );
      setIncomeEntries(incomeData || []);

      const recurringExpensesData = await db.query(
        `SELECT * FROM recurring_expenses
         WHERE active = 1
         ORDER BY next_due_date ASC, category ASC`,
      );
      setRecurringExpenses(recurringExpensesData || []);
    } catch (error) {
      console.error('[ExpensesIncome] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category.trim() || !formData.amount) {
      await showAlert({ title: t('fillRequiredFields'), confirmLabel: t('close') });
      return;
    }

    if (activeTab === 'income' && !formData.description.trim()) {
      await showAlert({ title: t('fillRequiredFields'), confirmLabel: t('close') });
      return;
    }

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await showAlert({ title: t('enterValidAmount'), confirmLabel: t('close') });
      return;
    }

    const description = formData.description.trim();

    try {
      if (activeTab === 'expenses') {
        if (editingRecurringId) {
          await db.run(
            `UPDATE recurring_expenses
             SET category = ?, description = ?, amount = ?, payment_method = ?, notes = ?,
                 start_date = ?, frequency = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              formData.category,
              description,
              amount,
              formData.payment_method,
              formData.notes,
              formData.date,
              formData.recurring_frequency,
              formData.date,
              editingRecurringId,
            ],
          );
        } else if (editingId) {
          await db.run(
            `UPDATE expenses
             SET category = ?, description = ?, amount = ?, expense_date = ?,
                 payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              formData.category,
              description,
              amount,
              formData.date,
              formData.payment_method,
              formData.notes,
              editingId,
            ],
          );
        } else if (formData.isRecurring) {
          await db.exec('BEGIN');
          try {
            await db.run(
              `INSERT INTO expenses (category, description, amount, expense_date, payment_method, notes)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                formData.category,
                description,
                amount,
                formData.date,
                formData.payment_method,
                formData.notes,
              ],
            );

            await db.run(
              `INSERT INTO recurring_expenses
               (category, description, amount, payment_method, notes, start_date, frequency, next_due_date, active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                formData.category,
                description,
                amount,
                formData.payment_method,
                formData.notes,
                formData.date,
                formData.recurring_frequency,
                addRecurringInterval(formData.date, formData.recurring_frequency),
              ],
            );

            await db.exec('COMMIT');
          } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
          }
        } else {
          await db.run(
            `INSERT INTO expenses (category, description, amount, expense_date, payment_method, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              formData.category,
              description,
              amount,
              formData.date,
              formData.payment_method,
              formData.notes,
            ],
          );
        }
      } else if (editingId) {
        await db.run(
          `UPDATE income
           SET category = ?, description = ?, amount = ?, income_date = ?,
               payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            formData.category,
            description,
            amount,
            formData.date,
            formData.payment_method,
            formData.notes,
            editingId,
          ],
        );
      } else {
        await db.run(
          `INSERT INTO income (category, description, amount, income_date, payment_method, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            formData.category,
            description,
            amount,
            formData.date,
            formData.payment_method,
            formData.notes,
          ],
        );
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error saving:', error);
      await showAlert({ title: t('errorSavingData'), confirmLabel: t('close') });
    }
  };

  const handleEdit = (item: Expense | IncomeEntry) => {
    setFormData({
      category: item.category,
      description: item.description || '',
      amount: item.amount.toString(),
      date:
        activeTab === 'expenses'
          ? (item as Expense).expense_date
          : (item as IncomeEntry).income_date,
      payment_method: item.payment_method || '',
      notes: item.notes || '',
      isRecurring: false,
      recurring_frequency: 'monthly',
    });
    setEditingId(item.id);
    setEditingRecurringId(null);
    setShowForm(true);
  };

  const handleEditRecurring = (item: RecurringExpense) => {
    setFormData({
      category: item.category,
      description: item.description || '',
      amount: item.amount.toString(),
      date: item.next_due_date,
      payment_method: item.payment_method || '',
      notes: item.notes || '',
      isRecurring: true,
      recurring_frequency: item.frequency,
    });
    setEditingId(null);
    setEditingRecurringId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('deleteEntryConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      const table = activeTab === 'expenses' ? 'expenses' : 'income';
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error deleting:', error);
      await showAlert({ title: t('errorDeletingEntry'), confirmLabel: t('close') });
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('deleteRecurringExpenseConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await db.run('DELETE FROM recurring_expenses WHERE id = ?', [id]);
      await loadData();
    } catch (error) {
      console.error('[ExpensesIncome] Error deleting recurring expense:', error);
      await showAlert({ title: t('errorDeletingEntry'), confirmLabel: t('close') });
    }
  };

  const resetForm = () => {
    setFormData(createEmptyFormData());
    setEditingId(null);
    setEditingRecurringId(null);
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
  const incomeCategories = [
    t('serviceCategory'),
    t('salesCategory'),
    t('otherIncomeCategory'),
  ];

  const displayItems = activeTab === 'expenses' ? expenses : incomeEntries;
  const categories = activeTab === 'expenses' ? expenseCategories : incomeCategories;
  const tableCategories = [
    'all',
    ...new Set(displayItems.map((item) => item.category).filter(Boolean)),
  ];
  const filteredDisplayItems = displayItems.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    const dateValue =
      activeTab === 'expenses'
        ? (item as Expense).expense_date
        : (item as IncomeEntry).income_date;

    const matchesSearch =
      !query ||
      item.category.toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.payment_method || '').toLowerCase().includes(query) ||
      dateValue.toLowerCase().includes(query);
    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });
  const sortedDisplayItems = sortRows(
    filteredDisplayItems,
    sortConfig,
    (item, key) => {
      switch (key) {
        case 'category':
          return item.category;
        case 'description':
          return item.description || '';
        case 'date':
          return activeTab === 'expenses'
            ? (item as Expense).expense_date
            : (item as IncomeEntry).income_date;
        case 'amount':
          return Number(item.amount) || 0;
        default:
          return '';
      }
    },
  );

  const totalAmount = filteredDisplayItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

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
            setEditingRecurringId(null);
            setFormData(createEmptyFormData());
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
            {editingRecurringId
              ? t('editRecurringExpense')
              : editingId
                ? activeTab === 'expenses'
                  ? t('editExpense')
                  : t('editIncome')
                : activeTab === 'expenses' && formData.isRecurring
                  ? t('addRecurringExpense')
                  : activeTab === 'expenses'
                    ? t('addExpense')
                    : t('addIncome')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('category')} *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('amount')} (₱) *
              </label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {activeTab === 'expenses' && formData.isRecurring
                  ? t('nextDueDate')
                  : t('date')}{' '}
                *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('paymentMethod')}
              </label>
              <Input
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_method: e.target.value,
                  })
                }
                placeholder={t('paymentMethod')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                {t('description')} {activeTab === 'expenses' ? t('optional') : '*'}
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('briefDescription')}
              />
            </div>
            {activeTab === 'expenses' && (
              <div className="md:col-span-2 space-y-3 rounded-lg border border-border p-4 bg-muted/20">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRecurring: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-input"
                    disabled={editingRecurringId !== null}
                  />
                  {t('makeRecurringExpense')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('recurringExpenseHelp')}
                </p>
                {formData.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('recurringFrequency')}
                    </label>
                    <select
                      value={formData.recurring_frequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurring_frequency: e.target
                            .value as RecurringFrequency,
                        })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="daily">{t('daily')}</option>
                      <option value="weekly">{t('weekly')}</option>
                      <option value="monthly">{t('monthly')}</option>
                      <option value="yearly">{t('yearly')}</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{t('notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder={t('additionalNotes')}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSubmit}>{t('save')}</Button>
              <Button variant="outline" onClick={resetForm}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <Card>
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('recurringExpenses')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {recurringExpenses.length}
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t('loading')}
            </div>
          ) : recurringExpenses.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t('noRecurringExpenses')}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recurringExpenses.map((item) => (
                <div
                  key={item.id}
                  className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description || t('noDescription')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('recurringFrequency')}: {getFrequencyLabel(item.frequency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('nextDueDate')}: {formatDate(item.next_due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:flex-col md:items-end">
                    <p className="font-semibold">{formatCurrency(item.amount)}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRecurring(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecurring(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-border p-6 md:grid-cols-3">
          <Input
            placeholder={t('searchEntries')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
          >
            {tableCategories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? t('allCategories') : category}
              </option>
            ))}
          </select>
          <div className="flex items-center text-sm text-muted-foreground">
            {t('showing')} {filteredDisplayItems.length} {t('of')} {displayItems.length}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('loading')}
          </div>
        ) : filteredDisplayItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm || filterCategory !== 'all'
              ? t('noMatchingEntries')
              : activeTab === 'expenses'
                ? t('noExpensesRecorded')
                : t('noIncomeRecorded')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                    <SortableTableHeader
                      label={t('category')}
                      sortKey="category"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as EntrySortKey),
                        )
                      }
                    />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortableTableHeader
                      label={t('description')}
                      sortKey="description"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as EntrySortKey),
                        )
                      }
                    />
                  </th>
                  <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                    <SortableTableHeader
                      label={t('date')}
                      sortKey="date"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as EntrySortKey, 'desc'),
                        )
                      }
                    />
                  </th>
                  <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                    <SortableTableHeader
                      label={t('amount')}
                      sortKey="amount"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as EntrySortKey, 'desc'),
                        )
                      }
                      align="right"
                    />
                  </th>
                  <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDisplayItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>{item.description || t('noDescription')}</div>
                      {item.payment_method && (
                        <div className="text-xs text-muted-foreground">
                          {item.payment_method}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(
                        activeTab === 'expenses'
                          ? (item as Expense).expense_date
                          : (item as IncomeEntry).income_date,
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
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
