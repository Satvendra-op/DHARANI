const API_BASE_URL = `${window.location.origin}/api`;
const API_KEY = 'AIzaSyAyXUJdtLoKIznDZDC33IGTcp6opv7CJkc';
const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';

const achievements = {
    first_correct: { name: 'First Step', description: 'Get your first correct answer.' },
    streak_3: { name: 'Eco Apprentice', description: 'Get 3 correct answers in a row.' },
    streak_5: { name: 'Eco Champion', description: 'Get 5 correct answers in a row.' },
    total_10: { name: 'Eco Guru', description: 'Get a total of 10 correct answers.' }
};

const getQualityColor = (quality) => {
    switch (quality) {
        case 'Good':
            return 'bg-green-500 text-white';
        case 'Better':
            return 'bg-blue-500 text-white';
        case 'Bad':
            return 'bg-yellow-500 text-gray-800';
        case 'Critical':
            return 'bg-red-500 text-white';
        default:
            return 'bg-gray-300 text-gray-800';
    }
};

const validQualities = ['Good', 'Better', 'Bad', 'Critical'];

const parsePriceToNumber = (value) => {
    if (value === undefined || value === null) return Number.NaN;
    if (typeof value === 'number') return value;
    const match = value.toString().replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : Number.NaN;
};

const formatPriceForDisplay = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) return 'Price unavailable';
    return `₹ ${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let roundScore = 0;
let quizData = { score: 0, streak: 0, unlocked_achievements: {} };
let currentListingCategory = '';
let currentListingImageBase64 = '';

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
        this.title.textContent = title;
        this.content.innerHTML = '';
        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else if (content instanceof Node) {
            this.content.appendChild(content);
        }
        this.actions.innerHTML = '';
        actions.forEach(({ label, action, variant = 'primary' }) => {
            const button = document.createElement('button');
            button.textContent = label;
            button.onclick = action;
            const baseClass = 'px-6 py-2 rounded-full font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 shadow-md';
            const variantClass = variant === 'secondary'
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400'
                : 'button-gradient hover:opacity-90 focus:ring-green-500';
            button.className = `${baseClass} ${variantClass}`;
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
            window.location.href = 'buyer.html';
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

const fetchWithAuth = async (url, options = {}) => {
    const session = ensureSellerAccess();
    if (!session) {
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    return response;
};

const createListing = async (payload) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/listings`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response) {
        return { ok: false, error: 'Authentication required' };
    }

    const raw = await response.text();

    try {
        const data = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
            return { ok: false, error: data.error || 'Failed to create listing' };
        }
        return { ok: true, data };
    } catch (error) {
        console.error('Unexpected response while creating listing:', raw);
        return { ok: false, error: 'Unexpected server response. Please try again.' };
    }
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
});

const renderHomeScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 text-center">
      <div class="hero-gradient p-8 rounded-3xl shadow-xl mb-8 transform transition-transform duration-300 hover:scale-105">
        <h2 class="text-4xl sm:text-5xl font-black text-white mb-2">Welcome to Dharani Snap!</h2>
        <p class="text-lg sm:text-xl text-white font-medium">Your personal guide to an eco-friendly life.</p>
      </div>
      <div class="space-y-4">
        <button id="reusability-btn" class="w-full py-4 px-6 bg-white border border-green-200 text-green-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">♻️</span> Check Reusability</span>
        </button>
        <button id="listing-btn" class="w-full py-4 px-6 bg-white border border-yellow-200 text-yellow-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">💰</span> Sell / Refurbish Item</span>
        </button>
        <button id="quiz-btn" class="w-full py-4 px-6 bg-white border border-blue-200 text-blue-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">🧠</span> Eco Quiz</span>
        </button>
        <button id="chatbot-btn" class="w-full py-4 px-6 bg-white border border-purple-200 text-purple-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">💬</span> Eco Chatbot</span>
        </button>
      </div>
    </div>
  `;

    document.getElementById('reusability-btn')?.addEventListener('click', () => renderReusabilityCheckScreen(mainContent));
    document.getElementById('quiz-btn')?.addEventListener('click', () => renderQuizScreen(mainContent));
    document.getElementById('chatbot-btn')?.addEventListener('click', () => renderChatbotScreen(mainContent));
    document.getElementById('listing-btn')?.addEventListener('click', () => renderListingScreen(mainContent));
};

const renderListingScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-yellow-800 mb-4">What are you listing?</h2>
      <p class="text-lg text-gray-700 mb-8">Choose the category that best describes your item.</p>
      <div class="space-y-4">
        <button data-category="Refurbished Products" class="listing-category-btn w-full py-4 px-6 bg-white border border-yellow-200 text-yellow-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">🎨</span> Refurbished Products</span>
          <p class="text-sm font-normal mt-1 opacity-80">Upcycled furniture, artwork, custom items.</p>
        </button>
        <button data-category="Scrap / Garbage" class="listing-category-btn w-full py-4 px-6 bg-white border border-blue-200 text-blue-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">📰</span> Scrap / Garbage</span>
          <p class="text-sm font-normal mt-1 opacity-80">Newspaper, cardboard, plastic, metal scrap.</p>
        </button>
      </div>
    </div>
  `;

    document.querySelectorAll('.listing-category-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            currentListingCategory = event.currentTarget.dataset.category;
            renderListingTypeScreen(mainContent, currentListingCategory);
        });
    });
};

