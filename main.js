const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { db, initDatabase } = require('./database');

// Handle installation/setup events
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize Database
initDatabase();

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'favicon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// --- HELPER: AUDIT LOG ---
function logActivity(username, action, details) {
    db.run("INSERT INTO logs (username, action, details) VALUES (?,?,?)", [username, action, details]);
}

// --- API HANDLERS ---

// 1. Auth & Users
ipcMain.handle('login', async (e, {user, pass}) => {
    return new Promise((resolve) => {
        db.get("SELECT * FROM users WHERE username=? AND password=?", [user, pass], (err, row) => {
            if (row) {
                const perms = JSON.parse(row.permissions || '[]');
                logActivity(row.username, 'Login', 'User logged in');
                resolve({ success: true, role: row.role, username: row.username, permissions: perms });
            } else {
                resolve({ success: false });
            }
        });
    });
});

ipcMain.handle('get-users', () => new Promise(resolve => db.all("SELECT id, username, role, permissions FROM users", (err, rows) => resolve(rows))));

ipcMain.handle('add-user', (e, data) => new Promise(resolve => {
    const permString = JSON.stringify(data.permissions);
    db.run("INSERT INTO users (username, password, role, permissions) VALUES (?,?,?,?)", 
        [data.username, data.password, data.role, permString], 
        function() { 
            logActivity('Admin', 'Add User', `Created user: ${data.username}`);
            resolve(this.lastID); 
        }
    );
}));

ipcMain.handle('delete-user', (e, {id, adminName}) => new Promise(resolve => {
    db.run("DELETE FROM users WHERE id=?", [id], () => {
        logActivity(adminName, 'Delete User', `Deleted user ID: ${id}`);
        resolve(true);
    });
}));

// 2. Dashboard Stats (Added Low Stock)
ipcMain.handle('get-dashboard-stats', async () => {
    const getCount = (query) => new Promise((resolve) => db.get(query, (err, row) => resolve(row ? row.count : 0)));
    const getTotal = (query) => new Promise((resolve) => db.get(query, (err, row) => resolve(row ? row.total : 0)));
    const getChart = (query) => new Promise((resolve) => db.all(query, (err, rows) => resolve(rows || [])));

    try {
        const customers = await getCount("SELECT COUNT(*) as count FROM customers");
        const items = await getCount("SELECT COUNT(*) as count FROM items");
        const invoices = await getCount("SELECT COUNT(*) as count FROM invoices");
        const sales = await getTotal("SELECT SUM(grand_total) as total FROM invoices");
        const lowStock = await getCount("SELECT COUNT(*) as count FROM items WHERE stock <= 10"); // LOW STOCK ALERT
        
        const chartData = await getChart(`SELECT strftime('%m-%Y', date) as month, SUM(grand_total) as total FROM invoices GROUP BY month ORDER BY date DESC LIMIT 6`);

        return { customers, items, invoices, sales: sales || 0, lowStock, chartData };
    } catch (error) {
        return { customers: 0, items: 0, invoices: 0, sales: 0, lowStock: 0, chartData: [] };
    }
});

// 3. Customers
ipcMain.handle('get-customers', () => new Promise(resolve => db.all("SELECT * FROM customers ORDER BY id DESC", (err, rows) => resolve(rows))));
ipcMain.handle('add-customer', (e, d) => new Promise(resolve => db.run("INSERT INTO customers (name, phone, email, address) VALUES (?,?,?,?)", [d.name, d.phone, d.email, d.address], function() { resolve(this.lastID); })));
ipcMain.handle('update-customer', (e, d) => new Promise(resolve => db.run("UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?", [d.name, d.phone, d.email, d.address, d.id], () => resolve(true))));
ipcMain.handle('delete-customer', (e, {id, user}) => new Promise(resolve => db.run("DELETE FROM customers WHERE id=?", [id], () => {
    logActivity(user, 'Delete Customer', `Deleted customer ID: ${id}`);
    resolve(true);
})));

