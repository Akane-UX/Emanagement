// Predefined Categories
const PRESET_CATEGORIES = [
    { id: 'cat_listrik', name: 'Listrik', icon: 'zap' },
    { id: 'cat_kuota', name: 'Kuota Internet', icon: 'wifi' },
    { id: 'cat_makan', name: 'Makan/Minum', icon: 'coffee' },
    { id: 'cat_pribadi', name: 'Kebutuhan Pribadi', icon: 'shopping-bag' },
    { id: 'cat_kendaraan', name: 'Bensin/Transport', icon: 'car' },
    { id: 'cat_tabungan', name: 'Tabungan', icon: 'piggy-bank' },
    { id: 'cat_hiburan', name: 'Hiburan', icon: 'gamepad-2' }
];

// State
let appData = {
    period: '',
    initialBalance: 0,
    categories: [], // { id, name, icon, allocated, spent }
    history: []
};

// Selection State (Temp)
let selectedCats = [];

// Utils
const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const generateId = () => 'custom_' + Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// DOM
const views = ['setup', 'categories', 'allocation', 'dashboard'].reduce((acc, v) => {
    acc[v] = document.getElementById(`view-${v}`);
    return acc;
}, {});
const btnReset = document.getElementById('btn-reset');

function init() {
    const saved = localStorage.getItem('emanagement_data_v2');
    if (saved) {
        appData = JSON.parse(saved);
        if (appData.categories.length === 0 || !appData.categories[0].allocated) {
            // Data incomplete, go to start
            showView('setup');
        } else {
            showView('dashboard');
            renderDashboard();
        }
    } else {
        showView('setup');
    }
}

function saveData() {
    localStorage.setItem('emanagement_data_v2', JSON.stringify(appData));
}

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    
    if (viewName === 'setup' || viewName === 'categories') {
        btnReset.classList.add('hidden');
    } else {
        btnReset.classList.remove('hidden');
    }
}

// 1. SETUP LOGIC
document.getElementById('form-setup').addEventListener('submit', (e) => {
    e.preventDefault();
    appData.period = document.getElementById('input-period').value;
    appData.initialBalance = parseFloat(document.getElementById('input-balance').value);
    appData.history = [];
    
    // Reset selections
    selectedCats = [...PRESET_CATEGORIES.slice(0, 4)]; // default select first 4
    
    showView('categories');
    renderCategorySelection();
});

// 2. CATEGORY SELECTION LOGIC
function renderCategorySelection() {
    const container = document.getElementById('preset-categories');
    container.innerHTML = '';
    
    const allOptions = [...PRESET_CATEGORIES, ...selectedCats.filter(c => c.id.startsWith('custom_'))];
    
    // Deduplicate just in case
    const uniqueOptions = Array.from(new Set(allOptions.map(a => a.id)))
        .map(id => allOptions.find(a => a.id === id));
        
    uniqueOptions.forEach(cat => {
        const isSelected = selectedCats.some(c => c.id === cat.id);
        const div = document.createElement('div');
        div.className = `cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center select-none transform active:scale-95 ${isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-surface hover:border-slate-600'}`;
        div.innerHTML = `
            <i data-lucide="${cat.icon}" class="w-6 h-6 ${isSelected ? 'text-brand-400' : 'text-slate-400'}"></i>
            <span class="text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}">${cat.name}</span>
        `;
        div.addEventListener('click', () => {
            if (isSelected) {
                selectedCats = selectedCats.filter(c => c.id !== cat.id);
            } else {
                selectedCats.push(cat);
            }
            renderCategorySelection();
        });
        container.appendChild(div);
    });
    lucide.createIcons();
    
    const btnNext = document.getElementById('btn-to-allocation');
    btnNext.disabled = selectedCats.length === 0;
    btnNext.className = btnNext.disabled ? 'flex-1 bg-slate-800 text-slate-500 font-semibold py-4 rounded-2xl cursor-not-allowed transition-all' : 'flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-4 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-brand-500/20';
}

document.getElementById('btn-add-custom-cat').addEventListener('click', () => {
    const input = document.getElementById('custom-cat-name');
    const name = input.value.trim();
    if (name) {
        const newCat = { id: generateId(), name, icon: 'folder' };
        selectedCats.push(newCat);
        input.value = '';
        renderCategorySelection();
    }
});

document.getElementById('btn-to-allocation').addEventListener('click', () => {
    if (selectedCats.length === 0) return;
    
    // Prepare appData.categories based on selectedCats
    appData.categories = selectedCats.map(c => ({
        ...c,
        allocated: 0,
        spent: 0
    }));
    
    showView('allocation');
    renderAllocationUI();
});

