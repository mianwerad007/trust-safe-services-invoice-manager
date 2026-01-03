const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Web Database Path
const dbPath = path.join(__dirname, "invoice_system_web.db");
const db = new sqlite3.Database(dbPath);

function initDatabase() {
    db.serialize(() => {
        // 1. Users
        db.run(
            `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'operator', permissions TEXT DEFAULT '[]')`,
            () => {
                db.get(
                    "SELECT * FROM users WHERE username='admin'",
                    (err, row) => {
                        if (!row) {
                            const allPerms = JSON.stringify(["all"]);
                            db.run(
                                "INSERT INTO users (username, password, role, permissions) VALUES ('admin', 'admin123', 'admin', ?)",
                                [allPerms],
                            );
                        }
                    },
                );
            },
        );

        // 2. Company Settings
        db.run(
            `CREATE TABLE IF NOT EXISTS company_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, address TEXT, phone TEXT, email TEXT, logo TEXT, prevent_negative INTEGER DEFAULT 0)`,
        );

        // 3. Customers
        db.run(
            `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, address TEXT)`,
        );

        // 4. Items
        db.run(
            `CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, unit TEXT, price REAL, stock INTEGER)`,
        );

        // 5. Invoices
        db.run(
            `CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE, customer_id INTEGER, date TEXT, subtotal REAL, discount_percent REAL, discount_amount REAL, tax_percent REAL DEFAULT 0, service_charge REAL DEFAULT 0, grand_total REAL, FOREIGN KEY(customer_id) REFERENCES customers(id))`,
        );

        // 6. Invoice Details
        db.run(
            `CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, item_name TEXT, description TEXT, qty INTEGER, price REAL, total REAL, FOREIGN KEY(invoice_id) REFERENCES invoices(id))`,
        );

        // 7. Logs
        db.run(
            `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, action TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        );

        // 8. Quotations
        db.run(
            `CREATE TABLE IF NOT EXISTS quotations (id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_no TEXT UNIQUE, customer_id INTEGER, date TEXT, subtotal REAL, discount_percent REAL, discount_amount REAL, tax_percent REAL DEFAULT 0, service_charge REAL DEFAULT 0, grand_total REAL, FOREIGN KEY(customer_id) REFERENCES customers(id))`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS quotation_items (id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_id INTEGER, item_name TEXT, description TEXT, qty INTEGER, price REAL, total REAL, FOREIGN KEY(quotation_id) REFERENCES quotations(id))`,
        );
    });
}

module.exports = { db, initDatabase, dbPath };
