const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const upload = multer({ dest: "uploads/" });

// Database Setup
const dbPath = path.join(__dirname, "invoice_system_web.db");
const db = new sqlite3.Database(dbPath);

function initDatabase() {
    db.serialize(() => {
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
        db.run(
            `CREATE TABLE IF NOT EXISTS company_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, address TEXT, phone TEXT, email TEXT, logo TEXT, prevent_negative INTEGER DEFAULT 0)`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, address TEXT)`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, unit TEXT, price REAL, stock INTEGER)`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE, customer_id INTEGER, date TEXT, subtotal REAL, discount_percent REAL, discount_amount REAL, tax_percent REAL DEFAULT 0, service_charge REAL DEFAULT 0, grand_total REAL, FOREIGN KEY(customer_id) REFERENCES customers(id))`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, item_name TEXT, description TEXT, qty INTEGER, price REAL, total REAL, FOREIGN KEY(invoice_id) REFERENCES invoices(id))`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, action TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS quotations (id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_no TEXT UNIQUE, customer_id INTEGER, date TEXT, subtotal REAL, discount_percent REAL, discount_amount REAL, tax_percent REAL DEFAULT 0, service_charge REAL DEFAULT 0, grand_total REAL, FOREIGN KEY(customer_id) REFERENCES customers(id))`,
        );
        db.run(
            `CREATE TABLE IF NOT EXISTS quotation_items (id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_id INTEGER, item_name TEXT, description TEXT, qty INTEGER, price REAL, total REAL, FOREIGN KEY(quotation_id) REFERENCES quotations(id))`,
        );
    });
}

initDatabase();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public")); // Vital for serving html/js
app.use(
    session({
        secret: "trustsafe_secret",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    }),
);

function isAuthenticated(req, res, next) {
    if (req.session.user) next();
    else res.status(401).json({ error: "Unauthorized" });
}

function logActivity(username, action, details) {
    db.run("INSERT INTO logs (username, action, details) VALUES (?,?,?)", [
        username,
        action,
        details,
    ]);
}

// --- ROUTES ---

// Login/Logout
app.post("/api/login", (req, res) => {
    const { user, pass } = req.body;
    db.get(
        "SELECT * FROM users WHERE username=? AND password=?",
        [user, pass],
        (err, row) => {
            if (row) {
                req.session.user = row;
                res.json({
                    success: true,
                    role: row.role,
                    username: row.username,
                    permissions: JSON.parse(row.permissions || "[]"),
                });
            } else {
                res.json({ success: false });
            }
        },
    );
});
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Dashboard
app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    const getCount = (q) =>
        new Promise((r) => db.get(q, (e, row) => r(row ? row.count : 0)));
    const getTotal = (q) =>
        new Promise((r) => db.get(q, (e, row) => r(row ? row.total : 0)));

    const [cust, item, inv, sales, low] = await Promise.all([
        getCount("SELECT COUNT(*) as count FROM customers"),
        getCount("SELECT COUNT(*) as count FROM items"),
        getCount("SELECT COUNT(*) as count FROM invoices"),
        getTotal("SELECT SUM(grand_total) as total FROM invoices"),
        getCount("SELECT COUNT(*) as count FROM items WHERE stock <= 10"),
    ]);

    db.all(
        "SELECT strftime('%m-%Y', date) as month, SUM(grand_total) as total FROM invoices GROUP BY month ORDER BY date DESC LIMIT 6",
        (err, rows) => {
            res.json({
                customers: cust,
                items: item,
                invoices: inv,
                sales: sales || 0,
                lowStock: low,
                chartData: rows || [],
            });
        },
    );
});

// Items
app.get("/api/items", isAuthenticated, (req, res) =>
    db.all("SELECT * FROM items ORDER BY id DESC", (e, r) => res.json(r)),
);
app.post("/api/items", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "INSERT INTO items (name, description, unit, price, stock) VALUES (?,?,?,?,?)",
        [d.name, d.desc, d.unit, d.price, d.stock],
        function () {
            res.json({ id: this.lastID });
        },
    );
});
app.post("/api/items/update", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "UPDATE items SET name=?, description=?, unit=?, price=?, stock=? WHERE id=?",
        [d.name, d.desc, d.unit, d.price, d.stock, d.id],
        () => res.json(true),
    );
});
app.post("/api/items/delete", isAuthenticated, (req, res) => {
    db.run("DELETE FROM items WHERE id=?", [req.body.id], () => {
        logActivity(
            req.session.user.username,
            "Delete Item",
            `ID: ${req.body.id}`,
        );
        res.json(true);
    });
});

// Customers
app.get("/api/customers", isAuthenticated, (req, res) =>
    db.all("SELECT * FROM customers ORDER BY id DESC", (e, r) => res.json(r)),
);
app.post("/api/customers", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "INSERT INTO customers (name, phone, email, address) VALUES (?,?,?,?)",
        [d.name, d.phone, d.email, d.address],
        function () {
            res.json({ id: this.lastID });
        },
    );
});
app.post("/api/customers/delete", isAuthenticated, (req, res) =>
    db.run("DELETE FROM customers WHERE id=?", [req.body.id], () =>
        res.json(true),
    ),
);

// Invoices
app.get("/api/invoice/last", isAuthenticated, (req, res) =>
    db.get("SELECT invoice_no FROM invoices ORDER BY id DESC LIMIT 1", (e, r) =>
        res.json(r),
    ),
);
app.get("/api/invoices", isAuthenticated, (req, res) =>
    db.all(
        "SELECT invoices.*, customers.name as customer_name FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id ORDER BY invoices.id DESC",
        (e, r) => res.json(r),
    ),
);
app.get("/api/invoices/:id", isAuthenticated, (req, res) => {
    db.get(
        "SELECT invoices.*, customers.name as customer_name, customers.phone, customers.address FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id WHERE invoices.id = ?",
        [req.params.id],
        (e, inv) => {
            if (!inv) return res.json(null);
            db.all(
                "SELECT * FROM invoice_items WHERE invoice_id = ?",
                [req.params.id],
                (e, items) => {
                    inv.items = items;
                    res.json(inv);
                },
            );
        },
    );
});
app.post("/api/invoices", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "INSERT INTO invoices (customer_id, invoice_no, date, subtotal, discount_percent, discount_amount, tax_percent, service_charge, grand_total) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            d.customer_id,
            d.invoice_no,
            d.date,
            d.subtotal,
            d.discount_percent,
            d.discount_amount,
            d.tax,
            d.service,
            d.grand_total,
        ],
        function (err) {
            if (err) return res.json(false);
            const invId = this.lastID;
            const stmt = db.prepare(
                "INSERT INTO invoice_items (invoice_id, item_name, description, qty, price, total) VALUES (?,?,?,?,?,?)",
            );
            const stockStmt = db.prepare(
                "UPDATE items SET stock = stock - ? WHERE id = ?",
            );
            d.items.forEach((i) => {
                stmt.run(invId, i.name, i.desc, i.qty, i.price, i.total);
                if (i.id) stockStmt.run(i.qty, i.id);
            });
            stmt.finalize();
            stockStmt.finalize();
            logActivity(
                req.session.user.username,
                "Create Invoice",
                `#${d.invoice_no}`,
            );
            res.json(true);
        },
    );
});

