# Debugging Guide

## Opening Developer Tools

### While App is Running
1. Press **F12** to open Developer Tools
2. Look at **Console** tab for messages
3. All errors prefixed with `[Tag]` for easy filtering

## Error Message Prefixes

Use these to find where errors occur:

```
[DB]                - Database query errors
[File]              - File read/write errors
[PDF]               - PDF generation errors
[App]               - General app errors
[InvoiceCreator]    - Invoice form errors
[BusinessSettings]  - Settings page errors
[InvoiceHistory]    - Invoice list errors
```

### Filter Console by Prefix
```javascript
// Show only database errors
console.log("%cShow only [DB] messages", "color: blue");

// Search in console: Ctrl+F, type [DB]
```

## Common Issues & Solutions

### Issue: "Cannot read properties of undefined (reading 'database')"

**Cause:** Electron API not yet initialized
**Solution:** Check preload.js is being loaded
```bash
# Check if preload path is correct in electron.js
grep "preload:" public/electron.js
```

**Check in Console:**
```javascript
console.log(window.electronAPI ? 'API Ready' : 'API Missing');
```

### Issue: Database Not Creating

**Check:**
1. Is userData directory created?
```javascript
// In console
window.electronAPI.app.getPath('userData').then(p => console.log('Data path:', p));
```

2. Are table creation commands running?
```javascript
// Check if tables exist
window.electronAPI.database.query("SELECT name FROM sqlite_master WHERE type='table'")
  .then(t => console.log('Tables:', t));
```

### Issue: Empty Data Causes Crash

**Solution:** All queries now return safe defaults
- Queries return `[]` not `undefined`
- Gets return `null` not `undefined`
- Components initialize with safe values

**Check:**
```javascript
// Should return empty array, not error
window.electronAPI.database.query('SELECT * FROM products')
  .then(r => console.log('Result:', r, 'Is array:', Array.isArray(r)));
```

### Issue: Logo Not Saving

**Check:**
1. Logo path is being set:
```javascript
// Open business settings page
// Open console
// Check logo_path in localStorage or indexedDB
```

2. File save is working:
```javascript
window.electronAPI.file.save('test.txt', 'test data')
  .then(path => console.log('Saved to:', path))
  .catch(e => console.error('Save error:', e));
```

### Issue: PDF Not Generating

**Check:**
1. PDF directory exists:
```javascript
// Check if invoices directory created
window.electronAPI.app.getPath('userData')
  .then(p => {
    const fs = require('fs');
    const invoicesDir = p + '/invoices';
    console.log('Invoices dir exists:', fs.existsSync(invoicesDir));
  });
```

2. PDF generation call succeeds:
```javascript
// Check PDF generation
window.electronAPI.pdf.generate(
  {
    invoice_number: 'TEST-001',
    customer_name: 'Test',
    items: [],
    subtotal: 100,
    tax_amount: 0,
    total: 100
  },
  { business_name: 'Test Shop' }
).then(path => console.log('PDF created:', path))
  .catch(e => console.error('PDF error:', e));
```

## Console Testing Commands

### Test Database Connection
```javascript
// Test query
window.electronAPI.database.query('SELECT 1')
  .then(() => console.log('✓ DB Connected'))
  .catch(e => console.error('✗ DB Error:', e));
```

### Test File Operations
```javascript
// Test file save
window.electronAPI.file.save('test.txt', 'Hello World')
  .then(path => console.log('✓ File saved:', path))
  .catch(e => console.error('✗ File error:', e));

// Test file exists
window.electronAPI.file.exists('/path/to/file')
  .then(exists => console.log('✓ File exists:', exists))
  .catch(e => console.error('✗ Check error:', e));
```

### Test App Paths
```javascript
// Get user data path
window.electronAPI.app.getPath('userData')
  .then(p => console.log('User data path:', p));

// Get desktop path
window.electronAPI.app.getPath('desktop')
  .then(p => console.log('Desktop path:', p));
```

## Checking Database State

### View All Products
```javascript
window.electronAPI.database.query('SELECT * FROM products')
  .then(products => console.table(products));
```

