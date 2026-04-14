const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

require('dotenv').config();

const app = express();

// --- 1. Middleware ---
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- 2. Static Files (Images) ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static(uploadDir));

// --- 3. Database Connection ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error("Database Connection Error:", err.message);
    else console.log("Connected to MySQL Database");
});

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'glow_aroma_secret_2026';
const PAYMOB_BASE = 'https://accept.paymob.com/api';

// --- 4. Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const rawName = req.body.name || 'candle';
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        cb(null, `${safeName}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// ==========================================
// --- UTILITY ROUTES & HELPERS ---
// ==========================================

app.get('/', (req, res) => res.status(200).send('Glow Aroma API Active'));

// Helper for Paymob
async function paymobGetAuthToken() {
    const res = await axios.post(`${PAYMOB_BASE}/auth/tokens`, { api_key: process.env.PAYMOB_API_KEY });
    return res.data.token;
}

// ==========================================
// --- CATALOG & BUILDER ROUTES ---
// ==========================================

app.get('/scents', (req, res) => {
    db.query('SELECT * FROM scents WHERE is_available = TRUE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/colors', (req, res) => {
    db.query('SELECT * FROM colors WHERE is_available = TRUE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/products', (req, res) => {
    db.query("SELECT * FROM prebuilt_candles WHERE is_active = TRUE", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// ==========================================
// --- AUTH & USER ROUTES ---
// ==========================================

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid email/password' });
        
        const user = results[0];
        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        
        // Bcrypt check
        if (!user.password_hash.startsWith('$2')) {
            if (password === user.password_hash) return res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (match) res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
            else res.status(401).json({ error: 'Invalid credentials' });
        });
    });
});

app.get('/users/:id', (req, res) => {
    if (!req.params.id || req.params.id === 'null') return res.status(400).json({ error: "No user ID" });
    db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { error: 'Not found' });
    });
});

// ==========================================
// --- ADDRESS BOOK (STABLE VERSION) ---
// ==========================================

app.get('/addresses/:userId', (req, res) => {
    db.query('SELECT * FROM user_addresses WHERE user_id = ?', [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/addresses/:userId', (req, res) => {
    const { fullName, phone, governorate, area, street, building, floorApt, notes } = req.body;
    const sql = `INSERT INTO user_addresses (user_id, full_name, phone, governorate, area, street, building, floor_apt, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [req.params.userId, fullName, phone, governorate, area, street, building, floorApt, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Saved', id: result.insertId });
    });
});

app.put('/addresses/:id', (req, res) => {
    const { fullName, phone, governorate, area, street, building, floorApt, notes } = req.body;
    const sql = `UPDATE user_addresses SET full_name=?, phone=?, governorate=?, area=?, street=?, building=?, floor_apt=?, notes=? WHERE id=?`;
    db.query(sql, [fullName, phone, governorate, area, street, building, floorApt, notes, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated' });
    });
});

app.delete('/addresses/:id', (req, res) => {
    db.query('DELETE FROM user_addresses WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Cannot delete. Address is likely linked to an order." });
        res.json({ message: 'Deleted' });
    });
});

// ==========================================
// --- CART & ORDER LOGIC ---
// ==========================================

app.get('/cart/:userId', (req, res) => {
    const sql = `
        SELECT ci.id AS cart_item_id, ci.quantity, cc.type AS candle_type, cc.total_price AS custom_price,
        pc.name AS prebuilt_name, pc.price AS prebuilt_price, pc.image_url AS prebuilt_image
        FROM cart_items ci
        LEFT JOIN custom_candles cc ON ci.custom_candle_id = cc.id
        LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
        JOIN carts ct ON ci.cart_id = ct.id
        WHERE ct.user_id = ?`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.delete('/cart/remove/:cartItemId', (req, res) => {
    db.query('DELETE FROM cart_items WHERE id = ?', [req.params.cartItemId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Removed' });
    });
});

// ==========================================
// --- ADMIN & PAYMENTS ---
// ==========================================

app.get('/admin/orders', (req, res) => {
    db.query('SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/paymob/initiate', async (req, res) => {
    try {
        const token = await paymobGetAuthToken();
        res.json({ paymentToken: token, iframeId: process.env.PAYMOB_IFRAME_ID });
    } catch (err) {
        res.status(500).json({ error: 'Gateway Connection Failed' });
    }
});

// --- GLOBAL ERROR CATCH (Stops JSON.parse errors) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));