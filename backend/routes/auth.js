const express = require('express');
const router = express.Router();

// Simple Prototype Admin Auth for MCA Academic Demonstration
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // Default academic demo credentials or any valid email with password
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mobileshop.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
        return res.json({
            success: true,
            message: 'Login successful.',
            user: {
                name: 'Administrator',
                email: adminEmail,
                role: 'System Admin'
            },
            token: 'mca-demo-session-' + Date.now()
        });
    }

    // Also accept any valid store manager/employee email with 'admin123' or 'password123'
    if (password === 'admin123' || password === 'password123') {
        return res.json({
            success: true,
            message: 'Login successful.',
            user: {
                name: email.split('@')[0].replace('.', ' ').toUpperCase(),
                email: email,
                role: 'Store Staff'
            },
            token: 'mca-demo-session-' + Date.now()
        });
    }

    return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Use demo email: admin@mobileshop.com and password: admin123'
    });
});

module.exports = router;
