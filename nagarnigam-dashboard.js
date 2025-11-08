const API_BASE_URL = `${window.location.origin}/api`;

// Modal utility
const modal = {
    root: document.getElementById('modal'),
    title: document.getElementById('modal-title'),
    content: document.getElementById('modal-content'),
    actions: document.getElementById('modal-actions'),
    closeBtn: document.getElementById('modal-close-btn'),
    
    init() {
        this.closeBtn?.addEventListener('click', () => this.hide());
        this.root?.addEventListener('click', (e) => {
            if (e.target === this.root) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.root.classList.contains('hidden')) {
                this.hide();
            }
        });
    },
    
    show(title, content, actions = []) {
        if (!this.root) return;
        this.title.textContent = title;
        this.content.innerHTML = typeof content === 'string' ? content : '';
        this.actions.innerHTML = '';
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.className = action.variant === 'secondary' 
                ? 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300'
                : 'px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800';
            btn.addEventListener('click', action.action);
            this.actions.appendChild(btn);
        });
        
        this.root.classList.remove('hidden');
    },
    
    hide() {
        this.root?.classList.add('hidden');
    }
};

// Check authentication
const checkAuth = () => {
    const token = localStorage.getItem('nagarnigamToken');
    if (!token) {
        window.location.href = 'nagarnigam-login.html';
        return false;
    }
    return true;
};

// Authorized fetch
const authorizedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('nagarnigamToken');
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('nagarnigamToken');
            window.location.href = 'nagarnigam-login.html';
            return null;
        }
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Format coordinates
const formatCoordinates = (lat, lon) => {
    if (!lat || !lon) return 'N/A';
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
};

