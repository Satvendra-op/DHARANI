const API_BASE_URL = `${window.location.origin}/api`;

const DEFAULT_EMPTY_TITLE = 'No listings yet';
const DEFAULT_EMPTY_MESSAGE = 'Sellers are preparing something special. Check back soon or create your own listing!';

const QUALITY_BADGE_CLASS = {
    Good: 'bg-emerald-500',
    Better: 'bg-blue-500',
    Bad: 'bg-amber-500',
    Critical: 'bg-rose-500'
};

const parsePriceValue = (priceInput) => {
    if (priceInput === undefined || priceInput === null) return Number.NaN;
    if (typeof priceInput === 'number') return priceInput;
    const match = priceInput.toString().replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : Number.NaN;
};

const formatPrice = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) return 'Price unavailable';
    return `₹ ${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const getListingPriceNumber = (listing) => {
    if (!listing) return Number.NaN;
    const direct = parsePriceValue(listing.price);
    if (!Number.isNaN(direct)) return direct;
    return parsePriceValue(listing.estimatedPriceINR);
};

const modal = {
    root: null,
    title: null,
    content: null,
    actions: null,
    closeBtn: null,
    backdrop: null,
    init() {
        this.root = document.getElementById('modal');
        if (!this.root) return;
        this.title = document.getElementById('modal-title');
        this.content = document.getElementById('modal-content');
        this.actions = document.getElementById('modal-actions');
        this.closeBtn = document.getElementById('modal-close-btn');
        this.backdrop = this.root;
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Close on backdrop click
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) {
                this.hide();
            }
        });
        
        // Close on ESC key
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
        if (content instanceof Node) {
            this.content.appendChild(content);
        }
        this.actions.innerHTML = '';
        actions.forEach(({ label, action, variant = 'primary' }) => {
            const baseClass = 'px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 shadow-md';
            const variantClass = variant === 'secondary'
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400'
                : 'button-gradient text-white hover:opacity-90 focus:ring-green-400';
            const button = document.createElement('button');
            button.className = `${baseClass} ${variantClass}`;
            button.textContent = label;
            button.onclick = action;
            this.actions.appendChild(button);
        });
        this.root.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
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
            document.body.style.overflow = ''; // Restore body scroll
        }, 300);
    }
};

const debounce = (fn, delay = 250) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const truncate = (text, limit = 140) => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const getConditionClass = (quality) => QUALITY_BADGE_CLASS[quality] || 'bg-slate-500';

const ensureAuthenticated = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        window.location.href = 'login.html';
        return null;
    }

    try {
        return { token, user: JSON.parse(storedUser) };
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

let authSession = null;

const state = {
    allListings: [],
    filteredListings: []
};

const elements = {
    listingsContainer: null,
    emptyState: null,
    emptyTitle: null,
    emptyMessage: null,
    resultsCount: null,
    searchInput: null,
    categoryFilter: null,
    conditionFilter: null,
    priceMin: null,
    priceMax: null
};

const authorizedFetch = async (url, options = {}) => {
  if (!authSession || !authSession.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authSession.token}`,
    ...(options.headers || {})
  };

  let response;
  let raw;
  
  try {
    response = await fetch(url, { ...options, headers });
    raw = await response.text();
  } catch (fetchError) {
    console.error('Network error:', fetchError);
    throw new Error('Network error. Please check your connection.');
  }
  
  try {
    const data = raw ? JSON.parse(raw) : {};
    
    // Check if response is successful (2xx status codes)
    if (response.ok) {
      return { ok: true, data, response };
    }
    
    // For non-ok responses, throw with error message
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  } catch (parseError) {
    // If parsing fails but response was ok, it might be empty response
    if (response.ok && !raw) {
      return { ok: true, data: {}, response };
    }
    
    // If response was not ok, throw the error with details from raw response
    if (!response.ok) {
      const errorMsg = parseError.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }
    
    // If response was ok but parsing failed, try to return what we have
    console.error('Response parse error:', parseError, 'Raw response:', raw);
    throw new Error('Failed to parse server response');
  }
};