const renderListingTypeScreen = (mainContent, category) => {
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-yellow-800 mb-4">${category} Listing</h2>
      <p class="text-lg text-gray-700 mb-8">How would you like to create your listing?</p>
      <div class="space-y-4">
        <button id="auto-listing-btn" class="w-full py-4 px-6 text-white font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">📸</span> Automatic Listing (AI Assisted)</span>
          <p class="text-sm font-normal mt-1 opacity-80">Upload an image and let AI fill the details.</p>
        </button>
        <button id="manual-listing-btn" class="w-full py-4 px-6 bg-white border border-gray-300 text-gray-700 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400">
          <span class="flex items-center justify-center"><span class="text-2xl mr-3">✍️</span> Manual Listing</span>
          <p class="text-sm font-normal mt-1 opacity-80">Enter all listing details yourself.</p>
        </button>
      </div>
    </div>
  `;

    document.getElementById('auto-listing-btn')?.addEventListener('click', () => startAutomaticListing(mainContent));
    document.getElementById('manual-listing-btn')?.addEventListener('click', () => renderManualListingScreen(mainContent));
};

const renderManualListingScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-yellow-800 mb-4">Manual Listing: ${currentListingCategory}</h2>
      <p class="text-lg text-gray-700 mb-6">Enter details for your ${currentListingCategory.toLowerCase()} item.</p>
      <form id="listing-form" class="space-y-4 text-left">
        <label class="block text-gray-700 font-semibold" for="item-name">Item Name</label>
        <input id="item-name" type="text" placeholder="e.g., Upcycled Jar Lantern" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" />
        <label class="block text-gray-700 font-semibold" for="item-quality">Product Quality</label>
        <select id="item-quality" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors">
          <option value="" disabled selected>Select Quality...</option>
          <option value="Good">Good (Excellent, minimal wear)</option>
          <option value="Better">Better (Minor wear, easily fixable)</option>
          <option value="Bad">Bad (Significant damage, requires major refurbishment)</option>
          <option value="Critical">Critical (Near unusable, suitable only for parts/scrap)</option>
        </select>
                            <label class="block text-gray-700 font-semibold" for="item-price">Estimated Price (INR)</label>
                            <input id="item-price" type="number" min="0" step="0.01" placeholder="e.g., 450" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" />
        <label class="block text-gray-700 font-semibold" for="item-description">Description</label>
        <textarea id="item-description" rows="3" placeholder="Describe the item, condition, and its environmental benefit." required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"></textarea>
        <label class="block text-gray-700 font-semibold" for="item-usage">Usage / Disposal Info</label>
        <textarea id="item-usage" rows="2" placeholder="${currentListingCategory === 'Refurbished Products' ? 'How can the buyer use this item?' : 'How should the buyer process this scrap?'}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"></textarea>
        <label class="block text-gray-700 font-semibold" for="item-image">Image Upload</label>
        <input id="item-image" type="file" accept="image/*" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" />
        <button type="submit" class="mt-8 w-full py-3 px-6 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
          List Item Manually
        </button>
      </form>
    </div>
  `;

    document.getElementById('listing-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = form.querySelector('#item-name').value.trim();
        const quality = form.querySelector('#item-quality').value;
        const priceInput = form.querySelector('#item-price').value.trim();
        const description = form.querySelector('#item-description').value.trim();
        const usageInfo = form.querySelector('#item-usage').value.trim();
        const imageFile = form.querySelector('#item-image').files?.[0];

        const priceValue = parsePriceToNumber(priceInput);

        if (!name || !quality || Number.isNaN(priceValue) || !description || !usageInfo || !imageFile) {
            modal.show('Invalid Details', 'Please provide all fields. Price must be a valid number.');
            return;
        }

        if (!validQualities.includes(quality)) {
            modal.show('Invalid Quality', 'Please select a valid product quality option.');
            return;
        }

        try {
            const imageData = await readFileAsDataUrl(imageFile);
            modal.show('Saving Listing', 'Creating your listing, please wait...');

            const payload = {
                category: currentListingCategory,
                itemName: name,
                productQuality: quality,
                price: priceValue,
                description,
                usageOrDisposalInfo: usageInfo,
                swachhBharatTagline: 'Keeping Bharat clean, one listing at a time!',
                imageData
            };

            const result = await createListing(payload);

            if (!result.ok) {
                throw new Error(result.error);
            }

            const isCritical = quality === 'Critical';
            modal.show(
                'Listing Successful!',
                `<p class="text-lg">Your manual listing for <strong>${name}</strong> priced at <strong>${formatPriceForDisplay(priceValue)}</strong> with quality <strong>${quality}</strong> in the <strong>${currentListingCategory}</strong> category has been created!</p>
                ${isCritical ? '<p class="text-sm text-amber-600 mt-2"><strong>Note:</strong> This is a Critical quality item. You can send a dump request to Nagar Nigam from your dashboard.</p>' : ''}`,
                [
                    { label: 'View Dashboard', action: () => { modal.hide(); window.location.href = 'seller-dashboard.html'; } },
                    { label: 'Create Another', action: () => { modal.hide(); renderListingScreen(mainContent); } }
                ]
            );
        } catch (error) {
            console.error('Manual Listing Error:', error);
            modal.show('Error', error.message || 'Failed to create listing. Please try again.');
        }
    });
};