// 4. Items
ipcMain.handle('get-items', () => new Promise(resolve => db.all("SELECT * FROM items ORDER BY id DESC", (err, rows) => resolve(rows))));
ipcMain.handle('add-item', (e, d) => new Promise(resolve => db.run("INSERT INTO items (name, description, unit, price, stock, image) VALUES (?,?,?,?,?,?)", [d.name, d.desc, d.unit, d.price, d.stock, d.image || null], function() { resolve(this.lastID); })));
ipcMain.handle('update-item', (e, d) => new Promise(resolve => db.run("UPDATE items SET name=?, description=?, unit=?, price=?, stock=?, image=? WHERE id=?", [d.name, d.desc, d.unit, d.price, d.stock, d.image || null, d.id], () => resolve(true))));
ipcMain.handle('delete-item', (e, {id, user}) => new Promise(resolve => db.run("DELETE FROM items WHERE id=?", [id], () => {
    logActivity(user, 'Delete Item', `Deleted item ID: ${id}`);
    resolve(true);
})));

// 4b. NEW: Services (labour / installation / non-stock charges)
ipcMain.handle('get-services', () => new Promise(resolve => db.all("SELECT * FROM services ORDER BY id DESC", (err, rows) => resolve(rows))));
ipcMain.handle('add-service', (e, d) => new Promise(resolve => db.run("INSERT INTO services (name, description, price) VALUES (?,?,?)", [d.name, d.desc, d.price], function() { resolve(this.lastID); })));
ipcMain.handle('update-service', (e, d) => new Promise(resolve => db.run("UPDATE services SET name=?, description=?, price=? WHERE id=?", [d.name, d.desc, d.price, d.id], () => resolve(true))));
ipcMain.handle('delete-service', (e, {id, user}) => new Promise(resolve => db.run("DELETE FROM services WHERE id=?", [id], () => {
    logActivity(user, 'Delete Service', `Deleted service ID: ${id}`);
    resolve(true);
})));

// 4c. NEW: Product Groups / Bundles (e.g. "CCTV 4 Channel Kit" made up of several items)
ipcMain.handle('get-groups', () => new Promise(resolve => {
    db.all("SELECT * FROM product_groups ORDER BY id DESC", (err, groups) => {
        if (!groups || groups.length === 0) return resolve([]);
        let remaining = groups.length;
        groups.forEach(g => {
            db.all(
                `SELECT pgi.item_id, pgi.qty, items.name, items.price, items.unit, items.stock
                 FROM product_group_items pgi LEFT JOIN items ON items.id = pgi.item_id
                 WHERE pgi.group_id = ?`,
                [g.id],
                (e2, rows) => {
                    g.items = rows || [];
                    remaining--;
                    if (remaining === 0) resolve(groups);
                }
            );
        });
    });
}));
ipcMain.handle('save-group', (e, d) => new Promise(resolve => {
    db.run("INSERT INTO product_groups (name, description) VALUES (?,?)", [d.name, d.description], function (err) {
        if (err) return resolve(false);
        const groupId = this.lastID;
        const stmt = db.prepare("INSERT INTO product_group_items (group_id, item_id, qty) VALUES (?,?,?)");
        (d.items || []).forEach(i => stmt.run(groupId, i.id, i.qty));
        stmt.finalize(() => resolve(groupId));
    });
}));
ipcMain.handle('update-group', (e, d) => new Promise(resolve => {
    db.run("UPDATE product_groups SET name=?, description=? WHERE id=?", [d.name, d.description, d.id], (err) => {
        if (err) return resolve(false);
        db.run("DELETE FROM product_group_items WHERE group_id=?", [d.id], () => {
            const stmt = db.prepare("INSERT INTO product_group_items (group_id, item_id, qty) VALUES (?,?,?)");
            (d.items || []).forEach(i => stmt.run(d.id, i.id, i.qty));
            stmt.finalize(() => resolve(true));
        });
    });
}));
ipcMain.handle('delete-group', (e, id) => new Promise(resolve => {
    db.run("DELETE FROM product_group_items WHERE group_id=?", [id], () => {
        db.run("DELETE FROM product_groups WHERE id=?", [id], () => resolve(true));
    });
}));

