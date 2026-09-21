const PRESET_CATEGORIES = [
    { id: 'cat_listrik', name: 'Listrik', icon: 'zap' },
    { id: 'cat_kuota', name: 'Kuota Internet', icon: 'wifi' },
    { id: 'cat_makan', name: 'Makan/Minum', icon: 'coffee' },
    { id: 'cat_pribadi', name: 'Kebutuhan Pribadi', icon: 'shopping-bag' },
    { id: 'cat_kendaraan', name: 'Bensin/Transport', icon: 'car' },
    { id: 'cat_tabungan', name: 'Tabungan', icon: 'piggy-bank' },
    { id: 'cat_hiburan', name: 'Hiburan', icon: 'gamepad-2' }
];

let appData = {
    period: '',
    periodDays: 0,
    startDate: '',
    endDate: '',
    initialBalance: 0,
    categories: [],
    history: []
};

let selectedCats = [];

const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const generateId = () => 'custom_' + Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const parseFormattedNumber = (val) => {
    if (!val) return 0;
    const cleaned = val.toString().replace(/\D/g, '');
    return parseFloat(cleaned) || 0;
};

const formatNumberInput = (e) => {
    const el = e.target;
    let cursor = el.selectionStart;
    let oldLength = el.value.length;
    let val = el.value.replace(/\D/g, '');
    if (val) val = parseInt(val, 10).toLocaleString('id-ID');
    el.value = val;
    let newPos = cursor + (el.value.length - oldLength);
    el.setSelectionRange(newPos, newPos);
};

const views = ['setup', 'categories', 'allocation', 'dashboard'].reduce((acc, v) => {
    acc[v] = document.getElementById(`view-${v}`);
    return acc;
}, {});
const btnReset = document.getElementById('btn-reset');
let currentView = null;

function init() {
    Object.values(views).forEach(v => {
        v.classList.remove('active');
        gsap.set(v, { opacity: 0, autoAlpha: 0, y: 20 });
    });

    const saved = localStorage.getItem('emanagement_data_v2');
    if (saved) {
        appData = JSON.parse(saved);
        if (appData.categories.length === 0 || typeof appData.categories[0].allocated === 'undefined') {
            transitionTo('setup');
        } else {
            transitionTo('dashboard');
            renderDashboard();
        }
    } else {
        transitionTo('setup');
    }
}

function saveData() {
    localStorage.setItem('emanagement_data_v2', JSON.stringify(appData));
}

