'use client';

import { useEffect, useState } from 'react';
import { getElectronAPI } from '@/lib/electron-api';

const isRenderableSrc = (value: string) =>
  value.startsWith('data:') ||
  value.startsWith('http://') ||
  value.startsWith('https://') ||
  value.startsWith('blob:');

export function useFilePreview(filepath?: string | null) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!filepath) {
        setPreviewSrc(null);
        return;
      }

      if (isRenderableSrc(filepath)) {
        setPreviewSrc(filepath);
        return;
      }

      try {
        const api = getElectronAPI();
        if (!api?.file?.read) {
          setPreviewSrc(null);
          return;
        }

        const fileData = await api.file.read(filepath);
        if (!cancelled) {
          setPreviewSrc(fileData);
        }
      } catch (error) {
        console.error('[FilePreview] Error loading file preview:', error);
        if (!cancelled) {
          setPreviewSrc(null);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [filepath]);

  return previewSrc;
}
