'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SortableTableHeader } from '@/components/ui/sortable-table-header';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getMonthlyFinancialSummary } from '@/lib/db';
import { TrendingUp, DollarSign, ShoppingCart, Percent } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { getNextSortConfig, sortRows, type SortConfig } from '@/lib/table-sort';

interface MonthlyData {
  monthIndex: number;
  month: string;
  salesRevenue: number;
  additionalIncome: number;
  revenue: number;
  productCosts: number;
  additionalExpenses: number;
  salaryPayments: number;
  costs: number;
  profit: number;
  invoiceCount: number;
}

interface YearlyStats {
  totalSalesRevenue: number;
  totalRevenue: number;
  totalCosts: number;
  totalProductCosts: number;
  totalExpenses: number;
  totalSalaryPayments: number;
  totalAdditionalIncome: number;
  totalProfit: number;
  profitMargin: number;
  totalInvoices: number;
  averageInvoice: number;
}

type RevenueSortKey =
  | 'monthIndex'
  | 'salesRevenue'
  | 'additionalIncome'
  | 'revenue'
  | 'productCosts'
  | 'additionalExpenses'
  | 'salaryPayments'
  | 'costs'
  | 'profit';

const RevenueTrackingPage: React.FC = () => {
  const { formatCurrency, formatMonth, language, t } = useLanguage();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig<RevenueSortKey>>({
    key: 'monthIndex',
    direction: 'asc',
  });

  useEffect(() => {
    loadRevenueData();
  }, [selectedYear, language]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      const data = await Promise.all(
        Array.from({ length: 12 }, async (_, index) => {
          const month = index + 1;
          const summary = await getMonthlyFinancialSummary(selectedYear, month);

          return {
            monthIndex: month,
            month: formatMonth(new Date(selectedYear, month - 1, 1)),
            salesRevenue: summary.salesRevenue,
            additionalIncome: summary.additionalIncome,
            revenue: summary.revenue,
            productCosts: summary.productCosts,
            additionalExpenses: summary.additionalExpenses,
            salaryPayments: summary.salaryPayments,
            costs: summary.costs,
            profit: summary.profit,
            invoiceCount: summary.invoiceCount,
          };
        }),
      );

      setMonthlyData(data);

      const totalSalesRevenue = data.reduce((sum, month) => sum + month.salesRevenue, 0);
      const totalRevenue = data.reduce((sum, month) => sum + month.revenue, 0);
      const totalProductCosts = data.reduce((sum, month) => sum + month.productCosts, 0);
      const totalCosts = data.reduce((sum, month) => sum + month.costs, 0);
      const totalExpenses = data.reduce((sum, month) => sum + month.additionalExpenses, 0);
      const totalSalaryPayments = data.reduce((sum, month) => sum + month.salaryPayments, 0);
      const totalAdditionalIncome = data.reduce((sum, month) => sum + month.additionalIncome, 0);
      const totalProfit = data.reduce((sum, month) => sum + month.profit, 0);
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const totalInvoices = data.reduce((sum, month) => sum + month.invoiceCount, 0);
      const averageInvoice = totalInvoices > 0 ? totalSalesRevenue / totalInvoices : 0;

      setYearlyStats({
        totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProductCosts: Math.round(totalProductCosts * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalSalaryPayments: Math.round(totalSalaryPayments * 100) / 100,
        totalAdditionalIncome: Math.round(totalAdditionalIncome * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalInvoices,
        averageInvoice: Math.round(averageInvoice * 100) / 100,
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, subtext }: any) => (
    <Card className="p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </Card>
  );

  const sortedMonthlyData = sortRows(monthlyData, sortConfig, (month, key) => {
    switch (key) {
      case 'monthIndex':
        return month.monthIndex;
      case 'salesRevenue':
        return month.salesRevenue;
      case 'additionalIncome':
        return month.additionalIncome;
      case 'revenue':
        return month.revenue;
      case 'productCosts':
        return month.productCosts;
      case 'additionalExpenses':
        return month.additionalExpenses;
      case 'salaryPayments':
        return month.salaryPayments;
      case 'costs':
        return month.costs;
      case 'profit':
        return month.profit;
      default:
        return 0;
    }
  });
  const productCostsLabel = t('productCosts');
  const revenueUseData = yearlyStats
    ? [
        {
          name: productCostsLabel,
          value: Math.max(yearlyStats.totalProductCosts, 0),
          color: '#f97316',
        },
        {
          name: t('otherExpenses'),
          value: Math.max(yearlyStats.totalExpenses, 0),
          color: '#ef4444',
        },
        {
          name: t('salaryPayments'),
          value: Math.max(yearlyStats.totalSalaryPayments, 0),
          color: '#f59e0b',
        },
        {
          name: t('profit'),
          value: Math.max(yearlyStats.totalProfit, 0),
          color: '#10b981',
        },
      ].filter((entry) => entry.value > 0)
    : [];

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('revenueTracking')}</h1>
          <p className="text-muted-foreground mt-1">{t('monitorBusinessPerformance')}</p>
        </div>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Yearly Stats */}
      {yearlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={DollarSign}
            label={t('invoiceRevenue')}
            value={formatCurrency(yearlyStats.totalSalesRevenue)}
            color="bg-green-100 text-green-600"
            subtext={t('paid')}
          />
          <StatCard
            icon={DollarSign}
            label={t('additionalIncome')}
            value={formatCurrency(yearlyStats.totalAdditionalIncome)}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={DollarSign}
            label={t('totalRevenue')}
            value={formatCurrency(yearlyStats.totalRevenue)}
            color="bg-green-100 text-green-600"
            subtext={`${t('invoiceRevenue')} + ${t('additionalIncome')}`}
          />
          <StatCard
            icon={ShoppingCart}
            label={productCostsLabel}
            value={formatCurrency(yearlyStats.totalProductCosts)}
            color="bg-orange-100 text-orange-600"
          />
          <StatCard
            icon={ShoppingCart}
            label={t('totalCosts')}
            value={formatCurrency(yearlyStats.totalCosts)}
            color="bg-orange-100 text-orange-600"
            subtext={`${productCostsLabel} + ${t('otherExpenses')} + ${t('salaryPayments')}`}
          />
          <StatCard
            icon={ShoppingCart}
            label={t('otherExpenses')}
            value={formatCurrency(yearlyStats.totalExpenses)}
            color="bg-red-100 text-red-600"
          />
          <StatCard
            icon={DollarSign}
            label={t('salaryPayments')}
            value={formatCurrency(yearlyStats.totalSalaryPayments)}
            color="bg-amber-100 text-amber-600"
          />
          <StatCard
            icon={TrendingUp}
            label={t('totalProfit')}
            value={formatCurrency(yearlyStats.totalProfit)}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={Percent}
            label={t('profitMargin')}
            value={`${yearlyStats.profitMargin.toFixed(1)}%`}
            color="bg-purple-100 text-purple-600"
            subtext={`${t('profit')} / ${t('totalRevenue')}`}
          />
        </div>
      )}

      {/* Secondary Stats */}
      {yearlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('totalInvoices')}</p>
            <p className="text-3xl font-bold">{yearlyStats.totalInvoices}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('averageInvoiceValue')}</p>
            <p className="text-3xl font-bold">{formatCurrency(yearlyStats.averageInvoice)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {`${t('invoiceRevenue')} / ${t('totalInvoices')}`}
            </p>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Costs Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('revenueVsCosts')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('revenueTimingNote')}
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name={t('totalRevenue')} />
              <Bar dataKey="costs" fill="#f97316" name={t('totalCosts')} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Profit Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('monthlyProfit')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#3b82f6"
                strokeWidth={2}
                name={t('profit')}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Profit Breakdown */}
      {yearlyStats && yearlyStats.totalRevenue > 0 && revenueUseData.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('totalRevenueUse')}</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueUseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${formatCurrency(Number(value ?? 0))} (${(Number(percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueUseData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Monthly Breakdown Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{t('monthlyBreakdown')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="compact-data-table w-full min-w-[980px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-px px-6 py-3 text-left whitespace-nowrap">
                  <SortableTableHeader
                    label={t('date')}
                    sortKey="monthIndex"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey),
                      )
                    }
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('totalRevenue')}
                    sortKey="revenue"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('invoiceRevenue')}
                    sortKey="salesRevenue"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('additionalIncome')}
                    sortKey="additionalIncome"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={productCostsLabel}
                    sortKey="productCosts"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('otherExpenses')}
                    sortKey="additionalExpenses"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('salaryPayments')}
                    sortKey="salaryPayments"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('costs')}
                    sortKey="costs"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right whitespace-nowrap">
                  <SortableTableHeader
                    label={t('profit')}
                    sortKey="profit"
                    sortConfig={sortConfig}
                    onSort={(key) =>
                      setSortConfig((current) =>
                        getNextSortConfig(current, key as RevenueSortKey, 'desc'),
                      )
                    }
                    align="right"
                  />
                </th>
                <th className="w-px px-6 py-3 text-right text-sm font-semibold whitespace-nowrap">{t('margin')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonthlyData.map((month) => {
                const margin = month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : '0';
                return (
                  <tr key={month.monthIndex} className="border-b border-border hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{month.month}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.revenue)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.salesRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.additionalIncome)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.productCosts)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.additionalExpenses)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.salaryPayments)}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{formatCurrency(month.costs)}</td>
                    <td
                      className={`px-6 py-4 text-sm text-right font-semibold whitespace-nowrap ${
                        month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(month.profit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{margin}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RevenueTrackingPage;
