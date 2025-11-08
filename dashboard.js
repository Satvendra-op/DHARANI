const API_BASE_URL = `${window.location.origin}/api`;

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load user information
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    const userInfoEl = document.getElementById('userInfo');
    const errorEl = document.getElementById('errorMessage');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (response.ok && data.user) {
            const user = data.user;
            const roleClass = user.role.toLowerCase();

            userInfoEl.innerHTML = `
                <h2>Welcome, ${user.name}!</h2>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> <span class="role-badge ${roleClass}">${user.role}</span></p>
                <p><strong>User ID:</strong> ${user._id}</p>
            `;
        } else {
            // Token invalid, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Try to use stored user data as fallback
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                const roleClass = user.role.toLowerCase();
                userInfoEl.innerHTML = `
                    <h2>Welcome, ${user.name}!</h2>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Role:</strong> <span class="role-badge ${roleClass}">${user.role}</span></p>
                    <p><strong>User ID:</strong> ${user.id}</p>
                `;
            } catch (e) {
                errorEl.textContent = 'Error loading user information';
                errorEl.classList.add('show');
            }
        } else {
            window.location.href = 'login.html';
        }
    }
}

// Logout handler
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadUserInfo();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

