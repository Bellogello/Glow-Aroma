const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'; 

// ==========================================
// --- DATABASE CONNECTION ---
// ==========================================
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: 'glow_aroma_db',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MariaDB:', err.message);
    return;
  }
  console.log('Connected to the glow_aroma_db database!');
});

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

// ==========================================
// --- USERS (SIGNUP) ---
// ==========================================

app.get('/users', (req, res) => {
  db.query('SELECT id, name, email, phone, role_id FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// Fetch a single user's profile (Used for Auto-Fill and Profile page)
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  
  // We only select safe data (no passwords!)
  db.query('SELECT name, email, phone FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Send back the exact user object
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
// --- SIGN IN (LOGIN) ---
// ==========================================

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = results[0];

    // --- LEGACY CHECK FIX ---
    // If the database password doesn't look like a bcrypt hash (starts with $2), check plain text!
    if (!user.password_hash.startsWith('$2')) {
      if (password === user.password_hash) {
        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ message: 'Login successful!', token, userId: user.id, userName: user.name, roleId: user.role_id });
      } else {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    // Otherwise, do the secure bcrypt check
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
    // 1. Ask Google's API for the user's profile info using the token
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!googleResponse.ok) {
      return res.status(401).json({ error: 'Invalid Google token.' });
    }

    const googleUser = await googleResponse.json();
    const { email, name } = googleUser; // Google gives us their real name and email!

    // 2. Check if this email already exists in our MariaDB database
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error: ' + err.message });

      if (results.length > 0) {
        // --- RETURNING USER ---
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
        // --- BRAND NEW USER ---
        // They didn't provide a password, but our DB requires one. 
        // We generate a random one and hash it so it's safe.
        const randomPassword = Math.random().toString(36).slice(-10);
        
        bcrypt.hash(randomPassword, SALT_ROUNDS, (hashErr, hashed) => {
          if (hashErr) return res.status(500).json({ error: 'Hashing failed.' });

          // Insert them as a standard Customer (role_id = 1)
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
  console.log("REACT SENT THIS TO THE CART:", req.body); 

  const { userId, type, scentId, quantity = 1, prebuiltCandleId, totalPrice = 0 } = req.body;
  if (!userId) return res.status(401).json({ error: 'You must be logged in!' });

  db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: 'Cart error: ' + err.message });

    if (cartResults.length > 0) {
      processItem(cartResults[0].id);
    } else {
      db.query('INSERT INTO carts (user_id) VALUES (?)', [userId], (err, newCart) => {
        if (err) return res.status(500).json({ error: 'New cart error: ' + err.message });
        processItem(newCart.insertId);
      });
    }

    function processItem(cartId) {
      // ==========================================
      // UPGRADED LOGIC: PREBUILT CANDLE STACKING
      // ==========================================
      if (prebuiltCandleId) {
        // 1. Check if this exact candle is already in this user's cart
        db.query(
          'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND prebuilt_candle_id = ?',
          [cartId, prebuiltCandleId],
          (err, existingItems) => {
            if (err) return res.status(500).json({ error: 'Check error: ' + err.message });

            if (existingItems.length > 0) {
              // 2. It exists! Update the quantity instead of making a new row
              const newQuantity = existingItems[0].quantity + quantity;
              db.query(
                'UPDATE cart_items SET quantity = ? WHERE id = ?',
                [newQuantity, existingItems[0].id],
                (err) => {
                  if (err) return res.status(500).json({ error: 'Update error: ' + err.message });
                  res.json({ message: 'Updated candle quantity in cart!' });
                }
              );
            } else {
              // 3. It doesn't exist yet! Safe to insert a new row
              db.query(
                'INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?)',
                [cartId, prebuiltCandleId, quantity],
                (err) => {
                  if (err) return res.status(500).json({ error: 'Insert error: ' + err.message });
                  res.json({ message: 'Added pre-built candle to cart!' });
                }
              );
            }
          }
        );
      } 
      // ==========================================
      // CUSTOM CANDLES (Left unchanged so they stay unique)
      // ==========================================
      else if (type === 'cup') {
        const { cupShapeId, cupSizeId, cupColorId, candleColorId } = req.body;

        db.query(
          "INSERT INTO custom_candles (type, scent_id, cup_shape_id, cup_size_id, cup_color_id, total_price) VALUES ('cup', ?, ?, ?, ?, ?)",
          [scentId, cupShapeId, cupSizeId, cupColorId, totalPrice],
          (err, candleResult) => {
            if (err) return res.status(500).json({ error: 'Candle error: ' + err.message });

            const customCandleId = candleResult.insertId;
            db.query(
              'INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES (?, ?, 1)',
              [customCandleId, candleColorId],
              (err) => {
                if (err) return res.status(500).json({ error: 'Layer error: ' + err.message });
                db.query(
                  'INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)',
                  [cartId, customCandleId, quantity],
                  (err) => {
                    if (err) return res.status(500).json({ error: 'Cart link error: ' + err.message });
                    res.json({ message: 'Added custom cup candle to cart!' });
                  }
                );
              }
            );
          }
        );
      } else if (type === 'mold') {
        const { moldShapeId, layers } = req.body;

        db.query(
          "INSERT INTO custom_candles (type, scent_id, mold_shape_id, total_price) VALUES ('mold', ?, ?, ?)",
          [scentId, moldShapeId, totalPrice],
          (err, candleResult) => {
            if (err) return res.status(500).json({ error: 'Mold error: ' + err.message });

            const customCandleId = candleResult.insertId;
            const layerValues = layers.map((colorId, index) => [customCandleId, colorId, index + 1]);

            db.query(
              'INSERT INTO custom_candle_layers (custom_candle_id, color_id, layer_index) VALUES ?',
              [layerValues],
              (err) => {
                if (err) return res.status(500).json({ error: 'Layers bulk insert error: ' + err.message });
                db.query(
                  'INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)',
                  [cartId, customCandleId, quantity],
                  (err) => {
                    if (err) return res.status(500).json({ error: 'Cart link error: ' + err.message });
                    res.json({ message: 'Added layered mold candle to cart!' });
                  }
                );
              }
            );
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
      cs.name AS cup_shape_name,
      csz.size_ml,
      ccol.name AS cup_color_name,
      ms.name AS mold_shape_name,
      s.name AS scent_name,
      GROUP_CONCAT(cl.name ORDER BY ccl.layer_index ASC SEPARATOR ', ') AS wax_colors,
      pc.name AS prebuilt_name,
      pc.price AS prebuilt_price,
      pc.image_url AS prebuilt_image
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
        };
      } else if (item.candle_type === 'cup') {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: true,
          name: `${item.cup_shape_name} (${item.size_ml}ml)`,
          color: `Cup: ${item.cup_color_name} | Wax: ${item.wax_colors}`,
          scent: item.scent_name,
          price: item.custom_price,
        };
      } else if (item.candle_type === 'mold') {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: true,
          name: `${item.mold_shape_name} Mold`,
          color: `Layers: ${item.wax_colors}`,
          scent: item.scent_name,
          price: item.custom_price,
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

  let sql = '';
  if (action === 'increase') {
    sql = 'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?';
  } else if (action === 'decrease') {
    sql = 'UPDATE cart_items SET quantity = GREATEST(quantity - 1, 1) WHERE id = ?';
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }

  db.query(sql, [cartItemId], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update quantity: ' + err.message });
    res.json({ message: 'Quantity updated successfully!' });
  });
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
  // 1. We added role_id here so Express grabs it from React
  const { name, email, phone, password, role_id } = req.body;

  // 2. Updated the safety check to make sure they picked a role
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

      // 3. Swapped the hardcoded '2' for a '?' placeholder
      const sql = 'INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?)';
      
      // 4. Injected the role_id variable into the database query
      db.query(sql, [name, email, phone, hashed, role_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to add staff: ' + err.message });

        // 5. Tell the frontend exactly which role was just created
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

app.post('/admin/products', (req, res) => {
  const { name, price, stock_quantity, description, image_url } = req.body;

  if (!name || price === undefined || stock_quantity === undefined) {
    return res.status(400).json({ message: 'Name, price, and stock quantity are required.' });
  }

  const sql = 'INSERT INTO prebuilt_candles (name, price, stock_quantity, description, image_url) VALUES (?, ?, ?, ?, ?)';
  db.query(
    sql,
    [name, parseFloat(price), parseInt(stock_quantity), description || null, image_url || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Failed to add product: ' + err.message });

      const newProduct = {
        id: result.insertId,
        name,
        price: parseFloat(price),
        stock_quantity: parseInt(stock_quantity),
        description: description || null,
        image_url: image_url || null,
      };

      res.status(201).json({ message: 'Product added successfully.', newProduct });
    }
  );
});

// ==========================================
// --- USER: DELETE ACCOUNT ---
// ==========================================
app.delete('/admin/delete-account', (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required.' });
  }

  // 1. Fetch the user to verify the password
  db.query('SELECT password_hash FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found.' });

    const storedPassword = results[0].password_hash;

    // --- LEGACY CHECK FIX (For manually inserted accounts) ---
    if (!storedPassword.startsWith('$2')) {
      if (password === storedPassword) {
        deleteUser();
      } else {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    } else {
      // Secure bcrypt check
      bcrypt.compare(password, storedPassword, (compareErr, isMatch) => {
        if (compareErr) return res.status(500).json({ error: 'Auth error.' });
        if (!isMatch) return res.status(401).json({ error: 'Incorrect password.' });
        
        deleteUser();
      });
    }

    // 2. The actual deletion function
    function deleteUser() {
      // Because of foreign keys (carts, orders, etc.), a simple delete might fail.
      // If a user has a cart, we must delete the cart items and the cart first!
      db.query('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cartResults) => {
        if (err) return res.status(500).json({ error: 'Cart lookup error: ' + err.message });

        if (cartResults.length > 0) {
          const cartId = cartResults[0].id;
          // Delete cart items first
          db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId], (err) => {
            if (err) return res.status(500).json({ error: 'Cart items delete error: ' + err.message });
            
            // Delete the cart
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

    // 3. Delete the user row
    function executeFinalDelete() {
      db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete account. You may have existing orders linked to your profile.' });
        res.json({ message: 'Account deleted successfully.' });
      });
    }
  });
});
// ==========================================
// --- DISCOUNT CODES (ADMIN ROUTES) ---
// ==========================================

// 1. Get all codes
app.get('/admin/discount-codes', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM discount_codes ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error("Fetch Promo Error:", err);
        res.status(500).json({ message: "Error fetching discount codes" });
    }
});

// 2. Create a new code (UPDATED WITH MAX ORDER AMOUNT)
app.post('/admin/discount-codes', async (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = req.body;
    try {
        await db.promise().query(
            `INSERT INTO discount_codes 
            (code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                code, 
                discount_type, 
                discount_value, 
                min_order_amount || 0, 
                max_order_amount || null, 
                max_uses || null, 
                expires_at || null
            ]
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

// 3. Toggle Active/Inactive Status
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

// 4. Delete a code
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
// CUSTOMER MESSAGES ROUTES
// ==========================================

// 1. POST: Customers sending a message from the Contact Page
app.post('/messages', (req, res) => {
    // 1. MUST HAVE 'phone' here!
    const { name, email, phone, message } = req.body; 
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.query(
        // 2. MUST HAVE 'phone' in the columns and a 4th '?' in the values
        'INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)',
        [name, email, phone || null, message], // 3. MUST pass the phone variable here
        (err) => {
            if (err) {
                console.error("Message Error:", err);
                return res.status(500).json({ error: 'Failed to send message.' });
            }
            res.status(201).json({ message: 'Message sent successfully!' });
        }
    );
});

// 2. GET: Admin dashboard fetching the inbox
app.get('/admin/messages', (req, res) => {
    // Ordering by created_at DESC puts the newest messages at the top
    db.query('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error("Fetch Messages Error:", err);
            return res.status(500).json({ error: 'Failed to fetch messages.' });
        }
        res.json(results);
    });
});

// 3. DELETE: Admin deleting a read message
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
// --- START SERVER ---
// ==========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});