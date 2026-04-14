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
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// --- Static Persistence for Uploads ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// ==========================================
// --- 2. DATABASE CONNECTION (POOLING) ---
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ CRITICAL: Database connection failed:", err.message);
    } else {
        console.log("✅ SUCCESS: Connected to MySQL Database:", process.env.DB_NAME);
        connection.release();
    }
});

// ==========================================
// --- 3. CONSTANTS & SECURITY ---
// ==========================================
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'glow_aroma_production_secret_2026';
const PAYMOB_BASE = 'https://accept.paymob.com/api';

// --- Multer Storage ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const rawName = req.body.name || 'product';
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        cb(null, `${safeName}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// ==========================================
// --- 4. PAYMOB PAYMENT HELPERS ---
// ==========================================

async function paymobGetAuthToken() {
    const res = await axios.post(`${PAYMOB_BASE}/auth/tokens`, { api_key: process.env.PAYMOB_API_KEY });
    return res.data.token;
}

async function paymobRegisterOrder(authToken, amountCents, merchantOrderId, items) {
    const res = await axios.post(`${PAYMOB_BASE}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: String(merchantOrderId),
        items: items
    });
    return res.data.id;
}

async function paymobGetPaymentKey(authToken, paymobOrderId, amountCents, billingData) {
    const res = await axios.post(`${PAYMOB_BASE}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: billingData,
        currency: 'EGP',
        integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID)
    });
    return res.data.token;
}

function paymobVerifyHmac(data, receivedHmac) {
    const fields = [
        'amount_cents', 'created_at', 'currency', 'error_occured',
        'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
        'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
        'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
        'source_data.sub_type', 'source_data.type', 'success'
    ];
    const str = fields.map(f => {
        const val = f.split('.').reduce((obj, k) => obj?.[k], data);
        return val ?? '';
    }).join('');
    const computed = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET).update(str).digest('hex');
    return computed === receivedHmac;
}

// ==========================================
// --- 5. ADMIN ROUTES (CRITICAL ORDER) ---
// ==========================================

// --- Order Management ---
app.get('/admin/orders', (req, res) => {
    const sql = `
        SELECT o.id, o.total, o.status_id, o.created_at, u.name AS customer_name 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        ORDER BY o.created_at DESC`;
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

app.put('/admin/orders/:id/status', (req, res) => {
    const { status_id } = req.body;
    db.query('UPDATE orders SET status_id = ? WHERE id = ?', [status_id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status successfully updated' });
    });
});

// --- Staff & User Management ---
app.get('/admin/staff', (req, res) => {
    db.query('SELECT id, name, email, phone, role_id FROM users WHERE role_id IN (2, 3) ORDER BY role_id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/admin/add-staff', (req, res) => {
    const { name, email, phone, password, role_id } = req.body;
    bcrypt.hash(password, SALT_ROUNDS, (err, hashed) => {
        db.query('INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?)', 
        [name, email, phone, hashed, role_id], (err, result) => {
            if (err) return res.status(500).json({ error: "Email already exists or DB error" });
            res.status(201).json({ message: 'Staff added', newStaff: { id: result.insertId, name, email, role_id } });
        });
    });
});

app.delete('/admin/staff/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ? AND role_id != 3', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Staff removed' });
    });
});

// --- Inventory & Products ---
app.post('/admin/products', upload.single('image'), (req, res) => {
    const { name, price, stock_quantity, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    db.query('INSERT INTO prebuilt_candles (name, price, stock_quantity, description, image_url) VALUES (?, ?, ?, ?, ?)', 
    [name, price, stock_quantity, description, image_url], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Product created', newProduct: { id: result.insertId, name, price, stock_quantity, description, image_url } });
    });
});

app.put('/admin/products/:id', upload.single('image'), (req, res) => {
    const { name, price, stock_quantity, description, existing_image_url } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : existing_image_url;
    const sql = 'UPDATE prebuilt_candles SET name=?, price=?, stock_quantity=?, description=?, image_url=? WHERE id=?';
    db.query(sql, [name, price, stock_quantity, description, image_url, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product updated', image_url });
    });
});

app.delete('/admin/products/:id', (req, res) => {
    db.query('DELETE FROM prebuilt_candles WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Product is linked to order history" });
        res.json({ message: 'Product deleted' });
    });
});

// --- Marketing & Messages ---
app.get('/admin/discount-codes', (req, res) => {
    db.query('SELECT * FROM discount_codes ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/admin/discount-codes', (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = req.body;
    const sql = `INSERT INTO discount_codes (code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [code, discount_type, discount_value, min_order_amount || 0, max_order_amount, max_uses, expires_at], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Promo Code Created' });
    });
});

