'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  Package,
  FileText,
  TrendingUp,
  Plus,
  BarChart3,
  BookOpen,
  CircleHelp,
  ContactRound,
  Wrench,
  Wallet,
} from 'lucide-react';
import { db } from '@/lib/db';
import { useLanguage } from '@/hooks/use-language';
import { getMonthDateRange } from '@/lib/date-utils';

interface DashboardPageProps {
  onLowStockUpdate?: (count: number) => void;
  onNavigate?: (
    page:
      | 'invoices'
      | 'inventory'
      | 'revenue-tracking'
      | 'business-settings'
      | 'active-invoices'
      | 'invoice-history'
      | 'customer-contacts'
      | 'data-management',
  ) => void;
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

  const quickStartSteps = [
    {
      number: '01',
      title: t('tutorialStep1Title'),
      description: t('tutorialStep1Desc'),
      actionLabel: t('businessSettings'),
      actionPage: 'business-settings' as const,
      icon: Wrench,
    },
    {
      number: '02',
      title: t('tutorialStep2Title'),
      description: t('tutorialStep2Desc'),
      actionLabel: t('inventory'),
      actionPage: 'inventory' as const,
      icon: Package,
    },
    {
      number: '03',
      title: t('tutorialStep3Title'),
      description: t('tutorialStep3Desc'),
      actionLabel: t('createInvoice'),
      actionPage: 'invoices' as const,
      icon: Plus,
    },
    {
      number: '04',
      title: t('tutorialStep4Title'),
      description: t('tutorialStep4Desc'),
      actionLabel: t('activeInvoices'),
      actionPage: 'active-invoices' as const,
      icon: FileText,
    },
    {
      number: '05',
      title: t('tutorialStep5Title'),
      description: t('tutorialStep5Desc'),
      actionLabel: t('invoiceHistory'),
      actionPage: 'invoice-history' as const,
      icon: Wallet,
    },
    {
      number: '06',
      title: t('tutorialStep6Title'),
      description: t('tutorialStep6Desc'),
      actionLabel: t('customerContacts'),
      actionPage: 'customer-contacts' as const,
      icon: ContactRound,
    },
  ];

  const faqItems = [
    {
      value: 'faq-1',
      question: t('faqQuestion1'),
      answer: t('faqAnswer1'),
    },
    {
      value: 'faq-2',
      question: t('faqQuestion2'),
      answer: t('faqAnswer2'),
    },
    {
      value: 'faq-3',
      question: t('faqQuestion3'),
      answer: t('faqAnswer3'),
    },
    {
      value: 'faq-4',
      question: t('faqQuestion4'),
      answer: t('faqAnswer4'),
    },
  ];

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('quickStartGuide')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('quickStartGuideDesc')}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {quickStartSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
                        {step.number}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <div className="rounded-lg bg-background p-2 text-primary shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full justify-center"
                    onClick={() => onNavigate?.(step.actionPage)}
                  >
                    {step.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <CircleHelp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('frequentlyAskedQuestions')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('faqIntro')}
              </p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger className="text-left text-sm font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
