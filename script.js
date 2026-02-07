// --- 1. إدارة البيانات (Data Management) ---

// بيانات افتراضية للبدء
const defaultData = {
    globalLock: false, // القفل العام
    users: [
        { id: 1, name: "الإدارة العامة", code: "admin", role: "admin", phone: "", address: "", booksCount: 0, locked: false },
    ],
    receipts: []
};

// تحميل البيانات من الذاكرة المحلية
let appData = JSON.parse(localStorage.getItem('charityApp_v2_updated')) || defaultData;

function saveData() {
    localStorage.setItem('charityApp_v2_updated', JSON.stringify(appData));
}

// --- 2. إدارة الدخول (Authentication) ---

// التحقق من الدخول التلقائي عند تشغيل الصفحة
window.onload = function() {
    const savedUserCode = localStorage.getItem('autoLoginCode');
    if (savedUserCode) {
        attemptLogin(savedUserCode, true);
    }
};

function handleLogin() {
    const code = document.getElementById('login-code').value;
    attemptLogin(code, false);
}

function attemptLogin(code, isAuto) {
    const user = appData.users.find(u => u.code === code);

    // التحقق من وجود المستخدم
    if (!user) {
        if (!isAuto) alert('الرمز غير صحيح!');
        return;
    }

    // التحقق من القفل (العام أو الخاص) - الأدمن لا يُقفل
    if (user.role !== 'admin') {
        if (appData.globalLock) {
            alert('النظام مغلق مؤقتاً من قبل الإدارة.');
            return;
        }
        if (user.locked) {
            alert('حسابك موقوف، يرجى مراجعة الإدارة.');
            return;
        }
    }

    // تسجيل الدخول ناجح
    // حفظ الرمز للدخول التلقائي
    localStorage.setItem('autoLoginCode', code);
    
    appData.currentUser = user; // تعيين المستخدم الحالي في الجلسة
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = user.name;
    
    if (user.role === 'admin') {
        initAdminView();
    } else {
        initAgentView();
    }
}

function logout() {
    localStorage.removeItem('autoLoginCode'); // حذف الدخول التلقائي
    appData.currentUser = null;
    location.reload();
}

// --- 3. منطق المخول (Agent Logic) ---

