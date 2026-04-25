const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

require('dotenv').config();

const {
    uploadImage,
    uploadModelWithThumbnail,
    uploadToCloudinary,
} = require('./cloudinary');

const app = express();

app.use(cors({
    origin: ['https://glow-aroma.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Keep local uploads dir for fallback
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const db = mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
    ssl:      { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error("Critical Database Error:", err.message);
    else console.log("Database connected successfully to " + process.env.DB_NAME);
});

const SALT_ROUNDS = 10;
const JWT_SECRET  = process.env.JWT_SECRET || 'glow_aroma_secure_key_2026';
const PAYMOB_BASE = 'https://accept.paymob.com/api';

// ==========================================
// --- PAYMOB HELPERS ---
// ==========================================
async function paymobGetAuthToken() {
    const res = await axios.post(`${PAYMOB_BASE}/auth/tokens`, { api_key: process.env.PAYMOB_API_KEY });
    return res.data.token;
}
async function paymobRegisterOrder(authToken, amountCents, merchantOrderId, items) {
    const res = await axios.post(`${PAYMOB_BASE}/ecommerce/orders`, {
        auth_token: authToken, delivery_needed: false, amount_cents: amountCents,
        currency: 'EGP', merchant_order_id: String(merchantOrderId), items
    });
    return res.data.id;
}
async function paymobGetPaymentKey(authToken, paymobOrderId, amountCents, billingData) {
    const res = await axios.post(`${PAYMOB_BASE}/acceptance/payment_keys`, {
        auth_token: authToken, amount_cents: amountCents, expiration: 3600,
        order_id: paymobOrderId, billing_data: billingData, currency: 'EGP',
        integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID)
    });
    return res.data.token;
}
function paymobVerifyHmac(data, receivedHmac) {
    const fields = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'];
    const str = fields.map(f => { const val = f.split('.').reduce((obj, k) => obj?.[k], data); return val ?? ''; }).join('');
    return crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET).update(str).digest('hex') === receivedHmac;
}

// ==========================================
// --- HEALTH CHECK ---
// ==========================================
app.get('/', (req, res) => res.status(200).send('Glow Aroma Production API Active'));

// ==========================================
// --- CANDLE BUILDER ASSETS ---
// ==========================================
app.get('/scents', (req, res) => {
    db.query(`SELECT s.*, sf.name AS family_name FROM scents s LEFT JOIN scent_families sf ON s.scent_family_id = sf.id WHERE s.is_available = TRUE`, (err, results) => {
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
app.get('/cup-shapes', async (req, res) => {
  try {
    // Make sure to select model_url! Also, we usually only want to show available items.
    const [rows] = await db.query('SELECT id, name, price_modifier, model_url, is_available FROM cup_shapes WHERE is_available = true');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching cup shapes:", err);
    res.status(500).json({ error: 'Failed to fetch cup shapes' });
  }
});

app.get('/cup-sizes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, size_ml, price_modifier FROM cup_sizes');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching cup sizes:", err);
    res.status(500).json({ error: 'Failed to fetch cup sizes' });
  }
});

app.get('/cup-colors', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, hex_code, price_modifier FROM cup_colors'); // Note: removed is_available if you don't use it for cup colors
    res.json(rows);
  } catch (err) {
    console.error("Error fetching cup colors:", err);
    res.status(500).json({ error: 'Failed to fetch cup colors' });
  }
});

app.get('/mold-shapes', (req, res) => {
    // Explicitly selecting everything to ensure model_url is included
    db.query('SELECT * FROM mold_shapes WHERE is_available = TRUE', (err, results) => {
        if (err) {
            console.error("MOLD FETCH ERROR:", err);
            return res.status(500).json({ error: err.message });
        }
        // This log will show up in your Railway Logs so you can verify the data
        console.log("MOLD DATA SENT TO FRONTEND:", results); 
        res.json(results);
    });
});


app.get('/admin/models', (req, res) => {
    db.query('SELECT * FROM candle_models ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(m => ({
            ...m,
            colorable_parts: typeof m.colorable_parts === 'string' 
                ? JSON.parse(m.colorable_parts || '[]') 
                : (m.colorable_parts || [])
        })));
    });
});