const setLoading = (isLoading) => {
    if (!elements.listingsContainer) return;
    if (isLoading) {
        elements.emptyState?.classList.add('hidden');
        elements.listingsContainer.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
        <svg class="h-8 w-8 animate-spin mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <p class="text-sm">Loading listings…</p>
      </div>
    `;
    }
};

const updateEmptyStateMessage = (filtersActive) => {
    if (!elements.emptyTitle || !elements.emptyMessage) return;
    if (filtersActive) {
        elements.emptyTitle.textContent = 'No matches found';
        elements.emptyMessage.textContent = 'Try adjusting your search keywords or filter ranges to discover more sustainable finds.';
    } else {
        elements.emptyTitle.textContent = DEFAULT_EMPTY_TITLE;
        elements.emptyMessage.textContent = DEFAULT_EMPTY_MESSAGE;
    }
};

const updateResultsCount = (visible, total) => {
    if (!elements.resultsCount) return;
    if (total === 0) {
        elements.resultsCount.classList.add('hidden');
        return;
    }
    const text = visible === total
        ? `Showing ${total} listings`
        : `Showing ${visible} of ${total} listings`;
    elements.resultsCount.textContent = text;
    elements.resultsCount.classList.remove('hidden');
};

const renderListings = (listings) => {
    if (!elements.listingsContainer || !elements.emptyState) return;

    if (!listings.length) {
        elements.listingsContainer.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    listings.forEach((listing) => {
        const card = document.createElement('article');
        card.className = 'bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:shadow-xl transition-shadow duration-200';

        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'relative';

        const image = document.createElement('img');
        image.src = listing.imageData || 'https://via.placeholder.com/400x260.png?text=Dharani+Snap';
        image.alt = listing.itemName || 'Listing image';
        image.className = 'w-full h-56 object-cover';

        const conditionBadge = document.createElement('span');
        conditionBadge.className = `absolute top-4 left-4 px-3 py-1 text-xs font-bold tracking-wide uppercase text-white rounded-full shadow-md ${getConditionClass(listing.productQuality)}`;
        conditionBadge.textContent = listing.productQuality || 'Condition';

        imageWrapper.append(image, conditionBadge);

        const body = document.createElement('div');
        body.className = 'p-6 flex flex-col gap-4 flex-1';

        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-start justify-between gap-3';

        const title = document.createElement('h3');
        title.className = 'text-xl font-bold text-gray-800';
        title.textContent = listing.itemName || 'Untitled Listing';

        const price = document.createElement('span');
        price.className = 'text-lg font-black text-green-600 whitespace-nowrap';
        price.textContent = formatPrice(getListingPriceNumber(listing));

        titleRow.append(title, price);

        const badgeRow = document.createElement('div');
        badgeRow.className = 'flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide';

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'px-3 py-1 rounded-full bg-emerald-50 text-emerald-600';
        categoryBadge.textContent = listing.category || 'Category';

        const postedBadge = document.createElement('span');
        postedBadge.className = 'px-3 py-1 rounded-full bg-slate-100 text-slate-600';
        postedBadge.textContent = `Posted ${new Date(listing.createdAt).toLocaleDateString()}`;

        badgeRow.append(categoryBadge, postedBadge);

        const description = document.createElement('p');
        description.className = 'text-gray-600 text-sm leading-relaxed';
        description.textContent = truncate(listing.description || 'This eco-friendly item is ready for a new life.');

        const sellerRow = document.createElement('div');
        sellerRow.className = 'flex items-center justify-between text-sm text-gray-500';
        sellerRow.innerHTML = `<span>Seller: <strong class="text-gray-700">${listing.sellerName || 'Unknown'}</strong></span><span>${listing.productQuality ? listing.productQuality : 'Condition TBD'}</span>`;

        const actions = document.createElement('div');
        actions.className = 'mt-auto pt-4 border-t border-gray-200';

        const tagline = document.createElement('p');
        tagline.className = 'text-xs text-gray-500 italic mb-3';
        tagline.textContent = listing.swachhBharatTagline || 'Keeping Bharat clean, one listing at a time.';

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex flex-col sm:flex-row gap-2';

        const viewButton = document.createElement('button');
        viewButton.className = 'flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold text-sm shadow-md hover:from-gray-800 hover:to-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2';
        viewButton.innerHTML = '<span class="mr-1">👁️</span> View Details';
        viewButton.addEventListener('click', () => showListingDetails(listing));

        if (authSession?.user?.role === 'Buyer') {
            // For Critical products, only show "View Details" (dump requests are seller-only)
            if (listing.productQuality !== 'Critical') {
                const contactButton = document.createElement('button');
                contactButton.className = 'flex-1 px-4 py-2.5 rounded-xl border-2 border-blue-400 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 hover:border-blue-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2';
                contactButton.innerHTML = '<span class="mr-1">💬</span> Contact';
                contactButton.addEventListener('click', () => openContactModal(listing));

                const buyButton = document.createElement('button');
                buyButton.className = 'flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2';
                buyButton.innerHTML = '<span class="mr-1">🛒</span> Buy Now';
                buyButton.addEventListener('click', () => handleBuyNow(listing));

                buttonGroup.append(viewButton, contactButton, buyButton);
            } else {
                // Critical items - show info badge
                const criticalBadge = document.createElement('div');
                criticalBadge.className = 'flex-1 px-4 py-2.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-700 font-semibold text-sm text-center';
                criticalBadge.innerHTML = '<span class="mr-1">⚠️</span> Critical Item';
                buttonGroup.append(viewButton, criticalBadge);
            }
        } else {
            buttonGroup.append(viewButton);
        }

        actions.append(tagline, buttonGroup);

        body.append(titleRow, badgeRow, description, sellerRow, actions);

        card.append(imageWrapper, body);
        fragment.appendChild(card);
    });

    elements.listingsContainer.innerHTML = '';
    elements.listingsContainer.appendChild(fragment);
};

const sendContactRequest = async (listingId, message) => {
    try {
        const result = await authorizedFetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            body: JSON.stringify({ listingId, message })
        });
        
        // The response should have a data object with the appointment
        if (result && result.data) {
            // If data has appointment field, return that
            if (result.data.appointment) {
                return result.data.appointment;
            }
            // Otherwise return the whole data object
            return result.data;
        }
        
        // Fallback: return the result itself
        return result || {};
    } catch (error) {
        console.error('Contact request error:', error);
        console.error('Error details:', error.message);
        throw error;
    }
};

const openContactModal = (listing) => {
    if (!listing || !(listing._id || listing.id)) {
        modal.show('Listing Error', 'Unable to contact this seller right now. Please refresh and try again.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    const listingId = listing._id || listing.id;

    const content = document.createElement('div');
    content.className = 'space-y-4 text-left';

    const info = document.createElement('p');
    info.className = 'text-sm text-gray-600';
    info.innerHTML = `You are contacting <strong>${listing.sellerName || 'the seller'}</strong> about <strong>${listing.itemName || 'this listing'}</strong>. Share any preferred time, location, or questions.`;

    const textarea = document.createElement('textarea');
    textarea.id = 'contact-message';
    textarea.rows = 3;
    textarea.className = 'w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400';
    textarea.placeholder = 'Message to the seller (optional)';

    content.append(info, textarea);

    modal.show('Contact Seller', content, [
        {
            label: 'Send Request',
            action: async () => {
                if (!authSession || !authSession.token) {
                    modal.show('Authentication Required', 'Please log in to contact sellers.', [
                        { label: 'Go to Login', action: () => { modal.hide(); window.location.href = 'login.html'; } },
                        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
                    ]);
                    return;
                }

                const messageValue = textarea.value.trim();
                modal.show('Sending Request', '<p class="text-sm text-gray-600">Please wait while we notify the seller.</p>');
                try {
                    const result = await sendContactRequest(listingId, messageValue);
                    modal.show(
                        'Request Sent!',
                        `<div class="space-y-3 text-left">
                            <p class="text-sm text-gray-700">Your request has been sent to <strong>${listing.sellerName || 'the seller'}</strong>.</p>
                            <p class="text-xs text-gray-500">You can review this appointment anytime from your dashboard.</p>
                        </div>`,
                        [
                            { label: 'Go to Dashboard', action: () => { modal.hide(); window.location.href = 'buyer-dashboard.html'; } },
                            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                        ]
                    );
                } catch (error) {
                    console.error('Contact request error:', error);
                    modal.show('Contact Failed', `<p class="text-sm text-gray-700">${error.message || 'Unable to reach the seller right now. Please try again.'}</p>`, [
                        { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                    ]);
                }
            }
        },
        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
    ]);
};

// Handle Buy Now - Creates purchase request (payment removed)
const handleBuyNow = async (listing) => {
    if (!listing || !(listing._id || listing.id)) {
        modal.show('Listing Error', 'Unable to process this purchase right now. Please refresh and try again.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    if (!authSession || !authSession.token) {
        modal.show('Authentication Required', 'Please log in to purchase items.', [
            { label: 'Go to Login', action: () => { modal.hide(); window.location.href = 'login.html'; } },
            { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    const listingId = listing._id || listing.id;
    const price = getListingPriceNumber(listing);
    const priceLabel = formatPrice(price);

    if (isNaN(price) || price <= 0) {
        modal.show('Price Error', 'Invalid price for this listing. Please contact the seller.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
        return;
    }

    // Create purchase request directly (no payment)
    const content = document.createElement('div');
    content.className = 'space-y-4';
    content.innerHTML = `
        <p class="text-sm text-gray-700">You are about to purchase <strong>${listing.itemName || 'this item'}</strong>.</p>
        <div class="bg-green-50 border border-green-200 rounded-xl p-3">
            <p class="text-xs text-gray-600 mb-1">Price</p>
            <p class="text-lg font-bold text-green-600">${priceLabel}</p>
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-2">Message to Seller (Optional)</label>
            <textarea id="purchase-message" rows="3" placeholder="Add any notes for the seller..." 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"></textarea>
        </div>
        <p class="text-xs text-gray-500">The seller will be notified and will contact you to complete the purchase.</p>
    `;

    modal.show('Purchase Request', '', [
        {
            label: 'Send Purchase Request',
            action: async () => {
                try {
                    const message = document.getElementById('purchase-message').value.trim();
                    modal.show('Processing', '<p class="text-sm text-gray-600">Sending purchase request...</p>');
                    
                    const result = await sendContactRequest(listingId, message || `Purchase request for ${listing.itemName || 'item'}. Price: ${priceLabel}`);
                    
                    modal.show(
                        'Purchase Request Sent! ✅',
                        `<div class="space-y-3 text-left">
                            <p class="text-sm text-gray-700">Your purchase request has been sent to <strong>${listing.sellerName || 'the seller'}</strong>.</p>
                            <p class="text-xs text-gray-500">Price: ${priceLabel}</p>
                            <p class="text-xs text-gray-500">The seller will contact you shortly to complete the purchase.</p>
                        </div>`,
                        [
                            { label: 'Go to Dashboard', action: () => { modal.hide(); window.location.href = 'buyer-dashboard.html'; } },
                            { label: 'Continue Shopping', action: () => { modal.hide(); window.location.reload(); } }
                        ]
                    );
                } catch (error) {
                    console.error('Purchase request error:', error);
                    modal.show('Request Failed', `<p class="text-sm text-gray-700">${error.message || 'Unable to send purchase request. Please try again.'}</p>`, [
                        { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
                    ]);
                }
            }
        },
        { label: 'Cancel', action: () => modal.hide(), variant: 'secondary' }
    ]);

    modal.content.innerHTML = '';
    modal.content.appendChild(content);
};

const showListingDetails = (listing) => {
    const content = document.createElement('div');
    content.className = 'space-y-4 max-h-[70vh] overflow-y-auto';

    if (listing.imageData) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'relative rounded-2xl overflow-hidden shadow-lg';
        const image = document.createElement('img');
        image.src = listing.imageData;
        image.alt = listing.itemName || 'Listing image';
        image.className = 'w-full h-64 object-cover';
        imageWrapper.appendChild(image);
        content.appendChild(imageWrapper);
    }

    const details = document.createElement('div');
    details.className = 'space-y-4 text-sm';
    
    const priceSection = document.createElement('div');
    priceSection.className = 'bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200';
    priceSection.innerHTML = `
        <p class="text-xs uppercase tracking-wide text-gray-600 mb-1 font-semibold">Price</p>
        <p class="text-2xl font-bold text-green-700">${formatPrice(getListingPriceNumber(listing))}</p>
    `;
    details.appendChild(priceSection);

    const infoGrid = document.createElement('div');
    infoGrid.className = 'grid grid-cols-2 gap-3';
    infoGrid.innerHTML = `
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Seller</p>
            <p class="font-semibold text-gray-800">${listing.sellerName || 'Unknown'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Category</p>
            <p class="font-semibold text-gray-800">${listing.category || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Condition</p>
            <p class="font-semibold text-gray-800">${listing.productQuality || 'N/A'}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Posted</p>
            <p class="font-semibold text-gray-800">${listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A'}</p>
        </div>
    `;
    details.appendChild(infoGrid);

    const descriptionSection = document.createElement('div');
    descriptionSection.className = 'bg-white p-4 rounded-xl border border-gray-200';
    descriptionSection.innerHTML = `
        <p class="text-xs uppercase tracking-wide text-gray-600 mb-2 font-semibold">Description</p>
        <p class="text-gray-700 leading-relaxed">${listing.description || 'No description provided.'}</p>
    `;
    details.appendChild(descriptionSection);

    if (listing.usageOrDisposalInfo) {
        const usageSection = document.createElement('div');
        usageSection.className = 'bg-blue-50 p-4 rounded-xl border border-blue-200';
        usageSection.innerHTML = `
            <p class="text-xs uppercase tracking-wide text-blue-700 mb-2 font-semibold">Usage / Disposal Info</p>
            <p class="text-gray-700 leading-relaxed">${listing.usageOrDisposalInfo}</p>
        `;
        details.appendChild(usageSection);
    }

    if (listing.swachhBharatTagline) {
        const taglineSection = document.createElement('div');
        taglineSection.className = 'bg-green-50 p-4 rounded-xl border border-green-200 italic text-center';
        taglineSection.innerHTML = `
            <p class="text-green-700 font-medium">${listing.swachhBharatTagline}</p>
        `;
        details.appendChild(taglineSection);
    }

    content.appendChild(details);

    const actions = [];
    if (authSession?.user?.role === 'Buyer') {
        actions.push({ 
            label: '💬 Contact Seller', 
            action: () => { 
                modal.hide(); 
                setTimeout(() => openContactModal(listing), 300); 
            } 
        });
    }
    actions.push({ 
        label: 'Close', 
        action: () => modal.hide(), 
        variant: 'secondary' 
    });

    modal.show('Listing Details', content, actions);
};

const fetchListings = async (categoryValue) => {
    const url = new URL(`${API_BASE_URL}/listings`);
    if (categoryValue && categoryValue !== 'all') {
        url.searchParams.set('category', categoryValue);
    }

    const response = await fetch(url);
    const raw = await response.text();

    if (!response.ok) {
        throw new Error(raw || 'Failed to load listings.');
    }

    try {
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.listings)) {
            return [];
        }
        return data.listings
            .filter((listing) => listing && (listing.seller || listing.sellerName))
            .map((listing) => ({
                ...listing,
                price: getListingPriceNumber(listing)
            }));
    } catch (error) {
        console.error('Unexpected response payload:', raw);
        throw new Error('Unexpected response from the server. Please try again later.');
    }
};

const applyFilters = () => {
    if (!elements.listingsContainer) return;

    const searchTerm = (elements.searchInput?.value || '').trim().toLowerCase();
    const conditionValue = elements.conditionFilter?.value || 'all';
    const minPriceValue = elements.priceMin?.value ? Number.parseFloat(elements.priceMin.value) : Number.NaN;
    const maxPriceValue = elements.priceMax?.value ? Number.parseFloat(elements.priceMax.value) : Number.NaN;
    const categoryValue = elements.categoryFilter?.value || 'all';

    const hasFilterTerm = Boolean(searchTerm);
    const hasCondition = conditionValue !== 'all';
    const hasMin = !Number.isNaN(minPriceValue);
    const hasMax = !Number.isNaN(maxPriceValue);
    const hasCategory = categoryValue !== 'all';

    state.filteredListings = state.allListings.filter((listing) => {
        const name = (listing.itemName || '').toLowerCase();
        const description = (listing.description || '').toLowerCase();
        const seller = (listing.sellerName || '').toLowerCase();

        const matchesSearch = !searchTerm || name.includes(searchTerm) || description.includes(searchTerm) || seller.includes(searchTerm);
        if (!matchesSearch) return false;

        const matchesCondition = conditionValue === 'all' || listing.productQuality === conditionValue;
        if (!matchesCondition) return false;

        if (!hasMin && !hasMax) {
            return true;
        }

        const numericPrice = getListingPriceNumber(listing);
        if (Number.isNaN(numericPrice)) {
            return false;
        }

        if (hasMin && numericPrice < minPriceValue) {
            return false;
        }
        if (hasMax && numericPrice > maxPriceValue) {
            return false;
        }

        return true;
    });

    updateEmptyStateMessage(hasFilterTerm || hasCondition || hasMin || hasMax || hasCategory);
    updateResultsCount(state.filteredListings.length, state.allListings.length);
    renderListings(state.filteredListings);
};

const loadListings = async () => {
    setLoading(true);
    try {
        const categoryValue = elements.categoryFilter?.value || 'all';
        state.allListings = await fetchListings(categoryValue);
        applyFilters();
    } catch (error) {
        console.error(error);
        modal.show('Marketplace Error', error.message || 'Unable to load listings right now. Please try again shortly.', [
            { label: 'Close', action: () => modal.hide(), variant: 'secondary' }
        ]);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    authSession = ensureAuthenticated();
    if (!authSession) {
        return;
    }

    const { user } = authSession;

    elements.listingsContainer = document.getElementById('listings-container');
    elements.emptyState = document.getElementById('empty-state');
    elements.emptyTitle = document.getElementById('empty-title');
    elements.emptyMessage = document.getElementById('empty-message');
    elements.resultsCount = document.getElementById('results-count');
    elements.searchInput = document.getElementById('search-input');
    elements.categoryFilter = document.getElementById('category-filter');
    elements.conditionFilter = document.getElementById('condition-filter');
    elements.priceMin = document.getElementById('price-min');
    elements.priceMax = document.getElementById('price-max');

    const clearFiltersBtn = document.getElementById('clear-filters');
    const refreshBtn = document.getElementById('refresh-btn');
    const sellBtn = document.getElementById('sell-btn');
    const emptyCreateBtn = document.getElementById('empty-create-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const titleEl = document.getElementById('marketplace-title');
    const roleBadge = document.getElementById('user-role-badge');
    const dashboardBtn = document.getElementById('dashboard-btn');

    modal.init();

    if (roleBadge) {
        roleBadge.textContent = user.role;
        roleBadge.classList.remove('hidden');
        if (user.role === 'Seller') {
            roleBadge.classList.add('bg-yellow-100', 'text-yellow-700');
            roleBadge.classList.remove('bg-green-100', 'text-green-700');
        }
    }

    const debouncedFilters = debounce(applyFilters, 200);

    elements.searchInput?.addEventListener('input', debouncedFilters);
    elements.conditionFilter?.addEventListener('change', applyFilters);
    elements.priceMin?.addEventListener('input', debouncedFilters);
    elements.priceMax?.addEventListener('input', debouncedFilters);

    elements.categoryFilter?.addEventListener('change', loadListings);

    clearFiltersBtn?.addEventListener('click', () => {
        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.categoryFilter) elements.categoryFilter.value = 'all';
        if (elements.conditionFilter) elements.conditionFilter.value = 'all';
        if (elements.priceMin) elements.priceMin.value = '';
        if (elements.priceMax) elements.priceMax.value = '';
        loadListings();
    });

    refreshBtn?.addEventListener('click', loadListings);

    dashboardBtn?.addEventListener('click', () => {
        window.location.href = 'buyer-dashboard.html';
    });

    const goToSellerPage = () => {
        if (user.role === 'Seller') {
            window.location.href = 'seller.html';
        } else {
            modal.show('Seller Access Required', 'You are currently browsing as a Buyer. Switch to a Seller account to create listings.', [
                { label: 'Got it', action: () => modal.hide(), variant: 'secondary' }
            ]);
        }
    };

    sellBtn?.addEventListener('click', goToSellerPage);
    emptyCreateBtn?.addEventListener('click', goToSellerPage);
    logoutBtn?.addEventListener('click', logout);
    titleEl?.addEventListener('click', loadListings);

    loadListings();
});