function transitionTo(viewName) {
    if (currentView === viewName) return;
    
    const nextViewEl = views[viewName];
    const prevViewEl = currentView ? views[currentView] : null;

    if (viewName === 'setup' || viewName === 'categories') {
        gsap.to(btnReset, { autoAlpha: 0, duration: 0.2 });
    } else {
        gsap.to(btnReset, { autoAlpha: 1, duration: 0.3, delay: 0.2 });
    }

    const tl = gsap.timeline();

    if (prevViewEl) {
        tl.to(prevViewEl, { 
            opacity: 0, 
            y: -10, 
            duration: 0.2, 
            ease: "power2.in",
            onComplete: () => {
                prevViewEl.classList.remove('active');
                prevViewEl.style.visibility = 'hidden';
            }
        });
    }

    tl.call(() => {
        nextViewEl.classList.add('active');
        nextViewEl.style.visibility = 'visible';
        currentView = viewName;

        if (viewName === 'dashboard') {
            gsap.set(nextViewEl, { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" });
            const bentoItems = nextViewEl.querySelectorAll('.bento-item');
            gsap.fromTo(bentoItems, 
                { opacity: 0, y: -30, scale: 0.95 },
                { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    stagger: 0.05, 
                    duration: 0.5, 
                    ease: "power3.out",
                    clearProps: "all" 
                }
            );
        }
    });

    if (viewName !== 'dashboard') {
        tl.fromTo(nextViewEl, 
            { autoAlpha: 0, y: -20, scale: 0.98 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }
        );
    }
}

document.getElementById('form-setup').addEventListener('submit', (e) => {
    e.preventDefault();
    appData.period = document.getElementById('input-period').value;
    appData.periodDays = parseInt(document.getElementById('input-period-days').value) || 0;
    appData.initialBalance = parseFormattedNumber(document.getElementById('input-balance').value);
    appData.history = [];

    if (appData.period === 'Kustom' && (!calStartDate || !calEndDate)) {
        showToast('Pilih tanggal mulai dan selesai!', 'error');
        return;
    }

    if (appData.period === 'Kustom') {
        appData.startDate = calStartDate.toISOString().split('T')[0];
        appData.endDate = calEndDate.toISOString().split('T')[0];
        const diffMs = calEndDate - calStartDate;
        appData.periodDays = Math.round(diffMs / 86400000) + 1;
    } else {
        appData.startDate = '';
        appData.endDate = '';
    }

    selectedCats = [...PRESET_CATEGORIES.slice(0, 4)];

    transitionTo('categories');
    renderCategorySelection();
});

let calViewYear, calViewMonth, calStartDate = null, calEndDate = null, calSelecting = 'start';

document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active-period'));
        btn.classList.add('active-period');

        const period = btn.getAttribute('data-period');
        const days = btn.getAttribute('data-days');
        document.getElementById('input-period').value = period;
        document.getElementById('input-period-days').value = days;

        const picker = document.getElementById('date-range-picker');
        if (period === 'Kustom') {
            picker.classList.remove('hidden');
            gsap.fromTo(picker, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
            const now = new Date();
            calViewYear = now.getFullYear();
            calViewMonth = now.getMonth();
            calStartDate = null;
            calEndDate = null;
            calSelecting = 'start';
            renderCalendar();
        } else {
            if (!picker.classList.contains('hidden')) {
                gsap.to(picker, { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in', onComplete: () => picker.classList.add('hidden') });
            }
            calStartDate = null;
            calEndDate = null;
        }
    });
});

document.getElementById('cal-prev').addEventListener('click', () => {
    calViewMonth--;
    if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
    renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
    calViewMonth++;
    if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
    renderCalendar();
});

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function renderCalendar() {
    document.getElementById('cal-month-label').textContent = `${MONTH_NAMES[calViewMonth]} ${calViewYear}`;

    const grid = document.getElementById('cal-days');
    grid.innerHTML = '';

    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day cal-day-empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const cellDate = new Date(calViewYear, calViewMonth, d);
        cellDate.setHours(0,0,0,0);

        let classes = 'cal-day';

        if (cellDate < today) {
            classes += ' cal-day-disabled';
        }

        if (cellDate.getTime() === today.getTime()) {
            classes += ' cal-day-today';
        }

        if (calStartDate && calEndDate) {
            const s = calStartDate.getTime(), e = calEndDate.getTime(), c = cellDate.getTime();
            if (c === s) classes += ' cal-day-start';
            if (c === e) classes += ' cal-day-end';
            if (c > s && c < e) classes += ' cal-day-in-range';
        } else if (calStartDate && cellDate.getTime() === calStartDate.getTime()) {
            classes += ' cal-day-start cal-day-end';
        }

        cell.className = classes;
        cell.textContent = d;

        if (cellDate >= today) {
            cell.addEventListener('click', () => handleCalDayClick(cellDate));
        }

        grid.appendChild(cell);
    }

    lucide.createIcons();
    updateCalSummary();
}

function handleCalDayClick(date) {
    if (calSelecting === 'start' || (calStartDate && date < calStartDate)) {
        calStartDate = date;
        calEndDate = null;
        calSelecting = 'end';
    } else {
        calEndDate = date;
        calSelecting = 'start';
    }
    renderCalendar();
}