function initAgentView() {
    document.getElementById('agent-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('date').valueAsDate = new Date(); // التاريخ الحالي
    
    // تحميل عدد الدفاتر المحفوظ
    const userInDB = appData.users.find(u => u.id === appData.currentUser.id);
    document.getElementById('agent-books-input').value = userInDB.booksCount || "";
    
    renderAgentTable();
    updateReceiptNumber(); 
}

// حفظ عدد الدفاتر للمخول
function saveAgentBooks() {
    const count = document.getElementById('agent-books-input').value;
    const userIndex = appData.users.findIndex(u => u.id === appData.currentUser.id);
    if (userIndex !== -1) {
        appData.users[userIndex].booksCount = count;
        saveData();
        alert('تم حفظ عدد الدفاتر.');
    }
}

function updateReceiptNumber() {
    const startNum = parseInt(document.getElementById('start-receipt-num').value) || 0;
    const myReceipts = appData.receipts.filter(r => r.userId === appData.currentUser.id);
    
    myReceipts.sort((a, b) => a.receiptNum - b.receiptNum);
    
    if (myReceipts.length > 0) {
        const lastNum = myReceipts[myReceipts.length - 1].receiptNum;
        if (startNum > lastNum) {
            document.getElementById('receipt-num').value = startNum;
        } else {
            document.getElementById('receipt-num').value = lastNum + 1;
        }
    } else {
        document.getElementById('receipt-num').value = startNum > 0 ? startNum : 1;
    }
}

function addOrUpdateReceipt() {
    const editId = document.getElementById('edit-receipt-id').value;
    
    const receiptNum = document.getElementById('receipt-num').value;
    const donorName = document.getElementById('donor-name').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const sector = document.getElementById('sector').value;
    const notes = document.getElementById('notes').value;

    if (!donorName || !amount || !receiptNum || !date || !sector) {
        alert('يرجى ملء جميع الحقول المطلوبة (الاسم، المبلغ، التاريخ، القاطع)');
        return;
    }

    if (editId) {
        // --- وضع التعديل ---
        const index = appData.receipts.findIndex(r => r.id == editId);
        if (index !== -1) {
            appData.receipts[index].receiptNum = parseInt(receiptNum);
            appData.receipts[index].donorName = donorName;
            appData.receipts[index].amount = parseFloat(amount);
            appData.receipts[index].date = date;
            appData.receipts[index].sector = sector;
            appData.receipts[index].notes = notes;
            
            saveData();
            alert('تم تعديل الوصل بنجاح');
            cancelEdit(); // الخروج من وضع التعديل
        }
    } else {
        // --- وضع الإضافة الجديد ---
        if(appData.receipts.some(r => r.receiptNum == receiptNum)) {
            alert('رقم الوصل مكرر! يرجى التأكد.');
            return;
        }

        const newReceipt = {
            id: Date.now(),
            userId: appData.currentUser.id,
            userName: appData.currentUser.name,
            receiptNum: parseInt(receiptNum),
            donorName,
            amount: parseFloat(amount),
            date,
            sector,
            notes,
            entryDate: new Date().toLocaleString('ar-IQ')
        };

        appData.receipts.push(newReceipt);
        saveData();
        
        document.getElementById('donor-name').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('notes').value = '';
        alert('تمت الإضافة بنجاح');
        updateReceiptNumber();
    }
    
    renderAgentTable();
}

function prepareEdit(id) {
    const receipt = appData.receipts.find(r => r.id === id);
    if (!receipt) return;

    document.getElementById('edit-receipt-id').value = receipt.id;
    document.getElementById('receipt-num').value = receipt.receiptNum;
    document.getElementById('donor-name').value = receipt.donorName;
    document.getElementById('amount').value = receipt.amount;
    document.getElementById('date').value = receipt.date;
    document.getElementById('sector').value = receipt.sector;
    document.getElementById('notes').value = receipt.notes;

    document.getElementById('form-title').innerText = "تعديل الوصل";
    document.getElementById('save-btn').innerText = "حفظ التعديلات";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
    
    document.getElementById('form-title').scrollIntoView({behavior: 'smooth'});
}

function cancelEdit() {
    document.getElementById('edit-receipt-id').value = '';
    document.getElementById('form-title').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة وصل جديد';
    document.getElementById('save-btn').innerText = "حفظ الوصل";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
    
    document.getElementById('donor-name').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('notes').value = '';
    
    updateReceiptNumber();
}

function renderAgentTable() {
    const tbody = document.querySelector('#agent-table tbody');
    tbody.innerHTML = '';
    
    const myReceipts = appData.receipts.filter(r => r.userId === appData.currentUser.id);
    
    // تحديث الإحصائيات (العدد + المبلغ) للمخول
    document.getElementById('agent-receipts-count').innerText = myReceipts.length;
    const totalMyAmount = myReceipts.reduce((sum, r) => sum + r.amount, 0);
    document.getElementById('agent-total-amount').innerText = totalMyAmount.toLocaleString() + ' د.ع';

    // ترتيب تنازلي (الأحدث فوق)
    myReceipts.sort((a, b) => b.receiptNum - a.receiptNum).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.receiptNum}</td>
            <td>${r.donorName}</td>
            <td>${r.amount.toLocaleString()}</td>
            <td>${r.date}</td>
            <td>${r.notes}</td>
            <td>
                <button onclick="prepareEdit(${r.id})" class="btn btn-warning" style="padding: 5px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteReceipt(${r.id})" class="btn btn-danger" style="padding: 5px;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteReceipt(id) {
    if(confirm('هل أنت متأكد من الحذف؟')) {
        appData.receipts = appData.receipts.filter(r => r.id !== id);
        saveData();
        renderAgentTable();
        updateReceiptNumber();
        if(appData.currentUser && appData.currentUser.role === 'admin') {
            renderAdminTable();
            updateAdminStats();
            renderAgentsSummary(); // لتحديث الملخص عند الحذف
        }
    }
}

