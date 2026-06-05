'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { useLanguage } from '@/hooks/use-language';
import { type CustomerContactFields, type CustomerContactPrefill } from '@/lib/customer-contacts';
import { isElectron } from '@/lib/electron-api';

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

function PageLoadingShell() {
  return (
    <div className="p-8 space-y-8">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/70" />
      <div className="h-5 w-80 animate-pulse rounded-lg bg-muted/50" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border bg-card/70 shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

const DashboardPage = dynamic(() => import('@/components/pages/dashboard'), {
  loading: () => <PageLoadingShell />,
});

const InventoryPage = dynamic(() => import('@/components/pages/inventory'), {
  loading: () => <PageLoadingShell />,
});

const BusinessSettingsPage = dynamic(() => import('@/components/pages/business-settings'), {
  loading: () => <PageLoadingShell />,
});

const AppSettingsPage = dynamic(() => import('@/components/pages/app-settings'), {
  loading: () => <PageLoadingShell />,
});

const InvoiceCreatorPage = dynamic(() => import('@/components/pages/invoice-creator'), {
  loading: () => <PageLoadingShell />,
});

const ActiveInvoicesPage = dynamic(() => import('@/components/pages/active-invoices'), {
  loading: () => <PageLoadingShell />,
});

const InvoiceHistoryPage = dynamic(() => import('@/components/pages/invoice-history'), {
  loading: () => <PageLoadingShell />,
});

const SalariesPage = dynamic(() => import('@/components/pages/salaries'), {
  loading: () => <PageLoadingShell />,
});

const RevenueTrackingPage = dynamic(() => import('@/components/pages/revenue-tracking'), {
  loading: () => <PageLoadingShell />,
});

const ExpensesIncomePage = dynamic(() => import('@/components/pages/expenses-income'), {
  loading: () => <PageLoadingShell />,
});

const CustomerContactsPage = dynamic(() => import('@/components/pages/customer-contacts'), {
  loading: () => <PageLoadingShell />,
});

export default function Home() {
  const { t } = useLanguage();
  const { showConfirm } = useAppDialog();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [customerPrefill, setCustomerPrefill] = useState<CustomerContactPrefill | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [invoiceEditorState, setInvoiceEditorState] = useState({
    hasUnsavedChanges: false,
    isSaving: false,
  });

  useEffect(() => {
    // Check for low stock items on mount
    const checkLowStock = async () => {
      try {
        // Only attempt database query if we're in Electron
        if (!isElectron()) {
          return;
        }

        const api = (window as any).electronAPI;
        if (!api?.database?.query) {
          return;
        }

        const result = await api.database.query(
          'SELECT COUNT(*) as count FROM products WHERE quantity_in_stock <= low_stock_threshold'
        );
        setLowStockCount(result[0]?.count || 0);
      } catch (error) {
        console.error('[App] Error checking low stock:', error);
      }
    };

    checkLowStock();
    // Check every 30 seconds
    const interval = setInterval(checkLowStock, 30000);
    return () => clearInterval(interval);
  }, []);

  const confirmInvoiceNavigation = async () => {
    if (currentPage !== 'invoices') {
      return true;
    }

    if (!invoiceEditorState.hasUnsavedChanges && !invoiceEditorState.isSaving) {
      return true;
    }

    return await showConfirm({
      title: t('leaveInvoiceWithoutSaving'),
      confirmLabel: t('confirm'),
      cancelLabel: t('cancel'),
    });
  };

  const openNewInvoice = async (prefill?: CustomerContactFields) => {
    if (currentPage === 'invoices' && !(await confirmInvoiceNavigation())) {
      return;
    }

    setSelectedInvoiceId(null);
    setCustomerPrefill(
      prefill
        ? {
            ...prefill,
            requestId: Date.now(),
          }
        : null,
    );
    setCurrentPage('invoices');
  };

  const changePage = async (page: Page) => {
    if (page === 'invoices') {
      await openNewInvoice();
      return;
    }

    if (currentPage === 'invoices' && !(await confirmInvoiceNavigation())) {
      return;
    }

    setCurrentPage(page);
    setMobileNavOpen(false);
  };

  const editInvoice = async (invoiceId: number) => {
    if (
      currentPage === 'invoices' &&
      selectedInvoiceId !== invoiceId &&
      !(await confirmInvoiceNavigation())
    ) {
      return;
    }

    setSelectedInvoiceId(invoiceId);
    setCustomerPrefill(null);
    setCurrentPage('invoices');
  };

  const renderPage = (): ReactNode => {
    const handleNavigate = (page: Page) => {
      void changePage(page);
    };

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onLowStockUpdate={setLowStockCount} onNavigate={handleNavigate} />;
      case 'inventory':
        return <InventoryPage onLowStockUpdate={setLowStockCount} />;
      case 'business-settings':
        return <BusinessSettingsPage />;
      case 'app-settings':
        return <AppSettingsPage />;
      case 'invoices':
        return (
          <InvoiceCreatorPage
            invoiceId={selectedInvoiceId}
            customerPrefill={customerPrefill}
            onDraftSaved={(invoiceId) => setSelectedInvoiceId(invoiceId)}
            onInvoiceCompleted={() => {
              setInvoiceEditorState({ hasUnsavedChanges: false, isSaving: false });
              setSelectedInvoiceId(null);
              setCustomerPrefill(null);
              setCurrentPage('invoice-history');
            }}
            onEditorStateChange={setInvoiceEditorState}
          />
        );
      case 'active-invoices':
        return <ActiveInvoicesPage onEditInvoice={editInvoice} />;
      case 'customer-contacts':
        return <CustomerContactsPage onUseContact={openNewInvoice} />;
      case 'invoice-history':
        return <InvoiceHistoryPage onEditInvoice={editInvoice} />;
      case 'salaries':
        return <SalariesPage />;
      case 'revenue-tracking':
        return <RevenueTrackingPage />;
      case 'expenses-income':
        return <ExpensesIncomePage />;
      default:
        return <DashboardPage onLowStockUpdate={setLowStockCount} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 md:block">
        <Sidebar
          currentPage={currentPage}
          onPageChange={changePage}
          lowStockCount={lowStockCount}
        />
      </aside>
      <main className="min-w-0 flex-1 md:pl-64">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t('openNavigation')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">{t('navigation')}</SheetTitle>
              <Sidebar
                currentPage={currentPage}
                onPageChange={changePage}
                lowStockCount={lowStockCount}
              />
            </SheetContent>
          </Sheet>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}
