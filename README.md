🛡️ TrustSafe Invoice Manager (Web Edition)
A powerful, secure, and mobile-friendly Invoice & Inventory Management System built with Node.js and SQLite. Designed for small businesses to manage sales, stock, and customers from anywhere using a web browser.

🚀 Key Features
📊 Dashboard: Real-time sales overview, revenue stats, and sales charts.

🧾 Invoicing: Create professional invoices with Tax, Discount, and Service Charges.

📝 Quotations: Generate estimates and convert them to invoices with one click.

📦 Inventory Management: Track stock levels with Low Stock Alerts.

🛑 Strict Stock Mode: Optional setting to prevent selling items out of stock.

📱 Mobile Ready: Fully responsive design works on Phones, Tablets, and Laptops.

💬 WhatsApp Integration: Send invoice details directly to customers via WhatsApp.

👥 User Roles: Admin (Full Access) and Operator (Restricted Access) roles.

💾 Data Safety: Manual Database Backup & Restore + CSV Export.

🖨️ Print Layout: Professional Navy Blue print template for thermal or A4 printers.

🛠️ Tech Stack
Backend: Node.js, Express.js

Database: SQLite3 (Local file-based DB)

Frontend: HTML5, Bootstrap 5, Vanilla JavaScript

Dependencies: express, sqlite3, express-session, multer

⚙️ Installation & Local Setup
Follow these steps to run the software on your computer (VS Code).

1. Prerequisites
Install Node.js (LTS Version).

Install Git.

2. Clone & Install
Bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/trustsafe-invoice-manager.git

# Go into the folder
cd trustsafe-invoice-manager

# Install dependencies
npm install
3. Run the App
Bash
node index.js
You will see a message: Server running on port 3000.

4. Access the App
On PC: Open your browser and go to http://localhost:3000

On Mobile: Connect to the same Wi-Fi, find your PC's IP address (e.g., 192.168.1.5), and go to http://192.168.1.5:3000.

🔑 Default Login Credentials
When you run the app for the first time, use these details:

Username: admin

Password: admin123

(You can add more users or change passwords inside the User Management section).

☁️ How to Deploy Online (Free)
To access this app from anywhere over the internet (without keeping your PC on), you can deploy it for free:

Option 1: Replit / Glitch
Upload the files to Replit or Glitch.

Run npm install.

Click "Run".

Use the provided URL on any device.

Option 2: Render.com
Push this code to GitHub.

Go to Render -> New Web Service.

Connect your GitHub Repo.

Build Command: npm install

Start Command: node index.js

📂 Project Structure
├── public/              # Frontend Files
│   ├── index.html       # Main UI
│   ├── renderer.js      # App Logic
│   ├── api-adapter.js   # Bridge between UI and Server
│   └── favicon.png      # App Icon
├── database.js          # Database Schema & Setup
├── index.js             # Main Server (Express App)
├── package.json         # Project Dependencies
└── README.md            # Documentation

📝 License
This project is created for TrustSafe Services. Developed by Muhammad Werad.