function exportAgentData() {
    const myReceipts = appData.receipts.filter(r => r.userId === appData.currentUser.id);
    if(myReceipts.length === 0) { alert('لا توجد بيانات للتصدير'); return; }

    const dataToExport = myReceipts.map(r => ({
        "رقم الوصل": r.receiptNum,
        "اسم المساهم": r.donorName,
        "المبلغ": r.amount,
        "التاريخ": r.date,
        "القاطع": r.sector,
        "الملاحظات": r.notes
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الوصولات");
    XLSX.writeFile(wb, `وصولات_${appData.currentUser.name}.xlsx`);
}

// --- 4. منطق المدير (Admin Logic) ---

function initAdminView() {
    document.getElementById('agent-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    
    updateAdminStats();
    populateAgentFilter();
    renderAdminTable();
    renderUsersControlTable();
    updateGlobalLockButton();
}

function updateAdminStats() {
    const totalAmount = appData.receipts.reduce((sum, r) => sum + r.amount, 0);
    const agentCount = appData.users.filter(u => u.role === 'agent').length;

    document.getElementById('total-amount').innerText = totalAmount.toLocaleString() + ' د.ع';
    document.getElementById('total-percentage').innerText = (totalAmount * 0.10).toLocaleString() + ' د.ع';
    document.getElementById('total-agents').innerText = agentCount;
    document.getElementById('total-receipts').innerText = appData.receipts.length;
}

function populateAgentFilter() {
    const select = document.getElementById('admin-filter-agent');
    select.innerHTML = '<option value="all">كل المخولين</option>';
    appData.users.filter(u => u.role === 'agent').forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name;
        select.appendChild(opt);
    });
}

function renderAdminTable() {
    const tbody = document.querySelector('#admin-table tbody');
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('admin-search').value.toLowerCase();
    const filterAgent = document.getElementById('admin-filter-agent').value;

    let filteredReceipts = appData.receipts.filter(r => {
        const agentUser = appData.users.find(u => u.id === r.userId);
        const agentName = agentUser ? agentUser.name : r.userName;

        const matchesSearch = r.donorName.toLowerCase().includes(searchTerm) || 
                              r.receiptNum.toString().includes(searchTerm) ||
                              agentName.toLowerCase().includes(searchTerm);
                              
        const matchesAgent = filterAgent === 'all' || r.userId == filterAgent;
        return matchesSearch && matchesAgent;
    });

    filteredReceipts.forEach(r => {
        const agentUser = appData.users.find(u => u.id === r.userId);
        const agentName = agentUser ? agentUser.name : r.userName;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.receiptNum}</td>
            <td>${agentName}</td>
            <td>${r.donorName}</td>
            <td>${r.amount.toLocaleString()}</td>
            <td>${r.date}</td>
            <td><small>${r.entryDate}</small></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button onclick="prepareAdminEdit(${r.id})" class="btn btn-warning" style="padding: 2px 8px; font-size: 10px;">تعديل</button>
                    <button onclick="deleteReceipt(${r.id})" class="btn btn-danger" style="padding: 2px 8px; font-size: 10px;">حذف</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- منطق تعديل الوصل من الأدمن ---
function prepareAdminEdit(id) {
    const receipt = appData.receipts.find(r => r.id === id);
    if(!receipt) return;

    document.getElementById('admin-edit-receipt-id').value = receipt.id;
    document.getElementById('admin-edit-num').value = receipt.receiptNum;
    document.getElementById('admin-edit-donor').value = receipt.donorName;
    document.getElementById('admin-edit-amount').value = receipt.amount;
    document.getElementById('admin-edit-date').value = receipt.date;
    document.getElementById('admin-edit-sector').value = receipt.sector;
    document.getElementById('admin-edit-notes').value = receipt.notes;

    document.getElementById('admin-edit-receipt-modal').classList.remove('hidden');
}

function saveAdminReceiptEdit() {
    const id = document.getElementById('admin-edit-receipt-id').value;
    const receiptNum = document.getElementById('admin-edit-num').value;
    const donorName = document.getElementById('admin-edit-donor').value;
    const amount = document.getElementById('admin-edit-amount').value;
    const date = document.getElementById('admin-edit-date').value;
    const sector = document.getElementById('admin-edit-sector').value;
    const notes = document.getElementById('admin-edit-notes').value;

    const index = appData.receipts.findIndex(r => r.id == id);
    if(index !== -1) {
        appData.receipts[index].receiptNum = parseInt(receiptNum);
        appData.receipts[index].donorName = donorName;
        appData.receipts[index].amount = parseFloat(amount);
        appData.receipts[index].date = date;
        appData.receipts[index].sector = sector;
        appData.receipts[index].notes = notes;

        saveData();
        renderAdminTable();
        updateAdminStats(); // تحديث الإحصائيات
        closeAdminEditModal();
        alert('تم تعديل الوصل بنجاح');
    }
}

function closeAdminEditModal() {
    document.getElementById('admin-edit-receipt-modal').classList.add('hidden');
}

// --- جديد: تفريغ البيانات ---
function clearAllData() {
    if(confirm('تحذير خطير: سيتم حذف جميع الوصولات لكل المخولين وتصفير عداد الدفاتر، ولكن سيبقى حساب المخول كما هو. هل أنت متأكد؟')) {
        appData.receipts = [];
        appData.users.forEach(u => {
            u.booksCount = 0; 
        });
        saveData();
        updateAdminStats();
        renderAdminTable();
        alert('تم تفريغ البيانات وتصفير العدادات بنجاح.');
    }
}

// --- جديد: جدول التحكم بالمستخدمين (القفل والتعديل والحذف) ---
function renderUsersControlTable() {
    const tbody = document.querySelector('#users-control-table tbody');
    tbody.innerHTML = '';

    appData.users.filter(u => u.role === 'agent').forEach(u => {
        const tr = document.createElement('tr');
        // تمت إضافة عمود عدد الدفاتر
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.phone || '-'}</td>
            <td><strong style="color:var(--primary); font-size:1.1em;">${u.booksCount || 0}</strong></td>
            <td>${u.address || '-'}</td>
            <td>
                ${u.locked ? '<span style="color:red; font-weight:bold;">مقفول</span>' : '<span style="color:green;">نشط</span>'}
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button onclick="toggleUserLock(${u.id})" class="btn ${u.locked ? 'btn-primary' : 'btn-danger'}" style="padding: 5px 10px; font-size: 11px;">
                        ${u.locked ? '<i class="fas fa-unlock"></i>' : '<i class="fas fa-lock"></i>'}
                    </button>
                    <button onclick="prepareEditAgent(${u.id})" class="btn btn-warning" style="padding: 5px 10px; font-size: 11px;">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    <button onclick="deleteAgent(${u.id})" class="btn btn-danger" style="padding: 5px 10px; font-size: 11px;">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleUserLock(userId) {
    const user = appData.users.find(u => u.id === userId);
    if(user) {
        user.locked = !user.locked; 
        saveData();
        renderUsersControlTable();
    }
}

// --- وظائف إدارة المخولين (تعديل وحذف) ---
function prepareEditAgent(userId) {
    const user = appData.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('edit-agent-id').value = user.id;
    document.getElementById('new-agent-name').value = user.name;
    document.getElementById('new-agent-phone').value = user.phone;
    document.getElementById('new-agent-address').value = user.address;
    document.getElementById('new-agent-code').value = user.code;
    
    document.getElementById('agent-modal-title').innerText = "تعديل بيانات المخول";
    toggleAgentModal();
}

function deleteAgent(userId) {
    if(confirm('هل أنت متأكد من حذف هذا المخول نهائياً؟ سيتم حذف حسابه فقط ولن تُحذف وصولاته المسجلة سابقاً باسمه.')) {
        appData.users = appData.users.filter(u => u.id !== userId);
        saveData();
        renderUsersControlTable();
        populateAgentFilter();
        updateAdminStats();
    }
}

function saveAgentProcess() {
    const editId = document.getElementById('edit-agent-id').value;
    const name = document.getElementById('new-agent-name').value;
    const phone = document.getElementById('new-agent-phone').value;
    const address = document.getElementById('new-agent-address').value;
    const code = document.getElementById('new-agent-code').value;

    if(!name || !code) { alert('الاسم والرمز حقول إجبارية'); return; }

    if (editId) {
        const index = appData.users.findIndex(u => u.id == editId);
        if (index !== -1) {
            if(appData.users.some(u => u.code === code && u.id != editId)) {
                alert('الرمز مستخدم مسبقاً من مخول آخر');
                return;
            }
            appData.users[index].name = name;
            appData.users[index].phone = phone;
            appData.users[index].address = address;
            appData.users[index].code = code;
            alert('تم التعديل بنجاح');
        }
    } else {
        if(appData.users.some(u => u.code === code)) { alert('الرمز مستخدم مسبقاً'); return; }
        appData.users.push({
            id: Date.now(),
            name: name,
            phone: phone,
            address: address,
            code: code,
            role: 'agent',
            booksCount: 0,
            locked: false
        });
        alert('تمت إضافة المخول بنجاح');
    }
    
    saveData();
    toggleAgentModal();
    populateAgentFilter();
    updateAdminStats();
    renderUsersControlTable();
}

// --- جديد: القفل العام ---
function toggleGlobalLock() {
    appData.globalLock = !appData.globalLock;
    saveData();
    updateGlobalLockButton();
}

function updateGlobalLockButton() {
    const btn = document.getElementById('global-lock-btn');
    if (appData.globalLock) {
        btn.innerHTML = '<i class="fas fa-unlock"></i> فتح النظام للجميع';
        btn.classList.remove('btn-dark');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = '<i class="fas fa-lock"></i> قفل النظام عام';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-dark');
    }
}

function toggleAgentModal() {
    const modal = document.getElementById('agent-modal');
    modal.classList.toggle('hidden');
    if(modal.classList.contains('hidden')) {
        document.getElementById('edit-agent-id').value = '';
        document.getElementById('new-agent-name').value = '';
        document.getElementById('new-agent-phone').value = '';
        document.getElementById('new-agent-address').value = '';
        document.getElementById('new-agent-code').value = '';
        document.getElementById('agent-modal-title').innerText = "إضافة مخول جديد";
    }
}

// --- جديد: وظائف ملخص مبالغ المخولين ---
function toggleAgentsSummaryModal() {
    const modal = document.getElementById('agents-summary-modal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderAgentsSummary();
    }
}

function renderAgentsSummary() {
    const tbody = document.querySelector('#agents-summary-table tbody');
    tbody.innerHTML = '';
    
    appData.users.filter(u => u.role === 'agent').forEach(u => {
        const userReceipts = appData.receipts.filter(r => r.userId === u.id);
        const totalAmount = userReceipts.reduce((sum, r) => sum + r.amount, 0);
        
        const tr = document.createElement('tr');
        // الترتيب الجديد: اسم - عدد - مبلغ - نسبة
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${userReceipts.length}</td>
            <td style="font-weight:bold;">${totalAmount.toLocaleString()} د.ع</td>
            <td style="color:var(--danger); font-weight:bold;">${(totalAmount * 0.10).toLocaleString()} د.ع</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportAgentsSummary() {
    const dataToExport = appData.users.filter(u => u.role === 'agent').map(u => {
        const userReceipts = appData.receipts.filter(r => r.userId === u.id);
        const totalAmount = userReceipts.reduce((sum, r) => sum + r.amount, 0);
        return {
            "اسم المخول": u.name,
            "عدد الوصولات": userReceipts.length,
            "المبلغ الكلي": totalAmount,
            "النسبة الكلية (10%)": totalAmount * 0.10
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ملخص المخولين");
    XLSX.writeFile(wb, `ملخص_المبالغ_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportAllData() {
    const dataToExport = appData.receipts.map(r => {
        const agentUser = appData.users.find(u => u.id === r.userId);
        return {
            "اسم المخول": agentUser ? agentUser.name : r.userName,
            "رقم الوصل": r.receiptNum,
            "اسم المساهم": r.donorName,
            "المبلغ": r.amount,
            "التاريخ": r.date,
            "القاطع": r.sector,
            "تاريخ الإدخال للنظام": r.entryDate
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كل البيانات");
    XLSX.writeFile(wb, `تقرير_شامل_${new Date().toISOString().slice(0,10)}.xlsx`);
}
