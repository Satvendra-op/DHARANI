const API_BASE_URL = `${window.location.origin}/api`;

const STATUS_STYLES = {
    Pending: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-rose-100 text-rose-700'
};

const QUALITY_STYLES = {
    Good: 'bg-emerald-100 text-emerald-700',
    Better: 'bg-blue-100 text-blue-700',
    Bad: 'bg-amber-100 text-amber-700',
    Critical: 'bg-rose-100 text-rose-700'
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

const ensureSellerAccess = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        window.location.href = 'login.html';
        return null;
    }

    try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'Seller') {
            window.location.href = user.role === 'Buyer' ? 'buyer-dashboard.html' : 'login.html';
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
        console.error('Seller dashboard fetch error:', raw);
        if (!response.ok) {
            throw new Error('Request failed');
        }
        throw new Error('Unexpected server response');
    }
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

const formatDate = (value) => {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const renderListings = (listings) => {
    const container = document.getElementById('seller-listings');
    const emptyState = document.getElementById('seller-listings-empty');
    const countLabel = document.getElementById('listings-count');

    if (!container || !emptyState) return;

    const total = listings.length;
    if (countLabel) countLabel.textContent = `${total} listing${total === 1 ? '' : 's'}`;

    if (!total) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    listings.forEach((listing) => {
        const card = document.createElement('article');
        card.className = 'bg-white border border-gray-200 rounded-3xl shadow-lg p-6 space-y-4 hover:shadow-xl transition-shadow duration-200';

        card.innerHTML = `
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div class="flex-1">
          <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">${listing.category || 'Category'}</p>
          <h4 class="text-xl font-bold text-gray-800">${listing.itemName || 'Untitled Listing'}</h4>
        </div>
        <span class="px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${QUALITY_STYLES[listing.productQuality] || 'bg-slate-100 text-slate-600'}">${listing.productQuality || 'Quality'}</span>
      </div>
      <p class="text-sm text-gray-600 leading-relaxed">${listing.description || 'No description provided.'}</p>
      <div class="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
        <div>
          <p class="text-xs text-gray-500 font-semibold mb-1">Price</p>
          <p class="text-lg font-bold text-green-600">${formatPrice(getPriceNumber(listing))}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 font-semibold mb-1">Created</p>
          <p class="text-sm text-gray-700">${formatDate(listing.createdAt)}</p>
        </div>
      </div>
    `;

        const footer = document.createElement('div');
        footer.className = 'flex flex-col gap-3';
        
        // Action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'flex gap-2';
        
        const copyLinkBtn = document.createElement('button');
        copyLinkBtn.className = 'flex-1 px-4 py-2 text-sm font-semibold text-green-600 border border-green-500 rounded-full hover:bg-green-50 transition-colors';
        copyLinkBtn.textContent = 'Copy Link';
        copyLinkBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/buyer.html#${listing._id}`;
            navigator.clipboard.writeText(url).then(() => {
                modal.show('Link Copied', `<p class="text-sm text-gray-700">Share this link with buyers: <span class="font-mono text-xs">${url}</span></p>`, [
                    { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                ]);
            }).catch(() => {
                modal.show('Copy Failed', 'Unable to copy link. Please try again.', [
                    { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                ]);
            });
        });
        actionButtons.appendChild(copyLinkBtn);
        
        // Show "Send Dump Request" button for Critical products
        if (listing.productQuality === 'Critical') {
            const dumpRequestBtn = document.createElement('button');
            dumpRequestBtn.className = 'flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors';
            dumpRequestBtn.innerHTML = '🗑️ Send Dump Request';
            dumpRequestBtn.addEventListener('click', () => handleDumpRequest(listing));
            actionButtons.appendChild(dumpRequestBtn);
        }
        
        footer.appendChild(actionButtons);
        footer.innerHTML += `<div class="text-xs text-gray-400 text-center">Listing ID: ${listing._id || 'N/A'}</div>`;
        
        card.appendChild(footer);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
};

const renderRequests = (appointments) => {
    const container = document.getElementById('seller-requests');
    const emptyState = document.getElementById('seller-requests-empty');
    const countLabel = document.getElementById('requests-count');

    if (!container || !emptyState) return;

    const total = appointments.length;
    if (countLabel) countLabel.textContent = `${total} request${total === 1 ? '' : 's'}`;

    if (!total) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

  appointments.forEach((appt) => {
    const listing = appt.listing || {};
    const buyer = appt.buyer || {};

    const card = document.createElement('article');
    card.className = 'bg-white border border-gray-200 rounded-3xl shadow-lg p-6 space-y-4 hover:shadow-xl transition-shadow duration-200';

    const statusClass = STATUS_STYLES[appt.status] || 'bg-gray-200 text-gray-700';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div class="flex-1">
          <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">${listing.itemName || 'Listing'}</p>
          <h4 class="text-lg font-bold text-gray-800">${buyer.name || 'Buyer'}</h4>
          <p class="text-xs text-gray-500 mt-1">${buyer.email || ''}</p>
        </div>
        <span class="px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${statusClass}">${appt.status || 'Pending'}</span>
      </div>
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p class="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Buyer Message
        </p>
        <p class="text-sm text-gray-700">${appt.message || 'No additional notes.'}</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
        <div>
          <p class="text-xs text-gray-500 font-semibold mb-1">Requested On</p>
          <p class="text-gray-700">${formatDate(appt.createdAt)}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 font-semibold mb-1">Listing Price</p>
          <p class="text-lg font-bold text-green-600">${formatPrice(getPriceNumber(listing))}</p>
        </div>
      </div>
    `;

        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
};

// Handle Dump Request
const handleDumpRequest = async (listing) => {
    if (!listing || !listing._id) {
        modal.show('Error', 'Invalid listing. Please refresh and try again.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    modal.show('Get Location', '<p class="text-sm text-gray-600">Please allow location access to send dump request...</p>');

    // Get user's current location
    if (!navigator.geolocation) {
        modal.show('Location Not Supported', 'Your browser does not support geolocation. Please enter your address manually.', [
            { label: 'Enter Manually', action: () => showManualLocationForm(listing) },
            { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            // Get address from coordinates (reverse geocoding)
            let address = 'Location provided';
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                if (data.display_name) {
                    address = data.display_name;
                }
            } catch (error) {
                console.error('Geocoding error:', error);
            }

            await sendDumpRequest(listing._id, latitude, longitude, address);
        },
        (error) => {
            console.error('Geolocation error:', error);
            modal.show('Location Access Denied', 'Unable to get your location. Please enter your address manually.', [
                { label: 'Enter Manually', action: () => showManualLocationForm(listing) },
                { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
            ]);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};

// Show manual location form
const showManualLocationForm = (listing) => {
    const content = document.createElement('div');
    content.className = 'space-y-4';
    content.innerHTML = `
        <p class="text-sm text-gray-700">Enter your location details:</p>
        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-2">Address</label>
            <input type="text" id="dump-address" placeholder="Enter your address" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2">Latitude</label>
                <input type="number" id="dump-latitude" step="any" placeholder="28.6139" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2">Longitude</label>
                <input type="number" id="dump-longitude" step="any" placeholder="77.2090" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
            </div>
        </div>
        <p class="text-xs text-gray-500">Or use <button id="get-location-btn" class="text-blue-600 underline">Get Current Location</button></p>
    `;

    const getLocationBtn = content.querySelector('#get-location-btn');
    getLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('dump-latitude').value = position.coords.latitude;
                    document.getElementById('dump-longitude').value = position.coords.longitude;
                },
                (error) => {
                    modal.show('Error', 'Unable to get location. Please enter manually.', [
                        { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                    ]);
                }
            );
        }
    });

    modal.show('Send Dump Request', '', [
        {
            label: 'Send Request',
            action: async () => {
                const address = document.getElementById('dump-address').value.trim();
                const latitude = parseFloat(document.getElementById('dump-latitude').value);
                const longitude = parseFloat(document.getElementById('dump-longitude').value);

                if (!address && (isNaN(latitude) || isNaN(longitude))) {
                    modal.show('Invalid Input', 'Please provide either address or coordinates.', [
                        { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                    ]);
                    return;
                }

                await sendDumpRequest(listing._id, latitude, longitude, address || 'Manual location');
            }
        },
        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
    ]);

    modal.content.innerHTML = '';
    modal.content.appendChild(content);
};

// Send dump request to server
const sendDumpRequest = async (listingId, latitude, longitude, address) => {
    try {
        modal.show('Sending Request', '<p class="text-sm text-gray-600">Sending dump request to Nagar Nigam...</p>');

        const token = localStorage.getItem('token');
        const response = await authorizedFetch(token, `${API_BASE_URL}/dump-requests`, {
            method: 'POST',
            body: JSON.stringify({
                listingId,
                latitude,
                longitude,
                address
            })
        });

        if (response && response.message) {
            modal.show(
                'Dump Request Sent! ✅',
                `<div class="space-y-3 text-left">
                    <p class="text-sm text-gray-700">Your dump request has been sent to Nagar Nigam successfully.</p>
                    <p class="text-xs text-gray-500">Location: ${address}</p>
                    <p class="text-xs text-gray-500">Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
                    <p class="text-xs text-gray-500">Nagar Nigam will review your request and get back to you soon.</p>
                </div>`,
                [
                    { label: 'View Requests', action: () => { modal.hide(); loadDumpRequests(); } },
                    { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                ]
            );
        } else {
            throw new Error('Failed to send dump request');
        }
    } catch (error) {
        console.error('Dump request error:', error);
        modal.show('Request Failed', `<p class="text-sm text-gray-700">${error.message || 'Unable to send dump request. Please try again.'}</p>`, [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

// Load dump requests for seller
const loadDumpRequests = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await authorizedFetch(token, `${API_BASE_URL}/dump-requests`);
        
        if (response && response.dumpRequests) {
            renderDumpRequests(response.dumpRequests);
        }
    } catch (error) {
        console.error('Error loading dump requests:', error);
    }
};

// Render dump requests
const renderDumpRequests = (dumpRequests) => {
    // This will be called to show dump requests in seller dashboard
    // You can add a section for dump requests if needed
    console.log('Dump requests:', dumpRequests);
};

const updateStats = (listings, appointments) => {
    const listingsCount = document.getElementById('stat-listings');
    const openRequests = document.getElementById('stat-open-requests');
    const progressRequests = document.getElementById('stat-requests-progress');
    const completedRequests = document.getElementById('stat-requests-completed');

    if (listingsCount) listingsCount.textContent = listings.length;
    if (openRequests) openRequests.textContent = appointments.filter((a) => a.status === 'Pending').length;
    if (progressRequests) progressRequests.textContent = appointments.filter((a) => a.status === 'In Progress').length;
    if (completedRequests) completedRequests.textContent = appointments.filter((a) => a.status === 'Completed').length;
};

const loadDashboard = async (token) => {
    try {
        const [listingsData, appointmentsData] = await Promise.all([
            authorizedFetch(token, `${API_BASE_URL}/listings/mine`),
            authorizedFetch(token, `${API_BASE_URL}/appointments`)
        ]);

        const listings = Array.isArray(listingsData.listings) ? listingsData.listings : [];
        const appointments = Array.isArray(appointmentsData.appointments) ? appointmentsData.appointments : [];

        updateStats(listings, appointments);
        renderListings(listings);
        renderRequests(appointments);
    } catch (error) {
        console.error(error);
        modal.show('Dashboard Error', error.message || 'Unable to load dashboard data.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const session = ensureSellerAccess();
    if (!session) {
        return;
    }

    const { token, user } = session;

    const nameBadge = document.getElementById('seller-name');
    const toolsBtn = document.getElementById('open-seller-tools');
    const marketBtn = document.getElementById('view-market');
    const refreshBtn = document.getElementById('refresh-dashboard');
    const logoutBtn = document.getElementById('logout-btn');
    const createFirstBtn = document.getElementById('create-first-listing');

    modal.init();

    if (nameBadge) {
        nameBadge.textContent = user.name;
        nameBadge.classList.remove('hidden');
    }

    toolsBtn?.addEventListener('click', () => {
        window.location.href = 'seller.html';
    });

    marketBtn?.addEventListener('click', () => {
        window.location.href = 'buyer.html';
    });

    refreshBtn?.addEventListener('click', () => loadDashboard(token));
    logoutBtn?.addEventListener('click', logout);
    createFirstBtn?.addEventListener('click', () => { window.location.href = 'seller.html'; });

    loadDashboard(token);
});