function updateCalSummary() {
    const summary = document.getElementById('cal-range-summary');
    if (calStartDate && calEndDate) {
        const fmt = d => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        document.getElementById('cal-start-label').textContent = fmt(calStartDate);
        document.getElementById('cal-end-label').textContent = fmt(calEndDate);
        const days = Math.round((calEndDate - calStartDate) / 86400000) + 1;
        document.getElementById('cal-days-count').textContent = days;
        document.getElementById('input-period-days').value = days;
        summary.classList.remove('hidden');
    } else {
        summary.classList.add('hidden');
    }
}

function renderCategorySelection() {
    const container = document.getElementById('preset-categories');
    container.innerHTML = '';

    const allOptions = [...PRESET_CATEGORIES, ...selectedCats.filter(c => c.id.startsWith('custom_'))];
    
    const uniqueOptions = Array.from(new Set(allOptions.map(a => a.id)))
        .map(id => allOptions.find(a => a.id === id));
        
    uniqueOptions.forEach(cat => {
        const isSelected = selectedCats.some(c => c.id === cat.id);
        const div = document.createElement('div');
        div.className = `cursor-pointer p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center select-none transform active:scale-95 ${isSelected ? 'border-zinc-600 bg-zinc-800/30' : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5'}`;
        div.innerHTML = `
            <i data-lucide="${cat.icon}" class="w-5 h-5 transition-colors ${isSelected ? 'text-zinc-200' : 'text-zinc-600'}"></i>
            <span class="text-xs font-medium transition-colors ${isSelected ? 'text-zinc-200' : 'text-zinc-500'}">${cat.name}</span>
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
    btnNext.className = btnNext.disabled ? 'flex-1 bg-white/5 text-zinc-500 font-semibold py-4 rounded-2xl cursor-not-allowed transition-all' : 'flex-1 bg-zinc-900 border border-white/10 hover:bg-zinc-800 hover:border-white/20 text-zinc-200 font-semibold py-4 rounded-2xl transition-all transform active:scale-[0.98]';
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
    
    appData.categories = selectedCats.map(c => ({
        ...c,
        allocated: 0,
        spent: 0
    }));
    
    transitionTo('allocation');
    renderAllocationUI();
});

function renderAllocationUI() {
    const container = document.getElementById('alloc-sliders-container');
    container.innerHTML = '';
    
    appData.categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'bg-surface/30 border border-white/5 p-4 rounded-2xl';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <i data-lucide="${cat.icon}" class="w-4 h-4 text-zinc-300"></i>
                    </div>
                    <label class="font-semibold text-sm text-zinc-200">${cat.name}</label>
                </div>
                <div class="relative w-1/3 min-w-[120px]">
                    <span class="absolute left-3 top-1.5 text-zinc-500 text-xs">Rp</span>
                    <input type="text" inputmode="numeric" class="alloc-num w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white text-sm font-medium focus:outline-none focus:border-white/30 text-right transition-all" data-id="${cat.id}" value="${cat.allocated.toLocaleString('id-ID')}">
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
        el.addEventListener('change', handleAllocationChange);
    });
    
    updateAllocationState();
}

function handleAllocationChange(e) {
    const id = e.target.getAttribute('data-id');
    if (e.target.classList.contains('alloc-num')) {
        formatNumberInput(e);
    }
    let val = parseFormattedNumber(e.target.value);
    if (val < 0) val = 0;
    
    const cat = appData.categories.find(c => c.id === id);
    const otherTotal = appData.categories.filter(c => c.id !== id).reduce((s, c) => s + c.allocated, 0);
    const maxAllowed = appData.initialBalance - otherTotal;
    
    let wasCapped = false;
    if (val > maxAllowed) {
        val = maxAllowed;
        wasCapped = true;
    }
    cat.allocated = val;
    
    const row = e.target.closest('.bg-surface\\/30');
    if (row) {
        const slider = row.querySelector('.alloc-slider');
        const numInput = row.querySelector('.alloc-num');
        
        if (slider) slider.value = val;
        
        if (numInput) {
            if (e.target !== numInput || wasCapped) {
                numInput.value = val.toLocaleString('id-ID');
            }
        }
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
    
    if (remaining >= 0) {
        if (remaining === 0) {
            disp.classList.add('text-zinc-100');
            disp.classList.remove('text-zinc-400');
        } else {
            disp.classList.add('text-zinc-400');
            disp.classList.remove('text-zinc-100');
        }
        btnSave.disabled = false;
    } else {
        btnSave.disabled = true;
    }
}

document.getElementById('form-allocation').addEventListener('submit', (e) => {
    e.preventDefault();
    saveData();
    transitionTo('dashboard');
    renderDashboard();
});

function renderDashboard() {
    const totalAllocated = appData.initialBalance;
    const totalSpent = appData.categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    
    const periodLabel = appData.period === 'Kustom' && appData.startDate && appData.endDate
        ? `${appData.periodDays} Hari`
        : appData.period;
    document.getElementById('dash-period').textContent = periodLabel;
    document.getElementById('dash-remaining-balance').textContent = formatRp(totalRemaining);
    document.getElementById('dash-total-spent').textContent = formatRp(totalSpent);
    document.getElementById('dash-total-budget').textContent = `dari ${formatRp(totalAllocated)}`;
    
    const mainProgress = (totalSpent / totalAllocated) * 100;
    const mainBar = document.getElementById('dash-main-progress');
    mainBar.style.width = `${Math.min(100, mainProgress)}%`;

    if (mainProgress > 85) mainBar.className = 'bg-red-500 h-full rounded-full transition-all duration-700 ease-out relative';
    else if (mainProgress > 60) mainBar.className = 'bg-zinc-400 h-full rounded-full transition-all duration-700 ease-out relative';
    else mainBar.className = 'bg-white h-full rounded-full transition-all duration-700 ease-out relative';
    const catContainer = document.getElementById('dash-categories-container');
    catContainer.innerHTML = '';
    
    const selectCat = document.getElementById('exp-category');
    const selectOptions = document.getElementById('exp-category-options');
    const selectText = document.getElementById('exp-category-text');
    
    selectCat.value = '';
    selectText.textContent = 'Pilih Kategori';
    selectText.className = 'text-zinc-500';
    selectOptions.innerHTML = '';
    
    appData.categories.forEach((cat, index) => {
        const opt = document.createElement('div');
        opt.className = 'px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-lg cursor-pointer transition-colors flex items-center gap-2';
        opt.innerHTML = `<i data-lucide="${cat.icon}" class="w-3.5 h-3.5 text-zinc-400"></i> ${cat.name}`;
        opt.addEventListener('click', () => {
            selectCat.value = cat.id;
            selectText.textContent = cat.name;
            selectText.className = 'text-white';
            closeDropdown();
        });
        selectOptions.appendChild(opt);
        
        const remaining = cat.allocated - cat.spent;
        const percentageLeft = cat.allocated > 0 ? (remaining / cat.allocated) * 100 : 0;
        
        let barColor = 'bg-white';
        if (percentageLeft <= 15) barColor = 'bg-red-500';
        else if (percentageLeft <= 40) barColor = 'bg-zinc-400';
        
        const card = document.createElement('div');
        card.className = 'bg-surface/50 border border-white/5 rounded-2xl p-4 hover:border-white/20 transition-all flex flex-col justify-center';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                        <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 text-zinc-300"></i>
                    </div>
                    <span class="font-medium text-sm text-zinc-200">${cat.name}</span>
                </div>
                <div class="text-right">
                    <span class="block text-sm font-bold text-white">${formatRp(remaining)}</span>
                </div>
            </div>
            <div class="w-full bg-white/5 rounded-full h-1 border border-white/5 overflow-hidden">
                <div class="${barColor} h-full rounded-full transition-all duration-1000 ease-out" style="width: ${Math.max(0, percentageLeft)}%;"></div>
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
            <div class="h-full flex flex-col items-center justify-center text-zinc-600">
                <i data-lucide="ghost" class="w-8 h-8 mb-2"></i>
                <p class="text-xs font-medium">Belum ada pengeluaran</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = '';
    const sorted = [...appData.history].reverse();
    
    sorted.forEach((item, index) => {
        const cat = appData.categories.find(c => c.id === item.categoryId);
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-xl transition-all hover:bg-surface/50`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <i data-lucide="${cat?.icon || 'circle'}" class="w-3.5 h-3.5 text-zinc-400"></i>
                </div>
                <div>
                    <p class="text-xs font-semibold text-zinc-200">${cat?.name || 'Unknown'}</p>
                    <p class="text-[10px] text-zinc-500 mt-0.5">${item.note || formatDate(item.date)}</p>
                </div>
            </div>
            <div class="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-md border border-white/5">
                -${formatRp(item.amount)}
            </div>
        `;
        historyContainer.appendChild(div);
    });
}

document.getElementById('form-expense').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFormattedNumber(document.getElementById('exp-amount').value);
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
        else if (percentageLeft <= 15) showToast(`Kritis! Budget ${cat.name} menipis.`, 'warning');
        else showToast('Tercatat.', 'success');
        
        document.getElementById('form-expense').reset();
        renderDashboard();
    }
});

btnReset.addEventListener('click', () => {
    if (confirm('Mulai ulang dari awal? Semua riwayat akan dihapus.')) {
        localStorage.removeItem('emanagement_data_v2');
        appData = { period: '', initialBalance: 0, categories: [], history: [] };
        selectedCats = [];
        transitionTo('setup');
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let style = 'border-white/10 bg-surface/90 text-zinc-200';
    let icon = 'check';
    
    if (type === 'warning') {
        style = 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500';
        icon = 'alert-triangle';
    } else if (type === 'error') {
        style = 'border-red-500/20 bg-red-500/10 text-red-400';
        icon = 'alert-circle';
    }
    
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl shadow-black/50 ${style}`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i><p class="text-xs font-semibold tracking-wide">${message}</p>`;
    
    container.appendChild(toast);
    lucide.createIcons();

    gsap.fromTo(toast, 
        { opacity: 0, y: 15, scale: 0.95 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
    );
    
    setTimeout(() => {
        gsap.to(toast, { 
            opacity: 0, 
            scale: 0.95, 
            duration: 0.2, 
            ease: "power2.in",
            onComplete: () => toast.remove() 
        });
    }, 3000);
}

let isDropdownOpen = false;
function toggleDropdown(e) {
    if (e) e.stopPropagation();
    
    if (isDropdownOpen) {
        closeDropdown();
    } else {
        isDropdownOpen = true;
        const dropdownMenu = document.getElementById('exp-category-dropdown');
        const dropdownIcon = document.getElementById('exp-category-icon');
        gsap.fromTo(dropdownMenu, 
            { autoAlpha: 0, y: -10 },
            { autoAlpha: 1, y: 0, duration: 0.3, ease: "power3.out" }
        );
        gsap.to(dropdownIcon, { rotation: 180, duration: 0.3, ease: "power3.out" });
    }
}

function closeDropdown() {
    if (!isDropdownOpen) return;
    isDropdownOpen = false;
    const dropdownMenu = document.getElementById('exp-category-dropdown');
    const dropdownIcon = document.getElementById('exp-category-icon');
    gsap.to(dropdownMenu, { autoAlpha: 0, y: -10, duration: 0.2, ease: "power2.in" });
    gsap.to(dropdownIcon, { rotation: 0, duration: 0.2, ease: "power2.in" });
}

document.getElementById('exp-category-btn').addEventListener('click', toggleDropdown);

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('exp-category-wrapper');
    if (isDropdownOpen && wrapper && !wrapper.contains(e.target)) {
        closeDropdown();
    }
});

document.getElementById('input-balance').addEventListener('input', formatNumberInput);
document.getElementById('exp-amount').addEventListener('input', formatNumberInput);

document.addEventListener("DOMContentLoaded", init);
