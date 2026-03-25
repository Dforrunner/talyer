'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { safeDataExport, safeDataImport } from '@/lib/electron-api';

const DataManagementPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shouldClearData, setShouldClearData] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage(null);

      const jsonData = await safeDataExport();
      if (!jsonData) {
        throw new Error('Failed to export data');
      }

      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mechanic-shop-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: 'Failed to export data. Check console for details.' });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setMessage(null);

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const jsonData = event.target.result;
            
            // Validate JSON
            JSON.parse(jsonData);

            const result = await safeDataImport(jsonData, shouldClearData);
            if (result?.success) {
              setMessage({ type: 'success', text: 'Data imported successfully! Please refresh the application.' });
              setShouldClearData(false);
            } else {
              throw new Error(result?.message || 'Import failed');
            }
          } catch (error) {
            console.error('Import error:', error);
            setMessage({ type: 'error', text: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}` });
          } finally {
            setImporting(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      console.error('Import setup error:', error);
      setMessage({ type: 'error', text: 'Failed to open file dialog' });
      setImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data Management</h1>
        <p className="text-muted-foreground mt-1">Export and import your business data for backup and migration</p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Export Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Export Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download all your business data including products, invoices, and settings as a JSON file. 
          This creates a complete backup that can be imported on another computer.
        </p>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What gets exported:</strong> All products, invoices, customer information, business settings, and revenue history.
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
            size="lg"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export All Data'}
          </Button>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Import Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Restore data from a previously exported JSON file. You can choose to merge with existing data 
          or replace everything with the imported data.
        </p>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              <strong>Options:</strong>
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldClearData}
                onChange={(e) => setShouldClearData(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-amber-800">Replace all existing data (clear before importing)</span>
            </label>
            {!shouldClearData && (
              <p className="text-xs text-amber-700 mt-2">Unchecked: New data will be merged with existing records</p>
            )}
            {shouldClearData && (
              <p className="text-xs text-amber-700 mt-2">Checked: All existing data will be deleted before import</p>
            )}
          </div>
          <Button
            onClick={handleImport}
            disabled={importing}
            variant="outline"
            className="gap-2"
            size="lg"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Preparing...' : 'Import Data from File'}
          </Button>
        </div>
      </Card>

      {/* Instructions Section */}
      <Card className="p-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-4">How to Transfer Data Between Computers</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold mb-2">Step 1: On the Original Computer</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Open the Data Management page (this page)</li>
              <li>Click "Export All Data" button</li>
              <li>Save the JSON file to a safe location or USB drive</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold mb-2">Step 2: On the New Computer</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Install the Mechanic Shop Invoicing application</li>
              <li>Launch the application</li>
              <li>Open the Data Management page</li>
              <li>Click "Import Data from File"</li>
              <li>Select the JSON file you saved from the original computer</li>
              <li>If you want to replace all data, check the "Replace all existing data" option</li>
              <li>Click Import and wait for confirmation</li>
            </ol>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">
              <strong>Tip:</strong> Keep regular backups of your export file to prevent data loss.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataManagementPage;
