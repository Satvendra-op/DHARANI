const API_BASE_URL = `${window.location.origin}/api`;

const STATUS_STYLES = {
    Pending: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-rose-100 text-rose-700'
};

const modal = {
    root: null,
    title: null,
    content: null,
    actions: null,
    closeBtn: null,
    init() {
        this.root = document.getElementById('modal');
        this.title = document.getElementById('modal-title');
        this.content = document.getElementById('modal-content');
        this.actions = document.getElementById('modal-actions');
        this.closeBtn = document.getElementById('modal-close-btn');
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
    },
    show(title, content, actions = []) {
        if (!this.root) return;
        this.title.textContent = title;
        this.content.innerHTML = typeof content === 'string' ? content : '';
        if (content instanceof Node) {
            this.content.appendChild(content);
        }
        this.actions.innerHTML = '';
        actions.forEach(({ label, action, variant = 'primary' }) => {
            const button = document.createElement('button');
            const baseClass = 'px-5 py-2 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 shadow-md';
            const variantClass = variant === 'secondary'
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400'
                : 'button-gradient text-white hover:opacity-90 focus:ring-green-400';
            button.className = `${baseClass} ${variantClass}`;
            button.textContent = label;
            button.onclick = action;
            this.actions.appendChild(button);
        });
        this.root.classList.remove('hidden');
        setTimeout(() => {
            const dialog = this.root.querySelector('div');
            if (dialog) {
                dialog.classList.add('scale-100');
                dialog.classList.remove('scale-95');
            }
        }, 10);
    },
    hide() {
        if (!this.root) return;
        const dialog = this.root.querySelector('div');
        if (dialog) {
            dialog.classList.remove('scale-100');
            dialog.classList.add('scale-95');
        }
        setTimeout(() => {
            this.root.classList.add('hidden');
        }, 300);
    }
};

const ensureBuyerAccess = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        window.location.href = 'login.html';
        return null;
    }

    try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'Buyer') {
            window.location.href = user.role === 'Seller' ? 'seller-dashboard.html' : 'login.html';
            return null;
        }
        return { token, user };
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return null;
    }
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
};

const authorizedFetch = async (token, url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    const raw = await response.text();
    try {
        const data = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        return data;
    } catch (error) {
        console.error('Dashboard fetch error:', raw);
        if (!response.ok) {
            throw new Error('Request failed');
        }
        throw new Error('Unexpected server response');
    }
};