const startAutomaticListing = (mainContent) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.setAttribute('capture', 'camera');
    fileInput.onchange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleAutomaticImageUpload(mainContent, file);
        }
    };
    fileInput.click();
};

const handleAutomaticImageUpload = (mainContent, file) => {
    if (!API_KEY) {
        modal.show('API Key Missing', 'Please provide a valid API key to use this feature.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const dataUrl = event.target?.result;
        if (!dataUrl) {
            modal.show('Image Error', 'Unable to process the selected image.');
            return;
        }

        currentListingImageBase64 = dataUrl;
        const base64ImageData = dataUrl.split(',')[1];
        const category = currentListingCategory;
        const prompt = `
      You are an expert listing generator for an eco-friendly marketplace in India.
      The user is uploading an image of an item intended for ${category}.
      Analyze the image and determine the Product Quality as one of: "Good", "Better", "Bad", or "Critical".
      Generate a structured JSON object for a product listing with the following fields:
      1. itemName
      2. productQuality
      3. estimatedPriceINR
      4. description
      5. usageOrDisposalInfo
      6. swachhBharatTagline
    `;

        mainContent.innerHTML = `
      <div class="p-6 w-full text-center">
        <h2 class="text-3xl font-extrabold text-yellow-800 mb-4">AI Analyzing Item...</h2>
        <p class="text-lg text-gray-700 mb-6">Generating listing details for your ${category.toLowerCase()}.</p>
        <img src="${dataUrl}" alt="Item to be analyzed" class="mx-auto rounded-xl shadow-lg max-h-64 object-contain mb-8">
        <div class="w-20 h-20 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto"></div>
      </div>
    `;

        try {
            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: file.type, data: base64ImageData } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            itemName: { type: 'STRING' },
                            productQuality: { type: 'STRING' },
                            estimatedPriceINR: { type: 'STRING' },
                            description: { type: 'STRING' },
                            usageOrDisposalInfo: { type: 'STRING' },
                            swachhBharatTagline: { type: 'STRING' }
                        },
                        propertyOrdering: ['itemName', 'productQuality', 'estimatedPriceINR', 'description', 'usageOrDisposalInfo', 'swachhBharatTagline']
                    }
                }
            };

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
            let response;
            let retries = 0;

            while (retries < 3) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        break;
                    }
                } catch (_) {
                    // ignored, handled by retry loop
                }
                retries += 1;
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
            }

            const result = await response.json();
            const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!jsonString) {
                throw new Error('The AI could not generate listing details. Please try again.');
            }

            const output = JSON.parse(jsonString);
            if (!validQualities.includes(output.productQuality)) {
                output.productQuality = 'Good';
            }

            renderAutomaticListingReview(mainContent, output);
        } catch (error) {
            console.error('Gemini API error:', error);
            modal.show(
                'AI Listing Error',
                'The AI could not generate listing details. Please try again with a clearer image or use Manual Listing.',
                [
                    { label: 'Manual Listing', action: () => { modal.hide(); renderManualListingScreen(mainContent); } },
                    { label: 'Try Again', action: () => { modal.hide(); renderListingTypeScreen(mainContent, currentListingCategory); } }
                ]
            );
        }
    };

    reader.readAsDataURL(file);
};

