let currentUserRole = '';
let currentUsername = '';
let currentUserPerms = [];
let allItems = [];
let editModal;
let lowStockModal;
let salesChart = null;

window.onload = () => {
    const modalEl = document.getElementById('editModal');
    if (modalEl) editModal = new bootstrap.Modal(modalEl);

    const lsEl = document.getElementById('lowStockModal');
    if (lsEl) lowStockModal = new bootstrap.Modal(lsEl);

    const searchInput = document.getElementById('product-search');
    if (searchInput) searchInput.addEventListener('input', handleItemSearch);

    const dashSearch = document.getElementById('dashboard-search');
    const dashResults = document.getElementById('dashboard-search-results');
    if (dashSearch && dashResults) {
        dashSearch.addEventListener('keyup', async function () {
            const query = this.value.toLowerCase();
            dashResults.innerHTML = '';
            if (query.length === 0) { dashResults.style.display = 'none'; return; }
            if (allItems.length === 0) try { allItems = await window.api.getItems(); } catch (err) {}
            const matches = allItems.filter(item => item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query)));
            if (matches.length > 0) {
                dashResults.style.display = 'block';
                matches.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'item-list-option';
                    let clr = item.stock <= 10 ? 'text-danger' : (item.stock <= 50 ? 'text-warning' : 'text-success');
                    el.innerHTML = `<strong>${item.name}</strong> - PKR ${item.price} <small class="${clr} fw-bold">(${item.stock})</small>`;
                    el.onclick = () => { dashSearch.value = item.name; dashResults.style.display = 'none'; };
                    dashResults.appendChild(el);
                });
            } else { dashResults.style.display = 'none'; }
        });
        document.addEventListener('click', (e) => { if (!dashSearch.contains(e.target)) dashResults.style.display = 'none'; });
    }

    document.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && document.getElementById('login-screen').style.display !== 'none') {
            handleLogin();
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); showPage('create-invoice'); }
        if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveInvoice(); }
    });

    const ph = document.getElementById('cust-phone');
    if(ph) ph.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11); });
};

// --- HELPERS ---
function hasPermission(perm) { if (currentUserRole === 'admin') return true; return currentUserPerms.includes(perm); }

function showPage(pageId, init = true) {
    if (pageId === 'create-invoice' && !hasPermission('create_invoice')) return alert("Access Denied");
    if (pageId === 'items' && !hasPermission('manage_items')) return alert("Access Denied");
    if (pageId === 'customers' && !hasPermission('manage_customers')) return alert("Access Denied");
    if (pageId === 'settings' && !hasPermission('manage_settings')) return alert("Access Denied");

    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    let navId = '';
    if(pageId === 'dashboard') navId = 'nav-dashboard';
    if(pageId === 'create-invoice') navId = 'nav-create';
    if(pageId === 'quotations') navId = 'nav-quotes';
    if(pageId === 'items') navId = 'nav-items';
    if(pageId === 'customers') navId = 'nav-customers';
    if(pageId === 'view-invoices') navId = 'nav-history';
    if(pageId === 'users') navId = 'nav-users';
    if(pageId === 'logs') navId = 'nav-logs';
    if(pageId === 'settings') navId = 'nav-settings';
    
    if(navId && document.getElementById(navId)) document.getElementById(navId).classList.add('active');

    if (init) {
        if (pageId === 'dashboard') loadDashboard();
        if (pageId === 'items') loadItems();
        if (pageId === 'customers') loadCustomers();
        if (pageId === 'create-invoice') setupInvoicePage();
        if (pageId === 'quotations') loadQuotations();
        if (pageId === 'users') loadUsers();
        if (pageId === 'logs') loadLogs();
        if (pageId === 'settings') loadSettings();
        if (pageId === 'view-invoices') loadAllInvoices();
    }
}

