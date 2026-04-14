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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    const rawName = req.body.name || 'candle';
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const finalFilename = `${safeName}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, finalFilename);
  }
});
const upload = multer({ storage: storage });

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION ERROR:', {
      message: err.message,
      code: err.code,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
    });
    return;
  }
  console.log(`✅ SUCCESS: Connected to database: ${process.env.DB_NAME}`);
});

// ==========================================
// --- PAYMOB HELPERS ---
// ==========================================

const PAYMOB_BASE = 'https://accept.paymob.com/api';

async function paymobGetAuthToken() {
  const res = await axios.post(`${PAYMOB_BASE}/auth/tokens`, {
    api_key: process.env.PAYMOB_API_KEY
  });
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

  const computed = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
    .update(str)
    .digest('hex');

  return computed === receivedHmac;
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
  db.query('SELECT * FROM cup_shapes WHERE is_available = TRUE', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get('/cup-sizes', (req, res) => {
  db.query('SELECT * FROM cup_sizes', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get('/cup-colors', (req, res) => {
  db.query('SELECT * FROM cup_colors', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get('/mold-shapes', (req, res) => {
  db.query('SELECT * FROM mold_shapes WHERE is_available = TRUE', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ==========================================
// --- PRODUCTS (PRE-BUILT CANDLES) ---
// ==========================================

app.get('/products', (req, res) => {
  db.query('SELECT * FROM prebuilt_candles ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM prebuilt_candles WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(results[0]);
  });
});

// ==========================================
// --- USERS ---
// ==========================================

app.get('/users', (req, res) => {
  db.query('SELECT id, name, email, phone, role_id FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT name, email, phone FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(results[0]);
  });
});

app.post('/users', (req, res) => {
  const { name, email, phone, password_hash } = req.body;

  bcrypt.hash(password_hash, SALT_ROUNDS, (hashErr, hashed) => {
    if (hashErr) return res.status(500).json({ error: 'Hashing failed.' });

    const sql = 'INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, 1)';
    db.query(sql, [name, email, phone, hashed], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const token = jwt.sign({ id: result.insertId, name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ message: 'User added successfully!', token, userName: name });
    });
  });
});

// ==========================================
// --- SIGN IN ---
// ==========================================

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = results[0];

    if (!user.password_hash.startsWith('$2')) {
      if (password === user.password_hash) {
        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ message: 'Login successful!', token, userId: user.id, userName: user.name, roleId: user.role_id });
      } else {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    bcrypt.compare(password, user.password_hash, (compareErr, isMatch) => {
      if (compareErr) return res.status(500).json({ error: 'Auth error.' });

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        message: 'Login successful!',
        token,
        userId: user.id,
        userName: user.name,
        roleId: user.role_id,
      });
    });
  });
});

// ==========================================
// --- GOOGLE SIGN IN ---
// ==========================================

app.post('/auth/google', async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Google token is missing.' });
  }

  try {
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!googleResponse.ok) {
      return res.status(401).json({ error: 'Invalid Google token.' });
    }

    const googleUser = await googleResponse.json();
    const { email, name } = googleUser;

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error: ' + err.message });

      if (results.length > 0) {
        const user = results[0];
        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        
        return res.json({
          message: 'Google login successful!',
          token,
          userId: user.id,
          userName: user.name,
          roleId: user.role_id,
        });
      } else {
        const randomPassword = Math.random().toString(36).slice(-10);
        
        bcrypt.hash(randomPassword, SALT_ROUNDS, (hashErr, hashed) => {
          if (hashErr) return res.status(500).json({ error: 'Hashing failed.' });

          const sql = 'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, 1)';
          db.query(sql, [name, email, hashed], (insertErr, result) => {
            if (insertErr) return res.status(500).json({ error: insertErr.message });

            const newUserId = result.insertId;
            const token = jwt.sign({ id: newUserId, name }, JWT_SECRET, { expiresIn: '7d' });

            res.status(201).json({
              message: 'Google account created and logged in!',
              token,
              userId: newUserId,
              userName: name,
              roleId: 1
            });
          });
        });
      }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ error: 'Server error during Google authentication.' });
  }
});

// ==========================================
// --- CART: ADD ITEM ---
// ==========================================

app.post('/cart/add', (req, res) => {
  const { userId, type, scentId, quantity = 1, prebuiltCandleId, totalPrice = 0, cupShapeId, cupSizeId, cupColorId, candleColorId, moldShapeId, layers, snapshot } = req.body;
  
  console.log('snapshot received:', snapshot ? 'YES, length: ' + snapshot.length : 'NO');

  if (!userId) return res.status(401).json({ error: 'You must be logged in!' });

  const parsedQty = Number(quantity);

  db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: 'Cart error: ' + err.message });

    let cartId;
    if (cartResults.length > 0) {
      cartId = cartResults[0].id;
      checkStockAndProcess(cartId);
    } else {
      db.query('INSERT INTO carts (user_id) VALUES (?)', [userId], (err, newCart) => {
        if (err) return res.status(500).json({ error: 'New cart error: ' + err.message });
        cartId = newCart.insertId;
        checkStockAndProcess(cartId);
      });
    }

    function checkStockAndProcess(cartId) {
      if (prebuiltCandleId) {
        const stockCheckSql = `
          SELECT 
            pc.stock_quantity, 
            IFNULL((SELECT quantity FROM cart_items WHERE cart_id = ? AND prebuilt_candle_id = ?), 0) as current_cart_qty 
          FROM prebuilt_candles pc
          WHERE pc.id = ?
        `;

        db.query(stockCheckSql, [cartId, prebuiltCandleId, prebuiltCandleId], (err, stockResults) => {
          if (err) return res.status(500).json({ error: 'Stock check error: ' + err.message });
          if (stockResults.length === 0) return res.status(404).json({ error: 'Product not found.' });

          const stock = Number(stockResults[0].stock_quantity);
          const currentCartQty = Number(stockResults[0].current_cart_qty);

          if (currentCartQty + parsedQty > stock) {
             return res.status(400).json({ error: `Cannot add to cart! Only ${stock} left in stock.` });
          }
          
          executeInsertPrebuilt(cartId);
        });
      } else {
        executeInsertCustom(cartId);
      }
    }

    function executeInsertPrebuilt(cartId) {
      db.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND prebuilt_candle_id = ?',
        [cartId, prebuiltCandleId],
        (err, existingItems) => {
          if (err) return res.status(500).json({ error: 'Check error: ' + err.message });

          if (existingItems.length > 0) {
            const newQuantity = Number(existingItems[0].quantity) + parsedQty;
            db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, existingItems[0].id], (err) => {
                if (err) return res.status(500).json({ error: 'Update error: ' + err.message });
                res.json({ message: 'Updated candle quantity in cart!' });
            });
          } else {
            db.query('INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?)', [cartId, prebuiltCandleId, parsedQty], (err) => {
                if (err) return res.status(500).json({ error: 'Insert error: ' + err.message });
                res.json({ message: 'Added pre-built candle to cart!' });
            });
          }
        }
      );
    }

    function executeInsertCustom(cartId) {
      if (type === 'cup') {
        db.query(
          "INSERT INTO custom_candles (type, scent_id, cup_shape_id, cup_size_id, cup_color_id, total_price, preview_image) VALUES ('cup', ?, ?, ?, ?, ?, ?)",
          [scentId, cupShapeId, cupSizeId, cupColorId, totalPrice, snapshot || null],
          (err, candleResult) => {
            if (err) return res.status(500).json({ error: 'Candle error: ' + err.message });

            const customCandleId = candleResult.insertId;
            db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES (?, ?, 1)', [customCandleId, candleColorId], (err) => {
                if (err) return res.status(500).json({ error: 'Layer error: ' + err.message });
                db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [cartId, customCandleId, parsedQty], (err) => {
                    if (err) return res.status(500).json({ error: 'Cart link error: ' + err.message });
                    res.json({ message: 'Added custom cup candle to cart!' });
                });
            });
          }
        );
      } else if (type === 'mold') {
        db.query(
          "INSERT INTO custom_candles (type, scent_id, mold_shape_id, total_price, preview_image) VALUES ('mold', ?, ?, ?, ?)",
          [scentId, moldShapeId, totalPrice, snapshot || null],
          (err, candleResult) => {
            if (err) return res.status(500).json({ error: 'Mold error: ' + err.message });

            const customCandleId = candleResult.insertId;
            const layerValues = layers.map((colorId, index) => [customCandleId, colorId, index + 1]);

            db.query('INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES ?', [layerValues], (err) => {
                if (err) return res.status(500).json({ error: 'Layers bulk insert error: ' + err.message });
                db.query('INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)', [cartId, customCandleId, parsedQty], (err) => {
                    if (err) return res.status(500).json({ error: 'Cart link error: ' + err.message });
                    res.json({ message: 'Added layered mold candle to cart!' });
                });
            });
          }
        );
      } else {
        res.status(400).json({ error: 'Invalid product type sent.' });
      }
    }
  });
});

// ==========================================
// --- CART: GET USER'S CART ---
// ==========================================

app.get('/cart/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT 
      ci.id AS cart_item_id,
      ci.quantity,
      cc.type AS candle_type,
      cc.total_price AS custom_price,
      cc.preview_image AS snapshot,
      cs.name AS cup_shape_name,
      csz.size_ml,
      ccol.name AS cup_color_name,
      ms.name AS mold_shape_name,
      s.name AS scent_name,
      GROUP_CONCAT(cl.name ORDER BY ccl.layer_index ASC SEPARATOR ', ') AS wax_colors,
      pc.name AS prebuilt_name,
      pc.price AS prebuilt_price,
      pc.image_url AS prebuilt_image,
      pc.stock_quantity AS prebuilt_stock
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
    GROUP BY ci.id
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to load cart: ' + err.message });

    const formattedCart = results.map((item) => {
      if (item.prebuilt_name) {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: false,
          name: item.prebuilt_name,
          price: item.prebuilt_price,
          image: item.prebuilt_image,
          max_stock: item.prebuilt_stock
        };
      } else if (item.candle_type === 'cup') {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: true,
          snapshot: item.snapshot,
          name: `${item.cup_shape_name} (${item.size_ml}ml)`,
          color: `Cup: ${item.cup_color_name} | Wax: ${item.wax_colors}`,
          scent: item.scent_name,
          price: item.custom_price,
          max_stock: 99
        };
      } else if (item.candle_type === 'mold') {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: true,
          snapshot: item.snapshot,
          name: `${item.mold_shape_name} Mold`,
          color: `Layers: ${item.wax_colors}`,
          scent: item.scent_name,
          price: item.custom_price,
          max_stock: 99
        };
      }
    });

    res.json(formattedCart);
  });
});

// ==========================================
// --- CART: UPDATE QUANTITY ---
// ==========================================

app.put('/cart/update/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;
  const { action } = req.body;

  if (action === 'decrease') {
    db.query('UPDATE cart_items SET quantity = GREATEST(quantity - 1, 1) WHERE id = ?', [cartItemId], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update quantity: ' + err.message });
      res.json({ message: 'Quantity updated successfully!' });
    });
  } else if (action === 'increase') {
    const checkSql = `
      SELECT ci.quantity, ci.prebuilt_candle_id, pc.stock_quantity 
      FROM cart_items ci
      LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
      WHERE ci.id = ?
    `;
    
    db.query(checkSql, [cartItemId], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Item not found in cart.' });

      const item = results[0];
      
      if (item.prebuilt_candle_id && item.quantity >= item.stock_quantity) {
        return res.status(400).json({ error: 'Cannot exceed available stock!' });
      }

      db.query('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?', [cartItemId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update quantity: ' + err.message });
        res.json({ message: 'Quantity updated successfully!' });
      });
    });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

// ==========================================
// --- CART: REMOVE ITEM ---
// ==========================================

app.delete('/cart/remove/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;

  db.query('DELETE FROM cart_items WHERE id = ?', [cartItemId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete: ' + err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    res.json({ message: 'Item successfully removed from cart!' });
  });
});

// ==========================================
// --- ADMIN: ORDERS ---
// ==========================================

app.get('/admin/orders', (req, res) => {
  const sql = `
    SELECT o.id, o.total, o.status_id, o.created_at, u.name AS customer_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
    res.json(results);
  });
});

