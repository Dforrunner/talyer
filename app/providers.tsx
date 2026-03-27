'use client';

import { AppDialogProvider } from '@/lib/app-dialog-context';
import { LanguageProvider } from '@/lib/language-context';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AppDialogProvider>{children}</AppDialogProvider>
    </LanguageProvider>
  );
}