function updateSidebarVisibility() {
    const map = [
        { id: 'nav-create', perm: 'create_invoice' },
        { id: 'nav-items', perm: 'manage_items' },
        { id: 'nav-customers', perm: 'manage_customers' },
        { id: 'nav-settings', perm: 'manage_settings' },
        { id: 'qa-new-invoice', perm: 'create_invoice' },
        { id: 'qa-add-item', perm: 'manage_items' },
        { id: 'qa-add-cust', perm: 'manage_customers' }
    ];
    map.forEach(x => { if(document.getElementById(x.id)) document.getElementById(x.id).style.display = hasPermission(x.perm) ? 'block' : 'none'; });
    
    if(currentUserRole !== 'admin') {
        if(document.getElementById('nav-users')) document.getElementById('nav-users').style.display='none';
        if(document.getElementById('nav-logs')) document.getElementById('nav-logs').style.display='none';
    } else {
        if(document.getElementById('nav-users')) document.getElementById('nav-users').style.display='block';
        if(document.getElementById('nav-logs')) document.getElementById('nav-logs').style.display='block';
    }
}

async function handleLogin() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    try {
        const res = await window.api.login({ user: u, pass: p });
        if (res.success) {
            currentUserRole = res.role;
            currentUsername = res.username;
            currentUserPerms = res.permissions || [];
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-layout').style.display = 'block';
            document.getElementById('user-role-badge').innerText = res.role.toUpperCase();
            updateSidebarVisibility();
            loadDashboard();
        } else { alert('Invalid Credentials'); }
    } catch (error) { console.error(error); }
}

async function loadDashboard() {
    try {
        const stats = await window.api.getDashboardStats();
        document.getElementById('dash-sales').innerText = (stats.sales || 0).toLocaleString();
        document.getElementById('dash-invoices').innerText = stats.invoices || 0;
        document.getElementById('dash-customers').innerText = stats.customers || 0;
        document.getElementById('dash-items').innerText = stats.items || 0;
        
        const alertBox = document.getElementById('dash-alert-box');
        if (stats.lowStock > 0) {
            alertBox.style.setProperty('display', 'flex', 'important');
            document.getElementById('dash-low-stock-count').innerText = stats.lowStock;
            if(allItems.length === 0) allItems = await window.api.getItems();
        } else {
            alertBox.style.setProperty('display', 'none', 'important');
        }

        const ctx = document.getElementById('salesChart').getContext('2d');
        if (salesChart) salesChart.destroy();
        salesChart = new Chart(ctx, { type: 'bar', data: { labels: (stats.chartData||[]).map(d=>d.month).reverse(), datasets: [{ label: 'Sales', data: (stats.chartData||[]).map(d=>d.total).reverse(), backgroundColor: '#3498db' }] }, options: { responsive: true, maintainAspectRatio: false } });
    } catch (e) {}
}