app.put('/admin/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;

  const validStatuses = [1, 2, 3];
  if (!status_id || !validStatuses.includes(Number(status_id))) {
    return res.status(400).json({ message: 'Invalid status_id. Must be 1, 2, or 3.' });
  }

  db.query('UPDATE orders SET status_id = ? WHERE id = ?', [Number(status_id), id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to update order: ' + err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order status updated successfully.' });
  });
});

app.get('/admin/orders/:id/items', (req, res) => {
  db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch items: ' + err.message });
    res.json(results);
  });
});

// ==========================================
// --- ADMIN: STAFF ---
// ==========================================

app.get('/admin/staff', (req, res) => {
  const sql = `
    SELECT id, name, email, role_id
    FROM users
    WHERE role_id IN (2, 3)
    ORDER BY role_id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch staff: ' + err.message });
    res.json(results);
  });
});

app.post('/admin/add-staff', (req, res) => {
  const { name, email, phone, password, role_id } = req.body;

  if (!name || !email || !password || !phone || !role_id) {
    return res.status(400).json({ message: 'Name, email, phone, password, and role are required.' });
  }

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
    if (err) return res.status(500).json({ message: 'DB error: ' + err.message });

    if (existing.length > 0) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    bcrypt.hash(password, SALT_ROUNDS, (hashErr, hashed) => {
      if (hashErr) return res.status(500).json({ message: 'Hashing failed.' });

      const sql = 'INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?)';
      db.query(sql, [name, email, phone, hashed, role_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to add staff: ' + err.message });

        const newStaff = { id: result.insertId, name, email, phone, role_id: Number(role_id) };
        res.status(201).json({ message: 'Staff member added successfully.', newStaff });
      });
    });
  });
});

app.delete('/admin/staff/:id', (req, res) => {
  const { id } = req.params;

  db.query('SELECT role_id FROM users WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error: ' + err.message });

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    if (rows[0].role_id === 3) {
      return res.status(403).json({ message: 'Super Admins cannot be removed via this route.' });
    }

    db.query('DELETE FROM users WHERE id = ? AND role_id = 2', [id], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to remove staff: ' + err.message });
      res.json({ message: 'Staff member removed successfully.' });
    });
  });
});

// ==========================================
// --- ADMIN: PRODUCTS ---
// ==========================================

app.post('/admin/products', upload.single('image'), (req, res) => {
  const { name, price, stock_quantity, description } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || price === undefined || stock_quantity === undefined) {
    return res.status(400).json({ message: 'Name, price, and stock quantity are required.' });
  }

  const sql = 'INSERT INTO prebuilt_candles (name, price, stock_quantity, description, image_url) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, parseFloat(price), parseInt(stock_quantity), description || null, image_url], (err, result) => {
      if (err) return res.status(500).json({ message: 'Failed to add product: ' + err.message });
      res.status(201).json({ 
        message: 'Product added successfully.', 
        newProduct: { id: result.insertId, name, price, stock_quantity, description, image_url } 
      });
  });
});

app.put('/admin/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, price, stock_quantity, description, existing_image_url } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : (existing_image_url || null);

  const sql = 'UPDATE prebuilt_candles SET name = ?, price = ?, stock_quantity = ?, description = ?, image_url = ? WHERE id = ?';
  db.query(sql, [name, parseFloat(price), parseInt(stock_quantity), description || null, image_url, id], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update product: ' + err.message });
      res.json({ message: 'Product updated successfully.', image_url });
  });
});

app.delete('/admin/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM prebuilt_candles WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Failed to delete product (It might be linked to an order!). ' + err.message });
    res.json({ message: 'Product deleted successfully.' });
  });
});

// ==========================================
// --- USER: DELETE ACCOUNT ---
// ==========================================

app.delete('/admin/delete-account', (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required.' });
  }

  db.query('SELECT password_hash FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found.' });

    const storedPassword = results[0].password_hash;

    if (!storedPassword.startsWith('$2')) {
      if (password === storedPassword) {
        deleteUser();
      } else {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    } else {
      bcrypt.compare(password, storedPassword, (compareErr, isMatch) => {
        if (compareErr) return res.status(500).json({ error: 'Auth error.' });
        if (!isMatch) return res.status(401).json({ error: 'Incorrect password.' });
        deleteUser();
      });
    }

    function deleteUser() {
      db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
        if (err) return res.status(500).json({ error: 'Cart lookup error: ' + err.message });

        if (cartResults.length > 0) {
          const cartId = cartResults[0].id;
          db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId], (err) => {
            if (err) return res.status(500).json({ error: 'Cart items delete error: ' + err.message });
            db.query('DELETE FROM carts WHERE id = ?', [cartId], (err) => {
              if (err) return res.status(500).json({ error: 'Cart delete error: ' + err.message });
              executeFinalDelete();
            });
          });
        } else {
          executeFinalDelete();
        }
      });
    }

    function executeFinalDelete() {
      db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete account. You may have existing orders linked to your profile.' });
        res.json({ message: 'Account deleted successfully.' });
      });
    }
  });
});

// ==========================================
// --- DISCOUNT CODES ---
// ==========================================

app.get('/admin/discount-codes', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM discount_codes ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error("Fetch Promo Error:", err);
        res.status(500).json({ message: "Error fetching discount codes" });
    }
});

app.post('/admin/discount-codes', async (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = req.body;
    try {
        await db.promise().query(
            `INSERT INTO discount_codes 
            (code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [code, discount_type, discount_value, min_order_amount || 0, max_order_amount || null, max_uses || null, expires_at || null]
        );
        res.status(201).json({ message: "Discount code created" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "This discount code already exists." });
        }
        console.error("Create Promo Error:", err);
        res.status(500).json({ message: "Error creating discount code" });
    }
});

