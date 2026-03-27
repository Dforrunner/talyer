'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import DashboardPage from '@/components/pages/dashboard';
import InventoryPage from '@/components/pages/inventory';
import BusinessSettingsPage from '@/components/pages/business-settings';
import InvoiceCreatorPage from '@/components/pages/invoice-creator';
import ActiveInvoicesPage from '@/components/pages/active-invoices';
import InvoiceHistoryPage from '@/components/pages/invoice-history';
import RevenueTrackingPage from '@/components/pages/revenue-tracking';
import DataManagementPage from '@/components/pages/data-management';
import ExpensesIncomePage from '@/components/pages/expenses-income';
import CustomerContactsPage from '@/components/pages/customer-contacts';
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

  const renderPage = () => {
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