function showLowStockModal() {
    const list = document.getElementById('low-stock-list');
    list.innerHTML = '';
    const lowItems = allItems.filter(i => i.stock <= 10);
    
    if (lowItems.length === 0) {
        list.innerHTML = '<li class="list-group-item text-center">No low stock items found.</li>';
    } else {
        lowItems.forEach(i => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<div><span class="fw-bold text-dark">${i.name}</span><br><small class="text-muted">Price: ${i.price}</small></div><span class="badge bg-danger rounded-pill">${i.stock} ${i.unit || 'Pc'}</span>`;
            list.appendChild(li);
        });
    }
    lowStockModal.show();
}

async function setupInvoicePage() {
    document.getElementById('page-title').innerText = "New Invoice";
    document.getElementById('btn-back-to-list').style.display = 'none';
    document.getElementById('btn-save-quote').style.display = 'inline-block';
    document.getElementById('btn-save-inv').style.display = 'inline-block'; 
    document.getElementById('product-search').style.display = 'block';
    
    document.getElementById('inv-items-body').innerHTML = '';
    document.getElementById('inv-discount-per').value = 0;
    document.getElementById('inv-tax').value = 0;
    document.getElementById('inv-service').value = 0;
    document.getElementById('inv-subtotal').innerText = '0.00';
    document.getElementById('inv-grand-total').innerText = '0.00';

    allItems = await window.api.getItems();
    const customers = await window.api.getCustomers();
    const sel = document.getElementById('inv-customer');
    sel.innerHTML = '<option value="">Select Customer</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    sel.disabled = false;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inv-date').value = today;

    const dd = String(new Date().getDate()).padStart(2,'0');
    const mm = String(new Date().getMonth()+1).padStart(2,'0');
    const yy = String(new Date().getFullYear()).slice(-2);
    const datePrefix = `${dd}${mm}${yy}`;
    
    const lastInv = await window.api.getLastInvoice();
    let newSeq = '01';
    if (lastInv && lastInv.invoice_no.startsWith(datePrefix)) {
        newSeq = String(parseInt(lastInv.invoice_no.slice(-2)) + 1).padStart(2, '0');
    }
    document.getElementById('inv-no').value = datePrefix + newSeq;
}

function handleItemSearch(e) {
    const query = e.target.value.toLowerCase();
    const list = document.getElementById('product-list');
    if (query.length < 1) { list.style.display = 'none'; return; }
    const matches = allItems.filter(i => i.name.toLowerCase().includes(query));
    list.innerHTML = '';
    matches.forEach(i => {
        const div = document.createElement('div');
        div.className = 'item-list-option';
        let clr = i.stock <= 10 ? 'text-danger' : (i.stock <= 50 ? 'text-warning' : 'text-success');
        div.innerHTML = `<strong>${i.name}</strong> - PKR ${i.price} <small class="${clr} fw-bold">(${i.stock})</small>`;
        div.onclick = () => { addItemToInvoice(i); list.style.display = 'none'; document.getElementById('product-search').value = ''; };
        list.appendChild(div);
    });
    list.style.display = matches.length ? 'block' : 'none';
}

// --- FIXED: ADD ITEM TO INVOICE (Prevent Duplicates) ---
function addItemToInvoice(item) {
    const tbody = document.getElementById('inv-items-body');
    
    // Check if row already exists
    const existingRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.getAttribute('data-id') == item.id);

    if (existingRow) {
        // If exists, just update quantity
        const qtyInput = existingRow.querySelector('.qty');
        qtyInput.value = parseInt(qtyInput.value) + 1;
        calcInvoiceFinal(); // Recalculate totals
    } else {
        // If not exists, create new row
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', item.id);
        tr.innerHTML = `
            <td><b>${item.name}</b><br><small class="text-muted">${item.description||''}</small></td>
            <td><input class="form-control price" value="${item.price}" readonly></td>
            <td><input class="form-control qty" value="1" min="1" oninput="calcInvoiceFinal()"></td>
            <td><span class="row-total fw-bold">${item.price}</span></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); calcInvoiceFinal()">x</button></td>
        `;
        tbody.appendChild(tr);
        calcInvoiceFinal();
    }
}

function calcInvoiceFinal() {
    let subtotal = 0;
    document.querySelectorAll('#inv-items-body tr').forEach(row => {
        const p = parseFloat(row.querySelector('.price').value) || 0;
        const q = parseFloat(row.querySelector('.qty').value) || 0;
        const total = p * q;
        row.querySelector('.row-total').innerText = total.toFixed(2);
        subtotal += total;
    });
    const discPer = parseFloat(document.getElementById('inv-discount-per').value) || 0;
    const taxPer = parseFloat(document.getElementById('inv-tax').value) || 0;
    const serviceAmt = parseFloat(document.getElementById('inv-service').value) || 0;

    const discAmt = (subtotal * discPer) / 100;
    const taxAmt = (subtotal * taxPer) / 100;
    const grand = (subtotal - discAmt) + taxAmt + serviceAmt;

    document.getElementById('inv-subtotal').innerText = subtotal.toFixed(2);
    document.getElementById('inv-grand-total').innerText = grand.toFixed(2);
}

async function preparePrint(isQuote = false) {
    const settings = await window.api.getSettings();
    document.getElementById('print-company-name').innerText = settings.name || 'Company Name';
    document.getElementById('print-company-addr').innerText = settings.address || '';
    document.getElementById('print-company-phone').innerText = settings.phone || '';
    document.getElementById('print-company-email').innerText = settings.email || '';
    if (settings.logo) document.getElementById('print-logo').src = settings.logo;

    document.getElementById('print-heading').innerText = isQuote ? "QUOTATION" : "INVOICE";

    const custId = document.getElementById('inv-customer').value;
    if(custId) {
        const customers = await window.api.getCustomers();
        const cust = customers.find(c => c.id == custId);
        document.getElementById('print-cust-name').innerText = cust.name;
        document.getElementById('print-cust-details').innerHTML = `Contact No.: ${cust.phone || '-'}<br>${cust.address || ''}`;
    } else {
        document.getElementById('print-cust-name').innerText = "Walk-in Customer";
        document.getElementById('print-cust-details').innerHTML = "";
    }

    document.getElementById('print-inv-no').innerText = document.getElementById('inv-no').value;
    document.getElementById('print-date').innerText = document.getElementById('inv-date').value;
    document.getElementById('print-time').innerText = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const screenRows = document.querySelectorAll('#inv-items-body tr');
    const printBody = document.getElementById('print-table-body');
    printBody.innerHTML = '';
    let totalQty = 0;
    
    screenRows.forEach((row, index) => {
        const name = row.cells[0].querySelector('b').innerText;
        const desc = row.cells[0].querySelector('small') ? row.cells[0].querySelector('small').innerText : '';
        const price = row.querySelector('.price').value;
        const qty = parseInt(row.querySelector('.qty').value);
        const total = row.querySelector('.row-total').innerText;
        const id = row.getAttribute('data-id');
        const itemObj = allItems.find(i => i.id == id);
        const unit = itemObj ? (itemObj.unit || 'Pc') : 'Pc';
        totalQty += qty;
        printBody.innerHTML += `<tr><td class="col-sr">${index + 1}</td><td class="col-item"><b>${name}</b><br><i style="font-size:9pt;">${desc}</i></td><td class="col-qty">${qty}</td><td class="col-unit">${unit}</td><td class="col-price">Rs ${parseFloat(price).toLocaleString()}</td><td class="col-amt">Rs ${parseFloat(total).toLocaleString()}</td></tr>`;
    });

    document.getElementById('print-total-qty').innerText = totalQty;
    document.getElementById('print-table-total').innerText = "Rs " + document.getElementById('inv-subtotal').innerText;
    document.getElementById('print-subtotal').innerText = "Rs " + document.getElementById('inv-subtotal').innerText;
    
    const grand = parseFloat(document.getElementById('inv-grand-total').innerText);
    document.getElementById('print-grand-total').innerText = "Rs " + grand.toLocaleString();
    
    const discPer = document.getElementById('inv-discount-per').value;
    const taxPer = document.getElementById('inv-tax').value;
    const servAmt = document.getElementById('inv-service').value;

    document.getElementById('print-discount-row').style.display = discPer > 0 ? 'table-row' : 'none';
    if(discPer > 0) document.getElementById('print-discount').innerText = discPer + "%";

    document.getElementById('print-tax-row').style.display = taxPer > 0 ? 'table-row' : 'none';
    if(taxPer > 0) document.getElementById('print-tax').innerText = taxPer + "%";

    document.getElementById('print-service-row').style.display = servAmt > 0 ? 'table-row' : 'none';
    if(servAmt > 0) document.getElementById('print-service').innerText = servAmt;

    document.getElementById('print-words').innerText = numberToWords(Math.floor(grand));
    const rawTerms = localStorage.getItem('company_terms') || '';
    const termsList = rawTerms.split('\n').filter(t => t.trim() !== '').map(t => `<li>${t}</li>`).join('');
    document.getElementById('print-terms-list').innerHTML = termsList ? `<ul>${termsList}</ul>` : '';
}

function numberToWords(num) {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str ? str + "Rupees Only" : "Zero Rupees Only";
}

async function saveInvoice() {
    await preparePrint(false);
    const custId = document.getElementById('inv-customer').value;
    if (!custId) return alert('Select Customer');
    if (document.querySelectorAll('#inv-items-body tr').length === 0) return alert('Add items first');

    const items = [];
    document.querySelectorAll('#inv-items-body tr').forEach(row => {
        const id = row.getAttribute('data-id');
        const itemObj = allItems.find(i => i.id == id);
        items.push({
            id: id,
            name: row.cells[0].querySelector('b').innerText,
            desc: row.cells[0].querySelector('small').innerText,
            unit: itemObj ? itemObj.unit : 'Pc',
            price: row.querySelector('.price').value,
            qty: row.querySelector('.qty').value,
            total: row.querySelector('.row-total').innerText
        });
    });

    const subtotal = parseFloat(document.getElementById('inv-subtotal').innerText);
    const discPer = parseFloat(document.getElementById('inv-discount-per').value);
    const discAmt = (subtotal * discPer) / 100;

    await window.api.saveInvoice({
        user: currentUsername,
        customer_id: custId,
        invoice_no: document.getElementById('inv-no').value,
        date: document.getElementById('inv-date').value,
        subtotal: subtotal,
        discount_percent: discPer,
        discount_amount: discAmt.toFixed(2),
        tax: document.getElementById('inv-tax').value,
        service: document.getElementById('inv-service').value,
        grand_total: document.getElementById('inv-grand-total').innerText,
        items: items
    });

    alert('Saved!');
    window.print();
    showPage('dashboard');
}

async function saveQuotation() {
    await preparePrint(true);
    const custId = document.getElementById('inv-customer').value;
    if (!custId) return alert('Select Customer');
    
    const items = [];
    document.querySelectorAll('#inv-items-body tr').forEach(row => {
        items.push({
            name: row.cells[0].querySelector('b').innerText,
            desc: row.cells[0].querySelector('small').innerText,
            price: row.querySelector('.price').value,
            qty: row.querySelector('.qty').value,
            total: row.querySelector('.row-total').innerText
        });
    });

    const subtotal = parseFloat(document.getElementById('inv-subtotal').innerText);
    const discPer = parseFloat(document.getElementById('inv-discount-per').value);
    const discAmt = (subtotal * discPer) / 100;
    const quoteNo = "EST-" + document.getElementById('inv-no').value;

    await window.api.saveQuotation({
        user: currentUsername,
        customer_id: custId,
        quotation_no: quoteNo,
        date: document.getElementById('inv-date').value,
        subtotal: subtotal,
        discount_percent: discPer,
        discount_amount: discAmt.toFixed(2),
        tax: document.getElementById('inv-tax').value,
        service: document.getElementById('inv-service').value,
        grand_total: document.getElementById('inv-grand-total').innerText,
        items: items
    });

    alert('Quotation Saved!');
    window.print();
    showPage('dashboard');
}

async function loadQuotations() {
    const rows = await window.api.getQuotations();
    document.getElementById('quotations-table-body').innerHTML = rows.map(r => `
        <tr>
            <td>${r.quotation_no}</td><td>${r.date}</td><td>${r.customer_name}</td><td>${r.grand_total}</td>
            <td class="text-center"><button class="btn btn-sm btn-success" onclick="convertQuoteToInv(${r.id})">Convert to Invoice</button></td>
        </tr>`).join('');
}

async function convertQuoteToInv(id) {
    if(!confirm("Convert this quotation to an actual invoice? Stock will be reduced.")) return;
    const q = await window.api.getQuotationDetails(id);
    if(!q) return;

    showPage('create-invoice', false);
    const sel = document.getElementById('inv-customer');
    sel.value = q.customer_id;
    
    const tbody = document.getElementById('inv-items-body');
    tbody.innerHTML = '';
    q.items.forEach(i => {
        const storeItem = allItems.find(x => x.name === i.item_name);
        const itemId = storeItem ? storeItem.id : '';
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', itemId);
        tr.innerHTML = `<td><b>${i.item_name}</b><br><small class="text-muted">${i.description}</small></td><td><input class="form-control price" value="${i.price}" readonly></td><td><input class="form-control qty" value="${i.qty}" oninput="calcInvoiceFinal()"></td><td><span class="row-total fw-bold">${i.total}</span></td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); calcInvoiceFinal()">x</button></td>`;
        tbody.appendChild(tr);
    });

    document.getElementById('inv-discount-per').value = q.discount_percent;
    document.getElementById('inv-tax').value = q.tax_percent;
    document.getElementById('inv-service').value = q.service_charge;
    calcInvoiceFinal();

    await window.api.deleteQuotation(id);
}