// 3. ALLOCATION LOGIC
function renderAllocationUI() {
    const container = document.getElementById('alloc-sliders-container');
    container.innerHTML = '';
    
    appData.categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'bg-surface/50 border border-slate-700/30 p-5 rounded-2xl';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        <i data-lucide="${cat.icon}" class="w-5 h-5 text-slate-300"></i>
                    </div>
                    <label class="font-semibold text-slate-200">${cat.name}</label>
                </div>
                <div class="relative w-1/3 min-w-[120px]">
                    <span class="absolute left-3 top-2 text-slate-500 text-sm">Rp</span>
                    <input type="number" min="0" class="alloc-num w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white font-medium focus:outline-none focus:border-brand-500 text-right" data-id="${cat.id}" value="${cat.allocated}">
                </div>
            </div>
            <div class="relative w-full">
                <input type="range" min="0" max="${appData.initialBalance}" value="${cat.allocated}" step="1000" class="alloc-slider" data-id="${cat.id}">
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
    
    document.querySelectorAll('.alloc-slider').forEach(el => el.addEventListener('input', handleAllocationChange));
    document.querySelectorAll('.alloc-num').forEach(el => {
        el.addEventListener('input', handleAllocationChange);
        el.addEventListener('change', handleAllocationChange); // Catch blur
    });
    
    updateAllocationState();
}

function handleAllocationChange(e) {
    const id = e.target.getAttribute('data-id');
    let val = parseFloat(e.target.value) || 0;
    if (val < 0) val = 0;
    
    const cat = appData.categories.find(c => c.id === id);
    
    // Calculate how much others take
    const otherTotal = appData.categories.filter(c => c.id !== id).reduce((s, c) => s + c.allocated, 0);
    const maxAllowed = appData.initialBalance - otherTotal;
    
    if (val > maxAllowed) {
        val = maxAllowed;
    }
    
    cat.allocated = val;
    
    // Sync UI for this category
    const row = e.target.closest('.bg-surface\\/50');
    if (row) {
        const slider = row.querySelector('.alloc-slider');
        const numInput = row.querySelector('.alloc-num');
        if (slider && e.target !== slider) slider.value = val;
        if (numInput && e.target !== numInput) numInput.value = val;
    }
    
    updateAllocationState();
}

function updateAllocationState() {
    let total = 0;
    appData.categories.forEach(cat => { total += cat.allocated; });
    
    const remaining = appData.initialBalance - total;
    const disp = document.getElementById('alloc-remaining-display');
    const btnSave = document.getElementById('btn-save-allocation');
    
    disp.textContent = formatRp(remaining);
    
    // Update max constraints on all sliders dynamically based on current remaining
    document.querySelectorAll('.alloc-slider').forEach(slider => {
        const id = slider.getAttribute('data-id');
        const cat = appData.categories.find(c => c.id === id);
        slider.max = cat.allocated + remaining; // Max they can slide is their current value + whatever is left
    });
    
    if (remaining >= 0) {
        if (remaining === 0) {
            disp.classList.add('text-emerald-400');
            disp.classList.remove('text-brand-400');
        } else {
            disp.classList.add('text-brand-400');
            disp.classList.remove('text-emerald-400');
        }
        btnSave.disabled = false;
    } else {
        btnSave.disabled = true;
    }
}

document.getElementById('form-allocation').addEventListener('submit', (e) => {
    e.preventDefault();
    saveData();
    showView('dashboard');
    renderDashboard();
});

