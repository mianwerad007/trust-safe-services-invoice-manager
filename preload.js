const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    login: (creds) => ipcRenderer.invoke('login', creds),
    getUsers: () => ipcRenderer.invoke('get-users'),
    addUser: (data) => ipcRenderer.invoke('add-user', data),
    deleteUser: (data) => ipcRenderer.invoke('delete-user', data), // Passed data object for log
    
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    
    getCustomers: () => ipcRenderer.invoke('get-customers'),
    addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
    updateCustomer: (data) => ipcRenderer.invoke('update-customer', data),
    deleteCustomer: (data) => ipcRenderer.invoke('delete-customer', data),
    
    getItems: () => ipcRenderer.invoke('get-items'),
    addItem: (data) => ipcRenderer.invoke('add-item', data),
    updateItem: (data) => ipcRenderer.invoke('update-item', data),
    deleteItem: (data) => ipcRenderer.invoke('delete-item', data),

    // --- NEW: Services (non-stock charges like labour/installation) ---
    getServices: () => ipcRenderer.invoke('get-services'),
    addService: (data) => ipcRenderer.invoke('add-service', data),
    updateService: (data) => ipcRenderer.invoke('update-service', data),
    deleteService: (data) => ipcRenderer.invoke('delete-service', data),

    // --- NEW: Product Groups / Bundles ---
    getGroups: () => ipcRenderer.invoke('get-groups'),
    saveGroup: (data) => ipcRenderer.invoke('save-group', data),
    updateGroup: (data) => ipcRenderer.invoke('update-group', data),
    deleteGroup: (id) => ipcRenderer.invoke('delete-group', id),
    
    getLastInvoice: () => ipcRenderer.invoke('get-last-invoice'),
    saveInvoice: (data) => ipcRenderer.invoke('save-invoice', data),
    getInvoices: () => ipcRenderer.invoke('get-invoices'),
    getInvoiceDetails: (id) => ipcRenderer.invoke('get-invoice-details', id),
    
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (data) => ipcRenderer.invoke('save-settings', data),

    // --- NEW FEATURES ---
    getLogs: () => ipcRenderer.invoke('get-logs'),
    
    // Quotations
    saveQuotation: (data) => ipcRenderer.invoke('save-quotation', data),
    getQuotations: () => ipcRenderer.invoke('get-quotations'),
    getQuotationDetails: (id) => ipcRenderer.invoke('get-quotation-details', id),
    deleteQuotation: (id) => ipcRenderer.invoke('delete-quotation', id),

    // Data Management
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    restoreDatabase: () => ipcRenderer.invoke('restore-database'),
    exportInvoices: () => ipcRenderer.invoke('export-invoices')
});