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

// ==========================================
// --- 1. MIDDLEWARE CONFIGURATION ---
// ==========================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static(uploadDir));

// ==========================================
// --- 2. DATABASE POOL (RAILWAY OPTIMIZED) ---
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
});

db.getConnection((err, conn) => {
    if (err) console.error("❌ DB Connection Failed:", err.message);
    else { console.log("✅ DB Connected Successfully"); conn.release(); }
});

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'glow_aroma_2026_prod';
const PAYMOB_BASE = 'https://accept.paymob.com/api';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const rawName = req.body.name || 'product';
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        cb(null, `${safeName}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// ==========================================
// --- 3. CART ROUTES (FIXES THE 404) ---
// ==========================================

// CRITICAL: We put /cart/add BEFORE generic /cart/:userId
app.post('/cart/add', (req, res) => {
    const { userId, type, scentId, quantity = 1, prebuiltCandleId, totalPrice, cupShapeId, cupSizeId, cupColorId, candleColorId, moldShapeId, layers, snapshot } = req.body;
    if (!userId) return res.status(401).json({ error: 'Auth Required' });

    db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const cartId = results.length > 0 ? results[0].id : null;

        const handleAddition = (cId) => {
            if (prebuiltCandleId) {
                db.query('INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?', 
                [cId, prebuiltCandleId, quantity, quantity], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Added to cart' });
                });
            } else if (type === 'cup' || type === 'mold') {
                // Logic for Custom Candles
                db.query("INSERT INTO custom_candles (type, scent_id, cup_shape_id, cup_size_id, cup_color_id, mold_shape_id, total_price, preview_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                [type, scentId, cupShapeId || null, cupSizeId || null, cupColorId || null, moldShapeId || null, totalPrice, snapshot], (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const customId = result.insertId;
                    
                    // Handle Layers
                    if (type === 'mold' && Array.isArray(layers)) {
                        const layerVals = layers.map((colId, idx) => [customId, colId, idx + 1]);
                        db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES ?', [layerVals], () => {});
                    } else if (candleColorId) {
                        db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES (?, ?, 1)', [customId, candleColorId], () => {});
                    }

                    db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [cId, customId, quantity], () => {
                        res.json({ message: 'Custom added' });
                    });
                });
            }
        };

        if (!cartId) {
            db.query('INSERT INTO carts (user_id) VALUES (?)', [userId], (err, r) => handleAddition(r.insertId));
        } else handleAddition(cartId);
    });
});

app.get('/cart/:userId', (req, res) => {
    const sql = `
        SELECT ci.id AS cart_item_id, ci.quantity, cc.type AS candle_type, cc.total_price AS custom_price, cc.preview_image AS snapshot,
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

// ==========================================
// --- 4. ADMIN ROUTES ---
// ==========================================

app.get('/admin/orders', (req, res) => {
    const sql = `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/admin/orders/:id/items', (req, res) => {
    db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/admin/staff', (req, res) => {
    db.query('SELECT id, name, email, role_id FROM users WHERE role_id IN (2, 3)', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- 5. CATALOG & AUTH ---
// ==========================================

app.get('/products', (req, res) => {
    db.query("SELECT * FROM prebuilt_candles WHERE is_active = TRUE", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/products/:id', (req, res) => {
    db.query('SELECT * FROM prebuilt_candles WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not Found' });
        res.json(results[0]);
    });
});

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid' });
        const user = results[0];
        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (match) {
                const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
            } else res.status(401).json({ error: 'Invalid' });
        });
    });
});

// ==========================================
// --- 6. CHECKOUT & PAYMOB ---
// ==========================================

app.post('/checkout', (req, res) => {
    const { userId, total, items } = req.body;
    db.query('INSERT INTO orders (user_id, total, status_id) VALUES (?, ?, 1)', [userId, total], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        const orderId = result.insertId;
        const values = items.map(i => [orderId, i.is_custom ? 'custom' : 'prebuilt', i.name, i.price, i.quantity]);
        db.query('INSERT INTO order_items (order_id, item_type, item_name, unit_price, quantity) VALUES ?', [values], (err) => {
            db.query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)', [userId], () => {
                res.status(201).json({ message: 'Success', orderId });
            });
        });
    });
});

// ==========================================
// --- 7. GLOBAL ERROR HANDLER ---
// ==========================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GLOW AROMA MASTER BACKEND LIVE ON ${PORT}`));