'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '@/lib/db';
import { TrendingUp, DollarSign, ShoppingCart, Percent } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

interface MonthlyData {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface YearlyStats {
  totalRevenue: number;
  totalCosts: number;
  totalExpenses: number;
  totalAdditionalIncome: number;
  totalProfit: number;
  profitMargin: number;
  totalInvoices: number;
  averageInvoice: number;
}

const RevenueTrackingPage: React.FC = () => {
  const { formatCurrency, formatMonth, language, t } = useLanguage();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [selectedYear, language]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      const data: MonthlyData[] = [];

      // Get data for each month
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(selectedYear, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(selectedYear, month, 0).toISOString().split('T')[0];

        // Get revenue
        const revenueData = await db.get(
          `SELECT SUM(total) as total FROM invoices 
           WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'draft'`,
          [startDate, endDate]
        );

        // Get costs (product costs only)
        const costsData = await db.get(
          `SELECT SUM(ii.quantity * ii.unit_price) as total FROM invoice_items ii
           JOIN invoices i ON ii.invoice_id = i.id
           WHERE ii.product_id IS NOT NULL AND i.invoice_date >= ? AND i.invoice_date <= ? AND i.status != 'draft'`,
          [startDate, endDate]
        );

        const revenue = revenueData?.total || 0;
        const costs = costsData?.total || 0;

        data.push({
          month: formatMonth(new Date(selectedYear, month - 1, 1)),
          revenue: Math.round(revenue * 100) / 100,
          costs: Math.round(costs * 100) / 100,
          profit: Math.round((revenue - costs) * 100) / 100,
        });
      }

      setMonthlyData(data);

      // Calculate yearly stats
      const totalRevenue = data.reduce((sum, m) => sum + m.revenue, 0);
      const totalCosts = data.reduce((sum, m) => sum + m.costs, 0);
      
      // Get additional expenses
      const startOfYear = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(selectedYear, 11, 31).toISOString().split('T')[0];

      const expensesData = await db.get(
        `SELECT SUM(amount) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?`,
        [startOfYear, endOfYear]
      );

      const incomeData = await db.get(
        `SELECT SUM(amount) as total FROM income WHERE income_date >= ? AND income_date <= ?`,
        [startOfYear, endOfYear]
      );

      const totalExpenses = expensesData?.total || 0;
      const totalAdditionalIncome = incomeData?.total || 0;
      
      // Calculate profit: Revenue + Additional Income - Costs - Expenses
      const totalProfit = (totalRevenue + totalAdditionalIncome) - (totalCosts + totalExpenses);
      const profitMargin = (totalRevenue + totalAdditionalIncome) > 0 ? (totalProfit / (totalRevenue + totalAdditionalIncome)) * 100 : 0;
      const invoiceCount = await db.get(
        `SELECT COUNT(*) as count FROM invoices 
         WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'draft'`,
        [startOfYear, endOfYear]
      );

      const totalInvoices = invoiceCount?.count || 0;
      const averageInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

      setYearlyStats({
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
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
            label={t('totalRevenue')}
            value={formatCurrency(yearlyStats.totalRevenue)}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={DollarSign}
            label={t('additionalIncome')}
            value={formatCurrency(yearlyStats.totalAdditionalIncome)}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={ShoppingCart}
            label={t('totalCosts')}
            value={formatCurrency(yearlyStats.totalCosts)}
            color="bg-orange-100 text-orange-600"
          />
          <StatCard
            icon={ShoppingCart}
            label={t('otherExpenses')}
            value={formatCurrency(yearlyStats.totalExpenses)}
            color="bg-red-100 text-red-600"
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
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Costs Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('revenueVsCosts')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name={t('revenue')} />
              <Bar dataKey="costs" fill="#f97316" name={t('costs')} />
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
      {yearlyStats && yearlyStats.totalRevenue > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('revenueBreakdown')}</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('profit'), value: yearlyStats.totalProfit },
                    { name: t('costs'), value: yearlyStats.totalCosts },
                  ]}
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
                  <Cell fill="#10b981" />
                  <Cell fill="#f97316" />
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
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('date')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('revenue')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('costs')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('profit')}</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">{t('margin')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((month, index) => {
                const margin = month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : '0';
                return (
                  <tr key={index} className="border-b border-border hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm font-medium">{month.month}</td>
                    <td className="px-6 py-4 text-sm text-right">{formatCurrency(month.revenue)}</td>
                    <td className="px-6 py-4 text-sm text-right">{formatCurrency(month.costs)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(month.profit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">{margin}%</td>
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