app.patch('/admin/discount-codes/:id', async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        await db.promise().query('UPDATE discount_codes SET is_active = ? WHERE id = ?', [is_active, id]);
        res.json({ message: "Status updated successfully" });
    } catch (err) {
        console.error("Toggle Promo Error:", err);
        res.status(500).json({ message: "Error updating status" });
    }
});

app.delete('/admin/discount-codes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise().query('DELETE FROM discount_codes WHERE id = ?', [id]);
        res.json({ message: "Discount code deleted" });
    } catch (err) {
        console.error("Delete Promo Error:", err);
        res.status(500).json({ message: "Error deleting discount code" });
    }
});

// ==========================================
// --- CUSTOMER MESSAGES ---
// ==========================================

app.post('/messages', (req, res) => {
    const { name, email, phone, message } = req.body; 
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    db.query(
        'INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)',
        [name, email, phone || null, message], 
        (err) => {
            if (err) {
                console.error("Message Error:", err);
                return res.status(500).json({ error: 'Failed to send message.' });
            }
            res.status(201).json({ message: 'Message sent successfully!' });
        }
    );
});

app.get('/admin/messages', (req, res) => {
    db.query('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error("Fetch Messages Error:", err);
            return res.status(500).json({ error: 'Failed to fetch messages.' });
        }
        res.json(results);
    });
});