// ==========================================
// --- PRODUCT CATALOG ---
// ==========================================
app.get('/products', (req, res) => {
    db.query('SELECT * FROM prebuilt_candles WHERE is_active = TRUE', (err, results) => {
        if (err) return res.status(500).json({ error: 'Catalog fetch failed' });
        res.json(results);
    });
});
app.get('/products/:id', (req, res) => {
    db.query('SELECT * FROM prebuilt_candles WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Product Not Found' });
        res.json(results[0]);
    });
});

// Admin product management — now uses Cloudinary for images
app.post('/admin/products', uploadImage.single('image'), (req, res) => {
    const { name, price, stock_quantity, description } = req.body;
    const image_url = req.file ? req.file.path : null; // Cloudinary returns path as the URL
    if (!name || price === undefined || stock_quantity === undefined)
        return res.status(400).json({ message: 'Name, price, and stock are required.' });
    db.query('INSERT INTO prebuilt_candles (name, price, stock_quantity, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [name, parseFloat(price), parseInt(stock_quantity), description || null, image_url],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.status(201).json({ message: 'Product added.', newProduct: { id: result.insertId, name, price, stock_quantity, description, image_url } });
        }
    );
});
app.put('/admin/products/:id', uploadImage.single('image'), (req, res) => {
    const { name, price, stock_quantity, description, existing_image_url } = req.body;
    const image_url = req.file ? req.file.path : (existing_image_url || null);
    db.query('UPDATE prebuilt_candles SET name=?, price=?, stock_quantity=?, description=?, image_url=? WHERE id=?',
        [name, parseFloat(price), parseInt(stock_quantity), description || null, image_url, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: 'Product updated.', image_url });
        }
    );
});
app.delete('/admin/products/:id', (req, res) => {
    db.query('DELETE FROM prebuilt_candles WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Delete failed. Product may be linked to an order.' });
        res.json({ message: 'Product deleted.' });
    });
});

// ==========================================
// --- 3D MODELS MANAGEMENT ---
// ==========================================

// 1. GET ALL MODELS (Used by Inventory)
app.get('/admin/models', (req, res) => {
    db.query('SELECT * FROM candle_models ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(m => ({
            ...m,
            colorable_parts: typeof m.colorable_parts === 'string'
                ? JSON.parse(m.colorable_parts || '[]')
                : (m.colorable_parts || [])
        })));
    });
});

