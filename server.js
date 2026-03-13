const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors'); 

require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: 'glow_aroma_db'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MariaDB:', err.message);
    return;
  }
  console.log('Connected to the candle_shop database!');
});

// ==========================================
// --- CUPS, SCENTS, COLORS ---
// ==========================================
app.get('/cups', (req, res) => {
  db.query('SELECT * FROM cups', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/cups', (req, res) => {
  const { color, description, size_ml, price } = req.body;
  const sql = "INSERT INTO cups (color, description, size_ml, price) VALUES (?, ?, ?, ?)";
  db.query(sql, [color, description, size_ml, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Cup added successfully!", id: result.insertId });
  });
});

app.get('/scents', (req, res) => {
  db.query('SELECT * FROM scents', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/scents', (req, res) => {
  const { name, scent_family, description, price } = req.body;
  const sql = "INSERT INTO scents (name, scent_family, description, price) VALUES (?, ?, ?, ?)";
  db.query(sql, [ name, scent_family, description, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Scent added successfully!", id: result.insertId });
  });
});

app.get('/colors', (req, res) => {
  db.query('SELECT * FROM colors', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/colors', (req, res) => {
  const { name, hex_code, price } = req.body;
  const sql = "INSERT INTO colors (name, hex_code, price) VALUES (?, ?, ?)";
  db.query(sql, [ name, hex_code, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Color added successfully!", id: result.insertId });
  });
});

// ==========================================
// --- USERS (SIGNUP) ---
// ==========================================
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/users', (req, res) => {
  const { name, email, phone, password_hash } = req.body;
  const sql = "INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, 1)";   
  db.query(sql, [name, email, phone, password_hash], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const token = jwt.sign({ id: result.insertId, name: name }, "your_secret_key", { expiresIn: "7d" });
    res.json({ message: "User added successfully!", token: token, userName: name });
  });
});

// ==========================================
// --- SIGN IN (LOGIN) ROUTE --- 
// ==========================================
app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = results[0];

    // Check if passwords match
    if (password !== user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Give them a token and send back their ID
    const token = jwt.sign({ id: user.id, name: user.name }, "your_secret_key", { expiresIn: "7d" });
    
    res.json({ 
      message: "Login successful!", 
      token: token, 
      userId: user.id, 
      userName: user.name,
      roleId: user.role_id 
    });
  });
});

// ==========================================
// --- ADD TO CART ROUTE (POST) ---
// ==========================================
app.post('/cart/add', (req, res) => {
  const { userId, cupId, colorId, scentId, totalPrice, prebuiltCandleId, quantity = 1 } = req.body;

  if (!userId) return res.status(401).json({ error: "You must be logged in!" });

  db.query("SELECT id FROM carts WHERE user_id = ?", [userId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: "Cart error: " + err.message });

    if (cartResults.length > 0) {
      processItem(cartResults[0].id);
    } else {
      db.query("INSERT INTO carts (user_id) VALUES (?)", [userId], (err, newCart) => {
        if (err) return res.status(500).json({ error: "New cart error: " + err.message });
        processItem(newCart.insertId);
      });
    }

    function processItem(cartId) {
      if (prebuiltCandleId) {
        const checkSql = "SELECT id FROM cart_items WHERE cart_id = ? AND prebuilt_candle_id = ?";
        db.query(checkSql, [cartId, prebuiltCandleId], (err, existResults) => {
          if (err) return res.status(500).json({ error: "Check error: " + err.message });

          if (existResults.length > 0) {
            db.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [quantity, existResults[0].id], (err) => {
              if (err) return res.status(500).json({ error: "Update error: " + err.message });
              res.json({ message: "Stacked pre-built candle!" });
            });
          } else {
            db.query("INSERT INTO cart_items (cart_id, prebuilt_candle_id, quantity) VALUES (?, ?, ?)", [cartId, prebuiltCandleId, quantity], (err) => {
              if (err) return res.status(500).json({ error: "Insert error: " + err.message });
              res.json({ message: "Added pre-built candle to cart!" });
            });
          }
        });
      } else if (cupId && colorId && scentId) {
        const checkSql = `
          SELECT ci.id 
          FROM cart_items ci
          JOIN custom_candles cc ON ci.custom_candle_id = cc.id
          WHERE ci.cart_id = ? AND cc.cup_id = ? AND cc.color_id = ? AND cc.scent_id = ?
        `;
        db.query(checkSql, [cartId, cupId, colorId, scentId], (err, existResults) => {
          if (err) return res.status(500).json({ error: "Check error: " + err.message });

          if (existResults.length > 0) {
            db.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [quantity, existResults[0].id], (err) => {
              if (err) return res.status(500).json({ error: "Update error: " + err.message });
              res.json({ message: "Stacked custom candle!" });
            });
          } else {
            const sqlCandle = "INSERT INTO custom_candles (cup_id, color_id, scent_id, total_price) VALUES (?, ?, ?, ?)";
            db.query(sqlCandle, [cupId, colorId, scentId, totalPrice], (err, candleResult) => {
              if (err) return res.status(500).json({ error: "Candle error: " + err.message });
              
              db.query("INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)", [cartId, candleResult.insertId, quantity], (err) => {
                if (err) return res.status(500).json({ error: "Insert error: " + err.message });
                res.json({ message: "Added custom candle to cart!" });
              });
            });
          }
        });
      } else {
        res.status(400).json({ error: "Invalid product data sent to cart." });
      }
    }
  });
});