### View All Invoices
```javascript
window.electronAPI.database.query('SELECT * FROM invoices')
  .then(invoices => console.table(invoices));
```

### View Business Settings
```javascript
window.electronAPI.database.get('SELECT * FROM business_settings LIMIT 1')
  .then(settings => console.log('Settings:', settings));
```

### Check Low Stock Items
```javascript
window.electronAPI.database.query(
  'SELECT name, quantity_in_stock, low_stock_threshold FROM products WHERE quantity_in_stock <= low_stock_threshold'
).then(items => console.table(items));
```

## Checking Safe Wrapper Functions

### Test Safe DB Query
```javascript
// Should never throw, returns [] on error
const safeQuery = async (sql) => {
  try {
    const api = window.electronAPI;
    if (!api?.database?.query) {
      console.warn('API not available');
      return [];
    }
    return await api.database.query(sql);
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

safeQuery('SELECT * FROM products')
  .then(r => console.log('Safe result:', r));
```

### Check if Electron API Ready
```javascript
const checkAPI = setInterval(() => {
  if (window.electronAPI) {
    console.log('✓ Electron API Ready');
    console.log('Database API:', window.electronAPI.database ? 'Ready' : 'Missing');
    console.log('File API:', window.electronAPI.file ? 'Ready' : 'Missing');
    console.log('PDF API:', window.electronAPI.pdf ? 'Ready' : 'Missing');
    clearInterval(checkAPI);
  } else {
    console.log('... waiting for Electron API');
  }
}, 100);

// Stop after 5 seconds
setTimeout(() => clearInterval(checkAPI), 5000);
```

## Performance Monitoring

### Check Component Load Time
```javascript
// In console, right before loading component
const start = performance.now();

// Then after component loads
const end = performance.now();
console.log(`Load time: ${(end - start).toFixed(0)}ms`);
```

### Check Memory Usage
```javascript
if (performance.memory) {
  console.log('Memory:', {
    used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
    limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    percentage: `${((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)}%`
  });
}
```

## Viewing Application Logs

### Check All Console Errors
```javascript
// Copy all errors to clipboard
copy(
  Array.from(document.querySelectorAll('*'))
    .filter(el => el.innerText?.includes('Error'))
    .map(el => el.innerText)
    .join('\n')
);
```

### Export Logs
```javascript
// Copy to file
const logs = [];
const originalLog = console.log;
console.log = function(...args) {
  logs.push(args.join(' '));
  originalLog.apply(console, args);
};

// Then copy logs
copy(logs.join('\n'));
```

## Verifying Production Readiness

### Quick Health Check
```javascript
async function healthCheck() {
  console.log('Starting health check...');
  
  try {
    // Check API
    if (!window.electronAPI) throw new Error('API not available');
    console.log('✓ Electron API available');
    
    // Check database
    const dbCheck = await window.electronAPI.database.query('SELECT 1');
    console.log('✓ Database connected');
    
    // Check business settings
    const settings = await window.electronAPI.database.get('SELECT * FROM business_settings LIMIT 1');
    console.log('✓ Business settings:', settings?.business_name || 'Not configured');
    
    // Check products
    const products = await window.electronAPI.database.query('SELECT COUNT(*) as count FROM products');
    console.log('✓ Products:', products[0]?.count || 0);
    
    // Check invoices
    const invoices = await window.electronAPI.database.query('SELECT COUNT(*) as count FROM invoices');
    console.log('✓ Invoices:', invoices[0]?.count || 0);
    
    console.log('✅ Health check passed!');
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

healthCheck();
```

## Getting Help

If issues persist:
1. **Check PRODUCTION_READINESS.md** for known issues
2. **Read CHANGES_MADE.md** to understand modifications
3. **Review this guide** for debugging steps
4. **Check console logs** with [prefix] tags
5. **Test with console commands** above

## Reporting Issues

When reporting issues, include:
1. Operating system and version
2. Steps to reproduce
3. Screenshot of error
4. Console log output (copy with [prefix] filters)
5. Result of health check above
