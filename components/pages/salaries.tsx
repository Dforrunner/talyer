'use client';

import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  Edit2,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortableTableHeader } from '@/components/ui/sortable-table-header';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { useLanguage } from '@/hooks/use-language';
import { db, ensureSalarySchema } from '@/lib/db';
import { getLocalDateInputValue } from '@/lib/date-utils';
import { getNextSortConfig, sortRows, type SortConfig } from '@/lib/table-sort';

type PayType = 'daily' | 'job' | 'biweekly' | 'monthly' | 'other';

interface Employee {
  id: number;
  name: string;
  phone: string | null;
  role: string | null;
  default_pay_type: PayType;
  default_rate: number | null;
  active: number;
}

interface SalaryPayment {
  id: number;
  employee_id: number | null;
  invoice_id: number | null;
  employee_name: string;
  pay_type: PayType;
  invoice_number: string | null;
  invoice_customer_name: string | null;
  invoice_status: string | null;
  invoice_date: string | null;
  job_reference: string | null;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

interface EmployeeSummary {
  employee_id: number | null;
  employee_name: string;
  total_paid: number;
  payment_count: number;
  last_paid_at: string;
}

interface MonthlyEmployeeTotal {
  employee_id: number | null;
  employee_name: string;
  total_paid: number;
  payment_count: number;
}

interface SalaryInvoiceOption {
  id: number;
  invoice_number: string;
  customer_name: string;
  status: string;
  invoice_date: string;
  total: number;
}

interface EmployeeFormState {
  name: string;
  phone: string;
  role: string;
  default_pay_type: PayType;
  default_rate: string;
}

interface SalaryFormState {
  employee_id: string;
  employee_name: string;
  pay_type: PayType;
  invoice_id: string;
  job_reference: string;
  amount: string;
  paid_at: string;
  notes: string;
}

type SalarySortKey =
  | 'employee_name'
  | 'pay_type'
  | 'paid_at'
  | 'amount';

const createEmptyEmployeeForm = (): EmployeeFormState => ({
  name: '',
  phone: '',
  role: '',
  default_pay_type: 'daily',
  default_rate: '',
});

const createEmptySalaryForm = (): SalaryFormState => ({
  employee_id: '',
  employee_name: '',
  pay_type: 'daily',
  invoice_id: '',
  job_reference: '',
  amount: '',
  paid_at: getLocalDateInputValue(),
  notes: '',
});

const SalariesPage: React.FC = () => {
  const { formatCurrency, formatDate, formatMonth, t } = useLanguage();
  const { showAlert, showConfirm } = useAppDialog();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoiceOptions, setInvoiceOptions] = useState<SalaryInvoiceOption[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
  const [monthlyEmployeeTotals, setMonthlyEmployeeTotals] = useState<
    MonthlyEmployeeTotal[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(true);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    getLocalDateInputValue().slice(0, 7),
  );
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterPayType, setFilterPayType] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig<SalarySortKey>>({
    key: 'paid_at',
    direction: 'desc',
  });
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(
    createEmptyEmployeeForm(),
  );
  const [paymentForm, setPaymentForm] = useState<SalaryFormState>(
    createEmptySalaryForm(),
  );

  useEffect(() => {
    void loadSalaryData();
  }, [selectedMonth]);

