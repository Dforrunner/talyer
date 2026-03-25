'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import DashboardPage from '@/components/pages/dashboard';
import InventoryPage from '@/components/pages/inventory';
import BusinessSettingsPage from '@/components/pages/business-settings';
import InvoiceCreatorPage from '@/components/pages/invoice-creator';
import InvoiceHistoryPage from '@/components/pages/invoice-history';
import RevenueTrackingPage from '@/components/pages/revenue-tracking';
import DataManagementPage from '@/components/pages/data-management';
import ExpensesIncomePage from '@/components/pages/expenses-income';
import { isElectron } from '@/lib/electron-api';

type Page = 'dashboard' | 'inventory' | 'business-settings' | 'invoices' | 'invoice-history' | 'revenue-tracking' | 'data-management' | 'expenses-income';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    // Check for low stock items on mount
    const checkLowStock = async () => {
      try {
        // Only attempt database query if we're in Electron
        if (!isElectron()) {
          console.log('[App] Not running in Electron, skipping database check');
          return;
        }

        const api = (window as any).electronAPI;
        if (!api?.database?.query) {
          console.log('[App] Database API not ready yet');
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

  const renderPage = () => {
    const handleNavigate = (page: Page) => {
      setCurrentPage(page);
    };

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onLowStockUpdate={setLowStockCount} onNavigate={handleNavigate} />;
      case 'inventory':
        return <InventoryPage onLowStockUpdate={setLowStockCount} />;
      case 'business-settings':
        return <BusinessSettingsPage />;
      case 'invoices':
        return <InvoiceCreatorPage />;
      case 'invoice-history':
        return <InvoiceHistoryPage />;
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
        onPageChange={setCurrentPage}
        lowStockCount={lowStockCount}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