app.delete('/admin/messages/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM contact_messages WHERE id = ?', [id], (err) => {
        if (err) {
            console.error("Delete Message Error:", err);
            return res.status(500).json({ error: 'Failed to delete message.' });
        }
        res.json({ message: 'Message deleted successfully.' });
    });
});

// ==========================================
// --- USER ADDRESS BOOK ---
// ==========================================

app.get('/addresses/:userId', (req, res) => {
  db.query('SELECT * FROM user_addresses WHERE user_id = ?', [req.params.userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/addresses/:userId', (req, res) => {
  const { fullName, phone, governorate, area, street, building, floorApt, notes } = req.body;
  const sql = 'INSERT INTO user_addresses (user_id, full_name, phone, governorate, area, street, building, floor_apt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [req.params.userId, fullName, phone, governorate, area, street, building, floorApt, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Address saved!', addressId: result.insertId });
  });
});

// ==========================================
// --- CHECKOUT ---
// ==========================================

app.post('/checkout', (req, res) => {
  const { userId, shippingDetails } = req.body;
  if (!userId) return res.status(401).json({ error: 'You must be logged in to checkout.' });

  db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    if (cartResults.length === 0) return res.status(400).json({ error: 'Your cart is empty!' });
    const cartId = cartResults[0].id;

    const cartItemsSql = `
      SELECT 
        ci.quantity, ci.prebuilt_candle_id, ci.custom_candle_id,
        cc.total_price AS custom_price, cc.type AS custom_type,
        pc.price AS prebuilt_price, pc.name AS prebuilt_name, pc.stock_quantity,
        cs.name AS cup_name, ms.name AS mold_name,
        sc.name AS scent_name,
        sz.size_ml AS cup_size,
        col.name AS cup_color,
        (SELECT GROUP_CONCAT(CONCAT('L', layer_index, ': ', c.name) SEPARATOR ' | ') 
         FROM custom_candle_layers ccl 
         JOIN colors c ON ccl.color_id = c.id 
         WHERE ccl.custom_candle_id = cc.id 
         ORDER BY ccl.layer_index) AS wax_colors
      FROM cart_items ci
      LEFT JOIN custom_candles cc ON ci.custom_candle_id = cc.id
      LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
      LEFT JOIN cup_shapes cs ON cc.cup_shape_id = cs.id
      LEFT JOIN mold_shapes ms ON cc.mold_shape_id = ms.id
      LEFT JOIN scents sc ON cc.scent_id = sc.id
      LEFT JOIN cup_sizes sz ON cc.cup_size_id = sz.id
      LEFT JOIN cup_colors col ON cc.cup_color_id = col.id
      WHERE ci.cart_id = ?
    `;

    db.query(cartItemsSql, [cartId], (err, items) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch cart items: ' + err.message });
      if (items.length === 0) return res.status(400).json({ error: 'Your cart is empty!' });

      for (let item of items) {
        if (item.prebuilt_candle_id && item.quantity > item.stock_quantity) {
          return res.status(400).json({ error: `Sorry, "${item.prebuilt_name}" only has ${item.stock_quantity} left.` });
        }
      }

      let orderTotal = 0;
      items.forEach(item => orderTotal += (item.prebuilt_price || item.custom_price || 0) * item.quantity);

      db.query('INSERT INTO orders (user_id, total, status_id) VALUES (?, ?, 1)', [userId, orderTotal], (err, orderResult) => {
        if (err) return res.status(500).json({ error: 'Failed to create order: ' + err.message });
        const newOrderId = orderResult.insertId;

        const orderItemsValues = items.map(item => {
          let itemType = 'prebuilt';
          let itemName = item.prebuilt_name || 'Unknown Item';
          let unitPrice = item.prebuilt_price || 0;
          let details = 'Standard Pre-built';

          if (item.custom_candle_id) {
            itemType = item.custom_type || 'cup';
            itemName = item.custom_type === 'cup' ? `${item.cup_name}` : `${item.mold_name}`;
            unitPrice = item.custom_price || 0;
            if (item.custom_type === 'cup') {
              details = `Scent: ${item.scent_name}, Size: ${item.cup_size}ml, Jar: ${item.cup_color}, Wax: ${item.wax_colors}`;
            } else {
              details = `Scent: ${item.scent_name}, Layers: [${item.wax_colors}]`;
            }
          }
          return [newOrderId, itemType, itemName, details, unitPrice, item.quantity];
        });

        db.query('INSERT INTO order_items (order_id, item_type, item_name, details, unit_price, quantity) VALUES ?', [orderItemsValues], (err) => {
          if (err) console.error("Failed to save order items", err);

          items.forEach(item => {
            if (item.prebuilt_candle_id) {
              db.query('UPDATE prebuilt_candles SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.prebuilt_candle_id]);
            }
          });
          db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId], () => {
            res.status(201).json({ message: 'Order placed successfully!', orderId: newOrderId });
          });
        });
      });
    });
  });
});