const formatDate = (value) => {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const getPriceNumber = (listing) => {
    if (!listing) return Number.NaN;
    if (typeof listing.price === 'number') return listing.price;
    const candidate = listing.price ?? listing.estimatedPriceINR;
    const match = candidate ? candidate.toString().replace(/,/g, '').match(/\d+(?:\.\d+)?/) : null;
    return match ? Number.parseFloat(match[0]) : Number.NaN;
};

const formatPrice = (price) => {
    const number = Number(price);
    if (Number.isNaN(number)) return 'Price unavailable';
    return `₹ ${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const updateStats = (appointments) => {
    const totalEl = document.getElementById('stat-total');
    const pendingEl = document.getElementById('stat-pending');
    const progressEl = document.getElementById('stat-progress');
    const completedEl = document.getElementById('stat-completed');

    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === 'Pending').length;
    const progress = appointments.filter((a) => a.status === 'In Progress').length;
    const completed = appointments.filter((a) => a.status === 'Completed').length;

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (progressEl) progressEl.textContent = progress;
    if (completedEl) completedEl.textContent = completed;
};

const renderAppointments = (appointments) => {
    const container = document.getElementById('appointments-container');
    const emptyState = document.getElementById('appointments-empty');

    if (!container || !emptyState) return;

    if (!appointments.length) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    appointments.forEach((appt) => {
        const listing = appt.listing || {};
        const card = document.createElement('article');
        card.className = 'bg-white rounded-3xl shadow-lg border border-gray-200 p-6 flex flex-col gap-5 hover:shadow-xl transition-shadow duration-200';

        const header = document.createElement('div');
        header.className = 'flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-gray-100';

        const title = document.createElement('div');
        title.className = 'flex-1';
        title.innerHTML = `
      <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Listing</p>
      <h3 class="text-xl font-bold text-gray-800">${listing.itemName || 'Untitled Listing'}</h3>
    `;

        const statusBadge = document.createElement('span');
        const statusClass = STATUS_STYLES[appt.status] || 'bg-gray-200 text-gray-700';
        statusBadge.className = `px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${statusClass}`;
        statusBadge.textContent = appt.status || 'Pending';

        header.append(title, statusBadge);

        const details = document.createElement('div');
        details.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm';
        details.innerHTML = `
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="font-semibold text-gray-700 mb-1">Seller</p>
        <p class="text-gray-800">${(appt.seller && appt.seller.name) || listing.sellerName || 'Unknown'}</p>
        <p class="text-xs text-gray-500 mt-1">${(appt.seller && appt.seller.email) || ''}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="font-semibold text-gray-700 mb-1">Price</p>
        <p class="text-lg font-bold text-green-600">${formatPrice(getPriceNumber(listing))}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="font-semibold text-gray-700 mb-1">Requested On</p>
        <p class="text-gray-800">${formatDate(appt.createdAt)}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-3">
        <p class="font-semibold text-gray-700 mb-1">Category</p>
        <p class="text-gray-800">${listing.category || 'N/A'}</p>
      </div>
    `;

        const messageBlock = document.createElement('div');
        messageBlock.className = 'bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm';
        messageBlock.innerHTML = `
      <p class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Your Message
      </p>
      <p class="text-gray-700">${appt.message || 'No additional notes provided.'}</p>
    `;

        const actions = document.createElement('div');
        actions.className = 'flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100';

        const listingInfo = document.createElement('p');
        listingInfo.className = 'text-xs text-gray-400';
        listingInfo.textContent = `Listing ID: ${listing._id || appt.listing?._id || 'N/A'}`;

        const viewListingBtn = document.createElement('button');
        viewListingBtn.className = 'px-4 py-2 text-sm font-semibold text-green-600 border border-green-500 rounded-full hover:bg-green-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400';
        viewListingBtn.textContent = 'View Listing';
        viewListingBtn.addEventListener('click', () => {
            modal.show('Listing Preview', `
        <p class="text-sm text-gray-700"><strong>${listing.itemName || 'Untitled Listing'}</strong></p>
        <p class="text-sm text-gray-600 mt-2">${listing.description || 'No description provided.'}</p>
        <p class="text-sm text-gray-600 mt-2"><strong>Usage / Disposal:</strong> ${listing.usageOrDisposalInfo || 'Not specified.'}</p>
        <p class="text-sm text-gray-600 mt-2"><strong>Price:</strong> ${formatPrice(getPriceNumber(listing))}</p>
      `, [
                { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
            ]);
        });

        actions.append(listingInfo, viewListingBtn);

        card.append(header, details, messageBlock, actions);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
};

const loadDashboard = async (token) => {
    try {
        const data = await authorizedFetch(token, `${API_BASE_URL}/appointments`);
        const appointments = Array.isArray(data.appointments) ? data.appointments : [];
        updateStats(appointments);
        renderAppointments(appointments);
    } catch (error) {
        console.error(error);
        modal.show('Dashboard Error', error.message || 'Unable to load appointments right now.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const session = ensureBuyerAccess();
    if (!session) {
        return;
    }

    const { token, user } = session;

    const nameBadge = document.getElementById('buyer-name');
    const backBtn = document.getElementById('back-to-market');
    const refreshBtn = document.getElementById('refresh-dashboard');
    const logoutBtn = document.getElementById('logout-btn');
    const exploreBtn = document.getElementById('explore-market');

    modal.init();

    if (nameBadge) {
        nameBadge.textContent = user.name;
        nameBadge.classList.remove('hidden');
    }

    backBtn?.addEventListener('click', () => {
        window.location.href = 'buyer.html';
    });

    refreshBtn?.addEventListener('click', () => loadDashboard(token));
    logoutBtn?.addEventListener('click', logout);
    exploreBtn?.addEventListener('click', () => { window.location.href = 'buyer.html'; });

    loadDashboard(token);
});