const renderAutomaticListingReview = (mainContent, listingData) => {
    const category = currentListingCategory;
    const imageSrc = currentListingImageBase64;
    const qualityClass = getQualityColor(listingData.productQuality);
    const initialPriceNumber = parsePriceToNumber(listingData.estimatedPriceINR ?? listingData.price);
    const initialPriceDisplay = Number.isNaN(initialPriceNumber) ? '' : initialPriceNumber.toString();

    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-yellow-800 mb-4">Review AI Listing</h2>
      <p class="text-lg text-gray-700 mb-6">Review and edit the generated details before listing.</p>
      <form id="review-form" class="space-y-4 text-left p-4 bg-white rounded-xl shadow-lg">
        <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
          <img src="${imageSrc}" alt="Item to be listed" class="rounded-xl shadow-md max-h-48 object-contain border-4 border-yellow-300 w-full sm:w-1/3">
          <div class="w-full sm:w-2/3 sm:pl-6">
            <p class="text-lg font-semibold text-gray-700">AI Assessed Quality:</p>
            <span class="inline-block px-4 py-2 font-black rounded-full text-xl shadow-md ${qualityClass}">
              ${listingData.productQuality}
            </span>
          </div>
        </div>
        <label class="block text-gray-700 font-semibold" for="review-item-name">Item Name</label>
        <input id="review-item-name" type="text" value="${listingData.itemName}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" />
        <label class="block text-gray-700 font-semibold" for="review-item-quality">Product Quality (Editable)</label>
        <select id="review-item-quality" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors">
          ${validQualities
            .map((quality) => `<option value="${quality}" ${listingData.productQuality === quality ? 'selected' : ''}>${quality}</option>`)
            .join('')}
        </select>
        <label class="block text-gray-700 font-semibold" for="review-item-price">Estimated Price (INR)</label>
        <input id="review-item-price" type="number" min="0" step="0.01" value="${initialPriceDisplay}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" />
        <label class="block text-gray-700 font-semibold" for="review-item-description">Description</label>
        <textarea id="review-item-description" rows="3" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors">${listingData.description}</textarea>
        <label class="block text-gray-700 font-semibold" for="review-item-usage">Usage / Disposal Info</label>
        <textarea id="review-item-usage" rows="2" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors">${listingData.usageOrDisposalInfo}</textarea>
        <p class="mt-4 p-3 bg-green-50 rounded-lg text-green-700 font-medium">${listingData.swachhBharatTagline}</p>
        <button type="submit" class="mt-8 w-full py-3 px-6 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
          Confirm & List Item
        </button>
      </form>
    </div>
  `;

    document.getElementById('review-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('review-item-name').value.trim();
        const quality = document.getElementById('review-item-quality').value;
        const price = document.getElementById('review-item-price').value.trim();
        const description = document.getElementById('review-item-description').value.trim();
        const usageInfo = document.getElementById('review-item-usage').value.trim();

        if (!validQualities.includes(quality)) {
            modal.show('Invalid Quality', 'Please select a valid product quality option.');
            return;
        }

        const numericPrice = parsePriceToNumber(price);
        if (Number.isNaN(numericPrice)) {
            modal.show('Invalid Price', 'Please enter a valid numeric price.');
            return;
        }

        try {
            modal.show('Saving Listing', 'Creating your listing, please wait...');

            const payload = {
                category,
                itemName: name,
                productQuality: quality,
                price: numericPrice,
                description,
                usageOrDisposalInfo: usageInfo,
                swachhBharatTagline: listingData.swachhBharatTagline,
                imageData: currentListingImageBase64
            };

            const result = await createListing(payload);

            if (!result.ok) {
                throw new Error(result.error);
            }

            modal.show(
                'Listing Confirmed!',
                `<p class="text-lg">Your AI-assisted listing for <strong>${name}</strong> priced at <strong>${formatPriceForDisplay(numericPrice)}</strong> with quality <strong>${quality}</strong> has been created in the <strong>${category}</strong> category!</p>`,
                [
                    { label: 'View Listings', action: () => { modal.hide(); window.location.href = 'buyer.html'; } },
                    { label: 'Create Another', action: () => { modal.hide(); renderListingScreen(mainContent); } }
                ]
            );
        } catch (error) {
            console.error('Automatic Listing Error:', error);
            modal.show('Error', error.message || 'Failed to create listing. Please try again.');
        }
    });
};

// The remaining functions (reusability check, quiz, chatbot) are adapted versions of the provided script.
// For brevity, only essential modifications are noted. The logic mirrors the original instructions.

const renderReusabilityCheckScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-green-800 mb-4">Reusability Check</h2>
      <p class="text-lg text-gray-700 mb-6">Upload an image and let's find out how to give your item a second life!</p>
      <div id="reusability-output" class="hidden bg-green-50 p-6 rounded-2xl shadow-inner mt-4 text-left"></div>
      <button id="start-check-btn" class="mt-8 w-full py-3 px-6 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
        Start New Check
      </button>
    </div>
  `;

    document.getElementById('start-check-btn')?.addEventListener('click', () => startReusabilityCheck(mainContent));
};

