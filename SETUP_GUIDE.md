# Firebase & Razorpay Setup Guide

## Firebase Authentication Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

### Step 2: Enable Authentication
1. In Firebase Console, go to **Authentication** > **Get started**
2. Enable **Email/Password** authentication
3. Enable **Google** authentication (optional, for Google Sign-In)

### Step 3: Get Firebase Config
1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app and copy the configuration

### Step 4: Update Firebase Config
1. Open `own2/public/login.html`
2. Find the `firebaseConfig` object (around line 54)
3. Replace the placeholder values with your actual Firebase config:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
    projectId: "YOUR_ACTUAL_PROJECT_ID",
    storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
    messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
    appId: "YOUR_ACTUAL_APP_ID"
};
```

4. Do the same for `own2/public/signup.html`

### Step 5: Set Firebase API Key (Optional, for Production)
Add to your `.env` file:
```
FIREBASE_API_KEY=your-firebase-api-key
```

**Note:** For development, the app will work without this, but token verification will be skipped.

---

## Razorpay Payment Gateway Setup

### Step 1: Create Razorpay Account
1. Go to [Razorpay Dashboard](https://razorpay.com/)
2. Sign up for a free account
3. Complete KYC verification (required for live payments)

### Step 2: Get API Keys
1. Log in to Razorpay Dashboard
2. Go to **Settings** > **API Keys**
3. Click **Generate Key** if you don't have keys
4. Copy your **Key ID** and **Key Secret**

### Step 3: Install Razorpay Package
```bash
cd own2
npm install razorpay
```

### Step 4: Set Environment Variables
Add to your `.env` file:
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Step 5: Test Mode
- Razorpay provides test keys for development
- Use test keys from Razorpay Dashboard > Settings > API Keys > Test Mode
- Test card numbers:
  - **Success:** 4111 1111 1111 1111
  - **Failure:** 4000 0000 0000 0002
  - **CVV:** Any 3 digits
  - **Expiry:** Any future date

---

## Installation Steps

### 1. Install Dependencies
```bash
cd own2
npm install razorpay axios
```

### 2. Update .env File
Create/update `.env` file in the `own2` directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hackathon-auth
JWT_SECRET=your-secret-key-change-in-production
FIREBASE_API_KEY=your-firebase-api-key-optional
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Start Server
```bash
npm start
# or
node server.js
```

---

## Features Added

### Firebase Authentication
- ✅ Email/Password signup and login
- ✅ Google Sign-In integration
- ✅ Secure token-based authentication
- ✅ User profile sync with database

### Razorpay Integration
- ✅ Secure payment processing
- ✅ Order creation and verification
- ✅ Payment status tracking
- ✅ Automatic appointment creation on successful payment

---

## Testing

### Test Firebase Auth
1. Go to `http://localhost:3000/signup.html`
2. Fill in the form or click "Sign up with Firebase"
3. Create an account
4. Try logging in

### Test Razorpay Payment
1. Log in as a Buyer
2. Browse listings in `buyer.html`
3. Click "Buy Now" on any listing
4. Click "Proceed to Payment"
5. Use Razorpay test credentials to complete payment

---

## Troubleshooting

### Firebase Issues
- **Error: "Firebase not configured"**
  - Check that Firebase config is set in `login.html` and `signup.html`
  - Verify all config values are correct

- **Error: "Invalid Firebase token"**
  - Make sure `FIREBASE_API_KEY` is set in `.env` (optional for dev)
  - Check Firebase Authentication is enabled in Firebase Console

### Razorpay Issues
- **Error: "Payment service not available"**
  - Check Razorpay is installed: `npm install razorpay`
  - Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`

- **Payment fails**
  - Use test mode keys for development
  - Check Razorpay dashboard for error logs
  - Verify amount is at least ₹1 (100 paise)

---

## Production Checklist

- [ ] Use production Firebase API keys
- [ ] Use production Razorpay keys (after KYC)
- [ ] Set strong JWT_SECRET
- [ ] Enable Firebase token verification (set FIREBASE_API_KEY)
- [ ] Configure proper CORS settings
- [ ] Set up proper error logging
- [ ] Test payment flow end-to-end
- [ ] Set up webhook for Razorpay (optional, for advanced features)

---

## Support

For issues:
- Firebase: [Firebase Documentation](https://firebase.google.com/docs)
- Razorpay: [Razorpay Documentation](https://razorpay.com/docs/)