// Load dump requests
const loadDumpRequests = async () => {
    try {
        const response = await authorizedFetch(`${API_BASE_URL}/nagarnigam/dump-requests`);
        if (response && response.dumpRequests) {
            renderDumpRequests(response.dumpRequests);
            updateStats(response.dumpRequests);
        }
    } catch (error) {
        console.error('Error loading dump requests:', error);
        modal.show('Error', `Failed to load dump requests: ${error.message}`, [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

// Update stats
const updateStats = (dumpRequests) => {
    const pending = dumpRequests.filter(r => r.status === 'Pending').length;
    const approved = dumpRequests.filter(r => r.status === 'Approved').length;
    const rejected = dumpRequests.filter(r => r.status === 'Rejected').length;
    const completed = dumpRequests.filter(r => r.status === 'Completed').length;
    
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-rejected').textContent = rejected;
    document.getElementById('stat-completed').textContent = completed;
};

// Render dump requests
const renderDumpRequests = (dumpRequests) => {
    const container = document.getElementById('dump-requests-list');
    const emptyState = document.getElementById('dump-requests-empty');
    
    if (!container || !emptyState) return;
    
    if (dumpRequests.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    const fragment = document.createDocumentFragment();
    
    dumpRequests.forEach(request => {
        const listing = request.listing || {};
        const seller = request.seller || {};
        
        const card = document.createElement('article');
        card.className = 'bg-white border border-gray-200 rounded-2xl shadow-lg p-6 space-y-4';
        
        const statusClass = {
            'Pending': 'bg-amber-100 text-amber-800',
            'Approved': 'bg-green-100 text-green-800',
            'Rejected': 'bg-red-100 text-red-800',
            'Completed': 'bg-blue-100 text-blue-800'
        }[request.status] || 'bg-gray-100 text-gray-800';
        
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-900 mb-1">${listing.itemName || 'Unknown Item'}</h3>
                    <p class="text-sm text-gray-600">Seller: ${seller.name || 'Unknown'} (${seller.email || 'N/A'})</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClass}">${request.status}</span>
            </div>
            <div class="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
                <div>
                    <p class="text-xs text-gray-500 font-semibold mb-1">Seller Location</p>
                    <p class="text-gray-700 text-xs">${request.sellerLocation?.address || 'N/A'}</p>
                    <p class="text-gray-500 text-xs">${formatCoordinates(request.sellerLocation?.latitude, request.sellerLocation?.longitude)}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 font-semibold mb-1">Request Date</p>
                    <p class="text-gray-700">${formatDate(request.createdAt)}</p>
                </div>
            </div>
            ${request.dumpLocation ? `
                <div class="bg-blue-50 rounded-xl p-4">
                    <p class="text-xs text-gray-500 font-semibold mb-1">Assigned Dump Location</p>
                    <p class="text-gray-700 text-sm">${request.dumpLocation.address || 'N/A'}</p>
                    <p class="text-gray-500 text-xs">${formatCoordinates(request.dumpLocation.latitude, request.dumpLocation.longitude)}</p>
                </div>
            ` : ''}
        `;
        
        // Action buttons
        if (request.status === 'Pending') {
            const actions = document.createElement('div');
            actions.className = 'flex gap-2';
            
            const approveBtn = document.createElement('button');
            approveBtn.className = 'flex-1 px-4 py-2 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-colors';
            approveBtn.textContent = '✅ Approve';
            approveBtn.addEventListener('click', () => handleApproveRequest(request._id));
            
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'flex-1 px-4 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors';
            rejectBtn.textContent = '❌ Reject';
            rejectBtn.addEventListener('click', () => handleRejectRequest(request._id));
            
            actions.appendChild(approveBtn);
            actions.appendChild(rejectBtn);
            card.appendChild(actions);
        }
        
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Handle approve request
const handleApproveRequest = async (requestId) => {
    const content = document.createElement('div');
    content.className = 'space-y-4';
    content.innerHTML = `
        <p class="text-sm text-gray-700">Select dump location for this request:</p>
        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-2">Dump Location</label>
            <select id="dump-location-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">Select location...</option>
                <option value="main">Main Dump Yard</option>
                <option value="north">North Zone</option>
                <option value="south">South Zone</option>
            </select>
        </div>
        <div class="hidden" id="custom-location">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-2">Latitude</label>
                    <input type="number" id="dump-lat" step="any" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-2">Longitude</label>
                    <input type="number" id="dump-lon" step="any" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
        </div>
    `;
    
    const select = content.querySelector('#dump-location-select');
    const locations = {
        'main': { latitude: 28.6139, longitude: 77.2090, address: 'Delhi Main Dump Yard' },
        'north': { latitude: 28.7041, longitude: 77.1025, address: 'North Zone Dump Yard' },
        'south': { latitude: 28.5245, longitude: 77.1855, address: 'South Zone Dump Yard' }
    };
    
    modal.show('Approve Request', '', [
        {
            label: 'Approve',
            action: async () => {
                const selected = select.value;
                let dumpLocation;
                
                if (selected && locations[selected]) {
                    dumpLocation = locations[selected];
                } else {
                    const lat = parseFloat(document.getElementById('dump-lat')?.value);
                    const lon = parseFloat(document.getElementById('dump-lon')?.value);
                    if (isNaN(lat) || isNaN(lon)) {
                        modal.show('Error', 'Please select or enter a valid dump location.', [
                            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                        ]);
                        return;
                    }
                    dumpLocation = { latitude: lat, longitude: lon, address: 'Custom Location' };
                }
                
                await approveRequest(requestId, dumpLocation);
            }
        },
        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
    ]);
    
    modal.content.innerHTML = '';
    modal.content.appendChild(content);
};

// Approve request
const approveRequest = async (requestId, dumpLocation) => {
    try {
        modal.show('Processing', '<p class="text-sm text-gray-600">Approving request...</p>');
        
        const response = await authorizedFetch(`${API_BASE_URL}/nagarnigam/dump-requests/${requestId}/approve`, {
            method: 'POST',
            body: JSON.stringify({
                status: 'Approved',
                dumpLocation
            })
        });
        
        if (response && response.message) {
            modal.show('Success', 'Request approved successfully!', [
                { label: 'Close', action: () => { modal.hide(); loadDumpRequests(); }, variant: 'secondary' }
            ]);
        }
    } catch (error) {
        modal.show('Error', `Failed to approve request: ${error.message}`, [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

// Handle reject request
const handleRejectRequest = async (requestId) => {
    modal.show('Reject Request', 'Are you sure you want to reject this dump request?', [
        {
            label: 'Reject',
            action: async () => {
                await rejectRequest(requestId);
            }
        },
        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
    ]);
};

// Reject request
const rejectRequest = async (requestId) => {
    try {
        modal.show('Processing', '<p class="text-sm text-gray-600">Rejecting request...</p>');
        
        const response = await authorizedFetch(`${API_BASE_URL}/nagarnigam/dump-requests/${requestId}/approve`, {
            method: 'POST',
            body: JSON.stringify({
                status: 'Rejected'
            })
        });
        
        if (response && response.message) {
            modal.show('Success', 'Request rejected.', [
                { label: 'Close', action: () => { modal.hide(); loadDumpRequests(); }, variant: 'secondary' }
            ]);
        }
    } catch (error) {
        modal.show('Error', `Failed to reject request: ${error.message}`, [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    modal.init();
    
    const nameElement = document.getElementById('nagar-nigam-name');
    const nagarNigamData = localStorage.getItem('nagarnigamData');
    if (nagarNigamData) {
        try {
            const data = JSON.parse(nagarNigamData);
            nameElement.textContent = data.name || 'Nagar Nigam';
        } catch (e) {
            nameElement.textContent = 'Nagar Nigam';
        }
    }
    
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('nagarnigamToken');
        localStorage.removeItem('nagarnigamData');
        window.location.href = 'nagarnigam-login.html';
    });
    
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        loadDumpRequests();
    });
    
    loadDumpRequests();
    // Auto-refresh every 30 seconds
    setInterval(loadDumpRequests, 30000);
});



