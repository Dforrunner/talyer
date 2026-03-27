"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AppBrand } from "@/components/ui/app-brand";
import { useLanguage } from "@/hooks/use-language";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DialogVariant = "default" | "destructive";

interface DialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

type DialogState =
  | ({
      kind: "alert" | "confirm";
      resolve: (value: boolean) => void;
    } & DialogOptions)
  | null;

interface AppDialogContextValue {
  showAlert: (options: DialogOptions) => Promise<void>;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [dialogState, setDialogState] = useState<DialogState>(null);

  const closeDialog = (result: boolean) => {
    setDialogState((current) => {
      current?.resolve(result);
      return null;
    });
  };

  const value = useMemo<AppDialogContextValue>(
    () => ({
      showAlert: (options) =>
        new Promise<void>((resolve) => {
          setDialogState({
            kind: "alert",
            title: options.title,
            description: options.description,
            confirmLabel: options.confirmLabel,
            cancelLabel: options.cancelLabel,
            variant: options.variant,
            resolve: () => resolve(),
          });
        }),
      showConfirm: (options) =>
        new Promise<boolean>((resolve) => {
          setDialogState({
            kind: "confirm",
            title: options.title,
            description: options.description,
            confirmLabel: options.confirmLabel,
            cancelLabel: options.cancelLabel,
            variant: options.variant,
            resolve,
          });
        }),
    }),
    [],
  );

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AlertDialog
        open={Boolean(dialogState)}
        onOpenChange={(open) => {
          if (!open && dialogState) {
            closeDialog(false);
          }
        }}
      >
        {dialogState && (
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-left">
              <AppBrand />
              <div className="space-y-2">
                <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
                {dialogState.description ? (
                  <AlertDialogDescription>
                    {dialogState.description}
                  </AlertDialogDescription>
                ) : null}
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {dialogState.kind === "confirm" ? (
                <AlertDialogCancel onClick={() => closeDialog(false)}>
                  {dialogState.cancelLabel || t("cancel")}
                </AlertDialogCancel>
              ) : null}
              <AlertDialogAction
                onClick={() => closeDialog(true)}
                className={
                  dialogState.variant === "destructive"
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : undefined
                }
              >
                {dialogState.confirmLabel ||
                  (dialogState.kind === "confirm" ? t("confirm") : t("close"))}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }

  return context;
}