  const loadSalaryData = async () => {
    try {
      setLoading(true);
      await ensureSalarySchema();

      const [monthYear, monthNumber] = selectedMonth.split('-').map(Number);
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = getLocalDateInputValue(
        new Date(monthYear, monthNumber, 0),
      );
      const [employeeRows, invoiceRows, paymentRows, summaryRows, monthlyRows] =
        await Promise.all([
        db.query(
          `SELECT *
           FROM employees
           WHERE active = 1
           ORDER BY name ASC`,
        ),
        db.query(
          `SELECT id, invoice_number, customer_name, status, invoice_date, total
           FROM invoices
           ORDER BY
             CASE status
               WHEN 'draft' THEN 0
               WHEN 'open' THEN 1
               WHEN 'completed' THEN 1
               WHEN 'paid' THEN 1
               ELSE 3
             END,
             invoice_date DESC,
             id DESC`,
        ),
        db.query(
          `SELECT sp.*,
                  i.invoice_number,
                  i.customer_name as invoice_customer_name,
                  i.status as invoice_status,
                  i.invoice_date
           FROM salary_payments sp
           LEFT JOIN invoices i ON i.id = sp.invoice_id
           ORDER BY sp.paid_at DESC, sp.id DESC`,
        ),
        db.query(
          `SELECT employee_id,
                  employee_name,
                  SUM(amount) as total_paid,
                  COUNT(*) as payment_count,
                  MAX(paid_at) as last_paid_at
           FROM salary_payments
           GROUP BY employee_id, employee_name
           ORDER BY total_paid DESC, employee_name ASC`,
        ),
        db.query(
          `SELECT employee_id,
                  employee_name,
                  SUM(amount) as total_paid,
                  COUNT(*) as payment_count
           FROM salary_payments
           WHERE paid_at >= ? AND paid_at <= ?
           GROUP BY employee_id, employee_name
           ORDER BY total_paid DESC, employee_name ASC`,
          [monthStart, monthEnd],
        ),
      ]);

      setEmployees(employeeRows || []);
      setInvoiceOptions(invoiceRows || []);
      setPayments(paymentRows || []);
      setEmployeeSummaries(summaryRows || []);
      setMonthlyEmployeeTotals(monthlyRows || []);
    } catch (error) {
      console.error('[Salaries] Error loading salary data:', error);
      await showAlert({
        title: t('errorLoadingSalaryData'),
        confirmLabel: t('close'),
      });
    } finally {
      setLoading(false);
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm(createEmptyEmployeeForm());
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm(createEmptySalaryForm());
    setEditingPaymentId(null);
    setShowPaymentForm(true);
  };

  const getPayTypeLabel = (payType: string) => {
    switch (payType) {
      case 'daily':
        return t('dailyPay');
      case 'job':
        return t('perJobPay');
      case 'biweekly':
        return t('biweeklyPay');
      case 'monthly':
        return t('monthlyPay');
      default:
        return t('otherPay');
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'draft':
        return t('draft');
      case 'open':
      case 'completed':
      case 'paid':
        return t('paid');
      default:
        return status || '';
    }
  };

  const getInvoiceOptionLabel = (invoice: SalaryInvoiceOption) =>
    `${invoice.invoice_number} - ${invoice.customer_name} - ${getStatusLabel(
      invoice.status,
    )} - ${formatDate(invoice.invoice_date)}`;

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === paymentForm.employee_id,
  );
  const selectedInvoice = invoiceOptions.find(
    (invoice) => String(invoice.id) === paymentForm.invoice_id,
  );
  const filteredInvoiceOptions = invoiceOptions.filter((invoice) => {
    const query = invoiceSearchTerm.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.customer_name.toLowerCase().includes(query) ||
      invoice.status.toLowerCase().includes(query) ||
      invoice.invoice_date.toLowerCase().includes(query)
    );
  });

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find((item) => String(item.id) === employeeId);

    setPaymentForm((current) => ({
      ...current,
      employee_id: employeeId,
      employee_name: employee?.name || '',
      pay_type: employee?.default_pay_type || current.pay_type,
      amount:
        employee && Number(employee.default_rate) > 0
          ? String(employee.default_rate)
          : current.amount,
    }));
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    setPaymentForm((current) => ({
      ...current,
      invoice_id: invoiceId,
    }));
  };

  const handleSaveEmployee = async () => {
    const defaultRate = Number(employeeForm.default_rate || 0);

    if (!employeeForm.name.trim()) {
      await showAlert({
        title: t('fillRequiredFields'),
        confirmLabel: t('close'),
      });
      return;
    }

    if (!Number.isFinite(defaultRate) || defaultRate < 0) {
      await showAlert({
        title: t('enterValidAmount'),
        confirmLabel: t('close'),
      });
      return;
    }

    try {
      await ensureSalarySchema();

      if (editingEmployeeId) {
        await db.run(
          `UPDATE employees
           SET name = ?, phone = ?, role = ?, default_pay_type = ?,
               default_rate = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            employeeForm.name.trim(),
            employeeForm.phone.trim(),
            employeeForm.role.trim(),
            employeeForm.default_pay_type,
            defaultRate,
            editingEmployeeId,
          ],
        );

        await db.run(
          `UPDATE salary_payments
           SET employee_name = ?
           WHERE employee_id = ?`,
          [employeeForm.name.trim(), editingEmployeeId],
        );
      } else {
        await db.run(
          `INSERT INTO employees
           (name, phone, role, default_pay_type, default_rate)
           VALUES (?, ?, ?, ?, ?)`,
          [
            employeeForm.name.trim(),
            employeeForm.phone.trim(),
            employeeForm.role.trim(),
            employeeForm.default_pay_type,
            defaultRate,
          ],
        );
      }

      resetEmployeeForm();
      await loadSalaryData();
    } catch (error) {
      console.error('[Salaries] Error saving employee:', error);
      await showAlert({
        title: t('errorSavingData'),
        confirmLabel: t('close'),
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone || '',
      role: employee.role || '',
      default_pay_type: employee.default_pay_type,
      default_rate:
        Number(employee.default_rate) > 0 ? String(employee.default_rate) : '',
    });
    setEditingEmployeeId(employee.id);
    setShowEmployeeForm(true);
  };

  const handleArchiveEmployee = async (employeeId: number) => {
    const confirmed = await showConfirm({
      title: t('deleteEmployeeConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await db.run(
        `UPDATE employees
         SET active = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [employeeId],
      );
      await loadSalaryData();
    } catch (error) {
      console.error('[Salaries] Error archiving employee:', error);
      await showAlert({
        title: t('errorDeletingEntry'),
        confirmLabel: t('close'),
      });
    }
  };

  const handleSavePayment = async () => {
    const amount = Number(paymentForm.amount);
    const employee = selectedEmployee;

    if (!employee || !paymentForm.paid_at || !paymentForm.amount) {
      await showAlert({
        title: t('fillRequiredFields'),
        confirmLabel: t('close'),
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      await showAlert({
        title: t('enterValidAmount'),
        confirmLabel: t('close'),
      });
      return;
    }

    try {
      await ensureSalarySchema();

      if (editingPaymentId) {
        await db.run(
          `UPDATE salary_payments
           SET employee_id = ?, invoice_id = ?, employee_name = ?, pay_type = ?,
               job_reference = ?, amount = ?, paid_at = ?, notes = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            employee.id,
            paymentForm.invoice_id ? Number(paymentForm.invoice_id) : null,
            employee.name,
            paymentForm.pay_type,
            paymentForm.job_reference.trim(),
            amount,
            paymentForm.paid_at,
            paymentForm.notes.trim(),
            editingPaymentId,
          ],
        );
      } else {
        await db.run(
          `INSERT INTO salary_payments
           (employee_id, invoice_id, employee_name, pay_type, job_reference, amount, paid_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employee.id,
            paymentForm.invoice_id ? Number(paymentForm.invoice_id) : null,
            employee.name,
            paymentForm.pay_type,
            paymentForm.job_reference.trim(),
            amount,
            paymentForm.paid_at,
            paymentForm.notes.trim(),
          ],
        );
      }

      resetPaymentForm();
      await loadSalaryData();
    } catch (error) {
      console.error('[Salaries] Error saving salary payment:', error);
      await showAlert({
        title: t('errorSavingData'),
        confirmLabel: t('close'),
      });
    }
  };

  const handleEditPayment = (payment: SalaryPayment) => {
    setPaymentForm({
      employee_id: payment.employee_id ? String(payment.employee_id) : '',
      employee_name: payment.employee_name,
      pay_type: payment.pay_type,
      invoice_id: payment.invoice_id ? String(payment.invoice_id) : '',
      job_reference: payment.job_reference || '',
      amount: String(payment.amount),
      paid_at: payment.paid_at,
      notes: payment.notes || '',
    });
    setInvoiceSearchTerm('');
    setEditingPaymentId(payment.id);
    setShowPaymentForm(true);
  };

  const handleDeletePayment = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('deleteSalaryPaymentConfirm'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await db.run('DELETE FROM salary_payments WHERE id = ?', [id]);
      await loadSalaryData();
    } catch (error) {
      console.error('[Salaries] Error deleting salary payment:', error);
      await showAlert({
        title: t('errorDeletingEntry'),
        confirmLabel: t('close'),
      });
    }
  };

  const employeeOptions = [
    'all',
    ...new Set(payments.map((payment) => payment.employee_name).filter(Boolean)),
  ];
  const filteredPayments = payments.filter((payment) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      payment.employee_name.toLowerCase().includes(query) ||
      (payment.job_reference || '').toLowerCase().includes(query) ||
      (payment.invoice_number || '').toLowerCase().includes(query) ||
      (payment.invoice_customer_name || '').toLowerCase().includes(query) ||
      (payment.notes || '').toLowerCase().includes(query);
    const matchesEmployee =
      filterEmployee === 'all' || payment.employee_name === filterEmployee;
    const matchesPayType =
      filterPayType === 'all' || payment.pay_type === filterPayType;

    return matchesSearch && matchesEmployee && matchesPayType;
  });
  const sortedPayments = sortRows(filteredPayments, sortConfig, (payment, key) => {
    switch (key) {
      case 'employee_name':
        return payment.employee_name;
      case 'pay_type':
        return payment.pay_type;
      case 'paid_at':
        return payment.paid_at;
      case 'amount':
        return Number(payment.amount) || 0;
      default:
        return '';
    }
  });
  const filteredTotal = filteredPayments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );
  const allTimeEmployeeTotal = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );
  const [selectedMonthYear, selectedMonthNumber] = selectedMonth
    .split('-')
    .map(Number);
  const selectedMonthLabel =
    Number.isFinite(selectedMonthYear) && Number.isFinite(selectedMonthNumber)
      ? formatMonth(new Date(selectedMonthYear, selectedMonthNumber - 1, 1), {
          month: 'long',
          year: 'numeric',
        })
      : t('thisMonth');
  const monthlyTotal = monthlyEmployeeTotals.reduce(
    (sum, employee) => sum + (Number(employee.total_paid) || 0),
    0,
  );

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('salaries')}</h1>
          <p className="mt-1 text-muted-foreground">{t('salariesDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEmployeeForm(createEmptyEmployeeForm());
              setEditingEmployeeId(null);
              setShowEmployeeForm((current) => !current);
            }}
            className="gap-2"
          >
            <UserRound className="h-4 w-4" />
            {t('addEmployee')}
          </Button>
          <Button
            onClick={() => {
              if (showPaymentForm && !editingPaymentId) {
                setShowPaymentForm(false);
                return;
              }

              resetPaymentForm();
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('quickAddSalaryPayment')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('employeeExpenses')}</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(allTimeEmployeeTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('salaryPayments')}</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(filteredTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            {t('salaryPayments')} - {selectedMonthLabel}
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(monthlyTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('activeEmployees')}</p>
          <p className="mt-1 text-2xl font-bold">{employees.length}</p>
        </Card>
      </div>

      {showEmployeeForm && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {editingEmployeeId ? t('editEmployee') : t('addEmployee')}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('employeeName')} *
              </label>
              <Input
                value={employeeForm.name}
                onChange={(event) =>
                  setEmployeeForm({ ...employeeForm, name: event.target.value })
                }
                placeholder={t('employeeName')}
                spellCheck
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('phone')}
              </label>
              <Input
                value={employeeForm.phone}
                onChange={(event) =>
                  setEmployeeForm({ ...employeeForm, phone: event.target.value })
                }
                placeholder={t('phone')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('employeeRole')}
              </label>
              <Input
                value={employeeForm.role}
                onChange={(event) =>
                  setEmployeeForm({ ...employeeForm, role: event.target.value })
                }
                placeholder={t('employeeRole')}
                spellCheck
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('defaultPayType')}
              </label>
              <select
                value={employeeForm.default_pay_type}
                onChange={(event) =>
                  setEmployeeForm({
                    ...employeeForm,
                    default_pay_type: event.target.value as PayType,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="daily">{t('dailyPay')}</option>
                <option value="job">{t('perJobPay')}</option>
                <option value="biweekly">{t('biweeklyPay')}</option>
                <option value="monthly">{t('monthlyPay')}</option>
                <option value="other">{t('otherPay')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('defaultAmountOptional')}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={employeeForm.default_rate}
                onChange={(event) =>
                  setEmployeeForm({
                    ...employeeForm,
                    default_rate: event.target.value,
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 md:col-span-2 xl:col-span-5">
              <Button onClick={() => void handleSaveEmployee()}>{t('save')}</Button>
              <Button variant="outline" onClick={resetEmployeeForm}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {showPaymentForm && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {editingPaymentId ? t('editSalaryPayment') : t('addSalaryPayment')}
            </h2>
          </div>
          {employees.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t('addEmployeeBeforePayment')}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('employeeName')} *
                </label>
                <select
                  value={paymentForm.employee_id}
                  onChange={(event) => handleEmployeeSelect(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('amount')} *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, amount: event.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('paidDate')} *
                </label>
                <Input
                  type="date"
                  value={paymentForm.paid_at}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, paid_at: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('payType')}
                </label>
                <select
                  value={paymentForm.pay_type}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      pay_type: event.target.value as PayType,
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="daily">{t('dailyPay')}</option>
                  <option value="job">{t('perJobPay')}</option>
                  <option value="biweekly">{t('biweeklyPay')}</option>
                  <option value="monthly">{t('monthlyPay')}</option>
                  <option value="other">{t('otherPay')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  {t('jobReference')}
                </label>
                <Input
                  value={invoiceSearchTerm}
                  onChange={(event) => setInvoiceSearchTerm(event.target.value)}
                  placeholder={t('searchInvoices')}
                  className="mb-2"
                />
                <select
                  value={paymentForm.invoice_id}
                  onChange={(event) => handleInvoiceSelect(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">{t('noInvoiceReference')}</option>
                  {filteredInvoiceOptions.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {getInvoiceOptionLabel(invoice)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedInvoice
                    ? `${t('selectedInvoice')}: ${getInvoiceOptionLabel(selectedInvoice)}`
                    : t('jobReferenceOptional')}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('manualJobNote')}
                </label>
                <Input
                  value={paymentForm.job_reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      job_reference: event.target.value,
                    })
                  }
                  placeholder={t('jobReferencePlaceholder')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  {t('notes')}
                </label>
                <Input
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, notes: event.target.value })
                  }
                  placeholder={t('additionalNotes')}
                  spellCheck
                />
              </div>
              <div className="flex gap-2 md:col-span-2 xl:col-span-4">
                <Button onClick={() => void handleSavePayment()}>
                  {t('save')}
                </Button>
                <Button variant="outline" onClick={resetPaymentForm}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-border p-6">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('employees')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {employees.length} {t('entries')}
            </p>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">{t('loading')}</div>
          ) : employees.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t('noEmployees')}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[employee.role, employee.phone].filter(Boolean).join(' - ') ||
                        t('noDescription')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getPayTypeLabel(employee.default_pay_type)}
                      {Number(employee.default_rate) > 0
                        ? ` - ${formatCurrency(employee.default_rate)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEmployee(employee)}
                      title={t('edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleArchiveEmployee(employee.id)}
                      title={t('delete')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('employeeTotals')}</h2>
            </div>
          </div>
          {employeeSummaries.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t('noSalaryPayments')}
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {employeeSummaries.map((employee) => (
                <div
                  key={`${employee.employee_id || 'legacy'}-${employee.employee_name}`}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{employee.employee_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {employee.payment_count} {t('payments')}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(employee.total_paid)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('lastPaid')}: {formatDate(employee.last_paid_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('monthlyEmployeeTotals')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('monthlyEmployeeTotalsDesc')}
            </p>
          </div>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="w-full md:w-48"
          />
        </div>
        {monthlyEmployeeTotals.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            {t('noSalaryPayments')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="compact-data-table w-full min-w-[520px]">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    {t('employeeName')}
                  </th>
                  <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                    {t('payments')}
                  </th>
                  <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                    {t('total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyEmployeeTotals.map((employee) => (
                  <tr
                    key={`${employee.employee_id || 'legacy'}-${employee.employee_name}`}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-sm font-medium">
                      {employee.employee_name}
                    </td>
                    <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                      {employee.payment_count}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(employee.total_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('salaryHistory')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredPayments.length} {t('entries')}
          </p>
        </div>

        <div className="grid gap-4 border-b border-border p-6 md:grid-cols-4">
          <Input
            placeholder={t('searchSalaryPayments')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            value={filterEmployee}
            onChange={(event) => setFilterEmployee(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2"
          >
            {employeeOptions.map((employee) => (
              <option key={employee} value={employee}>
                {employee === 'all' ? t('allEmployees') : employee}
              </option>
            ))}
          </select>
          <select
            value={filterPayType}
            onChange={(event) => setFilterPayType(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="all">{t('allPayTypes')}</option>
            <option value="daily">{t('dailyPay')}</option>
            <option value="job">{t('perJobPay')}</option>
            <option value="biweekly">{t('biweeklyPay')}</option>
            <option value="monthly">{t('monthlyPay')}</option>
            <option value="other">{t('otherPay')}</option>
          </select>
          <div className="flex items-center text-sm text-muted-foreground">
            {t('showing')} {filteredPayments.length} {t('of')} {payments.length}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('loading')}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('noSalaryPayments')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="compact-data-table w-full min-w-[820px]">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <SortableTableHeader
                      label={t('employeeName')}
                      sortKey="employee_name"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as SalarySortKey),
                        )
                      }
                    />
                  </th>
                  <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                    <SortableTableHeader
                      label={t('payType')}
                      sortKey="pay_type"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as SalarySortKey),
                        )
                      }
                    />
                  </th>
                  <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                    <SortableTableHeader
                      label={t('paidDate')}
                      sortKey="paid_at"
                      sortConfig={sortConfig}
                      onSort={(key) =>
                        setSortConfig((current) =>
                          getNextSortConfig(current, key as SalarySortKey, 'desc'),
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
                          getNextSortConfig(current, key as SalarySortKey, 'desc'),
                        )
                      }
                      align="right"
                    />
                  </th>
                  <th className="table-action-column px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">{payment.employee_name}</div>
                      {(payment.job_reference || payment.notes) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[
                            payment.invoice_number
                              ? `${payment.invoice_number} - ${payment.invoice_customer_name || ''} - ${getStatusLabel(payment.invoice_status)} - ${
                                  payment.invoice_date
                                    ? formatDate(payment.invoice_date)
                                    : ''
                                }`
                              : payment.job_reference,
                            payment.notes,
                          ]
                            .filter(Boolean)
                            .join(' - ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {getPayTypeLabel(payment.pay_type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.paid_at)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="table-action-column px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                          title={t('edit')}
                          disabled={!payment.employee_id}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeletePayment(payment.id)}
                          title={t('delete')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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

export default SalariesPage;