// 2. CREATE NEW MODEL (This was missing!)
app.post('/admin/models', uploadModelWithThumbnail, async (req, res) => {
    const { name, type, layers, flat_shading, colorable_parts, is_available } = req.body;

    if (!name || !type) return res.status(400).json({ error: 'Name and type are required.' });
    if (!req.files?.model?.[0]) return res.status(400).json({ error: 'GLB model file is required.' });

    try {
        // Upload .glb to Cloudinary as raw file
        const modelResult = await uploadToCloudinary(req.files.model[0].buffer, {
            folder: 'glow-aroma/models',
            resource_type: 'raw',
            public_id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.glb`,
        });

        // Upload thumbnail if provided
        let thumbnailUrl = null;
        if (req.files?.thumbnail?.[0]) {
            const thumbResult = await uploadToCloudinary(req.files.thumbnail[0].buffer, {
                folder: 'glow-aroma/thumbnails',
                resource_type: 'image',
            });
            thumbnailUrl = thumbResult.secure_url;
        }

        const parsedParts = colorable_parts || '[]';

        const [result] = await db.promise().query(
            'INSERT INTO candle_models (name, type, model_url, thumbnail_url, flat_shading, layers, colorable_parts, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                name, 
                type,
                modelResult.secure_url,
                thumbnailUrl,
                flat_shading === 'true' || flat_shading === true ? 1 : 0,
                parseInt(layers) || 1,
                parsedParts,
                is_available === 'true' || is_available === true ? 1 : 0
            ]
        );

        res.status(201).json({ message: 'Model uploaded successfully!', id: result.insertId });
    } catch (err) {
        console.error('Model upload error:', err);
        res.status(500).json({ error: 'Failed to upload model: ' + err.message });
    }
});

// 3. UPDATE MODEL
app.put('/admin/models/:id', async (req, res) => {
    const { name, type, layers, flat_shading, colorable_parts, is_available } = req.body;
    const parsedParts = colorable_parts
        ? (typeof colorable_parts === 'string' ? colorable_parts : JSON.stringify(colorable_parts))
        : '[]';
    try {
        await db.promise().query(
            'UPDATE candle_models SET name=?, type=?, flat_shading=?, layers=?, colorable_parts=?, is_available=? WHERE id=?',
            [
                name, type,
                flat_shading === 'true' || flat_shading === true ? 1 : 0,
                parseInt(layers) || 1,
                parsedParts,
                is_available !== false && is_available !== 'false' ? 1 : 0,
                req.params.id
            ]
        );
        res.json({ message: 'Model updated.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. DELETE MODEL
app.delete('/admin/models/:id', async (req, res) => {
    try {
        await db.promise().query('DELETE FROM candle_models WHERE id = ?', [req.params.id]);
        res.json({ message: 'Model deleted.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// --- USER AUTHENTICATION ---
// ==========================================
app.post('/users', (req, res) => {
    const { name, email, phone, password_hash } = req.body;
    bcrypt.hash(password_hash, SALT_ROUNDS, (err, hashed) => {
        if (err) return res.status(500).json({ error: 'Hashing failed.' });
        db.query('INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, 1)',
            [name, email, phone, hashed],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                const token = jwt.sign({ id: result.insertId, name }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ message: 'User created!', token, userName: name, userId: result.insertId });
            }
        );
    });
});
app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = results[0];
        const processLogin = () => {
            const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, userId: user.id, userName: user.name, roleId: user.role_id });
        };
        if (!user.password_hash.startsWith('$2')) {
            if (password === user.password_hash) return processLogin();
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (isMatch) processLogin();
            else res.status(401).json({ error: 'Invalid credentials' });
        });
    });
});
app.get('/users/:id', (req, res) => {
    db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { error: 'User Not Found' });
    });
});
app.post('/auth/google', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Google Token Missing' });
    try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { email, name } = response.data;
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
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
    } catch (e) { res.status(500).json({ error: 'OAuth Failed' }); }
});

// ==========================================
// --- SHOPPING CART ---
// ==========================================
app.post('/cart/add', (req, res) => {
    const { userId, type, scentId, quantity = 1, prebuiltCandleId, totalPrice, cupShapeId, cupSizeId, cupColorId, candleColorId, moldShapeId, layers, snapshot } = req.body;
    if (!userId) return res.status(401).json({ error: 'Auth Required' });
    db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, results) => {
        const cartId = results.length > 0 ? results[0].id : null;
        const handleAddition = (cId) => {
            if (prebuiltCandleId) {
                db.query('INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
                    [cId, prebuiltCandleId, quantity, quantity], () => res.json({ message: 'Added' }));
            } else if (type === 'cup') {
                db.query("INSERT INTO custom_candles (type, scent_id, cup_shape_id, cup_size_id, cup_color_id, total_price, preview_image) VALUES ('cup', ?, ?, ?, ?, ?, ?)",
                    [scentId, cupShapeId, cupSizeId, cupColorId, totalPrice, snapshot], (err, result) => {
                        const customId = result.insertId;
                        db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES (?, ?, 1)', [customId, candleColorId], () => {
                            db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [cId, customId, quantity], () => res.json({ message: 'Added Custom' }));
                        });
                    });
            } else if (type === 'mold') {
                db.query("INSERT INTO custom_candles (type, scent_id, mold_shape_id, total_price, preview_image) VALUES ('mold', ?, ?, ?, ?)",
                    [scentId, moldShapeId, totalPrice, snapshot], (err, result) => {
                        const customId = result.insertId;
                        const layerVals = layers.map((colorId, index) => [customId, colorId, index + 1]);
                        db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES ?', [layerVals], () => {
                            db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [cId, customId, quantity], () => res.json({ message: 'Added Mold' }));
                        });
                    });
            }
        };
        if (!cartId) db.query('INSERT INTO carts (user_id) VALUES (?)', [userId], (err, reslt) => handleAddition(reslt.insertId));
        else handleAddition(cartId);
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
        WHERE ct.user_id = ? GROUP BY ci.id`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(item => ({
            cart_item_id: item.cart_item_id, quantity: item.quantity, is_custom: !!item.candle_type,
            name: item.prebuilt_name || (item.candle_type === 'cup' ? `${item.cup_shape_name} (${item.size_ml}ml)` : `${item.mold_shape_name} Mold`),
            price: item.prebuilt_price || item.custom_price, image: item.prebuilt_image || item.snapshot,
            max_stock: item.prebuilt_stock || 99, color_info: item.candle_type ? `Wax: ${item.wax_colors}` : 'Standard', scent: item.scent_name || 'Original'
        })));
    });
});
app.delete('/cart/remove/:cartItemId', (req, res) => {
    db.query('DELETE FROM cart_items WHERE id = ?', [req.params.cartItemId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});
app.put('/cart/update/:cartItemId', (req, res) => {
    const { action } = req.body;
    if (action === 'increase') {
        db.query('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?', [req.params.cartItemId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Quantity increased' });
        });
    } else if (action === 'decrease') {
        db.query('UPDATE cart_items SET quantity = GREATEST(1, quantity - 1) WHERE id = ?', [req.params.cartItemId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Quantity decreased' });
        });
    } else res.status(400).json({ error: 'Invalid action received' });
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
    db.query('INSERT INTO user_addresses (user_id, full_name, phone, governorate, area, street, building, floor_apt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.params.userId, fullName, phone, governorate, area, street, building, floorApt, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Saved', id: result.insertId });
        }
    );
});
app.put('/addresses/:id', (req, res) => {
    const { fullName, phone, governorate, area, street, building, floorApt, notes } = req.body;
    db.query('UPDATE user_addresses SET full_name=?, phone=?, governorate=?, area=?, street=?, building=?, floor_apt=?, notes=? WHERE id=?',
        [fullName, phone, governorate, area, street, building, floorApt, notes, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Updated' });
        }
    );
});
app.delete('/addresses/:id', (req, res) => {
    db.query('DELETE FROM user_addresses WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Linked to Order' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Address Not Found' });
        res.json({ message: 'Deleted' });
    });
});

