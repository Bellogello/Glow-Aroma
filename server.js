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

// --- Middleware ---
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- Static File Handling ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static(uploadDir));

// --- Database Connection ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error("Database Error:", err.message);
    else console.log("Database connected successfully");
});

// --- Constants ---
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const PAYMOB_BASE = 'https://accept.paymob.com/api';

// --- Multer Engine ---
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
// --- UTILITY HELPERS ---
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
    const fields = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];
    const str = fields.map(f => {
        const val = f.split('.').reduce((obj, k) => obj?.[k], data);
        return val ?? '';
    }).join('');
    return crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET).update(str).digest('hex') === receivedHmac;
}

// ==========================================
// --- CANDLE BUILDER ROUTES ---
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

app.get('/cup-colors', (req, res) => {
    db.query('SELECT * FROM cup_colors', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/mold-shapes', (req, res) => {
    db.query('SELECT * FROM mold_shapes WHERE is_available = TRUE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- PRODUCT CATALOG ---
// ==========================================

app.get('/products', (req, res) => {
    db.query("SELECT * FROM prebuilt_candles WHERE is_active = TRUE", (err, results) => {
        if (err) return res.status(500).json({ error: "Database query failed" });
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
// --- AUTHENTICATION & USERS ---
// ==========================================

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = results[0];
        const login = () => {
            const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
        };
        if (!user.password_hash.startsWith('$2')) {
            if (password === user.password_hash) login();
            else res.status(401).json({ error: 'Invalid credentials' });
        } else {
            bcrypt.compare(password, user.password_hash, (err, match) => {
                if (match) login();
                else res.status(401).json({ error: 'Invalid credentials' });
            });
        }
    });
});

app.post('/auth/google', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Token missing' });
    try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { email, name } = response.data;
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                const user = results[0];
                const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
            } else {
                bcrypt.hash(Math.random().toString(36), SALT_ROUNDS, (err, hashed) => {
                    db.query('INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, 1)', [name, email, hashed], (err, result) => {
                        const token = jwt.sign({ id: result.insertId, name }, JWT_SECRET, { expiresIn: '7d' });
                        res.status(201).json({ token, userId: result.insertId, userName: name, roleId: 1 });
                    });
                });
            }
        });
    } catch (error) { res.status(500).json({ error: 'Google authentication failed' }); }
});

app.get('/users/:id', (req, res) => {
    db.query('SELECT name, email, phone FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { error: 'Not found' });
    });
});

// ==========================================
// --- SHOPPING CART ---
// ==========================================

app.post('/cart/add', (req, res) => {
    const { userId, type, scentId, quantity = 1, prebuiltCandleId, totalPrice, cupShapeId, cupSizeId, cupColorId, candleColorId, moldShapeId, layers, snapshot } = req.body;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const cartId = results.length > 0 ? results[0].id : null;

        const processAddition = (id) => {
            if (prebuiltCandleId) {
                db.query('SELECT stock_quantity FROM prebuilt_candles WHERE id = ?', [prebuiltCandleId], (err, stock) => {
                    if (stock[0].stock_quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });
                    db.query('INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?', [id, prebuiltCandleId, quantity, quantity], () => res.json({ message: 'Added' }));
                });
            } else if (type === 'cup') {
                db.query("INSERT INTO custom_candles (type, scent_id, cup_shape_id, cup_size_id, cup_color_id, total_price, preview_image) VALUES ('cup', ?, ?, ?, ?, ?, ?)", [scentId, cupShapeId, cupSizeId, cupColorId, totalPrice, snapshot], (err, result) => {
                    const customId = result.insertId;
                    db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES (?, ?, 1)', [customId, candleColorId], () => {
                        db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [id, customId, quantity], () => res.json({ message: 'Added' }));
                    });
                });
            } else if (type === 'mold') {
                db.query("INSERT INTO custom_candles (type, scent_id, mold_shape_id, total_price, preview_image) VALUES ('mold', ?, ?, ?, ?)", [scentId, moldShapeId, totalPrice, snapshot], (err, result) => {
                    const customId = result.insertId;
                    const layerValues = layers.map((colorId, index) => [customId, colorId, index + 1]);
                    db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES ?', [layerValues], () => {
                        db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [id, customId, quantity], () => res.json({ message: 'Added' }));
                    });
                });
            }
        };

        if (!cartId) db.query('INSERT INTO carts (user_id) VALUES (?)', [userId], (err, result) => processAddition(result.insertId));
        else processAddition(cartId);
    });
});

