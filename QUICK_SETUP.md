# ⚡ Quick Setup Guide

## 🎯 5-Minute Setup

### 1. Install Dependencies
```bash
cd own2
npm install razorpay axios
```

### 2. Configure Firebase (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project → Enable Authentication → Email/Password
3. Get config: Project Settings → Your apps → Web app
4. Update `signup.html` and `login.html` (replace `firebaseConfig` object)

### 3. Configure Razorpay (2 minutes)

1. Go to [Razorpay Dashboard](https://razorpay.com/)
2. Sign up → Settings → API Keys → Generate Test Keys
3. Copy Key ID and Key Secret

### 4. Create .env File

Create `own2/.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hackathon-auth
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_here
```

### 5. Start Server
```bash
node server.js
```

### 6. Test
- Open: `http://localhost:3000/signup.html`
- Sign up with Firebase
- Try a payment in buyer page

---

## 📝 Detailed Instructions

See `CONFIGURATION_GUIDE.md` for complete step-by-step instructions.



