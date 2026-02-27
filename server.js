const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();
const cors = require('cors'); // <-- Add this

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: 'glow_aroma_db' // Matches your SQL script
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MariaDB:', err.message);
    return;
  }
  console.log('Connected to the candle_shop database!');
});

// --- TESTER ROUTES FOR POSTMAN ---

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
  
  // 2. Map to your SQL columns
  // Note: I kept 'name' and 'size_oz' here assuming your original database 
  // schema hasn't changed. We are inserting the 'color' value into the 'name' column.
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
//Users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//users
app.post('/api/users', (req, res) => {
  const {name, email, password_hash} = req.body;
  const sql = "INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, 1)";
  
  db.query(sql, [name, email, password_hash], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "user added successfully!", id: result.insertId });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});