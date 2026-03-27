'use client';

import { Badge } from '@/components/ui/badge';
import { AppBrand } from '@/components/ui/app-brand';
import LanguageToggle from '@/components/language-toggle';
import { useLanguage } from '@/hooks/use-language';
import {
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  History,
  Download,
  DollarSign,
  ClipboardList,
  BookUser,
} from 'lucide-react';

type Page =
  | 'dashboard'
  | 'inventory'
  | 'business-settings'
  | 'invoices'
  | 'active-invoices'
  | 'invoice-history'
  | 'revenue-tracking'
  | 'data-management'
  | 'expenses-income'
  | 'customer-contacts';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void | Promise<void>;
  lowStockCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, lowStockCount }) => {
  const { t } = useLanguage();
  const menuItems = [
    { id: 'dashboard' as Page, label: t('dashboard'), icon: LayoutDashboard },
    { id: 'invoices' as Page, label: t('createInvoice'), icon: PlusCircle, highlight: true },
    { id: 'active-invoices' as Page, label: t('activeInvoices'), icon: ClipboardList },
    { id: 'invoice-history' as Page, label: t('invoiceHistory'), icon: History },
    { id: 'customer-contacts' as Page, label: t('customerContacts'), icon: BookUser },
    { id: 'inventory' as Page, label: t('inventory'), icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'expenses-income' as Page, label: t('expensesIncome'), icon: DollarSign },
    { id: 'revenue-tracking' as Page, label: t('revenueTracking'), icon: TrendingUp },
    { id: 'data-management' as Page, label: t('dataManagement'), icon: Download },
    { id: 'business-settings' as Page, label: t('businessSettings'), icon: Settings },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-sidebar-border">
        <AppBrand
          titleClassName="text-lg text-sidebar-foreground"
          subtitleClassName="text-sidebar-foreground/60"
          subtitle={t('shopManager')}
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="m-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-destructive">
              {lowStockCount} {t('itemsLow')}
            </p>
            <p className="text-xs text-destructive/80">{t('checkInventorySoon')}</p>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => void onPageChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
              } ${item.highlight ? 'font-semibold' : ''}`}
            >
              <div className="flex items-center text-left gap-3">
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-4 p-4 border-t border-sidebar-border">
        <LanguageToggle />
      </div>
    </div>
  );
};

export default Sidebar;
