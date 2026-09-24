
# 🛡️ TrustSafe Invoice Manager (Web Edition)

A powerful, fast, and mobile-friendly **Invoice & Inventory Management System** built with **Node.js**, **Express**, and **SQLite3**. Tailored specifically for small-to-medium businesses, IT service providers, and retail stores to streamline sales, stock control, quotations, and ledger balances across devices via local network or cloud hosting.

---

## 📸 Overview & Dashboard Preview

<img src="Src/App%20screenshot%20(12).png" alt="Dashboard Overview" width="100%">

---

## 🚀 Key Features

* 🧾 **Professional Invoicing:** Generate GST/Non-GST invoices with dynamic tax, discounts, and terms.
* 📦 **Real-time Inventory:** Manage product catalog, low-stock warnings, and stock in/out adjustments.
* 👥 **Client & Ledger Management:** Track customer receivables, outstanding balances, and payment histories.
* 📝 **Quotations to Invoices:** Create estimates/quotations and convert them into live invoices with one click.
* 💬 **WhatsApp Integration:** Direct click-to-chat links to send invoice summaries and reminders instantly.
* 🖨️ **Dual Print Formats:** Clean print layouts for standard **A4 documents** and **80mm/58mm thermal receipts**.
* 👤 **Role-Based Access Control:** Separate privilege levels for `Admin` and `Operator/Staff`.
* 💾 **Database Utilities:** Built-in manual SQLite backup and restore functionality.
* 📱 **Fully Responsive UI:** Optimized layout for desktop workstations, tablets, and smartphones.

---

## 🖼️ Feature Previews

### 1. Invoicing & Quotations
> Fast billing system with real-time tax calculation and instant PDF/print output.

<img src="Src/App%20screenshot%20(11).png" alt="Dashboard Overview" width="100%">

---

### 2. Inventory & Stock Control
> Visual product catalog with current stock levels, buying prices, and selling margins.

<img src="Src/App%20screenshot%20(9).png" alt="Dashboard Overview" width="100%">

---

### 3. Customer Ledger & Payment Tracking
> Complete debit/credit ledger tracking for each customer.

<img src="Src/App%20screenshot%20(6).png" alt="Dashboard Overview" width="100%">

---

### 4. Thermal & A4 Print Templates
> Print receipts instantly on POS thermal printers or standard office A4 printers.

<img src="Src/A4%20print%20size.png" alt="A4 Print Layout" width="100%">

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Runtime** | Node.js |
| **Web Framework** | Express.js |
| **Database** | SQLite3 (Persistent local relational DB) |
| **Frontend** | HTML5, Vanilla JavaScript, Bootstrap 5 |
| **Key Dependencies** | `express`, `sqlite3`, `express-session`, `multer` |

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (LTS version recommended)
* [Git](https://git-scm.com/)

### 2. Clone the Repository
```bash
git clone [https://github.com/mianwerad007/trust-safe-services-invoice-manager.git](https://github.com/mianwerad007/trust-safe-services-invoice-manager.git)
cd trust-safe-services-invoice-manager

```

### 3. Install Dependencies

```bash
npm install

```

### 4. Start the Application

```bash
npm run

```

*If everything is configured correctly, your terminal will show:*

```text
Server running on port 3000

```

### 5. Accessing the Application

* **On Host PC:** Open your browser and navigate to `http://localhost:3000`
* **On Mobile / LAN Devices:** Ensure both devices are on the same Wi-Fi/LAN, find the host PC's local IP address (e.g., `192.168.1.5`), and open:
```text
[http://192.168.1.5:3000](http://192.168.1.5:3000)

```



---

## 🔑 Default Credentials

On initial deployment, use the following credentials to access the system:

| Field | Default Value |
| --- | --- |
| **Username** | `admin` |
| **Password** | `admin123` |

> ⚠️ **Security Warning:** Change the default admin password immediately inside **User Management** after your first login.

---

## 📁 Recommended Project Structure

```text
trust-safe-services-invoice-manager/
├── public/                 # Static assets (CSS, client JS, brand logos)
│   └── css/
├── screenshots/            # Documentation images for README
│   ├── dashboard.png
│   ├── invoices.png
│   ├── inventory.png
│   ├── customers.png
│   └── print-formats.png
├── views/                  # UI templates / HTML files
├── routes/                 # Express route handlers
├── models/                 # SQLite queries and database helpers
├── db/                     # SQLite database file (*.sqlite / *.db)
├── uploads/                # Multer uploaded assets (logos, attachments)
├── index.js                # Server entry point
└── package.json            # Project dependencies & scripts

```

---

## ☁️ Deployment Guide

### Option 1: Local Network / Micro Server (Recommended for SQLite)

Run this application inside your office or local network on an always-on mini PC, Windows workstation, or Ubuntu home server using **PM2**:

```bash
npm install -g pm2
pm2 start index.js --name "trustsafe-invoice"
pm2 startup
pm2 save

```

### Option 2: Render.com / Cloud Web Service

1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com?utm_source=gemini) and create a **New Web Service**.
3. Link your GitHub repository.
4. Set configurations:
* **Build Command:** `npm install`
* **Start Command:** `node index.js`


5. *Note:* Since SQLite stores data in a local file, ensure you attach a **Persistent Disk** on Render (under `db/` path) so your database is not lost during server restarts.

---

## 🗺️ Future Roadmap

* [ ] Multi-currency and automated exchange rate toggle
* [ ] Automated scheduled database backups to Google Drive / S3
* [ ] Barcode scanner integration for lightning-fast billing
* [ ] Granular permission rules for multiple staff users
* [ ] Export reports to Excel (.xlsx) and CSV

---

## 👤 Author & Credits

* **Developer:** Muhammad Werad
* **GitHub:** [@mianwerad007](https://www.google.com/search?q=https://github.com/mianwerad007&utm_source=gemini)
* **Organization:** TrustSafe Services

---

## 📝 License

This project is proprietary software developed for **TrustSafe Services**. All rights reserved.


