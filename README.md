<div align="center">

# 🕯️ GlowAroma

**Custom candle e-commerce platform with a live 3D configurator**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-9.4-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Storage-3448C5?style=flat-square&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Deployed on Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)

[**🌐 Live Demo**](https://glow-aroma.vercel.app) · [**📡 API**](https://glow-aroma-production.up.railway.app)

</div>

---

## 📋 Table of Contents

- [What is GlowAroma?](#-what-is-glowaroma)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Database Schema](#️-database-schema)
- [API Reference](#-api-reference)
- [3D System](#-3d-system)
- [Payment Flow](#-payment-flow-paymob)
- [Real-time](#-real-time-socketio)
- [Deployment](#-deployment)
- [Auth & Roles](#-auth--roles)
- [Known Issues](#️-known-issues)

---

## ✨ What is GlowAroma?

GlowAroma is a full-stack e-commerce platform for a custom candle shop based in Egypt. Customers design personalised candles using a live **3D configurator** — choosing the cup shape, size, glass color, wax color, and scent — and see their creation rendered in real-time using Three.js before adding it to the cart with a snapshot image.

Admins manage everything from a tabbed dashboard: orders, products, inventory, the homepage slideshow, 3D showcase designs, promo codes, staff, and customer messages.

---

## 🚀 Features

### 👤 Customer
- 🕯️ **3D Candle Builder** — Configure cup shape, size, glass color, wax color, and scent with live Three.js preview
- 🎨 **Mold Candles** — Multi-layer mold designs with per-layer color control
- 📸 **Cart Snapshots** — Canvas PNG capture saved with each custom candle item
- 🛒 **Smart Cart** — Stacks identical designs, prevents duplicates, enforces stock limits
- 💳 **Paymob Payments** — Online card payments in EGP via embedded iframe
- 🎟️ **Promo Codes** — Percentage or fixed discounts with expiry, min/max order, and usage limits
- 📦 **Order History** — Track status from Processing → Shipped → Delivered
- ⚡ **Live Viewer Count** — Real-time Socket.io badge on product pages when 2+ people are viewing
- 🔐 **Google OAuth** — One-click sign-in alongside email/password auth
- 📍 **Address Book** — Save and manage multiple delivery addresses
- 💬 **Contact Form** — Send messages optionally linked to a specific order

### 🛠️ Admin
- 📊 **Dashboard Overview** — Revenue area chart (last 7 days), orders by status bar chart, low-stock alerts, stat cards
- 📦 **Order Management** — View all order items, update status, search and filter by customer or status
- 🕯️ **Products** — Add, edit, delete prebuilt candles with Cloudinary image upload
- 🛠️ **Inventory** — Full CRUD for scents, wax colors, cup shapes/sizes/colors, mold shapes (soft-delete if in use)
- 🧊 **3D Model Registry** — Upload GLB models to Cloudinary, set colorable parts per model, toggle flat shading
- 🖼️ **Homepage Slideshow** — Upload, reorder (↑↓), show/hide hero images
- ✨ **Showcase Studio** — Design 3D featured candle looks using the full configurator; they cycle on the homepage card
- 💬 **Messages** — Read customer contact messages linked to their orders
- 👥 **Staff Management** *(Super Admin)* — Add/remove admin accounts
- 🎟️ **Promo Code Manager** *(Super Admin)* — Create codes with type, value, limits, and expiry

---

## 🧱 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | SPA hosted on Vercel |
| Backend | Node.js + Express | REST API + Socket.io on Railway |
| Database | MySQL 9.4 | Hosted on Railway, mysql2 driver |
| 3D Configurator | Three.js (raw) | GLTFLoader + OrbitControls, forwardRef snapshot |
| 3D Display Viewer | @react-three/fiber + drei | Auto-rotating MiniCandleViewer |
| Payments | Paymob | EGP card payments, HMAC-SHA512 callback verification |
| Auth | JWT + bcrypt + Google OAuth | 7-day tokens stored in localStorage |
| Real-time | Socket.io | Live viewer count per product page |
| File/Model Storage | Cloudinary | Images as `image`, GLB models as `raw` |
| Styling | Custom CSS + React-Bootstrap | Averia Libre font, warm brown palette `#4A3728` |

---

## 📁 Project Structure

```
Glow-Aroma/
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Hero slideshow + featured products
│   │   │   ├── Create.jsx         # 3D candle builder
│   │   │   ├── Cart.jsx           # Cart with snapshot images
│   │   │   ├── Checkout.jsx       # Address form + Paymob iframe
│   │   │   ├── Products.jsx       # Product catalog grid
│   │   │   ├── ProductDetails.jsx # Single product + live viewers
│   │   │   ├── Profile.jsx        # Orders + address book
│   │   │   ├── SignIn.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── Dashboard.jsx      # Admin dashboard (tabbed)
│   │   │   └── Inventory.jsx      # Admin inventory management
│   │   ├── components/
│   │   │   ├── CandlePreview3D.jsx    # Full Three.js configurator
│   │   │   ├── MiniCandleViewer.jsx   # R3F display viewer (auto-rotate)
│   │   │   ├── CreateYourOwnCard.jsx  # Homepage showcase cycling card
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── NotificationContext.jsx
│   │   │   └── useTitles.js
│   │   ├── styles/                # Per-page CSS
│   │   └── config.js              # API_BASE_URL
│   └── public/
│       └── candle.glb             # Fallback 3D model
├── server.js                      # Express API entry point + Socket.io
├── cloudinary.js                  # Upload helpers
├── package.json
└── .env                           # Environment variables (never commit)
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+ or MariaDB
- [Cloudinary](https://cloudinary.com) account (free tier works)
- [Paymob](https://paymob.com) account (for payments)
- [Google Cloud Console](https://console.cloud.google.com) project with OAuth credentials

### 1. Clone the repo

```bash
git clone https://github.com/Bellogello/Glow-Aroma.git
cd Glow-Aroma
```

### 2. Install dependencies

```bash
# Backend
npm install

# Frontend
cd client && npm install

# Required extras
npm install recharts
npm install @react-three/fiber @react-three/drei
```

### 3. Set up the database

```bash
# Create local database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS glow_aroma_db;"

# Export from Railway
mariadb-dump -h monorail.proxy.rlwy.net -P 22983 \
  -u root -p --ssl-verify-server-cert=FALSE \
  railway > glow_aroma_db.sql

# Import locally
mysql -u root -p glow_aroma_db < glow_aroma_db.sql
```

### 4. Run

```bash
# Terminal 1 — backend on :8080
node server.js

# Terminal 2 — frontend on :5173
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔑 Environment Variables

### Backend `.env`

```env
# ── Database ───────────────────────────────────────
DB_HOST=localhost                    # Railway: monorail.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=glow_aroma_db                # Railway: railway
DB_PORT=3306                         # Railway: 22983
NODE_ENV=development                 # set to production to enable DB SSL

# ── Auth ───────────────────────────────────────────
JWT_SECRET=your_jwt_secret_minimum_32_characters

# ── Paymob ─────────────────────────────────────────
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret

# ── Cloudinary ─────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend `client/.env`

```env
VITE_API_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

> ⚠️ **Never commit `.env` to git.** Set production values directly in Railway and Vercel dashboards.

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Customers and admins — `role_id` 1/2/3 |
| `cup_shapes` | Cup shapes — `sizes` and `colors` stored as JSON columns |
| `mold_shapes` | Mold shapes — includes `layers` count |
| `custom_candles` | Customer-built candles — `cup_color_id` stores RGBA string, `cup_size` stores ml value |
| `custom_candle_layers` | Per-layer wax color — `custom_candle_id`, `color_id`, `layer_index` |
| `cart_items` | Links to either `custom_candle_id` OR `prebuilt_candle_id` (mutually exclusive) |
| `orders` | Purchase records — `status_id` 1=Processing 2=Shipped 3=Delivered |
| `order_items` | Snapshot of items at purchase time — read-only |
| `discount_codes` | Promo codes with type, value, min/max order, usage limits, expiry |
| `showcase_designs` | Featured 3D designs for the homepage CreateYourOwn card |
| `hero_images` | Homepage slideshow images |
| `candle_models` | 3D model registry — `colorable_parts` JSON array of mesh names |
| `prebuilt_candles` | Ready-made products with stock quantity |
| `contact_messages` | Customer contact form submissions |
| `user_addresses` | Saved delivery addresses |

> `cup_shapes.sizes` and `cup_shapes.colors` are JSON columns parsed in the frontend.
> `custom_candles.cup_color_id` stores an RGBA string — not a FK to `cup_colors`.

---

## 📡 API Reference

Base URL: `https://glow-aroma-production.up.railway.app`

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users` | Register new customer |
| `POST` | `/signin` | Email + password login |
| `POST` | `/auth/google` | Google OAuth login/register |
| `GET` | `/users/:id` | Get user profile |
| `DELETE` | `/admin/delete-account` | Delete own account (requires password) |
| `GET/POST/PUT/DELETE` | `/addresses/:userId` | Address book CRUD |

### Builder

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/scents` | All available scents with family |
| `GET` | `/colors` | All wax colors |
| `GET` | `/cup-shapes` | Shapes with sizes + colors JSON |
| `GET` | `/cup-sizes` | Cup sizes (id, size_ml) |
| `GET` | `/cup-colors` | Cup glass colors |
| `GET` | `/mold-shapes` | Mold shapes with layer count |
| `GET` | `/admin/models` | 3D models with colorable_parts |
| `GET` | `/showcase` | Active showcase designs (homepage) |
| `GET` | `/admin/showcase` | All showcase designs (admin) |
| `POST/PUT/DELETE` | `/admin/showcase/:id` | Showcase design CRUD |
| `PATCH` | `/admin/showcase/:id/toggle` | Toggle `{is_active: 0\|1}` |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/cart/add` | Add cup candle, mold candle, or prebuilt |
| `GET` | `/cart/:userId` | Get cart with names, colors, snapshots |
| `PUT` | `/cart/update/:cartItemId` | `{action: "increase"\|"decrease"}` |
| `DELETE` | `/cart/remove/:cartItemId` | Remove item |
| `POST` | `/coupons/validate` | Validate promo code against order total |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/checkout` | Place order, decrement stock, clear cart |
| `POST` | `/paymob/initiate` | Get Paymob payment token + iframe ID |
| `POST` | `/paymob/callback` | Paymob webhook — HMAC verify → update status |
| `GET` | `/orders/user/:userId` | Customer order history (last 10) |
| `GET` | `/admin/orders` | All orders (admin) |
| `GET` | `/admin/orders/:id/items` | Items for order ⚠️ must be before `/:orderId` route |
| `PUT` | `/admin/orders/:id/status` | Update status `{status_id: 1\|2\|3}` |

### Admin — Inventory

All support `GET / POST / PUT / DELETE`:

`/admin/inventory/scent-families` · `/admin/inventory/scents` · `/admin/inventory/colors` · `/admin/inventory/cup-shapes` · `/admin/inventory/cup-sizes` · `/admin/inventory/cup-colors` · `/admin/inventory/mold-shapes` · `/admin/models`

### Admin — Store Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/DELETE` | `/admin/hero-images` | Slideshow image management |
| `PATCH` | `/admin/hero-images/:id/toggle` | Show/hide image |
| `PUT` | `/admin/hero-images/reorder` | Reorder by `{orderedIds: [...]}` |
| `GET/POST/DELETE` | `/admin/staff` | Staff management (Super Admin) |
| `GET/POST/PATCH/DELETE` | `/admin/discount-codes` | Promo codes (Super Admin) |
| `GET/DELETE` | `/admin/messages` | Customer messages |

---

## 🎨 3D System

GlowAroma uses **two separate renderers**:

### `CandlePreview3D` — Full Configurator

Used in the **Create page** and **Dashboard Showcase Studio**.

- Raw **Three.js** — `GLTFLoader` + `OrbitControls`
- `forwardRef` exposes `getSnapshot()` → base64 PNG for cart snapshot
- `preserveDrawingBuffer: true` required for canvas capture

**Mesh detection by name:**

| Name pattern | Treated as |
|-------------|-----------|
| ends `_0` or includes `cylinder_0` | Glass cup (MeshPhysicalMaterial, transparent) |
| ends `_1`, includes `wax` or `sphere` | Wax fill |
| ends `_2`, includes `wick` | Wick — no color change |
| name in `colorable_parts` array | Mold layer at that array index |

### `MiniCandleViewer` — Display Viewer

Used in **CreateYourOwnCard** (homepage) and product pages.

- **@react-three/fiber** + `@react-three/drei` — `ContactShadows`, auto-rotates via `useFrame`
- Assigns layer colors by **traversal order**: `Wax_Bottom` → `layers[0]`, `Wax_Middle` → `layers[1]`, `Wax_Top` → `layers[2]`
- `layers` prop must be a **parsed array**, not a raw JSON string

### Adding a model

1. Model in Blender — name meshes clearly (`Wax_Bottom`, `Wax_Middle`, `Wax_Top` for molds)
2. Export as `.glb`
3. Upload via **Dashboard → 3D Models** — stored on Cloudinary as `resource_type: "raw"`
4. Set `colorable_parts` JSON array of mesh names in layer order

---

## 💳 Payment Flow (Paymob)

```
1. Customer confirms cart
        ↓
2. POST /checkout
   → INSERT orders (status_id = 1)
   → INSERT order_items snapshot
   → UPDATE prebuilt stock
   → DELETE cart_items
        ↓
3. POST /paymob/initiate
   → Paymob /auth/tokens           → authToken
   → Paymob /ecommerce/orders      → paymobOrderId
   → Paymob /acceptance/payment_keys → paymentToken
        ↓
4. Frontend renders Paymob iframe
        ↓
5. Customer enters card details
        ↓
6. POST /paymob/callback  ← Paymob webhook
   → HMAC-SHA512 verify over 18 fields
   → success === true → UPDATE orders SET status_id = 2
```

---

## ⚡ Real-time (Socket.io)

Live viewer count per product page. Pulsing badge appears when count ≥ 2.

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_product` | Client → Server | `productId` string |
| `leave_product` | Client → Server | `productId` string |
| `update_viewers` | Server → Client | `count` number |
| `disconnect` | Automatic | server uses `socketRooms` map to decrement |

```js
// In-memory state on server
const viewersCount = {};  // { "5": 3 }
const socketRooms  = {};  // { "socket_abc": "5" }
// socketRooms needed because socket.rooms clears before disconnect fires
```

---

## 🚀 Deployment

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Root directory: `client` · Build command: `npm run build` · Output: `dist`
3. Add env vars in Vercel dashboard:

```
VITE_API_URL=https://glow-aroma-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend → Railway

1. Connect GitHub repo to Railway
2. Start command: `node server.js`
3. Add all backend env vars in Railway Variables panel
4. Set `NODE_ENV=production` to enable DB SSL

```js
// Must bind to 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

// SSL toggled by NODE_ENV
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false
```

---

## 🔐 Auth & Roles

| Role | `role_id` | Access |
|------|-----------|--------|
| Customer | 1 | Public routes + own cart, orders, profile, addresses |
| Admin | 2 | Dashboard, orders, products, inventory, messages, store settings |
| Super Admin | 3 | All admin + staff management + promo codes |

JWTs have a 7-day expiry and are stored in `localStorage`. Google OAuth creates a user with a random hashed password on first sign-in. If `password_hash` doesn't start with `$2`, plaintext comparison is used (legacy support).

---

## ⚠️ Known Issues

| Area | Issue |
|------|-------|
| `cup_color_id` | Stores RGBA string — not a FK. Cart name resolved by parsing `cup_shapes.colors` JSON in Node.js |
| `cup_size` | Stores ml integer directly — not a FK to `cup_sizes` |
| Route order | `/admin/orders/:id/items` **must** be before `/admin/orders/:orderId` in `server.js` |
| Snapshot size | Base64 PNG in LONGTEXT — use `image/jpeg` at 0.6 quality to reduce payload and DB size |
| `colorable_parts` | Must be set manually per mold model — if empty all layers share the same color |
| Paymob status | Callback sets `status_id = 2` — no separate "Paid" status distinct from "Shipped" |
| Admin showcase | `fetchDashboardData` uses `/showcase` (public) — use `/admin/showcase` to see hidden designs |
| `MiniCandleViewer` | `layers` prop must be a parsed array, not a raw JSON string |
| `express.json` limit | Set to `10mb` — raise if 413 errors occur on large snapshots |
| Server timeout | `server.timeout = 120000ms` — slow Railway cold starts may still time out on large uploads |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is private. All rights reserved © GlowAroma 2026.

---

<div align="center">
  <p>Built with ❤️ and lots of candles 🕯️</p>
  <br/>
  <a href="https://glow-aroma.vercel.app">🌐 Live Site</a> ·
  <a href="https://glow-aroma-production.up.railway.app">📡 API</a> ·
  <a href="https://github.com/Bellogello/Glow-Aroma">📁 GitHub</a>
<<<<<<< HEAD
</div>
=======
</div>
>>>>>>> 7ff4e2b (added a readme)