// 5. Invoices (Updated for Tax/Service)
ipcMain.handle('get-last-invoice', () => new Promise(resolve => db.get("SELECT invoice_no FROM invoices ORDER BY id DESC LIMIT 1", (err, row) => resolve(row))));

ipcMain.handle('save-invoice', (e, data) => new Promise((resolve) => {
    db.run("INSERT INTO invoices (customer_id, invoice_no, date, subtotal, discount_percent, discount_amount, tax_percent, service_charge, grand_total) VALUES (?,?,?,?,?,?,?,?,?)", 
        [data.customer_id, data.invoice_no, data.date, data.subtotal, data.discount_percent, data.discount_amount, data.tax, data.service, data.grand_total], 
        function(err) {
            if(err) { console.log(err); resolve(false); return; }
            const invId = this.lastID;
            const insertItem = db.prepare("INSERT INTO invoice_items (invoice_id, item_name, description, qty, price, total, group_components) VALUES (?,?,?,?,?,?,?)");
            const updateStock = db.prepare("UPDATE items SET stock = stock - ? WHERE id = ?");

            data.items.forEach(i => {
                const qty = parseFloat(i.qty) || 0;
                const compJson = (i.components && i.components.length) ? JSON.stringify(i.components) : null;
                insertItem.run(invId, i.name, i.desc, qty, i.price, i.total, compJson);

                // CHANGED: a "group/kit" line deducts stock from each of its component items instead of itself
                if (i.components && i.components.length) {
                    i.components.forEach(c => { if (c.id) updateStock.run((parseFloat(c.qty) || 0) * qty, c.id); });
                } else if (i.id) {
                    updateStock.run(qty, i.id);
                }
            });

            insertItem.finalize();
            updateStock.finalize();
            logActivity(data.user, 'Create Invoice', `Created Invoice #${data.invoice_no} Amount: ${data.grand_total}`);
            resolve(invId);
        }
    );
}));

ipcMain.handle('get-invoices', () => new Promise(resolve => {
    db.all(`SELECT invoices.*, customers.name as customer_name FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id ORDER BY invoices.id DESC`, (err, rows) => resolve(rows));
}));

ipcMain.handle('get-invoice-details', (e, id) => {
    return new Promise((resolve) => {
        db.get(`SELECT invoices.*, customers.name as customer_name, customers.phone, customers.address FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id WHERE invoices.id = ?`, [id], (err, invoice) => {
            if (!invoice) return resolve(null);
            db.all("SELECT * FROM invoice_items WHERE invoice_id = ?", [id], (err, items) => {
                invoice.items = items; 
                resolve(invoice);
            });
        });
    });
});

// 6. Settings
ipcMain.handle('get-settings', () => new Promise(resolve => db.get("SELECT * FROM company_settings LIMIT 1", (err, row) => resolve(row || {}))));
ipcMain.handle('save-settings', (e, d) => new Promise(resolve => {
    db.run("DELETE FROM company_settings");
    db.run("INSERT INTO company_settings (name, address, phone, email, logo) VALUES (?,?,?,?,?)", [d.name, d.address, d.phone, d.email, d.logo], () => resolve(true));
}));