// ==========================================
// --- CONTACT MESSAGES ---
// ==========================================
app.post('/messages', (req, res) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required.' });
    db.query('INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)',
        [name, email, phone || null, message],
        (err) => {
            if (err) return res.status(500).json({ error: 'Failed to send message.' });
            res.status(201).json({ message: 'Message sent successfully!' });
        }
    );
});

// ==========================================
// --- ADMIN DASHBOARD ---
// ==========================================
app.get('/admin/orders', (req, res) => {
    db.query('SELECT o.id, o.total, o.status_id, o.created_at, u.name AS customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});
app.get('/admin/orders/:id/items', (req, res) => {
    db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.put('/admin/orders/:id/status', (req, res) => {
    const { status_id } = req.body;
    if (![1, 2, 3].includes(Number(status_id))) return res.status(400).json({ message: 'Invalid status_id.' });
    db.query('UPDATE orders SET status_id = ? WHERE id = ?', [Number(status_id), req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found.' });
        res.json({ message: 'Order status updated.' });
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
        db.query('INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, hashed, role_id],
            (err, result) => {
                if (err) return res.status(500).json({ message: err.message });
                res.status(201).json({ message: 'Staff Added', newStaff: { id: result.insertId, name, email, role_id: Number(role_id) } });
            }
        );
    });
});
app.delete('/admin/staff/:id', (req, res) => {
    db.query('SELECT role_id FROM users WHERE id = ?', [req.params.id], (err, rows) => {
        if (rows.length === 0) return res.status(404).json({ message: 'Not found.' });
        if (rows[0].role_id === 3) return res.status(403).json({ message: 'Cannot remove Super Admin.' });
        db.query('DELETE FROM users WHERE id = ? AND role_id = 2', [req.params.id], (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: 'Staff removed.' });
        });
    });
});
app.get('/admin/discount-codes', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM discount_codes ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/discount-codes', async (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = req.body;
    try {
        await db.promise().query(
            'INSERT INTO discount_codes (code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [code, discount_type, discount_value, min_order_amount || 0, max_order_amount, max_uses, expires_at]
        );
        res.status(201).json({ message: 'Promo Created' });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Code already exists.' });
        res.status(500).json({ error: e.message });
    }
});
app.patch('/admin/discount-codes/:id', async (req, res) => {
    try {
        await db.promise().query('UPDATE discount_codes SET is_active = ? WHERE id = ?', [req.body.is_active, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/discount-codes/:id', async (req, res) => {
    try {
        await db.promise().query('DELETE FROM discount_codes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/admin/messages', (req, res) => {
    db.query('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.delete('/admin/messages/:id', (req, res) => {
    db.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Message deleted.' });
    });
});
app.delete('/admin/delete-account', (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ error: 'userId and password required.' });
    db.query('SELECT password_hash FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
        const storedHash = results[0].password_hash;
        const doDelete = () => {
            db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, carts) => {
                const finish = () => db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
                    if (err) return res.status(500).json({ error: 'Delete failed.' });
                    res.json({ message: 'Account deleted.' });
                });
                if (carts.length > 0) {
                    db.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id], () => {
                        db.query('DELETE FROM carts WHERE id = ?', [carts[0].id], finish);
                    });
                } else finish();
            });
        };
        if (!storedHash.startsWith('$2')) {
            if (password === storedHash) doDelete();
            else res.status(401).json({ error: 'Incorrect password.' });
        } else {
            bcrypt.compare(password, storedHash, (err, match) => {
                if (match) doDelete();
                else res.status(401).json({ error: 'Incorrect password.' });
            });
        }
    });
});