const startReusabilityCheck = (mainContent) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.setAttribute('capture', 'camera');
    fileInput.onchange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageUpload(mainContent, file);
        }
    };
    fileInput.click();
};

const handleImageUpload = (mainContent, file) => {
    if (!API_KEY) {
        modal.show('API Key Missing', 'Please provide a valid API key to use this feature.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const dataUrl = event.target?.result;
        if (!dataUrl) {
            modal.show('Image Error', 'Unable to process the selected image.');
            return;
        }

        const base64ImageData = dataUrl.split(',')[1];
        const prompt = `
      You are an expert in waste management and sustainability with a specific focus on Indian contexts.
      Analyze the item in the image and provide a detailed, structured response in JSON format with keys:
      dharanis_choice, reusability_analysis (item, reusability_tip, swachh_bharat_impact, environmental_impact),
      and disposal_guidance (waste_type, disposal_method, which_bin).
    `;

        mainContent.innerHTML = `
      <div class="p-6 w-full text-center">
        <h2 class="text-3xl font-extrabold text-green-800 mb-4">Analyzing...</h2>
        <p class="text-lg text-gray-700 mb-6">Please wait while the AI analyzes your item.</p>
        <img src="${dataUrl}" alt="Item to be analyzed" class="mx-auto rounded-xl shadow-lg max-h-64 object-contain mb-8">
        <div class="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
      </div>
    `;

        try {
            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: file.type, data: base64ImageData } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            dharanis_choice: { type: 'STRING' },
                            reusability_analysis: {
                                type: 'OBJECT',
                                properties: {
                                    item: { type: 'STRING' },
                                    reusability_tip: { type: 'STRING' },
                                    swachh_bharat_impact: { type: 'STRING' },
                                    environmental_impact: { type: 'STRING' }
                                }
                            },
                            disposal_guidance: {
                                type: 'OBJECT',
                                properties: {
                                    waste_type: { type: 'STRING' },
                                    disposal_method: { type: 'STRING' },
                                    which_bin: { type: 'STRING' }
                                }
                            }
                        }
                    }
                }
            };

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
            let response;
            let retries = 0;

            while (retries < 3) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        break;
                    }
                } catch (_) {
                    // ignored
                }
                retries += 1;
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
            }

            const result = await response.json();
            const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!jsonString) {
                throw new Error('API response was invalid or empty.');
            }

            const output = JSON.parse(jsonString);
            displayReusabilityOutput(mainContent, output);
        } catch (error) {
            console.error('Gemini API error:', error);
            const fallback = {
                dharanis_choice: 'Undecided',
                reusability_analysis: {
                    item: 'Unknown Item',
                    reusability_tip: 'I could not identify this item. Please try again with a clearer image.',
                    swachh_bharat_impact: 'Every attempt helps us move towards a cleaner India.',
                    environmental_impact: 'Reducing waste protects our natural resources.'
                },
                disposal_guidance: {
                    waste_type: 'Unknown',
                    disposal_method: 'No specific method available.',
                    which_bin: 'Please try again.'
                }
            };
            displayReusabilityOutput(mainContent, fallback);
        }
    };

    reader.readAsDataURL(file);
};

