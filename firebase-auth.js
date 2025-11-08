// Firebase Authentication Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';

let firebaseApp = null;
let firebaseAuth = null;
let authInitialized = false;

// Initialize Firebase
function initFirebase() {
    if (authInitialized) return;
    
    const config = window.firebaseConfig;
    if (!config || !config.apiKey || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
        console.warn('Firebase config not found. Please configure Firebase in login.html/signup.html');
        return false;
    }

    try {
        firebaseApp = initializeApp(config);
        firebaseAuth = getAuth(firebaseApp);
        authInitialized = true;
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Firebase Email/Password Signup
export async function firebaseSignup(email, password, name, role) {
    if (!initFirebase()) {
        throw new Error('Firebase not configured. Please set up Firebase config.');
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;

        // Send email verification (optional)
        // await sendEmailVerification(user);

        // Get ID token
        const idToken = await user.getIdToken();

        // Send to backend to create user record with role
        const response = await fetch(`${window.API_BASE_URL || '/api'}/auth/firebase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken,
                name,
                role,
                email: user.email,
                uid: user.uid
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user account');
        }

        return {
            token: data.token,
            user: data.user,
            firebaseToken: idToken
        };
    } catch (error) {
        console.error('Firebase signup error:', error);
        throw error;
    }
}

// Firebase Email/Password Login
export async function firebaseLogin(email, password) {
    if (!initFirebase()) {
        throw new Error('Firebase not configured. Please set up Firebase config.');
    }

    try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        const idToken = await user.getIdToken();

        // Send to backend to get user record
        const response = await fetch(`${window.API_BASE_URL || '/api'}/auth/firebase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken,
                uid: user.uid
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate');
        }

        return {
            token: data.token,
            user: data.user,
            firebaseToken: idToken
        };
    } catch (error) {
        console.error('Firebase login error:', error);
        throw error;
    }
}

// Firebase Google Sign-In
export async function firebaseGoogleSignIn(role = null) {
    if (!initFirebase()) {
        throw new Error('Firebase not configured. Please set up Firebase config.');
    }

    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        const user = result.user;
        const idToken = await user.getIdToken();

        // Send to backend
        const response = await fetch(`${window.API_BASE_URL || '/api'}/auth/firebase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken,
                name: user.displayName,
                email: user.email,
                uid: user.uid,
                role: role || 'Buyer' // Default to Buyer if no role specified
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate');
        }

        return {
            token: data.token,
            user: data.user,
            firebaseToken: idToken
        };
    } catch (error) {
        console.error('Firebase Google sign-in error:', error);
        throw error;
    }
}

// Export auth instance for other uses
export function getFirebaseAuth() {
    if (!authInitialized) initFirebase();
    return firebaseAuth;
}