// ==========================================
// --- CHECKOUT ---
// ==========================================
app.post('/checkout', (req, res) => {
    const { userId, total, items, couponCode } = req.body;
    const numericTotal = parseFloat(total) || 0;
    db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
        if (err || cartResults.length === 0) return res.status(400).json({ error: 'Empty Cart' });
        const cartId = cartResults[0].id;
        db.query('INSERT INTO orders (user_id, total, status_id) VALUES (?, ?, 1)', [userId, numericTotal], (err, result) => {
            if (err) return res.status(500).json({ error: 'Order Creation Failed: ' + err.message });
            const orderId = result.insertId;
            if (!items || items.length === 0) return res.status(400).json({ error: 'No items received from frontend' });
            const values = items.map(i => {
                let exactItemType = 'prebuilt';
                if (i.is_custom) exactItemType = (i.name && i.name.toLowerCase().includes('mold')) ? 'mold' : 'cup';
                return [orderId, exactItemType, i.name || 'Candle', parseFloat(i.price) || 0, parseInt(i.quantity, 10) || 1, i.details || i.color_info || 'Standard Pre-built'];
            });
            db.query('INSERT INTO order_items (order_id, item_type, item_name, unit_price, quantity, details) VALUES ?', [values], (itemErr) => {
                if (itemErr) {
                    console.error("DB REJECTED ITEMS INSERT:", itemErr.message);
                    return res.status(500).json({ error: 'DB Error on Items: ' + itemErr.message });
                }
                db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId], () => {
                    if (couponCode) {
                        db.query('UPDATE discount_codes SET times_used = times_used + 1 WHERE code = ?',
                            [couponCode.toUpperCase()],
                            (err) => { if (err) console.error('Failed to increment coupon usage:', err.message); }
                        );
                    }
                    res.status(201).json({ message: 'Order placed successfully', orderId });
                });
            });
        });
    });
});