async function loadLogs() {
    const logs = await window.api.getLogs();
    document.getElementById('logs-table-body').innerHTML = logs.map(l => `<tr><td>${l.timestamp}</td><td>${l.username}</td><td>${l.action}</td><td>${l.details}</td></tr>`).join('');
}

async function loadItems() {
    allItems = await window.api.getItems();
    const tbody = document.getElementById('items-table-body');
    tbody.innerHTML = '';
    allItems.forEach((i, idx) => {
        let stockClass = '';
        if (i.stock <= 10) stockClass = 'text-danger fw-bold';
        else if (i.stock <= 50) stockClass = 'text-warning fw-bold';
        else stockClass = 'text-success fw-bold';
        tbody.innerHTML += `<tr><td>${idx+1}</td><td>${i.name}</td><td>${i.description||'-'}</td><td>${i.unit||'Pc'}</td><td>${i.price}</td><td class="${stockClass}">${i.stock}</td><td><button class="btn btn-sm btn-warning" onclick='openEditItem(${JSON.stringify(i)})'>Edit</button> <button class="btn btn-sm btn-danger" onclick="delItem(${i.id})">Del</button></td></tr>`;
    });
}
document.getElementById('item-form').onsubmit = async (e) => {
    e.preventDefault();
    await window.api.addItem({ name: document.getElementById('item-name').value, desc: document.getElementById('item-desc').value, unit: document.getElementById('item-unit').value, price: document.getElementById('item-price').value, stock: document.getElementById('item-stock').value });
    e.target.reset(); loadItems();
};
async function delItem(id) { if(confirm('Delete?')) { await window.api.deleteItem({id, user: currentUsername}); loadItems(); }}

