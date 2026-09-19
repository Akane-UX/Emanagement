// default categories
const DEFAULT_CATEGORIES = [
    { id: 'cat_listrik', name: 'Listrik', icon: 'zap', percent: 0, allocated: 0, spent: 0 },
    { id: 'cat_kuota', name: 'Kuota Internet', icon: 'wifi', percent: 0, allocated: 0, spent: 0 },
    { id: 'cat_makan', name: 'Makan/Konsumsi', icon: 'coffee', percent: 0, allocated: 0, spent: 0 },
    { id: 'cat_pribadi', name: 'Kebutuhan Pribadi', icon: 'shopping-bag', percent: 0, allocated: 0, spent: 0 },
    { id: 'cat_lainnya', name: 'Lainnya / Tabungan', icon: 'piggy-bank', percent: 0, allocated: 0, spent: 0 }
];

// State
let appData = {
    period: '',
    initialBalance: 0,
    categories: [],
    history: []
};

// Utils
const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};
const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// DOM Elements
const views = {
    setup: document.getElementById('view-setup'),
    allocation: document.getElementById('view-allocation'),
    dashboard: document.getElementById('view-dashboard')
};
const btnReset = document.getElementById('btn-reset');

// Init
function init() {
    const savedData = localStorage.getItem('emanagement_data');
    if (savedData) {
        appData = JSON.parse(savedData);
        // Determine which view to show
        if (appData.categories.length === 0) {
            showView('allocation');
            renderAllocationForm();
        } else {
            showView('dashboard');
            renderDashboard();
        }
    } else {
        showView('setup');
    }
}

function saveData() {
    localStorage.setItem('emanagement_data', JSON.stringify(appData));
}

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    
    if (viewName === 'setup') {
        btnReset.classList.add('hidden');
    } else {
        btnReset.classList.remove('hidden');
    }
}

// SETUP LOGIC
document.getElementById('form-setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const period = document.getElementById('input-period').value;
    const balance = parseFloat(document.getElementById('input-balance').value);
    
    appData.period = period;
    appData.initialBalance = balance;
    // deep copy default categories
    appData.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)); 
    appData.history = [];
    
    saveData();
    showView('allocation');
    renderAllocationForm();
});

