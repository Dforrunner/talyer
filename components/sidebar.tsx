'use client';

import { Badge } from '@/components/ui/badge';
import { AppBrand } from '@/components/ui/app-brand';
import LanguageToggle from '@/components/language-toggle';
import { useLanguage } from '@/hooks/use-language';
import {
  LayoutDashboard,
  Package,
  Settings,
  Building2,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  History,
  DollarSign,
  ClipboardList,
  BookUser,
  HandCoins,
  type LucideIcon,
} from 'lucide-react';

type Page =
  | 'dashboard'
  | 'inventory'
  | 'business-settings'
  | 'app-settings'
  | 'invoices'
  | 'active-invoices'
  | 'invoice-history'
  | 'salaries'
  | 'revenue-tracking'
  | 'expenses-income'
  | 'customer-contacts';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void | Promise<void>;
  lowStockCount: number;
}

interface SidebarMenuItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: number | null;
}

interface SidebarMenuGroup {
  label: string;
  items: SidebarMenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, lowStockCount }) => {
  const { t } = useLanguage();
  const menuGroups: SidebarMenuGroup[] = [
    {
      label: t('today'),
      items: [
        { id: 'dashboard' as Page, label: t('dashboard'), icon: LayoutDashboard },
        { id: 'invoices' as Page, label: t('startJob'), icon: PlusCircle, highlight: true },
        { id: 'active-invoices' as Page, label: t('jobsInProgress'), icon: ClipboardList },
      ],
    },
    {
      label: t('records'),
      items: [
        { id: 'invoice-history' as Page, label: t('pastJobs'), icon: History },
        { id: 'customer-contacts' as Page, label: t('customerContacts'), icon: BookUser },
      ],
    },
    {
      label: t('shopData'),
      items: [
        { id: 'inventory' as Page, label: t('inventory'), icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
        { id: 'salaries' as Page, label: t('salaries'), icon: HandCoins },
        { id: 'expenses-income' as Page, label: t('expensesIncome'), icon: DollarSign },
        { id: 'revenue-tracking' as Page, label: t('revenueTracking'), icon: TrendingUp },
      ],
    },
    {
      label: t('setup'),
      items: [
        { id: 'business-settings' as Page, label: t('businessSettings'), icon: Building2 },
        { id: 'app-settings' as Page, label: t('backupTransfer'), icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo/Title */}
      <div className="p-6 border-b border-sidebar-border">
        <AppBrand
          titleClassName="text-lg text-sidebar-foreground"
          subtitleClassName="text-sidebar-foreground/60"
          subtitle={t('appTagline')}
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
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => void onPageChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/30'
                  } ${item.highlight ? 'font-semibold' : ''}`}
                >
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-4 p-4 border-t border-sidebar-border">
        <LanguageToggle />
      </div>
    </div>
  );
};

export default Sidebar;
