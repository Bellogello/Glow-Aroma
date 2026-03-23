-- DROP DATABASE IF EXISTS glow_aroma_db;
CREATE DATABASE IF NOT EXISTS glow_aroma_db;
USE glow_aroma_db;

-- ============================================================
-- PHASE 1: LOOKUP / REFERENCE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50)      NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS order_statuses (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50)      NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS payment_statuses (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50)      NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS discount_types (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50)      NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ============================================================
-- PHASE 2: NEW DYNAMIC PRODUCT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS colors (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  hex_code      VARCHAR(7)      UNIQUE,
  price         DECIMAL(10,2)   UNSIGNED NOT NULL DEFAULT 0.00,
  is_available  BOOLEAN         NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS scents (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  scent_family  VARCHAR(100),
  price         DECIMAL(10,2)   UNSIGNED NOT NULL DEFAULT 0.00,
  is_available  BOOLEAN         NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cup_shapes (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  base_price    DECIMAL(10,2)   UNSIGNED NOT NULL,
  is_available  BOOLEAN         NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cup_sizes (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  size_ml        INT UNSIGNED    NOT NULL,
  price_modifier DECIMAL(10,2)   UNSIGNED NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cup_colors (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  hex_code      VARCHAR(7),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mold_shapes (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  layers        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  base_price    DECIMAL(10,2)   UNSIGNED NOT NULL,
  is_available  BOOLEAN         NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100)    NOT NULL UNIQUE,
  price           DECIMAL(10,2)   UNSIGNED NOT NULL,
  estimated_days  VARCHAR(50),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  code              VARCHAR(50)      NOT NULL UNIQUE,
  discount_type     ENUM('percentage', 'fixed') NOT NULL,
  discount_value    DECIMAL(10,2)    UNSIGNED NOT NULL,
  min_order_amount  DECIMAL(10,2)    UNSIGNED NOT NULL DEFAULT 0.00,
  max_order_amount  DECIMAL(10,2)    UNSIGNED DEFAULT NULL,
  max_uses          INT UNSIGNED     DEFAULT NULL,
  times_used        INT UNSIGNED     NOT NULL DEFAULT 0,
  expires_at        DATE             DEFAULT NULL,
  is_active         BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ============================================================
-- PHASE 3: USER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name           VARCHAR(150)     NOT NULL,
  email          VARCHAR(150)     NOT NULL UNIQUE,
  password_hash  VARCHAR(255)     NOT NULL,
  role_id        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  phone          VARCHAR(20)      UNIQUE,
  created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  full_name   VARCHAR(150)    NOT NULL,
  phone       VARCHAR(20)     NOT NULL,
  governorate VARCHAR(50)     NOT NULL,
  area        VARCHAR(100)    NOT NULL,
  street      VARCHAR(255)    NOT NULL,
  building    VARCHAR(50)     NOT NULL,
  floor_apt   VARCHAR(50)     NOT NULL,
  notes       TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- PHASE 4: THE NEW CANDLE BUILDER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS custom_candles (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  type           ENUM('cup', 'mold') NOT NULL, 
  scent_id       INT UNSIGNED    NOT NULL,
  cup_shape_id   INT UNSIGNED    NULL,
  cup_size_id    INT UNSIGNED    NULL,
  cup_color_id   INT UNSIGNED    NULL,
  mold_shape_id  INT UNSIGNED    NULL,
  preview_image  LONGTEXT        NULL,
  total_price    DECIMAL(10,2)   UNSIGNED NOT NULL,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (scent_id)      REFERENCES scents(id),
  FOREIGN KEY (cup_shape_id)  REFERENCES cup_shapes(id),
  FOREIGN KEY (cup_size_id)   REFERENCES cup_sizes(id),
  FOREIGN KEY (cup_color_id)  REFERENCES cup_colors(id),
  FOREIGN KEY (mold_shape_id) REFERENCES mold_shapes(id)
);

CREATE TABLE IF NOT EXISTS custom_candle_layers (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  custom_candle_id INT UNSIGNED    NOT NULL,
  color_id         INT UNSIGNED    NOT NULL,
  layer_index      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (custom_candle_id) REFERENCES custom_candles(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id)         REFERENCES colors(id)
);

CREATE TABLE IF NOT EXISTS prebuilt_candles (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name            VARCHAR(150)    NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2)   UNSIGNED NOT NULL,
  stock_quantity  INT UNSIGNED    NOT NULL DEFAULT 0,
  image_url       VARCHAR(255),
  model_url       VARCHAR(255),
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ============================================================
-- PHASE 5: CART TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS carts (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL UNIQUE,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  cart_id             INT UNSIGNED    NOT NULL,
  custom_candle_id    INT UNSIGNED    NULL, 
  prebuilt_candle_id  INT UNSIGNED    NULL, 
  quantity            INT UNSIGNED    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (cart_id)            REFERENCES carts(id),
  FOREIGN KEY (custom_candle_id)   REFERENCES custom_candles(id),
  FOREIGN KEY (prebuilt_candle_id) REFERENCES prebuilt_candles(id)
);

-- ============================================================
-- PHASE 6: ORDER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED     NOT NULL,
  status_id           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  total               DECIMAL(10,2)    UNSIGNED NOT NULL,
  created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (status_id) REFERENCES order_statuses(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED    NOT NULL,
  item_type   ENUM('cup', 'mold', 'prebuilt') NOT NULL,
  item_name   VARCHAR(150)    NOT NULL, 
  details     TEXT            NOT NULL, 
  unit_price  DECIMAL(10,2)   UNSIGNED NOT NULL,
  quantity    INT UNSIGNED    NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ============================================================
-- PHASE 7: PAYMENT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED     NOT NULL UNIQUE,
  amount          DECIMAL(10,2)    UNSIGNED NOT NULL,
  status_id       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (order_id)  REFERENCES orders(id),
  FOREIGN KEY (status_id) REFERENCES payment_statuses(id)
);

-- ============================================================
-- PHASE 8: REVIEWS & WISHLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED     NOT NULL,
  prebuilt_candle_id INT UNSIGNED NULL,
  rating             TINYINT UNSIGNED NOT NULL,
  comment            TEXT,
  created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (prebuilt_candle_id) REFERENCES prebuilt_candles(id)
);

CREATE TABLE IF NOT EXISTS wishlists (
  id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED    NOT NULL,
  custom_candle_id  INT UNSIGNED    NOT NULL,
  saved_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)          REFERENCES users(id),
  FOREIGN KEY (custom_candle_id) REFERENCES custom_candles(id)
);

-- ============================================================
-- PHASE 9: SEED DATA (Safe to run multiple times!)
-- ============================================================

INSERT IGNORE INTO user_roles (id, name) VALUES (1, 'customer'), (2, 'admin'), (3, 'super admin');

-- Essential Order & Payment Statuses (Fixes the Checkout Crash!)
INSERT IGNORE INTO order_statuses (id, name) VALUES (1, 'Processing'), (2, 'Shipped'), (3, 'Delivered'), (4, 'Cancelled');
INSERT IGNORE INTO payment_statuses (id, name) VALUES (1, 'Pending'), (2, 'Paid'), (3, 'Failed'), (4, 'Refunded');

-- Wax Colors
INSERT IGNORE INTO colors (id, name, hex_code, price) VALUES 
(1, 'Black', '#1a1a1a', 10.00),
(2, 'Ivory White', '#FFFFF0', 10.00),
(3, 'Crimson Red', '#DC143C', 10.00),
(4, 'Blush Pink', '#FFB6C1', 10.00),
(5, 'Sage Green', '#8FBC8F', 10.00),
(6, 'Ocean Blue', '#006994', 10.00),
(7, 'Lavender', '#E6E6FA', 10.00);

-- Scents
INSERT IGNORE INTO scents (id, name, price) VALUES 
(1, 'Vanilla Bean', 15.00), 
(2, 'Lavender Fields', 20.00), 
(3, 'Sandalwood', 25.00), 
(4, 'Fresh Linen', 15.00);

-- Cup Building Blocks
INSERT IGNORE INTO cup_shapes (id, name, base_price) VALUES 
(1, 'Classic Glass Jar', 40.00), 
(2, 'Modern Square', 50.00), 
(3, 'Travel Tin', 30.00);

INSERT IGNORE INTO cup_sizes (id, size_ml, price_modifier) VALUES 
(1, 150, 0.00), 
(2, 250, 20.00), 
(3, 400, 45.00);

INSERT IGNORE INTO cup_colors (id, name, hex_code) VALUES 
(1, 'Clear', '#e8f4f8'), 
(2, 'Frosted', '#d0d0d0'), 
(3, 'Matte Black', '#1a1a1a'), 
(4, 'Rose Gold', '#b76e79');

-- Mold Building Blocks
INSERT IGNORE INTO mold_shapes (id, name, layers, base_price) VALUES 
(1, 'Teddy Bear', 1, 80.00), 
(2, 'Geometric Sphere', 2, 90.00), 
(3, 'Rubik''s Cube', 3, 110.00), 
(4, 'Layered Pillar', 4, 130.00);

-- Prebuilt Store Items
INSERT IGNORE INTO prebuilt_candles (id, name, description, price, stock_quantity, image_url, is_active) VALUES
(1, 'Ocean Breeze Jar', 'A refreshing coastal scent.', 120.00, 50, '/images/ocean.png', TRUE),
(2, 'Vanilla Dream Tin', 'A sweet classic vanilla scent.', 150.00, 35, '/images/vanilla.png', TRUE),
(3, 'Spiced Pumpkin Glass', 'Warm spices and autumn vibes.', 180.00, 0, '/images/pumpkin.png', TRUE);

-- Admin Users (Password is Test123!)
INSERT IGNORE INTO users (id, name, email, phone, password_hash, role_id) VALUES 
(1, 'Chloe Customer', 'customer@glowaroma.com', '01000000001', '$2b$10$YourHashedPasswordHere...', 1),
(2, 'Adam Admin', 'admin@glowaroma.com', '01000000002', '$2b$10$YourHashedPasswordHere...', 2),
(3, 'Sam Superadmin', 'superadmin@glowaroma.com', '01000000003', '$2b$10$YourHashedPasswordHere...', 3);