async function loadCustomers() {
    const c = await window.api.getCustomers();
    const t = document.getElementById('cust-table-body'); t.innerHTML = '';
    c.forEach(x => t.innerHTML += `<tr><td>${x.name}</td><td>${x.phone}</td><td>${x.address}</td><td><button class="btn btn-sm btn-danger" onclick="delCust(${x.id})">Del</button></td></tr>`);
}
document.getElementById('customer-form').onsubmit = async (e) => {
    e.preventDefault();
    await window.api.addCustomer({ name: document.getElementById('cust-name').value, phone: document.getElementById('cust-phone').value, email: document.getElementById('cust-email').value, address: document.getElementById('cust-addr').value });
    e.target.reset(); loadCustomers();
};
async function delCust(id) { if(confirm('Delete?')) { await window.api.deleteCustomer({id, user: currentUsername}); loadCustomers(); }}

// --- FIXED: EDIT ITEM MODAL WITH DESCRIPTION ---
function openEditItem(i) {
    document.getElementById('edit-modal-body').innerHTML = `
        <label>Name</label><input id="ei-name" class="form-control mb-2" value="${i.name}">
        <label>Description</label><input id="ei-desc" class="form-control mb-2" value="${i.description || ''}">
        <label>Unit</label><select id="ei-unit" class="form-select mb-2"><option value="Pc">Pc</option><option value="Kg">Kg</option><option value="Meter">Meter</option><option value="Box">Box</option><option value="Pkt">Pkt</option></select>
        <label>Price</label><input id="ei-price" class="form-control mb-2" value="${i.price}">
        <label>Stock</label><input id="ei-stock" class="form-control mb-2" value="${i.stock}">
    `;
    document.getElementById('ei-unit').value = i.unit || 'Pc';
    
    document.getElementById('save-edit-btn').onclick = async () => {
        await window.api.updateItem({ 
            id: i.id, 
            name: document.getElementById('ei-name').value, 
            desc: document.getElementById('ei-desc').value, // Now including description
            price: document.getElementById('ei-price').value, 
            stock: document.getElementById('ei-stock').value, 
            unit: document.getElementById('ei-unit').value 
        });
        editModal.hide(); loadItems();
    };
    editModal.show();
}

