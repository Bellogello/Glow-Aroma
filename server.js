const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // <-- Add this

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


//Cups
app.get('/api/cups', (req, res) => {
  db.query('SELECT * FROM cups', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/api/cups', (req, res) => {
  // 1. Destructure exactly what Postman is sending
  const { color, description, size_ml, price } = req.body;
  

  const sql = "INSERT INTO cups (color, description, size_ml, price) VALUES (?, ?, ?, ?)";
  
  db.query(sql, [color, description, size_ml, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Cup added successfully!", id: result.insertId });
  });
});

//Scents
app.get('/api/scents', (req, res) => {
  db.query('SELECT * FROM scents', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/api/scents', (req, res) => {
  const { name, scent_family, description, price } = req.body;
  const sql = "INSERT INTO scents (name, scent_family, description, price) VALUES (?, ?, ?, ?)";
  
  db.query(sql, [ name, scent_family, description, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Scent added successfully!", id: result.insertId });
  });
});

//Colors
app.get('/api/colors', (req, res) => {
  db.query('SELECT * FROM colors', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.post('/api/colors', (req, res) => {
  const { name, hex_code, price } = req.body;
  const sql = "INSERT INTO colors (name, hex_code, price) VALUES (?, ?, ?)";
  
  db.query(sql, [ name, hex_code, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Color added successfully!", id: result.insertId });
  });
});



//Users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


app.post('/api/users', (req, res) => {
  const { name, email, phone, password_hash } = req.body;
  const sql = "INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, 1)";
  
  db.query(sql, [name, email, phone, password_hash], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 1. Generate the "wristband" token using the new user's ID
    // Note: In a real app, keep "your_secret_key" inside your .env file!
    const token = jwt.sign({ id: result.insertId, name: name }, "your_secret_key", { expiresIn: "7d" });
    
    // 2. Send BOTH the success message AND the token back to React
    res.json({ message: "User added successfully!", token: token, userName: name });
  });
});


// ==========================================
// --- ADD TO CART ROUTE (POST) ---
// ==========================================
app.post('/api/cart/add', (req, res) => {
  // 1. ADD 'quantity' TO THE DESTRUCTURING (Default to 1 if missing)
  const { userId, cupId, colorId, scentId, totalPrice, quantity = 1 } = req.body;

  if (!userId) return res.status(401).json({ error: "You must be logged in to add to cart!" });

  db.query("SELECT id FROM carts WHERE user_id = ?", [userId], (err, cartResults) => {
    if (err) return res.status(500).json({ error: "Cart error: " + err.message });

    if (cartResults.length > 0) {
      checkAndInsert(cartResults[0].id);
    } else {
      db.query("INSERT INTO carts (user_id) VALUES (?)", [userId], (err, newCartResult) => {
        if (err) return res.status(500).json({ error: "New cart error: " + err.message });
        checkAndInsert(newCartResult.insertId);
      });
    }

    function checkAndInsert(cartId) {
      const checkSql = `
        SELECT ci.id, ci.quantity 
        FROM cart_items ci
        JOIN custom_candles cc ON ci.custom_candle_id = cc.id
        WHERE ci.cart_id = ? AND cc.cup_id = ? AND cc.color_id = ? AND cc.scent_id = ?
      `;
      
      db.query(checkSql, [cartId, cupId, colorId, scentId], (err, existResults) => {
        if (err) return res.status(500).json({ error: "Check error: " + err.message });

        if (existResults.length > 0) {
          const existingCartItemId = existResults[0].id;
          // 2. UPDATE THIS LINE to add the specific quantity instead of just + 1
          db.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [quantity, existingCartItemId], (err) => {
            if (err) return res.status(500).json({ error: "Update error: " + err.message });
            res.json({ message: "Stacked! Increased quantity of existing candle." });
          });
        } else {
          const sqlCandle = "INSERT INTO custom_candles (cup_id, color_id, scent_id, total_price) VALUES (?, ?, ?, ?)";
          db.query(sqlCandle, [cupId, colorId, scentId, totalPrice], (err, candleResult) => {
            if (err) return res.status(500).json({ error: "Candle insert error: " + err.message });
            
            // 3. UPDATE THIS LINE to insert the actual quantity instead of a hardcoded 1
            const sqlItem = "INSERT INTO cart_items (cart_id, custom_candle_id, quantity) VALUES (?, ?, ?)";
            db.query(sqlItem, [cartId, candleResult.insertId, quantity], (err) => {
              if (err) return res.status(500).json({ error: "Cart Item error: " + err.message });
              res.json({ message: "Successfully added new custom candle!" });
            });
          });
        }
      });
    }
  });
});

// ==========================================
// --- UPDATE QUANTITY ROUTE (PUT) ---
// ==========================================
app.put('/api/cart/update/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;
  const { action } = req.body; // 'increase' or 'decrease'

  let sql = "";
  if (action === 'increase') {
    sql = "UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?";
  } else if (action === 'decrease') {
    // GREATEST() ensures the quantity never goes below 1 in the database
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
app.delete('/api/cart/remove/:cartItemId', (req, res) => {
  const { cartItemId } = req.params;

  // We delete the specific row from the cart_items table
  const sql = "DELETE FROM cart_items WHERE id = ?";
  
  db.query(sql, [cartItemId], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete: " + err.message });
    
    // If no rows were affected, the item didn't exist
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found in cart." });
    }

    res.json({ message: "Item successfully removed from cart!" });
  });
});

// ==========================================
// --- GET USER'S CART ROUTE (GET) ---
// ==========================================
app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  
  // This SQL query joins 5 fucking tables together so you get the actual names instead of just random ID numbers
  const sql = `
    SELECT 
      ci.id as cart_item_id, 
      ci.quantity,
      cc.total_price, 
      c.color as cup_color, 
      c.size_ml, 
      cl.name as color_name, 
      s.name as scent_name 
    FROM cart_items ci 
    JOIN custom_candles cc ON ci.custom_candle_id = cc.id 
    JOIN cups c ON cc.cup_id = c.id 
    JOIN colors cl ON cc.color_id = cl.id 
    JOIN scents s ON cc.scent_id = s.id 
    JOIN carts ct ON ci.cart_id = ct.id 
    WHERE ct.user_id = ?
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database had a stroke: " + err.message });
    res.json(results);
  });
});


//login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length === 0) {
      return res.status(401).json({ error: "User not found. Please sign up." });
    }

    const user = results[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ error: "Incorrect password!" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      "your_secret_key", 
      { expiresIn: "7d" }
    );

    res.json({ 
      message: "Logged in successfully!", 
      token: token,
      name: user.name,
      userId: user.id
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});