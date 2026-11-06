// Authentication & Session Guard for Academic Demo
(function() {
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    const userSession = localStorage.getItem('smart_mobile_user');

    if (!userSession && !isLoginPage) {
        // Automatically assign demo session if visiting directly for easy demonstration, or redirect
        const demoUser = {
            name: 'Store Administrator',
            email: 'admin@mobileshop.com',
            role: 'System Administrator'
        };
        localStorage.setItem('smart_mobile_user', JSON.stringify(demoUser));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const stored = localStorage.getItem('smart_mobile_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                const userNameEl = document.getElementById('sidebarUserName');
                const userRoleEl = document.getElementById('sidebarUserRole');
                const userAvatarEl = document.getElementById('sidebarUserAvatar');

                if (userNameEl) userNameEl.textContent = user.name || 'Admin';
                if (userRoleEl) userRoleEl.textContent = user.role || 'Administrator';
                if (userAvatarEl && user.name) {
                    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    userAvatarEl.textContent = initials;
                }
            } catch (e) {
                console.error(e);
            }
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('smart_mobile_user');
                window.location.href = 'index.html';
            });
        }
    });
})();