async function loadUsers() {
    const u = await window.api.getUsers();
    document.getElementById('users-table-body').innerHTML = u.map(x => `<tr><td>${x.username}</td><td>${x.role}</td><td><button class="btn btn-sm btn-danger" onclick="delUser(${x.id})">Del</button></td></tr>`).join('');
}
document.getElementById('user-form').onsubmit = async (e) => {
    e.preventDefault();
    const role = document.getElementById('new-role').value;
    let perms = [];
    if (role === 'admin') {
        perms = ['all'];
    } else {
        if(document.getElementById('perm-invoice').checked) perms.push('create_invoice');
        if(document.getElementById('perm-items').checked) perms.push('manage_items');
        if(document.getElementById('perm-customers').checked) perms.push('manage_customers');
        if(document.getElementById('perm-settings').checked) perms.push('manage_settings');
    }
    await window.api.addUser({ username: document.getElementById('new-user').value, password: document.getElementById('new-pass').value, role, permissions: perms });
    e.target.reset(); loadUsers();
};
async function delUser(id) { if(confirm('Delete?')) { await window.api.deleteUser({id, adminName: currentUsername}); loadUsers(); }}
function togglePermissions() { 
    const isOp = document.getElementById('new-role').value === 'operator';
    document.getElementById('permissions-container').style.opacity = isOp ? '1' : '0.5';
    document.getElementById('permissions-container').style.pointerEvents = isOp ? 'auto' : 'none';
}
function togglePassword() {
    const x = document.getElementById('login-pass'); const i = document.getElementById('toggle-password-icon');
    if (x.type === 'password') { x.type = 'text'; i.classList.replace('fa-eye', 'fa-eye-slash'); } else { x.type = 'password'; i.classList.replace('fa-eye-slash', 'fa-eye'); }
}