// ALLOCATION LOGIC
function renderAllocationForm() {
    document.getElementById('display-setup-balance').textContent = formatRp(appData.initialBalance);
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    appData.categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-4 bg-zinc-950 p-3 border border-zinc-800 rounded-xl';
        div.innerHTML = `
            <div class="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <i data-lucide="${cat.icon}" class="w-5 h-5 text-zinc-400"></i>
            </div>
            <div class="flex-1">
                <label class="block text-sm font-medium text-zinc-300">${cat.name}</label>
                <div class="text-xs text-zinc-500 mt-0.5" id="val-${cat.id}">Rp 0</div>
            </div>
            <div class="w-24 relative">
                <input type="number" min="0" max="100" class="alloc-input w-full bg-zinc-900 border border-zinc-800 rounded-lg pr-7 pl-3 py-2 text-zinc-100 text-right focus:outline-none focus:border-emerald-500" data-id="${cat.id}" value="${cat.percent || ''}" placeholder="0">
                <span class="absolute right-3 top-2 text-zinc-500 text-sm">%</span>
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
    
    // Add event listeners to inputs
    document.querySelectorAll('.alloc-input').forEach(input => {
        input.addEventListener('input', calculateTotalAllocation);
    });
    
    calculateTotalAllocation(); // initial calc
}

function calculateTotalAllocation() {
    let totalPercent = 0;
    const btnSave = document.getElementById('btn-save-allocation');
    const badge = document.getElementById('alloc-badge');
    const dispTotal = document.getElementById('total-percent-display');
    
    document.querySelectorAll('.alloc-input').forEach(input => {
        const val = parseFloat(input.value) || 0;
        totalPercent += val;
        
        // update nominal display
        const id = input.getAttribute('data-id');
        const nominal = (val / 100) * appData.initialBalance;
        document.getElementById(`val-${id}`).textContent = formatRp(nominal);
    });
    
    dispTotal.textContent = `${totalPercent}%`;
    badge.textContent = `${totalPercent} / 100%`;
    
    if (totalPercent === 100) {
        dispTotal.classList.add('text-emerald-500');
        dispTotal.classList.remove('text-red-500');
        badge.classList.add('bg-emerald-500/10', 'text-emerald-500');
        badge.classList.remove('bg-red-500/10', 'text-red-500');
        btnSave.disabled = false;
    } else {
        dispTotal.classList.add('text-red-500');
        dispTotal.classList.remove('text-emerald-500');
        badge.classList.add('bg-red-500/10', 'text-red-500');
        badge.classList.remove('bg-emerald-500/10', 'text-emerald-500');
        btnSave.disabled = true;
    }
}

document.getElementById('form-allocation').addEventListener('submit', (e) => {
    e.preventDefault();
    document.querySelectorAll('.alloc-input').forEach(input => {
        const id = input.getAttribute('data-id');
        const percent = parseFloat(input.value) || 0;
        const cat = appData.categories.find(c => c.id === id);
        if (cat) {
            cat.percent = percent;
            cat.allocated = (percent / 100) * appData.initialBalance;
            cat.spent = 0;
        }
    });
    saveData();
    showView('dashboard');
    renderDashboard();
});

// DASHBOARD LOGIC
function renderDashboard() {
    // 1. Top Summary
    const totalAllocated = appData.initialBalance;
    const totalSpent = appData.categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    
    document.getElementById('dash-period').textContent = appData.period;
    document.getElementById('dash-remaining-balance').textContent = formatRp(totalRemaining);
    document.getElementById('dash-total-spent').textContent = formatRp(totalSpent);
    document.getElementById('dash-total-budget').textContent = `dari ${formatRp(totalAllocated)}`;
    
    // 2. Categories Progress
    const catContainer = document.getElementById('dash-categories-container');
    catContainer.innerHTML = '';
    const selectCat = document.getElementById('exp-category');
    selectCat.innerHTML = '';
    
    appData.categories.forEach(cat => {
        // Build Select Options for Expense Form
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectCat.appendChild(opt);
        
        // Build Progress Card
        const remaining = cat.allocated - cat.spent;
        const percentageLeft = (remaining / cat.allocated) * 100;
        
        // Color logic
        let colorClass = 'bg-emerald-500';
        let textClass = 'text-emerald-400';
        let bgLight = 'bg-emerald-500/10';
        
        if (percentageLeft <= 15) {
            colorClass = 'bg-red-500';
            textClass = 'text-red-400';
            bgLight = 'bg-red-500/10';
        } else if (percentageLeft <= 40) {
            colorClass = 'bg-yellow-500';
            textClass = 'text-yellow-400';
            bgLight = 'bg-yellow-500/10';
        }
        
        const card = document.createElement('div');
        card.className = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg ${bgLight} flex items-center justify-center">
                        <i data-lucide="${cat.icon}" class="w-4 h-4 ${textClass}"></i>
                    </div>
                    <span class="font-medium text-sm text-zinc-300">${cat.name}</span>
                </div>
                <span class="text-xs font-semibold ${textClass}">${percentageLeft.toFixed(0)}% Sisa</span>
            </div>
            <div class="mb-2 flex justify-between items-end">
                <span class="text-lg font-bold">${formatRp(remaining)}</span>
                <span class="text-xs text-zinc-500">/ ${formatRp(cat.allocated)}</span>
            </div>
            <div class="w-full bg-zinc-950 rounded-full h-2">
                <div class="${colorClass} h-2 rounded-full transition-all duration-500" style="width: ${Math.max(0, percentageLeft)}%"></div>
            </div>
        `;
        catContainer.appendChild(card);
    });
    
    // 3. History
    const historyContainer = document.getElementById('history-container');
    if (appData.history.length === 0) {
        historyContainer.innerHTML = '<div class="text-center text-sm text-zinc-500 mt-10">Belum ada transaksi</div>';
    } else {
        historyContainer.innerHTML = '';
        // Sort newest first
        const sortedHistory = [...appData.history].reverse();
        sortedHistory.forEach(item => {
            const cat = appData.categories.find(c => c.id === item.categoryId);
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg';
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center">
                        <i data-lucide="${cat?.icon || 'circle'}" class="w-4 h-4 text-zinc-400"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-zinc-200">${cat?.name || 'Unknown'}</p>
                        <p class="text-xs text-zinc-500">${item.note || formatDate(item.date)}</p>
                    </div>
                </div>
                <div class="text-sm font-semibold text-red-400">
                    -${formatRp(item.amount)}
                </div>
            `;
            historyContainer.appendChild(div);
        });
    }
    
    lucide.createIcons();
}

// EXPENSE SUBMISSION
document.getElementById('form-expense').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const categoryId = document.getElementById('exp-category').value;
    const note = document.getElementById('exp-note').value;
    
    const catIndex = appData.categories.findIndex(c => c.id === categoryId);
    if (catIndex > -1) {
        const cat = appData.categories[catIndex];
        
        // Prevent if not enough budget? We will allow negative but show alert
        cat.spent += amount;
        
        // Add to history
        appData.history.push({
            id: Date.now(),
            categoryId,
            amount,
            note,
            date: new Date().toISOString()
        });
        
        saveData();
        
        // Check threshold after spent
        const remaining = cat.allocated - cat.spent;
        const percentageLeft = (remaining / cat.allocated) * 100;
        
        if (percentageLeft < 0) {
            showToast(`Budget ${cat.name} telah melebihi batas (Minus)!`, 'error');
        } else if (percentageLeft <= 15) {
            showToast(`Awas! Budget ${cat.name} tersisa sangat sedikit (${percentageLeft.toFixed(0)}%)`, 'warning');
        } else {
            showToast(`Pengeluaran Rp${amount.toLocaleString('id-ID')} berhasil dicatat.`, 'success');
        }
        
        // Reset form
        document.getElementById('form-expense').reset();
        
        renderDashboard();
    }
});

// RESET
btnReset.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data dan mengulang dari awal?')) {
        localStorage.removeItem('emanagement_data');
        appData = { period: '', initialBalance: 0, categories: [], history: [] };
        showView('setup');
    }
});

// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    let icon = 'check-circle';
    
    if (type === 'warning') {
        bgClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
        icon = 'alert-triangle';
    } else if (type === 'error') {
        bgClass = 'bg-red-500/10 border-red-500/20 text-red-400';
        icon = 'alert-circle';
    }
    
    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md ${bgClass}`;
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5"></i>
        <p class="text-sm font-medium">${message}</p>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300); // Wait for exit animation
    }, 4000);
}

// Start app
init();