const displayReusabilityOutput = (mainContent, output) => {
    const ra = output.reusability_analysis;
    const dg = output.disposal_guidance;
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <h2 class="text-3xl font-extrabold text-green-800 mb-4">Reusability Check</h2>
      <div class="p-6 rounded-2xl shadow-lg mt-4 text-left space-y-6">
        <div class="p-6 rounded-2xl shadow-xl border-4 ${output.dharanis_choice === 'Reuse' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}">
          <h3 class="text-2xl font-bold mb-2 flex items-center justify-center text-gray-800">
            <span class="mr-2">${output.dharanis_choice === 'Reuse' ? '♻️' : '🗑️'}</span>
            Dharani's Choice:
            <span class="font-black ml-2 ${output.dharanis_choice === 'Reuse' ? 'text-green-600' : 'text-red-600'}">${output.dharanis_choice}</span>
          </h3>
        </div>
        <div class="p-4 bg-white rounded-xl shadow-lg border border-green-200">
          <h3 class="font-bold text-xl text-green-700 mb-2 flex items-center"><span class="text-2xl mr-2">💡</span> Reusability Analysis</h3>
          <p class="text-lg font-semibold flex items-center text-gray-600 mb-2"><span class="text-xl mr-2">📦</span>Item: <span class="text-green-600 ml-2">${ra.item}</span></p>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h4 class="font-bold text-base text-gray-800 mb-1">Tip:</h4>
            <p class="text-gray-700">${ra.reusability_tip}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <h4 class="font-bold text-base text-gray-800 mb-1">Swachh Bharat Impact:</h4>
            <p class="text-gray-700">${ra.swachh_bharat_impact}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <h4 class="font-bold text-base text-gray-800 mb-1">Environmental Impact:</h4>
            <p class="text-gray-700">${ra.environmental_impact}</p>
          </div>
        </div>
        <div class="p-4 bg-white rounded-xl shadow-lg border border-red-200">
          <h3 class="font-bold text-xl text-red-700 mb-2 flex items-center"><span class="text-2xl mr-2">🗑️</span> Disposal Guidance</h3>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h4 class="font-bold text-base text-gray-800 mb-1">Waste Type:</h4>
            <p class="text-gray-700">${dg.waste_type}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <h4 class="font-bold text-base text-gray-800 mb-1">Disposal Method:</h4>
            <p class="text-gray-700">${dg.disposal_method}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <h4 class="font-bold text-base text-gray-800 mb-1">Which Bin:</h4>
            <p class="text-gray-700">${dg.which_bin}</p>
          </div>
        </div>
      </div>
      <button id="start-check-btn" class="mt-8 w-full py-3 px-6 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
        Start New Check
      </button>
    </div>
  `;

    document.getElementById('start-check-btn')?.addEventListener('click', () => renderReusabilityCheckScreen(mainContent));
};

const getQuizQuestionsFromAPI = async () => {
    if (!API_KEY) {
        modal.show('API Key Missing', 'Please provide a valid API key to use the quiz feature.');
        return [];
    }

    const prompt = `
    Generate a JSON array of 5 unique eco-friendly multiple-choice questions with options A-D, answer, correctPhrase, and incorrectPhrase.
  `;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        question: { type: 'STRING' },
                        options: {
                            type: 'OBJECT',
                            properties: {
                                A: { type: 'STRING' },
                                B: { type: 'STRING' },
                                C: { type: 'STRING' },
                                D: { type: 'STRING' }
                            }
                        },
                        answer: { type: 'STRING' },
                        correctPhrase: { type: 'STRING' },
                        incorrectPhrase: { type: 'STRING' }
                    }
                }
            }
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    let response;
    let retries = 0;

    while (retries < 3) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                break;
            }
        } catch (_) {
            // ignored
        }
        retries += 1;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }

    if (!response || !response.ok) {
        throw new Error('Failed to fetch quiz questions from API.');
    }

    const result = await response.json();
    const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonString) {
        throw new Error('API response was invalid or empty.');
    }
    return JSON.parse(jsonString);
};

const renderQuizScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 w-full text-center">
      <div class="bg-green-100 p-6 rounded-2xl shadow-md mb-8">
        <h2 class="text-3xl font-extrabold text-green-800 mb-4">Eco Quiz</h2>
        <p class="text-lg text-gray-700 mb-6">Test your knowledge and become an Eco Warrior!</p>
        <p class="text-3xl font-bold text-green-600 mb-2">Total Score: <span id="quiz-score">${quizData.score}</span></p>
        <p class="text-xl font-medium text-gray-700">Current Streak: <span id="quiz-streak">${quizData.streak}</span></p>
      </div>
      <div id="achievements-container" class="bg-gray-100 p-4 rounded-xl shadow-inner mb-6 text-left ${Object.keys(quizData.unlocked_achievements).length > 0 ? '' : 'hidden'}">
        <h3 class="font-bold text-lg mb-2 flex items-center text-gray-800"><span class="text-2xl mr-2">🏆</span> My Achievements</h3>
        <ul id="achievements-list" class="space-y-2"></ul>
      </div>
      <div id="quiz-container" class="space-y-4"></div>
      <button id="start-quiz-btn" class="mt-8 w-full py-3 px-6 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 button-gradient focus:outline-none focus:ring-2 focus:ring-green-400">
        Start Quiz
      </button>
    </div>
  `;

    const achievementsList = document.getElementById('achievements-list');
    const achievementsContainer = document.getElementById('achievements-container');

    if (achievementsList && achievementsContainer) {
        achievementsList.innerHTML = '';
        if (Object.keys(quizData.unlocked_achievements).length > 0) {
            Object.keys(quizData.unlocked_achievements).forEach((key) => {
                if (quizData.unlocked_achievements[key]) {
                    const achievementItem = document.createElement('li');
                    achievementItem.className = 'flex items-center space-x-2 text-green-800';
                    achievementItem.innerHTML = `<span class="text-2xl">🏅</span><span>${achievements[key].name}: ${achievements[key].description}</span>`;
                    achievementsList.appendChild(achievementItem);
                }
            });
            achievementsContainer.classList.remove('hidden');
        } else {
            achievementsContainer.classList.add('hidden');
        }
    }

    document.getElementById('start-quiz-btn')?.addEventListener('click', () => startQuiz(mainContent));
};