// ==========================================
// --- PAYMOB ---
// ==========================================
app.post('/paymob/initiate', async (req, res) => {
    try {
        const { amountCents, orderId, items, shippingDetails } = req.body;
        const authToken = await paymobGetAuthToken();
        const paymobOrderId = await paymobRegisterOrder(authToken, amountCents, orderId, items || []);
        const nameParts = (shippingDetails.fullName || 'Guest User').split(' ');
        const billingData = {
            first_name: nameParts[0] || 'NA', last_name: nameParts.slice(1).join(' ') || 'NA',
            phone_number: shippingDetails.phone || 'NA', apartment: shippingDetails.floorApt || 'NA',
            floor: 'NA', street: shippingDetails.street || 'NA', building: shippingDetails.building || 'NA',
            city: shippingDetails.area || 'NA', state: shippingDetails.governorate || 'NA',
            country: 'EG', postal_code: 'NA', shipping_method: 'NA', email: 'customer@glowaroma.com'
        };
        const paymentToken = await paymobGetPaymentKey(authToken, paymobOrderId, amountCents, billingData);
        res.json({ paymentToken, iframeId: process.env.PAYMOB_IFRAME_ID });
    } catch (err) {
        console.error('Paymob initiation error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
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
// --- USER ORDER HISTORY ---
// ==========================================
app.get('/orders/user/:userId', (req, res) => {
    const sql = `
        SELECT o.id, o.total, o.status_id, o.created_at,
        GROUP_CONCAT(oi.item_name ORDER BY oi.id ASC SEPARATOR ', ') AS item_summary
        FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC LIMIT 10`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- COUPON VALIDATION ---
// ==========================================
app.post('/coupons/validate', async (req, res) => {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided.' });
    try {
        const [rows] = await db.promise().query('SELECT * FROM discount_codes WHERE code = ? AND is_active = TRUE', [code.toUpperCase()]);
        if (rows.length === 0) return res.status(404).json({ error: 'Invalid or inactive coupon code.' });
        const coupon = rows[0];
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'This coupon has expired.' });
        if (coupon.max_uses && coupon.times_used >= coupon.max_uses) return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
        if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) return res.status(400).json({ error: `Minimum order of ${coupon.min_order_amount} L.E. required.` });
        if (coupon.max_order_amount && orderTotal > coupon.max_order_amount) return res.status(400).json({ error: `This coupon is only valid for orders up to ${coupon.max_order_amount} L.E.` });
        res.json({ code: coupon.code, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// --- INVENTORY: SCENT FAMILIES ---
// ==========================================
app.get('/admin/inventory/scent-families', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM scent_families ORDER BY name ASC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/scent-families', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        const [result] = await db.promise().query('INSERT INTO scent_families (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Scent family added.', id: result.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'This family already exists.' });
        res.status(500).json({ error: e.message });
    }
});
app.put('/admin/inventory/scent-families/:id', async (req, res) => {
    try { await db.promise().query('UPDATE scent_families SET name=? WHERE id=?', [req.body.name, req.params.id]); res.json({ message: 'Updated.' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/inventory/scent-families/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM scent_families WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — scents are using this family.' }); }
});

// ==========================================
// --- INVENTORY: SCENTS ---
// ==========================================
app.get('/admin/inventory/scents', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`SELECT s.*, sf.name AS family_name FROM scents s LEFT JOIN scent_families sf ON s.scent_family_id = sf.id ORDER BY s.id DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/scents', async (req, res) => {
    const { name, price_modifier, is_available, scent_family_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        const [result] = await db.promise().query(
            'INSERT INTO scents (name, price_modifier, is_available, scent_family_id) VALUES (?, ?, ?, ?)',
            [name, parseFloat(price_modifier) || 0, is_available !== false, scent_family_id || null]
        );
        res.status(201).json({ message: 'Scent added.', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/admin/inventory/scents/:id', async (req, res) => {
    const { name, price_modifier, is_available, scent_family_id } = req.body;
    try {
        await db.promise().query(
            'UPDATE scents SET name=?, price_modifier=?, is_available=?, scent_family_id=? WHERE id=?',
            [name, parseFloat(price_modifier) || 0, is_available, scent_family_id || null, req.params.id]
        );
        res.json({ message: 'Scent updated.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/inventory/scents/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM scents WHERE id = ?', [req.params.id]); res.json({ message: 'Scent deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});

// ==========================================
// --- INVENTORY: WAX COLORS ---
// ==========================================
app.get('/admin/inventory/colors', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM colors ORDER BY id DESC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/colors', async (req, res) => {
    const { name, hex_code, price_modifier, is_available } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        const [result] = await db.promise().query('INSERT INTO colors (name, hex_code, price_modifier, is_available) VALUES (?, ?, ?, ?)', [name, hex_code || null, parseFloat(price_modifier) || 0, is_available !== false]);
        res.status(201).json({ message: 'Color added.', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/admin/inventory/colors/:id', async (req, res) => {
    const { name, hex_code, price_modifier, is_available } = req.body;
    try { await db.promise().query('UPDATE colors SET name=?, hex_code=?, price_modifier=?, is_available=? WHERE id=?', [name, hex_code || null, parseFloat(price_modifier) || 0, is_available, req.params.id]); res.json({ message: 'Color updated.' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/inventory/colors/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM colors WHERE id = ?', [req.params.id]); res.json({ message: 'Color deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});

// ==========================================
// --- INVENTORY: CUP COLORS ---
// ==========================================
app.get('/admin/inventory/cup-colors', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM cup_colors ORDER BY id DESC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/cup-colors', async (req, res) => {
    const { name, hex_code, price_modifier } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        const [result] = await db.promise().query('INSERT INTO cup_colors (name, hex_code, price_modifier) VALUES (?, ?, ?)', [name, hex_code || null, parseFloat(price_modifier) || 0]);
        res.status(201).json({ message: 'Cup color added.', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/admin/inventory/cup-colors/:id', async (req, res) => {
    const { name, hex_code, price_modifier } = req.body;
    try { await db.promise().query('UPDATE cup_colors SET name=?, hex_code=?, price_modifier=? WHERE id=?', [name, hex_code || null, parseFloat(price_modifier) || 0, req.params.id]); res.json({ message: 'Cup color updated.' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/inventory/cup-colors/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM cup_colors WHERE id = ?', [req.params.id]); res.json({ message: 'Cup color deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});

// ==========================================
// --- INVENTORY: CUP SIZES ---
// ==========================================
app.get('/admin/inventory/cup-sizes', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM cup_sizes ORDER BY id DESC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/cup-sizes', async (req, res) => {
    const { size_ml, price_modifier } = req.body;
    if (!size_ml) return res.status(400).json({ error: 'Size (ml) is required.' });
    try {
        const [result] = await db.promise().query('INSERT INTO cup_sizes (size_ml, price_modifier) VALUES (?, ?)', [parseInt(size_ml), parseFloat(price_modifier) || 0]);
        res.status(201).json({ message: 'Cup size added.', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/admin/inventory/cup-sizes/:id', async (req, res) => {
    const { size_ml, price_modifier } = req.body;
    try { await db.promise().query('UPDATE cup_sizes SET size_ml=?, price_modifier=? WHERE id=?', [parseInt(size_ml), parseFloat(price_modifier) || 0, req.params.id]); res.json({ message: 'Cup size updated.' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/admin/inventory/cup-sizes/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM cup_sizes WHERE id = ?', [req.params.id]); res.json({ message: 'Cup size deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});

// ==========================================
// --- INVENTORY: CUP SHAPES ---
// ==========================================
app.get('/admin/inventory/cup-shapes', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM cup_shapes ORDER BY id DESC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/cup-shapes', async (req, res) => {
    // 1. Added model_url here
    const { name, price_modifier, model_url, is_available } = req.body; 
    
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    
    try {
        // 2. Added model_url to the SQL query and the array of values
        const [result] = await db.promise().query(
            'INSERT INTO cup_shapes (name, price_modifier, model_url, is_available) VALUES (?, ?, ?, ?)', 
            [name, parseFloat(price_modifier) || 0, model_url || null, is_available !== false]
        );
        res.status(201).json({ message: 'Cup shape added.', id: result.insertId });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});
app.put('/admin/inventory/cup-shapes/:id', async (req, res) => {
    const { name, price_modifier, model_url, is_available } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    
    try {
        await db.promise().query(
            'UPDATE cup_shapes SET name = ?, price_modifier = ?, model_url = ?, is_available = ? WHERE id = ?', 
            [name, parseFloat(price_modifier) || 0, model_url || null, is_available !== false, req.params.id]
        );
        res.json({ message: 'Cup shape updated.' });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});
app.delete('/admin/inventory/cup-shapes/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM cup_shapes WHERE id = ?', [req.params.id]); res.json({ message: 'Cup shape deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});

// ==========================================
// --- INVENTORY: MOLD SHAPES ---
// ==========================================
app.get('/admin/inventory/mold-shapes', async (req, res) => {
    try { const [rows] = await db.promise().query('SELECT * FROM mold_shapes ORDER BY id DESC'); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/admin/inventory/mold-shapes', (req, res) => {
    const { name, price_modifier, layers, model_url, is_available } = req.body;
    const sql = 'INSERT INTO mold_shapes (name, price_modifier, layers, model_url, is_available) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, price_modifier || 0, layers || 1, model_url || null, is_available], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: result.insertId });
    });
});

app.put('/admin/inventory/mold-shapes/:id', (req, res) => {
    const { name, price_modifier, layers, model_url, is_available } = req.body;
    const sql = 'UPDATE mold_shapes SET name=?, price_modifier=?, layers=?, model_url=?, is_available=? WHERE id=?';
    db.query(sql, [name, price_modifier || 0, layers || 1, model_url || null, is_available, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/admin/inventory/mold-shapes/:id', async (req, res) => {
    try { await db.promise().query('DELETE FROM mold_shapes WHERE id = ?', [req.params.id]); res.json({ message: 'Mold shape deleted.' }); }
    catch (e) { res.status(500).json({ error: 'Cannot delete — may be linked to existing orders.' }); }
});


// ==========================================
// --- SERVER ACTIVATION ---
// ==========================================

// Define the PORT variable here
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});

server.timeout = 120000;