// ==========================================
// --- PAYMOB: INITIATE ONLINE PAYMENT ---
// ==========================================

app.post('/paymob/initiate', async (req, res) => {
  const { userId, shippingDetails, orderId, amountCents, items } = req.body;

  if (!orderId || !amountCents) {
    return res.status(400).json({ error: 'orderId and amountCents are required.' });
  }

  try {
    const authToken = await paymobGetAuthToken();
    const paymobOrderId = await paymobRegisterOrder(authToken, amountCents, orderId, items || []);

    const nameParts = (shippingDetails.fullName || 'Guest User').split(' ');
    const billingData = {
      first_name: nameParts[0] || 'NA',
      last_name: nameParts.slice(1).join(' ') || 'NA',
      phone_number: shippingDetails.phone || 'NA',
      apartment: shippingDetails.floorApt || 'NA',
      floor: 'NA',
      street: shippingDetails.street || 'NA',
      building: shippingDetails.building || 'NA',
      city: shippingDetails.area || 'NA',
      state: shippingDetails.governorate || 'NA',
      country: 'EG',
      postal_code: 'NA',
      shipping_method: 'NA',
      email: 'customer@glowaroma.com'
    };

    const paymentToken = await paymobGetPaymentKey(authToken, paymobOrderId, amountCents, billingData);

    res.json({
      paymentToken,
      iframeId: process.env.PAYMOB_IFRAME_ID
    });
  } catch (err) {
    console.error('Paymob initiation error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// ==========================================
// --- PAYMOB: TRANSACTION CALLBACK ---
// ==========================================
// Set this URL in your Paymob dashboard under:
// Developers > Payment Integrations > [your integration] > Transaction Processed Callback
// During dev: https://YOUR_NGROK.ngrok.io/paymob/callback
// In production: https://yourdomain.com/paymob/callback

app.post('/paymob/callback', async (req, res) => {
  const { hmac } = req.query;
  const data = req.body?.obj;

  if (!data) {
    console.error('Paymob callback: no obj in body');
    return res.sendStatus(200); // always 200 so Paymob doesn't retry forever
  }

  if (!paymobVerifyHmac(data, hmac)) {
    console.error('Paymob callback: HMAC verification failed!');
    return res.sendStatus(200);
  }

  console.log(`Paymob callback: order ${data.order?.merchant_order_id}, success=${data.success}`);

  if (data.success === true) {
    const merchantOrderId = data.order?.merchant_order_id;
    if (merchantOrderId) {
      try {
        await db.promise().query(
          'UPDATE orders SET payment_status = ? WHERE id = ?',
          ['paid', merchantOrderId]
        );
        console.log(`Order #${merchantOrderId} marked as paid.`);
      } catch (dbErr) {
        console.error('Failed to update order payment status:', dbErr.message);
      }
    }
  }

  res.sendStatus(200);
});

// ==========================================
// --- START SERVER ---
// ==========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});