async function loadSettings() {
    const s = await window.api.getSettings();
    document.getElementById('set-name').value = s.name || '';
    document.getElementById('set-addr').value = s.address || '';
    document.getElementById('set-phone').value = s.phone || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-terms').value = localStorage.getItem('company_terms') || '';
    if (s.logo) document.getElementById('set-logo-preview').src = s.logo;
}
async function saveSettings() {
    localStorage.setItem('company_terms', document.getElementById('set-terms').value);
    const fileInput = document.getElementById('set-logo-input');
    let logoBase64 = document.getElementById('set-logo-preview').getAttribute('src') || '';
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function (e) { await sendSettingsData(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
    } else { await sendSettingsData(logoBase64); }
}
async function sendSettingsData(logo) {
    await window.api.saveSettings({
        name: document.getElementById('set-name').value,
        address: document.getElementById('set-addr').value,
        phone: document.getElementById('set-phone').value,
        email: document.getElementById('set-email').value,
        logo: logo
    });
    alert('Settings Saved!');
    document.getElementById('set-logo-preview').src = logo;
}

async function loadAllInvoices() {
    const invs = await window.api.getInvoices();
    const tbody = document.getElementById('all-invoices-body');
    tbody.innerHTML = '';
    invs.forEach(i => {
        tbody.innerHTML += `<tr><td>${i.invoice_no}</td><td>${i.date}</td><td>${i.customer_name||'Unknown'}</td><td>${i.grand_total}</td><td class="text-center"><div class="btn-group"><button class="btn btn-sm btn-info text-white" onclick="viewInvoice(${i.id})"><i class="fas fa-eye"></i></button><button class="btn btn-sm btn-secondary" onclick="viewInvoice(${i.id}, true)"><i class="fas fa-print"></i></button></div></td></tr>`;
    });
}
async function viewInvoice(id, autoPrint = false) {
    const invoice = await window.api.getInvoiceDetails(id);
    if (!invoice) return;

    showPage('create-invoice', false);
    document.getElementById('inv-no').value = invoice.invoice_no;
    document.getElementById('inv-date').value = invoice.date;
    const sel = document.getElementById('inv-customer');
    sel.innerHTML = `<option value="${invoice.customer_id}">${invoice.customer_name}</option>`;
    sel.disabled = true;

    const tbody = document.getElementById('inv-items-body');
    tbody.innerHTML = '';
    invoice.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', item.item_id || ''); 
        tr.innerHTML = `<td><b>${item.item_name}</b><br><small class="text-muted">${item.description||''}</small></td><td><input class="form-control price" value="${item.price}" readonly></td><td><input class="form-control qty" value="${item.qty}" readonly></td><td><span class="row-total fw-bold">${item.total}</span></td><td></td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('inv-subtotal').innerText = invoice.subtotal;
    document.getElementById('inv-grand-total').innerText = invoice.grand_total;
    document.getElementById('inv-discount-per').value = invoice.discount_percent;
    document.getElementById('inv-tax').value = invoice.tax_percent;
    document.getElementById('inv-service').value = invoice.service_charge;

    await preparePrint(false);
    if(autoPrint) setTimeout(() => window.print(), 500);
}
// Add this function anywhere in renderer.js

async function confirmRestore() {
    if (confirm("⚠️ WARNING: This will overwrite your current data with the backup file.\nThe app will restart automatically.\n\nAre you sure?")) {
        await window.api.restoreDatabase();
    }
}