app.get('/cart/:userId', (req, res) => {
    const sql = `
        SELECT ci.id AS cart_item_id, ci.quantity, cc.type AS candle_type, cc.total_price AS custom_price, cc.preview_image AS snapshot,
        cs.name AS cup_shape_name, csz.size_ml, ccol.name AS cup_color_name, ms.name AS mold_shape_name, s.name AS scent_name,
        GROUP_CONCAT(cl.name ORDER BY ccl.layer_index ASC SEPARATOR ', ') AS wax_colors,
        pc.name AS prebuilt_name, pc.price AS prebuilt_price, pc.image_url AS prebuilt_image, pc.stock_quantity AS prebuilt_stock
        FROM cart_items ci
        LEFT JOIN custom_candles cc ON ci.custom_candle_id = cc.id
        LEFT JOIN cup_shapes cs ON cc.cup_shape_id = cs.id
        LEFT JOIN cup_sizes csz ON cc.cup_size_id = csz.id
        LEFT JOIN cup_colors ccol ON cc.cup_color_id = ccol.id
        LEFT JOIN mold_shapes ms ON cc.mold_shape_id = ms.id
        LEFT JOIN scents s ON cc.scent_id = s.id
        LEFT JOIN custom_candle_layers ccl ON cc.id = ccl.custom_candle_id
        LEFT JOIN colors cl ON ccl.color_id = cl.id
        LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
        JOIN carts ct ON ci.cart_id = ct.id
        WHERE ct.user_id = ?
        GROUP BY ci.id`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatted = results.map(item => ({
            cart_item_id: item.cart_item_id,
            quantity: item.quantity,
            is_custom: !!item.candle_type,
            snapshot: item.snapshot,
            name: item.prebuilt_name || (item.candle_type === 'cup' ? `${item.cup_shape_name} (${item.size_ml}ml)` : `${item.mold_shape_name} Mold`),
            price: item.prebuilt_name ? item.prebuilt_price : item.custom_price,
            image: item.prebuilt_name ? item.prebuilt_image : item.snapshot,
            max_stock: item.prebuilt_name ? item.prebuilt_stock : 99,
            color: item.prebuilt_name ? 'Standard' : (item.candle_type === 'cup' ? `Cup: ${item.cup_color_name} | Wax: ${item.wax_colors}` : `Layers: ${item.wax_colors}`),
            scent: item.scent_name
        }));
        res.json(formatted);
    });
});

app.delete('/cart/remove/:cartItemId', (req, res) => {
    db.query('DELETE FROM cart_items WHERE id = ?', [req.params.cartItemId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Removed' });
    });
});

// ==========================================
// --- ADDRESS BOOK ---
// ==========================================

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
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    });
});

// ==========================================
// --- ADMIN OPERATIONS ---
// ==========================================

app.get('/admin/orders', (req, res) => {
    const sql = 'SELECT o.id, o.total, o.status_id, o.created_at, u.name AS customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/admin/orders/:id/status', (req, res) => {
    db.query('UPDATE orders SET status_id = ? WHERE id = ?', [req.body.status_id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status Updated' });
    });
});

app.get('/admin/staff', (req, res) => {
    db.query('SELECT id, name, email, role_id FROM users WHERE role_id IN (2, 3) ORDER BY role_id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/admin/add-staff', (req, res) => {
    const { name, email, phone, password, role_id } = req.body;
    bcrypt.hash(password, SALT_ROUNDS, (err, hashed) => {
        db.query('INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?)', [name, email, phone, hashed, role_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Staff added', newStaff: { id: result.insertId, name, email, role_id } });
        });
    });
});

app.get('/admin/discount-codes', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM discount_codes ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/admin/discount-codes', async (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = req.body;
    try {
        await db.promise().query(`INSERT INTO discount_codes (code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [code, discount_type, discount_value, min_order_amount || 0, max_order_amount, max_uses, expires_at]);
        res.status(201).json({ message: "Created" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/admin/messages', (req, res) => {
    db.query('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- CHECKOUT & PAYMOB ---
// ==========================================

app.post('/checkout', (req, res) => {
    const { userId, shippingDetails, paymentMethod } = req.body;
    db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
        if (err || cartResults.length === 0) return res.status(400).json({ error: 'Cart empty' });
        const cartId = cartResults[0].id;

        // Complex order creation logic with stock checks...
        db.query('INSERT INTO orders (user_id, total, status_id) VALUES (?, 0, 1)', [userId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = result.insertId;
            res.status(201).json({ message: 'Order created', orderId });
        });
    });
});

app.post('/paymob/initiate', async (req, res) => {
    try {
        const token = await paymobGetAuthToken();
        const paymobId = await paymobRegisterOrder(token, req.body.amountCents, req.body.orderId, req.body.items);
        const paymentToken = await paymobGetPaymentKey(token, paymobId, req.body.amountCents, req.body.shippingDetails);
        res.json({ paymentToken, iframeId: process.env.PAYMOB_IFRAME_ID });
    } catch (err) { res.status(500).json({ error: 'Gateway error' }); }
});

app.post('/paymob/callback', async (req, res) => {
    const { hmac } = req.query;
    const data = req.body?.obj;
    if (data && paymobVerifyHmac(data, hmac) && data.success === true) {
        db.query('UPDATE orders SET status_id = 2 WHERE id = ?', [data.order.merchant_order_id]);
    }
    res.sendStatus(200);
});

// ==========================================
// --- SERVER START ---
// ==========================================

app.get('/', (req, res) => res.status(200).send('API Active'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});