// 4. DASHBOARD LOGIC
function renderDashboard() {
    const totalAllocated = appData.initialBalance;
    const totalSpent = appData.categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    
    document.getElementById('dash-period').textContent = appData.period;
    document.getElementById('dash-remaining-balance').textContent = formatRp(totalRemaining);
    document.getElementById('dash-total-spent').textContent = formatRp(totalSpent);
    document.getElementById('dash-total-budget').textContent = `dari ${formatRp(totalAllocated)}`;
    
    const mainProgress = (totalSpent / totalAllocated) * 100;
    const mainBar = document.getElementById('dash-main-progress');
    mainBar.style.width = `${Math.min(100, mainProgress)}%`;
    if (mainProgress > 85) mainBar.className = 'bg-gradient-to-r from-red-600 to-red-400 h-3 rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(239,68,68,0.5)]';
    else if (mainProgress > 60) mainBar.className = 'bg-gradient-to-r from-yellow-600 to-yellow-400 h-3 rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(234,179,8,0.5)]';
    else mainBar.className = 'bg-gradient-to-r from-brand-600 to-indigo-500 h-3 rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(59,130,246,0.5)]';
    
    const catContainer = document.getElementById('dash-categories-container');
    catContainer.innerHTML = '';
    
    const selectCat = document.getElementById('exp-category');
    selectCat.innerHTML = '<option value="" disabled selected>Pilih Kategori</option>';
    
    appData.categories.forEach(cat => {
        // Dropdown
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectCat.appendChild(opt);
        
        // Progress Card
        const remaining = cat.allocated - cat.spent;
        const percentageLeft = cat.allocated > 0 ? (remaining / cat.allocated) * 100 : 0;
        
        let colorTheme = 'emerald';
        if (percentageLeft <= 15) colorTheme = 'red';
        else if (percentageLeft <= 40) colorTheme = 'yellow';
        
        const card = document.createElement('div');
        card.className = 'bg-surface border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-${colorTheme}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-lucide="${cat.icon}" class="w-5 h-5 text-${colorTheme}-400"></i>
                    </div>
                    <span class="font-semibold text-slate-200">${cat.name}</span>
                </div>
                <div class="text-right">
                    <span class="block text-lg font-bold text-slate-100">${formatRp(remaining)}</span>
                    <span class="text-xs font-medium text-slate-500">dari ${formatRp(cat.allocated)}</span>
                </div>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-2 border border-slate-800">
                <div class="bg-${colorTheme}-500 h-1.5 mt-[1px] ml-[1px] rounded-full transition-all duration-1000" style="width: ${Math.max(0, percentageLeft)}%; max-width: calc(100% - 2px);"></div>
            </div>
        `;
        catContainer.appendChild(card);
    });
    
    renderHistory();
    lucide.createIcons();
}

function renderHistory() {
    const historyContainer = document.getElementById('history-container');
    if (appData.history.length === 0) {
        historyContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <i data-lucide="ghost" class="w-10 h-10 mb-2"></i>
                <p class="text-sm font-medium">Belum ada pengeluaran</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = '';
    const sorted = [...appData.history].reverse();
    
    sorted.forEach((item, index) => {
        const cat = appData.categories.find(c => c.id === item.categoryId);
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl animate-fade-in`;
        div.style.animationDelay = `${index * 0.05}s`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-surface flex items-center justify-center border border-slate-700">
                    <i data-lucide="${cat?.icon || 'circle'}" class="w-4 h-4 text-slate-400"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-slate-200">${cat?.name || 'Unknown'}</p>
                    <p class="text-xs text-slate-500">${item.note || formatDate(item.date)}</p>
                </div>
            </div>
            <div class="text-sm font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-md">
                -${formatRp(item.amount)}
            </div>
        `;
        historyContainer.appendChild(div);
    });
}

document.getElementById('form-expense').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const categoryId = document.getElementById('exp-category').value;
    const note = document.getElementById('exp-note').value;
    
    if(!categoryId) {
        showToast('Silakan pilih kategori!', 'error');
        return;
    }
    
    const cat = appData.categories.find(c => c.id === categoryId);
    if (cat) {
        cat.spent += amount;
        
        appData.history.push({
            id: Date.now(),
            categoryId,
            amount,
            note,
            date: new Date().toISOString()
        });
        
        saveData();
        
        const percentageLeft = ((cat.allocated - cat.spent) / cat.allocated) * 100;
        if (percentageLeft < 0) showToast(`Overbudget! Kategori ${cat.name} minus.`, 'error');
        else if (percentageLeft <= 15) showToast(`Kritis! Budget ${cat.name} tersisa sedikit.`, 'warning');
        else showToast('Pengeluaran berhasil dicatat.', 'success');
        
        document.getElementById('form-expense').reset();
        renderDashboard();
    }
});

// RESET
btnReset.addEventListener('click', () => {
    if (confirm('Hapus seluruh riwayat dan mulai ulang dari 0?')) {
        localStorage.removeItem('emanagement_data_v2');
        appData = { period: '', initialBalance: 0, categories: [], history: [] };
        selectedCats = [];
        showView('setup');
    }
});

// TOAST
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let style = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    let icon = 'check-circle-2';
    
    if (type === 'warning') {
        style = 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
        icon = 'alert-triangle';
    } else if (type === 'error') {
        style = 'border-red-500/30 bg-red-500/10 text-red-400';
        icon = 'alert-circle';
    }
    
    toast.className = `toast-enter flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/50 ${style}`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i><p class="text-sm font-semibold">${message}</p>`;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Start app
init();
