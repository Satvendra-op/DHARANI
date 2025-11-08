const API_BASE_URL = `${window.location.origin}/api`;
window.API_BASE_URL = API_BASE_URL;

// Import Firebase auth functions
import { firebaseSignup, firebaseLogin, firebaseGoogleSignIn } from './firebase-auth.js';

// Utility functions
function showError(elementId, message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.classList.add('hidden');
    }
}

function showSuccess(elementId, message) {
    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
    }

    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

function clearMessages() {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');
    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');
}

function redirectByRole(role) {
    if (role === 'Seller') {
        window.location.href = 'seller-dashboard.html';
    } else {
        window.location.href = 'buyer-dashboard.html';
    }
}

// Initialize form handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Signup Form Handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            if (!name || !email || !password || !role) {
                showError('errorMessage', 'All fields are required');
                return;
            }

            if (password.length < 6) {
                showError('errorMessage', 'Password must be at least 6 characters long');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password, role }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token in localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    showSuccess('successMessage', 'Account created successfully! Redirecting...');

                    // Redirect based on role after 1.5 seconds
                    setTimeout(() => {
                        redirectByRole(data.user.role);
                    }, 1500);
                } else {
                    showError('errorMessage', data.error || 'Signup failed. Please try again.');
                }
            } catch (error) {
                console.error('Signup Error:', error);
                showError('errorMessage', 'Network error. Please check if the server is running.');
            }
        });
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('errorMessage', 'Email and password are required');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token in localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    showSuccess('successMessage', 'Login successful! Redirecting...');

                    // Redirect based on role after 1 second
                    setTimeout(() => {
                        redirectByRole(data.user.role);
                    }, 1000);
                } else {
                    showError('errorMessage', data.error || 'Invalid email or password');
                }
            } catch (error) {
                console.error('Login Error:', error);
                showError('errorMessage', 'Network error. Please check if the server is running.');
            }
        });
    }

    // Initialize Google Sign-In (Hidden - using Firebase instead)
    window.handleGoogleSignIn = handleGoogleSignIn;
    
    // Hide Google Sign-In button immediately
    initializeGoogleSignIn();

    // Firebase Login Button
    const firebaseLoginBtn = document.getElementById('firebase-login-btn');
    const firebaseLoginWarning = document.getElementById('firebase-config-warning');
    
    if (firebaseLoginBtn) {
        // Check if Firebase is configured
        const checkFirebaseConfig = () => {
            const config = window.firebaseConfig;
            if (!config || !config.apiKey || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
                if (firebaseLoginWarning) {
                    firebaseLoginWarning.classList.remove('hidden');
                }
                return false;
            }
            if (firebaseLoginWarning) {
                firebaseLoginWarning.classList.add('hidden');
            }
            return true;
        };
        
        setTimeout(checkFirebaseConfig, 500);
        
        firebaseLoginBtn.addEventListener('click', async () => {
            clearMessages();
            
            if (!checkFirebaseConfig()) {
                showError('errorMessage', 'Firebase is not configured. Please configure Firebase first.');
                return;
            }
            
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;

            if (!email || !password) {
                showError('errorMessage', 'Please enter email and password first');
                return;
            }

            try {
                showSuccess('successMessage', 'Signing in with Firebase...');
                firebaseLoginBtn.disabled = true;
                
                const result = await firebaseLogin(email, password);
                
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('firebaseToken', result.firebaseToken);

                showSuccess('successMessage', 'Login successful! Redirecting...');
                setTimeout(() => {
                    redirectByRole(result.user.role);
                }, 1000);
            } catch (error) {
                firebaseLoginBtn.disabled = false;
                showError('errorMessage', error.message || 'Firebase login failed. Please try again.');
            }
        });
    }

    // Firebase Signup Button
    const firebaseSignupBtn = document.getElementById('firebase-signup-btn');
    const firebaseWarning = document.getElementById('firebase-config-warning');
    
    if (firebaseSignupBtn) {
        // Ensure button is visible
        firebaseSignupBtn.style.display = 'flex';
        firebaseSignupBtn.style.visibility = 'visible';
        firebaseSignupBtn.style.opacity = '1';
        
        // Check if Firebase is configured
        const checkFirebaseConfig = () => {
            const config = window.firebaseConfig;
            if (!config || !config.apiKey || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
                if (firebaseWarning) {
                    firebaseWarning.classList.remove('hidden');
                }
                firebaseSignupBtn.disabled = false; // Still show button but warn user
                return false;
            }
            if (firebaseWarning) {
                firebaseWarning.classList.add('hidden');
            }
            return true;
        };
        
        // Check on page load - wait for scripts to load
        setTimeout(() => {
            checkFirebaseConfig();
        }, 1000);
        
        firebaseSignupBtn.addEventListener('click', async () => {
            clearMessages();
            
            if (!checkFirebaseConfig()) {
                showError('errorMessage', 'Firebase is not configured. Please configure Firebase first. See CONFIGURATION_GUIDE.md for instructions.');
                return;
            }
            
            const name = document.getElementById('name')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const role = document.getElementById('role')?.value;

            if (!name || !email || !password || !role) {
                showError('errorMessage', 'Please fill all fields first');
                return;
            }

            if (password.length < 6) {
                showError('errorMessage', 'Password must be at least 6 characters');
                return;
            }

            try {
                showSuccess('successMessage', 'Creating account with Firebase...');
                firebaseSignupBtn.disabled = true;
                
                const result = await firebaseSignup(email, password, name, role);
                
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('firebaseToken', result.firebaseToken);

                showSuccess('successMessage', 'Account created! Redirecting...');
                setTimeout(() => {
                    redirectByRole(result.user.role);
                }, 1000);
            } catch (error) {
                firebaseSignupBtn.disabled = false;
                showError('errorMessage', error.message || 'Firebase signup failed. Please try again.');
            }
        });
    }
});

