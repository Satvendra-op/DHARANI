# 🔧 Complete Configuration Guide for Firebase & Razorpay

## 📋 Quick Start Checklist

- [ ] Install dependencies
- [ ] Configure Firebase
- [ ] Configure Razorpay
- [ ] Set up environment variables
- [ ] Test authentication
- [ ] Test payments

---

## 🔥 Step 1: Firebase Configuration

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter project name: `Dharani Snap` (or your choice)
4. **Disable** Google Analytics (optional, for simplicity)
5. Click **"Create project"**

### 1.2 Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"**:
   - Click on **Email/Password**
   - Toggle **"Enable"** to ON
   - Click **"Save"**
5. (Optional) Enable **"Google"** sign-in:
   - Click on **Google**
   - Toggle **"Enable"** to ON
   - Enter project support email
   - Click **"Save"**

### 1.3 Get Firebase Configuration

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** (`</>`) to add a web app
5. Register your app:
   - App nickname: `Dharani Snap Web`
   - (Optional) Check "Also set up Firebase Hosting"
   - Click **"Register app"**
6. **Copy the configuration object** - it looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 1.4 Update Firebase Config in Code

**Update `signup.html`:**
1. Open `own2/public/signup.html`
2. Find lines **79-88** (the `firebaseConfig` object)
3. Replace the placeholder values with your actual Firebase config:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",  // Your actual API key
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

**Update `login.html`:**
1. Open `own2/public/login.html`
2. Find lines **54-61** (the `firebaseConfig` object)
3. Replace with the same Firebase config values

### 1.5 Set Firebase API Key (Optional - for Production)

1. Create/update `.env` file in `own2` directory
2. Add:
```
FIREBASE_API_KEY=your-firebase-api-key-here
```
*(This is the same `apiKey` from your Firebase config)*

**Note:** For development, this is optional. The app will work without it, but token verification will be skipped.

---

## 💳 Step 2: Razorpay Configuration

### 2.1 Create Razorpay Account

1. Go to [Razorpay Dashboard](https://razorpay.com/)
2. Click **"Sign Up"** (free account)
3. Enter your details:
   - Business email
   - Business name
   - Mobile number
4. Verify your email and mobile number
5. Complete KYC (required for live payments)

### 2.2 Get Razorpay API Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Click **"Settings"** in the left sidebar
3. Click **"API Keys"**
4. You'll see two modes:
   - **Test Mode** (for development)
   - **Live Mode** (for production)

### 2.3 Generate Test Keys

1. Make sure you're in **"Test Mode"** (toggle in top right)
2. Click **"Generate Key"** if you don't have keys
3. Copy your **Key ID** (starts with `rzp_test_...`)
4. Copy your **Key Secret** (starts with `...` - shown only once, save it!)

### 2.4 Install Razorpay Package

Open terminal in the `own2` directory and run:
```bash
npm install razorpay axios
```

### 2.5 Set Razorpay Environment Variables

1. Create/update `.env` file in `own2` directory
2. Add your Razorpay credentials:
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
```

**⚠️ Important:**
- Never commit `.env` file to Git
- Use test keys for development
- Use live keys only in production (after KYC)

---

## 📝 Step 3: Create .env File

1. In the `own2` directory, create a file named `.env`
2. Add all environment variables:

```env
# Server Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hackathon-auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Firebase (Optional - for production token verification)
FIREBASE_API_KEY=your-firebase-api-key-here

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### Generate a Secure JWT Secret

Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

---

## 🚀 Step 4: Install All Dependencies

Run these commands in the `own2` directory:

```bash
# Install Razorpay and axios
npm install razorpay axios

# If you don't have other dependencies, install them:
npm install express mongoose bcryptjs jsonwebtoken cors dotenv
```

---

## ✅ Step 5: Test Configuration

### Test Firebase Authentication

1. Start your server:
```bash
cd own2
node server.js
```

2. Open browser: `http://localhost:3000/signup.html`

3. Try Firebase signup:
   - Fill in the form (Name, Email, Password, Role)
   - Click **"🔥 Sign up with Firebase"**
   - Check browser console for any errors
   - You should be redirected to dashboard on success

4. Try Firebase login:
   - Go to `http://localhost:3000/login.html`
   - Enter email and password
   - Click **"🔥 Sign in with Firebase"**
   - Should redirect to dashboard

### Test Razorpay Payment

1. Log in as a Buyer
2. Go to marketplace (`buyer.html`)
3. Find a listing with a price
4. Click **"Buy Now"**
5. Click **"Proceed to Payment"**
6. Use Razorpay test card:
   - **Card Number:** `4111 1111 1111 1111`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVV:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
7. Complete payment
8. Check if payment is verified and appointment is created

---

## 🔍 Troubleshooting

### Firebase Issues

**Error: "Firebase not configured"**
- ✅ Check that Firebase config is updated in `signup.html` and `login.html`
- ✅ Verify all config values are correct (no quotes around values)
- ✅ Check browser console for detailed errors

**Error: "Firebase: Error (auth/email-already-in-use)"**
- ✅ Email is already registered, try logging in instead

**Error: "Invalid Firebase token"**
- ✅ Check if `FIREBASE_API_KEY` is set in `.env` (optional for dev)
- ✅ Verify Authentication is enabled in Firebase Console

### Razorpay Issues

**Error: "Payment service not available"**
- ✅ Check Razorpay is installed: `npm list razorpay`
- ✅ Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`
- ✅ Restart server after adding environment variables

**Error: "Failed to create payment order"**
- ✅ Check Razorpay keys are correct
- ✅ Verify keys are test keys (start with `rzp_test_`)
- ✅ Check server logs for detailed error

**Payment window not opening**
- ✅ Check browser console for errors
- ✅ Verify Razorpay script is loading
- ✅ Check internet connection

---

## 📱 Test Cards (Razorpay)

Use these test cards in Razorpay test mode:

| Scenario | Card Number | CVV | Expiry |
|----------|------------|-----|--------|
| Success | 4111 1111 1111 1111 | 123 | Any future date |
| Failure | 4000 0000 0000 0002 | 123 | Any future date |
| 3D Secure | 5267 3181 8797 5449 | 123 | Any future date |

---

## 🎯 Quick Reference

### Firebase Config Location
- `own2/public/signup.html` (lines 79-88)
- `own2/public/login.html` (lines 54-61)

### Environment Variables (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hackathon-auth
JWT_SECRET=your-secret-key
FIREBASE_API_KEY=your-firebase-api-key (optional)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

### Important Files
- `.env` - Environment variables (create this file)
- `server.js` - Backend server
- `public/auth.js` - Authentication logic
- `public/firebase-auth.js` - Firebase auth module
- `public/buyer.js` - Payment integration

---

## 🆘 Need Help?

1. Check browser console for errors (F12)
2. Check server logs in terminal
3. Verify all environment variables are set
4. Ensure all dependencies are installed
5. Restart server after configuration changes

---

## ✨ You're All Set!

Once configured:
- ✅ Users can sign up/login with Firebase
- ✅ Users can make payments with Razorpay
- ✅ Payments are automatically verified
- ✅ Appointments are created on successful payment

Happy coding! 🚀



