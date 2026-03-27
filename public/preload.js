const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    query: (sql, params) => ipcRenderer.invoke('database:query', sql, params),
    get: (sql, params) => ipcRenderer.invoke('database:get', sql, params),
    run: (sql, params) => ipcRenderer.invoke('database:run', sql, params),
    exec: (sql) => ipcRenderer.invoke('database:exec', sql),
  },
  
  // File operations
  file: {
    save: (filename, data, subdir) => ipcRenderer.invoke('file:save', filename, data, subdir),
    saveAs: (options) => ipcRenderer.invoke('file:save-as', options),
    saveCopy: (sourcePath, defaultFileName) =>
      ipcRenderer.invoke('file:save-copy', sourcePath, defaultFileName),
    exists: (filepath) => ipcRenderer.invoke('file:exists', filepath),
    read: (filepath) => ipcRenderer.invoke('file:read', filepath),
  },
  
  // PDF operations
  pdf: {
    generate: (invoiceData, businessData) => ipcRenderer.invoke('pdf:generate', invoiceData, businessData),
  },
  
  // Data import/export operations
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: (jsonData, shouldClear) => ipcRenderer.invoke('data:import', jsonData, shouldClear),
  },
  
  // App operations
  app: {
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },

  updates: {
    getState: () => ipcRenderer.invoke('updates:get-state'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatusChange: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updates:status', listener);
      return () => ipcRenderer.removeListener('updates:status', listener);
    },
  },
});