// Google Sign-In handler
function handleGoogleSignIn(response) {
    const isSignup = window.location.pathname.includes('signup');
    
    if (isSignup) {
        // Show role selection for signup
        const roleSelect = document.getElementById('google-role-select');
        const roleDropdown = document.getElementById('google-role');
        
        if (roleSelect && roleDropdown) {
            // Store credential temporarily
            window.pendingGoogleCredential = response.credential;
            
            // Show role selection
            roleSelect.classList.remove('hidden');
            roleSelect.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Handle role selection
            roleDropdown.onchange = function() {
                const selectedRole = roleDropdown.value;
                if (selectedRole && window.pendingGoogleCredential) {
                    roleSelect.classList.add('hidden');
                    proceedWithGoogleAuth(window.pendingGoogleCredential, selectedRole);
                    window.pendingGoogleCredential = null;
                }
            };
            
            return; // Wait for user to select role
        }
    }
    
    // For login, proceed directly
    proceedWithGoogleAuth(response.credential, null);
}

// Proceed with Google authentication
async function proceedWithGoogleAuth(credential, role = null) {
    try {
        showSuccess('successMessage', 'Authenticating with Google...');
        
        // Send the credential to the backend
        const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential, role }),
        });

        const data = await backendResponse.json();

        if (backendResponse.ok) {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showSuccess('successMessage', 'Authentication successful! Redirecting...');

            // Redirect based on role after 1 second
            setTimeout(() => {
                redirectByRole(data.user.role);
            }, 1000);
        } else {
            showError('errorMessage', data.error || 'Google sign-in failed. Please try again.');
        }
    } catch (error) {
        console.error('Google Auth Error:', error);
        showError('errorMessage', 'Network error. Please check if the server is running.');
    }
}

// Initialize Google Sign-In button (Hidden - using Firebase Google Sign-In instead)
function initializeGoogleSignIn() {
    const buttonContainer = document.getElementById('google-signin-button');
    
    // Hide the Google Sign-In button container since we're using Firebase
    // Firebase handles Google Sign-In through the Firebase button
    if (buttonContainer) {
        buttonContainer.style.display = 'none';
    }
}