// ==========================================
// --- GET USER'S CART ROUTE (GET) ---
// ==========================================
app.get('/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const sql = `
    SELECT 
      ci.id as cart_item_id, 
      ci.quantity,
      cc.total_price as custom_price, 
      c.color as cup_color, 
      c.size_ml, 
      cl.name as color_name, 
      s.name as scent_name,
      pc.name as prebuilt_name,
      pc.price as prebuilt_price,
      pc.image_url as prebuilt_image
    FROM cart_items ci 
    LEFT JOIN custom_candles cc ON ci.custom_candle_id = cc.id 
    LEFT JOIN cups c ON cc.cup_id = c.id 
    LEFT JOIN colors cl ON cc.color_id = cl.id 
    LEFT JOIN scents s ON cc.scent_id = s.id 
    LEFT JOIN prebuilt_candles pc ON ci.prebuilt_candle_id = pc.id
    JOIN carts ct ON ci.cart_id = ct.id 
    WHERE ct.user_id = ?
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to load cart: " + err.message });
    
    const formattedCart = results.map(item => {
      if (item.prebuilt_name) {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: false,
          name: item.prebuilt_name,
          price: item.prebuilt_price,
          image: item.prebuilt_image
        };
      } else {
        return {
          cart_item_id: item.cart_item_id,
          quantity: item.quantity,
          is_custom: true,
          name: "Custom Candle",
          color: item.color_name,
          scent: item.scent_name,
          price: item.custom_price
        };
      }
    });

    res.json(formattedCart);
  });
});

// ==========================================
// --- UPDATE QUANTITY ROUTE (PUT) ---
// ==========================================
app.put('/cart/update/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;
  const { action } = req.body; 

  let sql = "";
  if (action === 'increase') {
    sql = "UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?";
  } else if (action === 'decrease') {
    sql = "UPDATE cart_items SET quantity = GREATEST(quantity - 1, 1) WHERE id = ?";
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }

  db.query(sql, [cartItemId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to update quantity: " + err.message });
    res.json({ message: "Quantity updated successfully!" });
  });
});

// ==========================================
// --- REMOVE ITEM FROM CART ROUTE (DELETE) ---
// ==========================================
app.delete('/cart/remove/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;

  const sql = "DELETE FROM cart_items WHERE id = ?";
  
  db.query(sql, [cartItemId], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete: " + err.message });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found in cart." });
    }

    res.json({ message: "Item successfully removed from cart!" });
  });
});

// ==========================================
// --- GET ALL PRE-BUILT CANDLES ROUTE ---
// ==========================================
app.get('/products', (req, res) => {
  const sql = "SELECT * FROM prebuilt_candles WHERE is_active = TRUE";
  
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch: " + err.message });
    res.json(results);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});