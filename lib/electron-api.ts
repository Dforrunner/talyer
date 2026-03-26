// Safe wrapper for accessing Electron APIs with fallbacks for development
export const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};

export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
};

// Wait for electron API to be ready
export const waitForElectronAPI = (timeoutMs = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      resolve(window.electronAPI);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        clearInterval(checkInterval);
        resolve(window.electronAPI);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('Electron API not available after timeout'));
      }
    }, 100);
  });
};

// Safe database query wrapper
export const safeDbQuery = async (sql: string, params: any[] = []) => {
  try {
    const api = getElectronAPI();
    if (!api?.database?.query) {
      console.warn('[DB] Database API not available, returning empty result');
      return [];
    }
    return await api.database.query(sql, params);
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
};

// Safe database get wrapper
export const safeDbGet = async (sql: string, params: any[] = []) => {
  try {
    const api = getElectronAPI();
    if (!api?.database?.get) {
      console.warn('[DB] Database API not available, returning null');
      return null;
    }
    return await api.database.get(sql, params);
  } catch (error) {
    console.error('[DB] Get error:', error);
    throw error;
  }
};

// Safe database run wrapper
export const safeDbRun = async (sql: string, params: any[] = []) => {
  try {
    const api = getElectronAPI();
    if (!api?.database?.run) {
      console.warn('[DB] Database API not available, returning null');
      return null;
    }
    return await api.database.run(sql, params);
  } catch (error) {
    console.error('[DB] Run error:', error);
    throw error;
  }
};

// Safe file operations
export interface FileSaveDialogOptions {
  defaultFileName: string;
  data: any;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export const safeFileExists = async (filepath: string) => {
  try {
    const api = getElectronAPI();
    if (!api?.file?.exists) {
      console.warn('[File] File API not available');
      return false;
    }
    return await api.file.exists(filepath);
  } catch (error) {
    console.error('[File] Exists check error:', error);
    return false;
  }
};

// Safe file save
export const safeFileSave = async (filename: string, data: any, subdir?: string) => {
  try {
    const api = getElectronAPI();
    if (!api?.file?.save) {
      console.warn('[File] File API not available');
      return null;
    }
    return await api.file.save(filename, data, subdir);
  } catch (error) {
    console.error('[File] Save error:', error);
    throw error;
  }
};

export const safeFileSaveAs = async (options: FileSaveDialogOptions) => {
  try {
    const api = getElectronAPI();
    if (!api?.file?.saveAs) {
      console.warn('[File] File save-as API not available');
      return null;
    }
    return await api.file.saveAs(options);
  } catch (error) {
    console.error('[File] Save-as error:', error);
    throw error;
  }
};

// Safe PDF generation
export const safePdfGenerate = async (invoiceData: any, businessData: any) => {
  try {
    const api = getElectronAPI();
    if (!api?.pdf?.generate) {
      console.warn('[PDF] PDF API not available');
      return null;
    }
    return await api.pdf.generate(invoiceData, businessData);
  } catch (error) {
    console.error('[PDF] Generate error:', error);
    throw error;
  }
};

// Safe data export
export const safeDataExport = async () => {
  try {
    const api = getElectronAPI();
    if (!api?.data?.export) {
      console.warn('[Data] Export API not available');
      return null;
    }
    return await api.data.export();
  } catch (error) {
    console.error('[Data] Export error:', error);
    throw error;
  }
};

// Safe data import
export const safeDataImport = async (jsonData: string, shouldClear: boolean = false) => {
  try {
    const api = getElectronAPI();
    if (!api?.data?.import) {
      console.warn('[Data] Import API not available');
      return null;
    }
    return await api.data.import(jsonData, shouldClear);
  } catch (error) {
    console.error('[Data] Import error:', error);
    throw error;
  }
};