const startQuiz = async (mainContent) => {
    const quizContainer = document.getElementById('quiz-container');
    const startQuizBtn = document.getElementById('start-quiz-btn');

    if (!quizContainer || !startQuizBtn) {
        return;
    }

    startQuizBtn.classList.add('hidden');
    quizContainer.innerHTML = `
    <div class="p-6 w-full text-center">
      <div class="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
      <p class="mt-4 text-gray-700">Generating new quiz questions...</p>
    </div>
  `;

    try {
        currentQuizQuestions = await getQuizQuestionsFromAPI();
        currentQuestionIndex = 0;
        roundScore = 0;

        if (currentQuizQuestions.length > 0) {
            loadQuestion(mainContent);
        } else {
            renderQuizScreen(mainContent);
        }
    } catch (error) {
        console.error('Quiz Error:', error);
        quizContainer.innerHTML = `
      <div class="p-6 w-full text-center text-red-600">
        <p class="text-xl font-bold">Failed to load quiz questions.</p>
        <p class="mt-2 text-lg">Please check your internet connection and API key.</p>
      </div>
    `;
        startQuizBtn.classList.remove('hidden');
    }
};

const loadQuestion = (mainContent) => {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) {
        return;
    }

    if (currentQuestionIndex >= currentQuizQuestions.length) {
        return;
    }

    const question = currentQuizQuestions[currentQuestionIndex];

    quizContainer.innerHTML = `
    <div class="bg-white p-6 rounded-2xl shadow-xl space-y-4 text-left">
      <p class="text-xl font-bold text-gray-900">Question ${currentQuestionIndex + 1} of ${currentQuizQuestions.length}:</p>
      <p class="text-lg text-gray-800 mb-4">${question.question}</p>
      <div id="options-container" class="space-y-3">
        ${Object.entries(question.options)
            .map(
                ([key, value]) => `
              <button data-answer="${key}" class="w-full text-left p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-green-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 quiz-option-btn">
                <span class="font-semibold text-green-600 mr-2">${key}:</span>
                <span class="text-gray-800">${value}</span>
              </button>
            `
            )
            .join('')}
      </div>
    </div>
  `;

    quizContainer.querySelectorAll('.quiz-option-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            handleQuizAnswer(mainContent, event.currentTarget, question);
        });
    });
};

const handleQuizAnswer = (mainContent, selectedButton, question) => {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) {
        return;
    }

    quizContainer.querySelectorAll('.quiz-option-btn').forEach((btn) => {
        btn.disabled = true;
    });

    const userAnswer = selectedButton.dataset.answer;
    const correct = question.answer;
    let title;
    let message;
    let newAchievement = null;

    if (userAnswer.toUpperCase() === correct.toUpperCase()) {
        quizData.score += 1;
        quizData.streak += 1;
        roundScore += 1;
        selectedButton.classList.add('bg-green-200', 'ring-2', 'ring-green-500');
        title = '✅ Correct!';
        message = `<p class="text-lg text-green-600 font-semibold">${question.correctPhrase}</p>`;

        if (quizData.score === 1 && !quizData.unlocked_achievements.first_correct) {
            quizData.unlocked_achievements.first_correct = true;
            newAchievement = achievements.first_correct.name;
        }
        if (quizData.streak === 3 && !quizData.unlocked_achievements.streak_3) {
            quizData.unlocked_achievements.streak_3 = true;
            newAchievement = achievements.streak_3.name;
        }
        if (quizData.streak === 5 && !quizData.unlocked_achievements.streak_5) {
            quizData.unlocked_achievements.streak_5 = true;
            newAchievement = achievements.streak_5.name;
        }
        if (quizData.score === 10 && !quizData.unlocked_achievements.total_10) {
            quizData.unlocked_achievements.total_10 = true;
            newAchievement = achievements.total_10.name;
        }
    } else {
        quizData.streak = 0;
        selectedButton.classList.add('bg-red-200', 'ring-2', 'ring-red-500');
        title = '❌ Incorrect!';
        message = `<p class="text-lg text-red-600 font-semibold">${question.incorrectPhrase}</p>`;
        const correctButton = quizContainer.querySelector(`[data-answer="${correct}"]`);
        if (correctButton) {
            correctButton.classList.add('bg-green-200', 'ring-2', 'ring-green-500');
        }
    }

    const scoreEl = document.getElementById('quiz-score');
    const streakEl = document.getElementById('quiz-streak');
    if (scoreEl) scoreEl.textContent = quizData.score;
    if (streakEl) streakEl.textContent = quizData.streak;

    if (currentQuestionIndex + 1 >= currentQuizQuestions.length) {
        let roundPhrase = '';
        if (roundScore === currentQuizQuestions.length) {
            roundPhrase = "Perfect score! You're an Eco Master! 💯";
        } else if (roundScore >= Math.ceil(currentQuizQuestions.length * 0.6)) {
            roundPhrase = 'Great job! Keep up the good work! 🌱';
        } else {
            roundPhrase = "Every answer is a step forward! You'll ace the next round! 💪";
        }

        modal.show(
            'Round Complete!',
            `<p class="text-xl font-bold mb-4">Your score is: ${roundScore} out of ${currentQuizQuestions.length}</p><p>${roundPhrase}</p>`,
            [
                { label: 'Start New Round', action: () => { modal.hide(); startQuiz(mainContent); } },
                { label: 'Back to Home', action: () => { modal.hide(); renderHomeScreen(mainContent); } }
            ]
        );
    } else {
        const nextAction = () => {
            modal.hide();
            currentQuestionIndex += 1;
            loadQuestion(mainContent);
        };

        if (newAchievement) {
            modal.show(title, `${message}<p class="mt-4">You've unlocked the achievement: <strong>${newAchievement}</strong>! 🎉</p>`, [
                { label: 'Next', action: nextAction }
            ]);
        } else {
            modal.show(title, message, [{ label: 'Next', action: nextAction }]);
        }
    }
};

