"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { useLanguage, type Language } from "@/hooks/use-language";
import {
  getElectronAPI,
  safeAppGetVersion,
  safeDataExport,
  safeDataImport,
  safeUpdatesCheck,
  safeUpdatesDownload,
  safeUpdatesGetState,
  safeUpdatesInstall,
} from "@/lib/electron-api";
import { getLocalDateInputValue } from "@/lib/date-utils";

interface UpdateState {
  status:
    | "idle"
    | "unsupported"
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  currentVersion: string | null;
  latestVersion: string | null;
  progress?: {
    percent?: number;
  } | null;
  releaseNotes?: string;
  message?: string;
}

const AppSettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { showAlert } = useAppDialog();
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [shouldClearData, setShouldClearData] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadUpdater = async () => {
      try {
        const [version, initialState] = await Promise.all([
          safeAppGetVersion(),
          safeUpdatesGetState(),
        ]);

        setAppVersion(version || "");
        setUpdateState(initialState);

        const api = getElectronAPI();
        if (api?.updates?.onStatusChange) {
          unsubscribe = api.updates.onStatusChange((nextState: UpdateState) => {
            setUpdateState(nextState);
          });
        }
      } catch (error) {
        console.error("[AppSettings] Error loading updater state:", error);
      }
    };

    void loadUpdater();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const getUpdateStatusText = () => {
    switch (updateState?.status) {
      case "unsupported":
        if (updateState.message === "disabled_in_development") {
          return t("updateUnsupportedDevelopment");
        }
        if (updateState.message === "portable_build_not_supported") {
          return t("updateUnsupportedPortable");
        }
        return t("updateUnsupportedPlatform");
      case "checking":
        return t("checkingForUpdates");
      case "available":
        return t("updateAvailableMessage");
      case "not-available":
        return t("appIsUpToDate");
      case "downloading":
        return t("downloadingUpdate");
      case "downloaded":
        return t("updateReadyToInstall");
      case "error":
        return updateState.message
          ? `${t("updateErrorGeneric")} ${updateState.message}`
          : t("updateErrorGeneric");
      case "idle":
      default:
        return t("updateStatusIdle");
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      const nextState = await safeUpdatesCheck();
      if (nextState) {
        setUpdateState(nextState);
      }
    } catch (error) {
      console.error("[AppSettings] Error checking updates:", error);
      await showAlert({ title: t("updateErrorGeneric"), confirmLabel: t("close") });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      const nextState = await safeUpdatesDownload();
      if (nextState) {
        setUpdateState(nextState);
      }
    } catch (error) {
      console.error("[AppSettings] Error downloading update:", error);
      await showAlert({ title: t("updateErrorGeneric"), confirmLabel: t("close") });
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await safeUpdatesInstall();
    } catch (error) {
      console.error("[AppSettings] Error installing update:", error);
      await showAlert({ title: t("updateErrorGeneric"), confirmLabel: t("close") });
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage(null);

      const jsonData = await safeDataExport();
      if (!jsonData) {
        throw new Error(t("exportNoData"));
      }

      const blob = new Blob([jsonData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shopflow-backup-${getLocalDateInputValue()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: "success", text: t("exportSuccess") });
    } catch (error) {
      console.error("[AppSettings] Export error:", error);
      setMessage({ type: "error", text: t("exportFailed") });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setMessage(null);

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          setImporting(false);
          return;
        }

        setImporting(true);

        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
          try {
            const jsonData = readerEvent.target?.result;
            if (typeof jsonData !== "string") {
              throw new Error(t("importFailed"));
            }

            JSON.parse(jsonData);

            const result = await safeDataImport(jsonData, shouldClearData);
            if (!result?.success) {
              throw new Error(result?.message || t("importFailed"));
            }

            setMessage({
              type: "success",
              text: result.restartRequired
                ? t("importSuccessRestarting")
                : t("importSuccessRefresh"),
            });
            setShouldClearData(false);

            if (result.restartRequired) {
              window.setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          } catch (error) {
            console.error("[AppSettings] Import error:", error);
            setMessage({
              type: "error",
              text: `${t("importFailed")}: ${
                error instanceof Error ? error.message : t("unknownError")
              }`,
            });
          } finally {
            setImporting(false);
          }
        };

        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      console.error("[AppSettings] Import setup error:", error);
      setMessage({ type: "error", text: t("fileDialogFailed") });
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("appSettings")}</h1>
        <p className="mt-1 text-muted-foreground">{t("appSettingsDesc")}</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("preferences")}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">{t("language")}</label>
            <select
              value={language}
              onChange={(event) =>
                void setLanguage(event.target.value as Language)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value="en">{t("english")}</option>
              <option value="tl">{t("tagalog")}</option>
            </select>
          </div>
        </div>
      </Card>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-semibold">{t("dataManagement")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("dataManagementDesc")}
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-base font-semibold">{t("exportData")}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("exportDataDesc")}
            </p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>{t("exportWhatGetsExported")}</strong> {t("exportIncludesAll")}
              </p>
            </div>
            <Button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="mt-4 gap-2"
              size="lg"
            >
              <Download className="h-4 w-4" />
              {exporting ? t("exportingData") : t("exportAllData")}
            </Button>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="mb-2 text-base font-semibold">{t("importData")}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("importDataDesc")}
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-sm text-amber-800">
                <strong>{t("importOptions")}</strong>
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={shouldClearData}
                  onChange={(event) => setShouldClearData(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-amber-800">
                  {t("replaceAllExistingData")}
                </span>
              </label>
              {!shouldClearData && (
                <p className="mt-2 text-xs text-amber-700">
                  {t("mergeExistingDataInfo")}
                </p>
              )}
              {shouldClearData && (
                <p className="mt-2 text-xs text-amber-700">
                  {t("clearExistingDataInfo")}
                </p>
              )}
            </div>
            <Button
              onClick={() => void handleImport()}
              disabled={importing}
              variant="outline"
              className="mt-4 gap-2"
              size="lg"
            >
              <Upload className="h-4 w-4" />
              {importing ? t("preparingImport") : t("importDataFromFile")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-semibold">{t("appUpdates")}</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {t("appUpdatesDesc")}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("currentVersion")}</p>
            <p className="mt-1 text-lg font-semibold">
              {appVersion || updateState?.currentVersion || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("availableVersion")}</p>
            <p className="mt-1 text-lg font-semibold">
              {updateState?.latestVersion || "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">{getUpdateStatusText()}</p>
          {updateState?.status === "downloading" && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("updateProgress")}: {Math.round(updateState.progress?.percent || 0)}%
            </p>
          )}
          {updateState?.releaseNotes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground">
                {t("updateReleaseNotes")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {updateState.releaseNotes}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => void handleCheckForUpdates()}
            disabled={updateState?.status === "checking"}
          >
            {updateState?.status === "checking"
              ? t("checkingForUpdates")
              : t("checkForUpdates")}
          </Button>
          {updateState?.status === "available" && (
            <Button onClick={() => void handleDownloadUpdate()}>
              {t("downloadUpdate")}
            </Button>
          )}
          {updateState?.status === "downloading" && (
            <Button disabled>{t("downloadingUpdate")}</Button>
          )}
          {updateState?.status === "downloaded" && (
            <Button onClick={() => void handleInstallUpdate()}>
              {t("installUpdateNow")}
            </Button>
          )}
        </div>
      </Card>

      <Card className="bg-muted/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t("transferDataBetweenComputers")}
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-semibold">{t("step1OriginalComputer")}</p>
            <ol className="ml-2 list-inside list-decimal space-y-1 text-muted-foreground">
              <li>{t("openDataManagementPage")}</li>
              <li>{t("clickExportAllData")}</li>
              <li>{t("saveJsonFile")}</li>
            </ol>
          </div>
          <div>
            <p className="mb-2 font-semibold">{t("step2NewComputer")}</p>
            <ol className="ml-2 list-inside list-decimal space-y-1 text-muted-foreground">
              <li>{t("installApplication")}</li>
              <li>{t("launchApplication")}</li>
              <li>{t("openDataManagementPage")}</li>
              <li>{t("clickImportDataFromFile")}</li>
              <li>{t("selectBackupFile")}</li>
              <li>{t("ifReplaceCheckOption")}</li>
              <li>{t("clickImportWaitConfirm")}</li>
            </ol>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800">
              <strong>{t("backupTip")}</strong> {t("keepRegularBackups")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppSettingsPage;