// --- NEW FEATURE: QUOTATIONS ---
ipcMain.handle('save-quotation', (e, data) => new Promise((resolve) => {
    db.run("INSERT INTO quotations (customer_id, quotation_no, date, subtotal, discount_percent, discount_amount, tax_percent, service_charge, grand_total) VALUES (?,?,?,?,?,?,?,?,?)", 
        [data.customer_id, data.quotation_no, data.date, data.subtotal, data.discount_percent, data.discount_amount, data.tax, data.service, data.grand_total], 
        function(err) {
            if(err) { resolve(false); return; }
            const qId = this.lastID;
            const insertItem = db.prepare("INSERT INTO quotation_items (quotation_id, item_name, description, qty, price, total, group_components) VALUES (?,?,?,?,?,?,?)");
            data.items.forEach(i => {
                const compJson = (i.components && i.components.length) ? JSON.stringify(i.components) : null;
                insertItem.run(qId, i.name, i.desc, i.qty, i.price, i.total, compJson);
            });
            insertItem.finalize();
            logActivity(data.user, 'Create Quotation', `Created Quote #${data.quotation_no}`);
            resolve(qId);
        }
    );
}));

ipcMain.handle('get-quotations', () => new Promise(resolve => {
    db.all(`SELECT quotations.*, customers.name as customer_name FROM quotations LEFT JOIN customers ON quotations.customer_id = customers.id ORDER BY quotations.id DESC`, (err, rows) => resolve(rows));
}));

ipcMain.handle('get-quotation-details', (e, id) => new Promise(resolve => {
    db.get(`SELECT quotations.*, customers.name as customer_name, customers.phone, customers.address FROM quotations LEFT JOIN customers ON quotations.customer_id = customers.id WHERE quotations.id = ?`, [id], (err, quote) => {
        if (!quote) return resolve(null);
        db.all("SELECT * FROM quotation_items WHERE quotation_id = ?", [id], (err, items) => {
            quote.items = items; resolve(quote);
        });
    });
}));

ipcMain.handle('delete-quotation', (e, id) => new Promise(resolve => {
    db.run("DELETE FROM quotation_items WHERE quotation_id=?", [id], () => {
        db.run("DELETE FROM quotations WHERE id=?", [id], () => resolve(true));
    });
}));

// --- NEW FEATURE: LOGS ---
ipcMain.handle('get-logs', () => new Promise(resolve => db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", (err, rows) => resolve(rows))));

// --- NEW FEATURE: DATA MANAGEMENT ---
ipcMain.handle('backup-database', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: 'invoice_backup.db',
        filters: [{ name: 'Database', extensions: ['db'] }]
    });
    if (filePath) {
        const dbPath = path.join(app.getPath('userData'), 'invoice_system_v6.db');
        fs.copyFileSync(dbPath, filePath);
        return true;
    }
    return false;
});

ipcMain.handle('export-invoices', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Export Invoices',
        defaultPath: 'invoices_export.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    
    if (filePath) {
        db.all("SELECT invoices.*, customers.name FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id", (err, rows) => {
            if(!rows) return;
            const header = "InvoiceNo,Date,Customer,Subtotal,Discount,Tax,ServiceCharge,GrandTotal\n";
            const content = rows.map(r => `${r.invoice_no},${r.date},${r.name},${r.subtotal},${r.discount_amount},${r.tax_percent},${r.service_charge},${r.grand_total}`).join("\n");
            fs.writeFileSync(filePath, header + content);
        });
        return true;
    }
    return false;
});
ipcMain.handle('restore-database', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Backup File to Restore',
        filters: [{ name: 'Database', extensions: ['db'] }],
        properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return false;

    const backupPath = filePaths[0];
    const liveDbPath = path.join(app.getPath('userData'), 'invoice_system_final_v1.db');

    return new Promise((resolve) => {
        // 1. Close the current DB connection to unlock the file
        db.close((err) => {
            if (err) {
                console.error("Error closing DB:", err);
                resolve(false);
                return;
            }

            try {
                // 2. Overwrite the live DB with the backup
                fs.copyFileSync(backupPath, liveDbPath);
                
                // 3. Relaunch the app to reload new data
                app.relaunch();
                app.exit(0); // Close current instance
                resolve(true);
            } catch (error) {
                console.error("Restore failed:", error);
                resolve(false);
            }
        });
    });
});