const renderChatbotScreen = (mainContent) => {
    mainContent.innerHTML = `
    <div class="p-6 flex flex-col h-full w-full">
      <h2 class="text-3xl font-extrabold text-green-800 mb-4 text-center">Eco Chatbot</h2>
      <p class="text-lg text-gray-700 mb-6 text-center">Ask me anything about eco-friendly living!</p>
      <div id="chat-history" class="flex-1 overflow-y-auto p-4 bg-white rounded-2xl shadow-inner mb-4 space-y-4 max-h-[60vh] min-h-[40vh]"></div>
      <form id="chat-form" class="flex space-x-2">
        <input id="chat-input" type="text" placeholder="Ask me a question..." class="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors" />
        <button type="submit" id="chat-submit-btn" class="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  `;

    document.getElementById('chat-form')?.addEventListener('submit', (event) => handleChatSubmit(event));
};

const handleChatSubmit = async (event) => {
    event.preventDefault();

    if (!API_KEY) {
        modal.show('API Key Missing', 'Please provide a valid API key to use the chatbot.');
        return;
    }

    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const chatSubmitBtn = document.getElementById('chat-submit-btn');

    if (!chatInput || !chatHistory || !chatSubmitBtn) {
        return;
    }

    const input = chatInput.value.trim();
    if (!input) {
        return;
    }

    const userMessage = document.createElement('div');
    userMessage.className = 'flex justify-end';
    userMessage.innerHTML = `<div class="max-w-[75%] p-4 rounded-2xl bg-green-600 text-white rounded-br-none shadow-md">${input}</div>`;
    chatHistory.appendChild(userMessage);
    chatInput.value = '';
    chatSubmitBtn.disabled = true;

    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'flex justify-start';
    loadingMessage.innerHTML = '<div class="max-w-[75%] p-4 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none animate-pulse shadow-md">Thinking...</div>';
    chatHistory.appendChild(loadingMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    let botResponseText = '';

    try {
        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: `You are a helpful eco-friendly assistant. Answer the following question about recycling, reusing, or eco-friendly practices. Be concise and informative, like a chatbot. The user is asking: "${input}"` }]
            }]
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        let response;
        let retries = 0;

        while (retries < 3) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    break;
                }
            } catch (_) {
                // ignored
            }
            retries += 1;
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        botResponseText = text || 'Sorry, I received an empty response from the server. Please try again.';
    } catch (error) {
        console.error('Chatbot Error:', error);
        botResponseText = "Sorry, I'm having trouble connecting right now. Please try again later.";
    }

    loadingMessage.remove();
    const botMessage = document.createElement('div');
    botMessage.className = 'flex justify-start';
    botMessage.innerHTML = `<div class="max-w-[75%] p-4 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none shadow-md">${botResponseText}</div>`;
    chatHistory.appendChild(botMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    chatSubmitBtn.disabled = false;
};

document.addEventListener('DOMContentLoaded', () => {
    const session = ensureSellerAccess();
    if (!session) {
        return;
    }

    const mainContent = document.getElementById('main-content');
    const homeBtn = document.getElementById('home-btn');
    const appTitle = document.getElementById('app-title');
    const viewListingsBtn = document.getElementById('view-listings-btn');
    const dashboardBtn = document.getElementById('seller-dashboard-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (!mainContent) {
        return;
    }

    modal.init();

    homeBtn?.addEventListener('click', () => renderHomeScreen(mainContent));
    appTitle?.addEventListener('click', () => renderHomeScreen(mainContent));
    viewListingsBtn?.addEventListener('click', () => { window.location.href = 'buyer.html'; });
    dashboardBtn?.addEventListener('click', () => { window.location.href = 'seller-dashboard.html'; });
    logoutBtn?.addEventListener('click', logout);

    renderHomeScreen(mainContent);
});

