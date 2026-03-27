'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, FileText, TrendingUp, Plus, BarChart3 } from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { getMonthDateRange } from '@/lib/date-utils';

interface DashboardPageProps {
  onLowStockUpdate?: (count: number) => void;
  onNavigate?: (page: 'invoices' | 'inventory' | 'revenue-tracking') => void;
}

interface Stats {
  totalProducts: number;
  lowStockItems: number;
  totalInvoices: number;
  monthlyRevenue: number;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLowStockUpdate, onNavigate }) => {
  const { formatCurrency, t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockItems: 0,
    totalInvoices: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get total products
        const products = await db.query('SELECT COUNT(*) as count FROM products');
        const totalProducts = products[0]?.count || 0;

        // Get low stock items
        const lowStock = await db.query(
          'SELECT COUNT(*) as count FROM products WHERE quantity_in_stock <= low_stock_threshold'
        );
        const lowStockItems = lowStock[0]?.count || 0;

        // Get total invoices
        const invoices = await db.query("SELECT COUNT(*) as count FROM invoices WHERE status != 'draft'");
        const totalInvoices = invoices[0]?.count || 0;

        // Get this month's revenue
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const { startDate, endDate } = getMonthDateRange(year, month);

        const profit = await db.get(
          `SELECT SUM(total) as total_revenue FROM invoices 
           WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'draft'`,
          [startDate, endDate]
        );

        setStats({
          totalProducts,
          lowStockItems,
          totalInvoices,
          monthlyRevenue: profit?.total_revenue || 0,
        });

        if (onLowStockUpdate) {
          onLowStockUpdate(lowStockItems);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [onLowStockUpdate]);

  const StatCard = ({ icon: Icon, label, value, color, showAlert = false }: any) => (
    <Card className="p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{loading ? '...' : value}</p>
        {showAlert && value > 0 && (
          <p className="text-xs text-destructive mt-2">⚠️ {t('actionRequired')}</p>
        )}
      </div>
    </Card>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>
        <p className="text-muted-foreground mt-1">{t('welcomeMessage')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label={t('totalProducts')}
          value={stats.totalProducts}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('lowStockItems')}
          value={stats.lowStockItems}
          color="bg-red-100 text-red-600"
          showAlert={true}
        />
        <StatCard
          icon={FileText}
          label={t('totalInvoices')}
          value={stats.totalInvoices}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label={t('monthlyRevenue')}
          value={formatCurrency(stats.monthlyRevenue)}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">{t('quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => onNavigate?.('invoices')}
            variant="outline"
            className="p-4 h-auto flex flex-col items-start gap-2 hover:bg-primary/5"
          >
            <Plus className="w-5 h-5" />
            <div className="text-left text-wrap">
              <p className="font-semibold text-sm">{t('createInvoice')}</p>
              <p className="text-xs text-muted-foreground">{t('createInvoiceDesc')}</p>
            </div>
          </Button>
          <Button
            onClick={() => onNavigate?.('inventory')}
            variant="outline"
            className="p-4 h-auto flex flex-col items-start gap-2 hover:bg-green-50"
          >
            <Package className="w-5 h-5" />
            <div className="text-left text-wrap">
              <p className="font-semibold text-sm">{t('manageInventory')}</p>
              <p className="text-xs text-muted-foreground">{t('manageInventoryDesc')}</p>
            </div>
          </Button>
          <Button
            onClick={() => onNavigate?.('revenue-tracking')}
            variant="outline"
            className="p-4 h-auto flex flex-col items-start gap-2 hover:bg-purple-50"
          >
            <BarChart3 className="w-5 h-5" />
            <div className="text-left text-wrap">
              <p className="font-semibold text-sm">{t('viewReports')}</p>
              <p className="text-xs text-muted-foreground">{t('viewReportsDesc')}</p>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
