'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { safeDataExport, safeDataImport } from '@/lib/electron-api';
import { getLocalDateInputValue } from '@/lib/date-utils';

const DataManagementPage: React.FC = () => {
  const { t } = useLanguage();
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
        throw new Error(t('exportNoData'));
      }

      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shopflow-backup-${getLocalDateInputValue()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: t('exportSuccess') });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: t('exportFailed') });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setMessage(null);

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          setImporting(false);
          return;
        }

        setImporting(true);

        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const jsonData = event.target.result;
            
            // Validate JSON
            JSON.parse(jsonData);

            const result = await safeDataImport(jsonData, shouldClearData);
            if (result?.success) {
              setMessage({
                type: 'success',
                text: result.restartRequired ? t('importSuccessRestarting') : t('importSuccessRefresh'),
              });
              setShouldClearData(false);
              if (result.restartRequired) {
                window.setTimeout(() => {
                  window.location.reload();
                }, 1200);
              }
            } else {
              throw new Error(result?.message || t('importFailed'));
            }
          } catch (error) {
            console.error('Import error:', error);
            setMessage({
              type: 'error',
              text: `${t('importFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`,
            });
          } finally {
            setImporting(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      console.error('Import setup error:', error);
      setMessage({ type: 'error', text: t('fileDialogFailed') });
      setImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('dataManagement')}</h1>
        <p className="text-muted-foreground mt-1">{t('dataManagementDesc')}</p>
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
        <h2 className="text-lg font-semibold mb-2">{t('exportData')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('exportDataDesc')}</p>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{t('exportWhatGetsExported')}</strong> {t('exportIncludesAll')}
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
            size="lg"
          >
            <Download className="w-4 h-4" />
            {exporting ? t('exportingData') : t('exportAllData')}
          </Button>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">{t('importData')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('importDataDesc')}</p>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              <strong>{t('importOptions')}</strong>
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldClearData}
                onChange={(e) => setShouldClearData(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-amber-800">{t('replaceAllExistingData')}</span>
            </label>
            {!shouldClearData && (
              <p className="text-xs text-amber-700 mt-2">{t('mergeExistingDataInfo')}</p>
            )}
            {shouldClearData && (
              <p className="text-xs text-amber-700 mt-2">{t('clearExistingDataInfo')}</p>
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
            {importing ? t('preparingImport') : t('importDataFromFile')}
          </Button>
        </div>
      </Card>

      {/* Instructions Section */}
      <Card className="p-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-4">{t('transferDataBetweenComputers')}</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold mb-2">{t('step1OriginalComputer')}</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>{t('openDataManagementPage')}</li>
              <li>{t('clickExportAllData')}</li>
              <li>{t('saveJsonFile')}</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold mb-2">{t('step2NewComputer')}</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>{t('installApplication')}</li>
              <li>{t('launchApplication')}</li>
              <li>{t('openDataManagementPage')}</li>
              <li>{t('clickImportDataFromFile')}</li>
              <li>{t('selectBackupFile')}</li>
              <li>{t('ifReplaceCheckOption')}</li>
              <li>{t('clickImportWaitConfirm')}</li>
            </ol>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">
              <strong>{t('backupTip')}</strong> {t('keepRegularBackups')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataManagementPage;