// Settings & Users
app.get("/api/settings", isAuthenticated, (req, res) =>
    db.get("SELECT * FROM company_settings LIMIT 1", (e, r) =>
        res.json(r || {}),
    ),
);
app.post("/api/settings", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run("DELETE FROM company_settings");
    db.run(
        "INSERT INTO company_settings (name, address, phone, email, logo, prevent_negative) VALUES (?,?,?,?,?,?)",
        [d.name, d.address, d.phone, d.email, d.logo, d.prevent_negative],
        () => res.json(true),
    );
});
app.get("/api/users", isAuthenticated, (req, res) =>
    db.all("SELECT id, username, role, permissions FROM users", (e, r) =>
        res.json(r),
    ),
);
app.post("/api/users", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "INSERT INTO users (username, password, role, permissions) VALUES (?,?,?,?)",
        [d.username, d.password, d.role, JSON.stringify(d.permissions)],
        () => res.json(true),
    );
});
app.post("/api/users/delete", isAuthenticated, (req, res) =>
    db.run("DELETE FROM users WHERE id=?", [req.body.id], () => res.json(true)),
);

// Quotations
app.get("/api/quotations", isAuthenticated, (req, res) =>
    db.all(
        "SELECT quotations.*, customers.name as customer_name FROM quotations LEFT JOIN customers ON quotations.customer_id = customers.id ORDER BY quotations.id DESC",
        (e, r) => res.json(r),
    ),
);
app.get("/api/quotations/:id", isAuthenticated, (req, res) => {
    db.get(
        "SELECT quotations.*, customers.name as customer_name, customers.phone, customers.address FROM quotations LEFT JOIN customers ON quotations.customer_id = customers.id WHERE quotations.id = ?",
        [req.params.id],
        (e, quote) => {
            if (!quote) return res.json(null);
            db.all(
                "SELECT * FROM quotation_items WHERE quotation_id = ?",
                [req.params.id],
                (e, items) => {
                    quote.items = items;
                    res.json(quote);
                },
            );
        },
    );
});
app.post("/api/quotations", isAuthenticated, (req, res) => {
    const d = req.body;
    db.run(
        "INSERT INTO quotations (customer_id, quotation_no, date, subtotal, discount_percent, discount_amount, tax_percent, service_charge, grand_total) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            d.customer_id,
            d.quotation_no,
            d.date,
            d.subtotal,
            d.discount_percent,
            d.discount_amount,
            d.tax,
            d.service,
            d.grand_total,
        ],
        function (err) {
            if (err) return res.json(false);
            const qId = this.lastID;
            const stmt = db.prepare(
                "INSERT INTO quotation_items (quotation_id, item_name, description, qty, price, total) VALUES (?,?,?,?,?,?)",
            );
            d.items.forEach((i) =>
                stmt.run(qId, i.name, i.desc, i.qty, i.price, i.total),
            );
            stmt.finalize();
            res.json(true);
        },
    );
});
app.post("/api/quotations/delete", isAuthenticated, (req, res) => {
    db.run(
        "DELETE FROM quotation_items WHERE quotation_id=?",
        [req.body.id],
        () => {
            db.run("DELETE FROM quotations WHERE id=?", [req.body.id], () =>
                res.json(true),
            );
        },
    );
});

// Logs & Export
app.get("/api/logs", isAuthenticated, (req, res) =>
    db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", (e, r) =>
        res.json(r),
    ),
);
app.get("/api/backup", isAuthenticated, (req, res) =>
    res.download(dbPath, "invoice_backup.db"),
);
app.post(
    "/api/restore",
    isAuthenticated,
    upload.single("dbfile"),
    (req, res) => {
        if (req.file) {
            fs.copyFileSync(req.file.path, dbPath);
            fs.unlinkSync(req.file.path);
            db.close();
            const newDb = new sqlite3.Database(dbPath); // Reopen
            res.json(true);
        } else {
            res.json(false);
        }
    },
);
app.get("/api/export", isAuthenticated, (req, res) => {
    db.all(
        "SELECT invoices.*, customers.name FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id",
        (err, rows) => {
            const header = "InvoiceNo,Date,Customer,Subtotal,GrandTotal\n";
            const content = rows
                .map(
                    (r) =>
                        `${r.invoice_no},${r.date},${r.name},${r.subtotal},${r.grand_total}`,
                )
                .join("\n");
            res.header("Content-Type", "text/csv");
            res.attachment("invoices.csv");
            res.send(header + content);
        },
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`),
);