app.get('/admin/messages', (req, res) => {
    db.query('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- 6. CANDLE BUILDER & CATALOG ---
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

app.get('/cup-shapes', (req, res) => {
    db.query('SELECT * FROM cup_shapes WHERE is_available = TRUE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/cup-sizes', (req, res) => {
    db.query('SELECT * FROM cup_sizes', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/products', (req, res) => {
    db.query("SELECT * FROM prebuilt_candles WHERE is_active = TRUE", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/products/:id', (req, res) => {
    db.query('SELECT * FROM prebuilt_candles WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(results[0]);
    });
});

// ==========================================
// --- 7. AUTH & USER PROFILES ---
// ==========================================

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = results[0];
        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (match) {
                const token = jwt.sign({ id: user.id, name: user.name, role: user.role_id }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
            } else res.status(401).json({ error: 'Invalid password' });
        });
    });
});

app.get('/users/:id', (req, res) => {
    db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { error: 'Not found' });
    });
});

app.get('/addresses/:userId', (req, res) => {
    db.query('SELECT * FROM user_addresses WHERE user_id = ?', [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/addresses/:userId', (req, res) => {
    const { fullName, phone, governorate, area, street, building, floorApt, notes } = req.body;
    const sql = `INSERT INTO user_addresses (user_id, full_name, phone, governorate, area, street, building, floor_apt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [req.params.userId, fullName, phone, governorate, area, street, building, floorApt, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Address saved', id: result.insertId });
    });
});

// ==========================================
// --- FIXED CART FETCH ROUTE ---
// ==========================================
app.get('/cart/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT 
            ci.id AS cart_item_id, 
            ci.quantity, 
            ci.prebuilt_candle_id,
            ci.custom_candle_id,
            pc.name AS prebuilt_name, 
            pc.price AS prebuilt_price, 
            pc.image_url AS prebuilt_image,
            cc.total_price AS custom_price, 
            cc.preview_image AS snapshot,
            cc.type AS candle_type
        FROM cart_items ci
        LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
        LEFT JOIN custom_candles cc ON ci.custom_candle_id = cc.id
        JOIN carts ct ON ci.cart_id = ct.id
        WHERE ct.user_id = ?`;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Map data to a consistent format the frontend expects
        const formatted = results.map(item => ({
            cart_item_id: item.cart_item_id,
            quantity: item.quantity,
            id: item.prebuilt_candle_id || item.custom_candle_id,
            name: item.prebuilt_name || (item.candle_type === 'cup' ? 'Custom Cup Candle' : 'Custom Mold Candle'),
            price: item.prebuilt_name ? item.prebuilt_price : item.custom_price,
            image: item.prebuilt_name ? item.prebuilt_image : item.snapshot,
            is_custom: !!item.candle_type
        }));
        res.json(formatted);
    });
});

// ==========================================
// --- FIXED CHECKOUT POST ROUTE ---
// ==========================================
app.post('/checkout', (req, res) => {
    const { userId, items, total } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items provided in checkout request" });
    }

    db.query('INSERT INTO orders (user_id, total, status_id) VALUES (?, ?, 1)', [userId, total], (err, result) => {
        if (err) return res.status(500).json({ error: "Order creation failed" });
        
        const orderId = result.insertId;
        
        // Ensure unit_price and item_name are mapped correctly from the frontend payload
        const itemValues = items.map(i => [
            orderId, 
            i.is_custom ? 'custom' : 'prebuilt', 
            i.name, 
            i.price, 
            i.quantity
        ]);

        const itemSql = `INSERT INTO order_items (order_id, item_type, item_name, unit_price, quantity) VALUES ?`;
        
        db.query(itemSql, [itemValues], (err) => {
            if (err) return res.status(500).json({ error: "Failed to save order items" });

            // Clear the cart
            db.query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)', [userId], () => {
                res.status(201).json({ message: 'Success', orderId });
            });
        });
    });
});
// ==========================================
// --- 9. PAYMENTS & FINISHING ---
// ==========================================

app.post('/paymob/initiate', async (req, res) => {
    try {
        const token = await paymobGetAuthToken();
        const paymobId = await paymobRegisterOrder(token, req.body.amountCents, req.body.orderId, req.body.items);
        const paymentToken = await paymobGetPaymentKey(token, paymobId, req.body.amountCents, req.body.shippingDetails);
        res.json({ paymentToken, iframeId: process.env.PAYMOB_IFRAME_ID });
    } catch (err) { res.status(500).json({ error: 'Gateway Connection Failed' }); }
});

app.post('/paymob/callback', async (req, res) => {
    const { hmac } = req.query;
    const data = req.body?.obj;
    if (data && paymobVerifyHmac(data, hmac) && data.success === true) {
        db.query('UPDATE orders SET status_id = 2 WHERE id = ?', [data.order.merchant_order_id]);
    }
    res.sendStatus(200);
});

// --- Catch-All Error Handler ---
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- Server Activation ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GLOW AROMA BACKEND ONLINE ON PORT ${PORT}`);
});