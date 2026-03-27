'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from '@/components/sidebar';
import { useAppDialog } from '@/hooks/use-app-dialog';
import { useLanguage } from '@/hooks/use-language';
import { type CustomerContactFields, type CustomerContactPrefill } from '@/lib/customer-contacts';
import { isElectron } from '@/lib/electron-api';

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

const InvoiceCreatorPage = dynamic(() => import('@/components/pages/invoice-creator'), {
  loading: () => <PageLoadingShell />,
});

const ActiveInvoicesPage = dynamic(() => import('@/components/pages/active-invoices'), {
  loading: () => <PageLoadingShell />,
});

const InvoiceHistoryPage = dynamic(() => import('@/components/pages/invoice-history'), {
  loading: () => <PageLoadingShell />,
});

const RevenueTrackingPage = dynamic(() => import('@/components/pages/revenue-tracking'), {
  loading: () => <PageLoadingShell />,
});

const DataManagementPage = dynamic(() => import('@/components/pages/data-management'), {
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
      case 'revenue-tracking':
        return <RevenueTrackingPage />;
      case 'expenses-income':
        return <ExpensesIncomePage />;
      case 'data-management':
        return <DataManagementPage />;
      default:
        return <DashboardPage onLowStockUpdate={setLowStockCount} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={changePage}
        lowStockCount={lowStockCount}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
