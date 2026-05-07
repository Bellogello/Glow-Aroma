const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, LevelFormat, Header, Footer,
  TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  brand:  '4A3728',
  accent: 'C8A97E',
  cream:  'FDF6F0',
  light:  'F5EFE1',
  gray:   '8C7E70',
  border: 'E0DCD3',
  white:  'FFFFFF',
  danger: 'C0392B',
  blue:   '2980B9',
  green:  '27AE60',
  purple: '8E44AD',
  orange: 'E67E22',
  teal:   '16A085',
  dark:   '2C3E50',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const b  = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const bs = { top: b, bottom: b, left: b, right: b };
const nb = { style: BorderStyle.NONE,   size: 0, color: C.white  };
const nbs= { top: nb, bottom: nb, left: nb, right: nb };

const spacer = (n=200) => new Paragraph({ spacing:{ before: n, after: 0 }, children:[] });

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, bold:true, size:40, color: C.brand, font:'Arial' })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold:true, size:28, color: C.brand, font:'Arial' })]
  });
}
function h3(text, color=C.accent) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold:true, size:24, color, font:'Arial' })]
  });
}
function p(text, opts={}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size:20, font:'Arial', color: C.dark, ...opts })]
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference:'bullets', level:0 },
    spacing: { before:60, after:60 },
    children: [new TextRun({ text, size:20, font:'Arial', color: C.dark })]
  });
}
function divider() {
  return new Paragraph({
    spacing: { before:240, after:240 },
    border: { bottom:{ style:BorderStyle.SINGLE, size:2, color: C.border, space:1 } },
    children:[]
  });
}
function sectionBanner(text) {
  return new Paragraph({
    spacing: { before:600, after:200 },
    shading: { fill: C.brand, type: ShadingType.CLEAR },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold:true, size:36, color: C.white, font:'Arial' })]
  });
}

// ── Cell helpers ──────────────────────────────────────────────────────────────
function cell(text, w, fill=C.white, textColor=C.dark, bold=false, center=false) {
  return new TableCell({
    borders: bs,
    width: { size: w, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top:100, bottom:100, left:140, right:140 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), size:18, font:'Arial', color: textColor, bold })]
    })]
  });
}
function hdrCell(text, w) { return cell(text, w, C.brand, C.white, true, true); }
function accentCell(text, w, color=C.accent) { return cell(text, w, color, C.white, true, true); }

function row(...cells) { return new TableRow({ children: cells }); }

function tbl(widths, rows_data) {
  const total = widths.reduce((a,b)=>a+b,0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows_data
  });
}

// ── Box drawing using table cells ─────────────────────────────────────────────
function boxRow(label, fill, textColor, widths) {
  return row(...widths.map((w,i) =>
    i === 0
      ? accentCell(label, w, fill)
      : cell('', w, C.white)
  ));
}

// ── Arrow text ────────────────────────────────────────────────────────────────
function arrow(text='') {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:{ before:60, after:60 },
    children:[new TextRun({ text: `▼  ${text}`, size:20, color: C.gray, font:'Arial' })]
  });
}
function arrowRight(text='') {
  return new Paragraph({
    spacing:{ before:60, after:60 },
    children:[new TextRun({ text: `  ➜  ${text}`, size:20, color: C.gray, font:'Arial' })]
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGRAM CONTENT
// ─────────────────────────────────────────────────────────────────────────────

// 1. USE CASE DIAGRAM
function useCaseDiagram() {
  return [
    sectionBanner('1.  Use Case Diagram'),
    spacer(200),
    h2('GlowAroma — System Use Cases'),
    p('Shows the interactions between actors and the system functionalities.'),
    spacer(160),

    // Actors legend
    tbl([2200, 2200, 2200, 2760], [
      row(hdrCell('Actor', 2200), hdrCell('Role', 2200), hdrCell('Access Level', 2200), hdrCell('Description', 2760)),
      row(cell('Customer',2200,C.light,C.brand,true), cell('End User',2200), cell('Public + Authenticated',2200), cell('Browses, builds candles, orders, pays',2760)),
      row(cell('Admin',2200,C.light,C.brand,true),    cell('Staff',2200),    cell('Authenticated (role 2)',2200),  cell('Manages orders, products, messages',2760)),
      row(cell('Super Admin',2200,C.light,C.brand,true), cell('Owner',2200), cell('Authenticated (role 3)',2200),  cell('Full access + staff + promos',2760)),
      row(cell('Paymob',2200,C.light,C.brand,true),   cell('External',2200), cell('Webhook only',2200),            cell('Sends payment callback to backend',2760)),
      row(cell('Google',2200,C.light,C.brand,true),   cell('External',2200), cell('OAuth only',2200),              cell('Provides user identity via access_token',2760)),
    ]),
    spacer(240),

    h3('Customer Use Cases', C.blue),
    tbl([500, 2800, 6060], [
      row(hdrCell('#',500), hdrCell('Use Case',2800), hdrCell('Description',6060)),
      row(cell('UC-01',500,C.cream), cell('Register / Login',2800), cell('Sign up with email or Google OAuth',6060)),
      row(cell('UC-02',500,C.cream), cell('Browse Products',2800), cell('View prebuilt candle catalog and product details',6060)),
      row(cell('UC-03',500,C.cream), cell('Build Custom Candle',2800), cell('Use 3D configurator to select shape, size, cup color, wax color, scent; preview live in 3D',6060)),
      row(cell('UC-04',500,C.cream), cell('Manage Cart',2800), cell('Add/remove items, adjust quantities, view cart with snapshot images',6060)),
      row(cell('UC-05',500,C.cream), cell('Apply Promo Code',2800), cell('Enter discount code at checkout, system validates and applies discount',6060)),
      row(cell('UC-06',500,C.cream), cell('Checkout',2800), cell('Enter shipping address, choose payment method, complete payment via Paymob',6060)),
      row(cell('UC-07',500,C.cream), cell('View Order History',2800), cell('See past orders with status (Processing / Shipped / Delivered)',6060)),
      row(cell('UC-08',500,C.cream), cell('Manage Addresses',2800), cell('Save, edit, delete delivery addresses for faster checkout',6060)),
      row(cell('UC-09',500,C.cream), cell('Contact Support',2800), cell('Submit contact form message with optional order reference',6060)),
      row(cell('UC-10',500,C.cream), cell('View Live Viewers',2800), cell('See real-time count of people viewing same product (Socket.io)',6060)),
    ]),
    spacer(200),

    h3('Admin Use Cases', C.orange),
    tbl([500, 2800, 6060], [
      row(hdrCell('#',500), hdrCell('Use Case',2800), hdrCell('Description',6060)),
      row(cell('UC-11',500,C.cream), cell('Manage Orders',2800), cell('View all orders, update status (Processing/Shipped/Delivered), inspect order items',6060)),
      row(cell('UC-12',500,C.cream), cell('Manage Products',2800), cell('Add, edit, delete prebuilt candles with Cloudinary image upload',6060)),
      row(cell('UC-13',500,C.cream), cell('Manage Inventory',2800), cell('CRUD for scents, wax colors, cup shapes/sizes/colors, mold shapes, 3D models',6060)),
      row(cell('UC-14',500,C.cream), cell('Manage Slideshow',2800), cell('Upload, reorder, show/hide homepage hero images',6060)),
      row(cell('UC-15',500,C.cream), cell('Create Showcase',2800), cell('Use design studio to create featured 3D candle designs for homepage card',6060)),
      row(cell('UC-16',500,C.cream), cell('View Messages',2800), cell('Read and delete customer contact messages, link to related orders',6060)),
      row(cell('UC-17',500,C.cream), cell('View Dashboard Stats',2800), cell('See revenue charts, order status breakdown, low stock alerts',6060)),
    ]),
    spacer(200),

    h3('Super Admin Use Cases', C.purple),
    tbl([500, 2800, 6060], [
      row(hdrCell('#',500), hdrCell('Use Case',2800), hdrCell('Description',6060)),
      row(cell('UC-18',500,C.cream), cell('Manage Staff',2800), cell('Add and remove admin accounts (role 2 or 3)',6060)),
      row(cell('UC-19',500,C.cream), cell('Manage Promo Codes',2800), cell('Create codes with discount type, value, limits, expiry; enable/disable',6060)),
      row(cell('UC-20',500,C.cream), cell('Delete Own Account',2800), cell('Permanently delete admin account with password confirmation',6060)),
    ]),
    divider(),
  ];
}

// 2. CONTEXT DIAGRAM
function contextDiagram() {
  return [
    sectionBanner('2.  Context Diagram'),
    spacer(200),
    h2('System Context — External Entities & Data Flows'),
    p('Shows GlowAroma as a black box with all external entities that interact with it.'),
    spacer(200),

    tbl([2200, 1400, 2600, 2160], [
      row(hdrCell('External Entity',2200), hdrCell('Direction',1400), hdrCell('Data In → System',2600), hdrCell('Data Out ← System',2160)),
      row(cell('Customer Browser',2200,C.light,C.brand,true), cell('↔ Two-way',1400,C.cream), cell('Login, candle config, cart actions, orders, messages',2600), cell('Products, cart, order status, 3D models, invoices',2160)),
      row(cell('Paymob',2200,C.light,C.brand,true), cell('↔ Two-way',1400,C.cream), cell('HMAC callback with payment result',2600), cell('Payment initiation request (amount, billing data)',2160)),
      row(cell('Google OAuth',2200,C.light,C.brand,true), cell('→ Inbound',1400,C.cream), cell('access_token from Google Sign-In',2600), cell('User info request (email, name) via Google userinfo API',2160)),
      row(cell('Cloudinary CDN',2200,C.light,C.brand,true), cell('↔ Two-way',1400,C.cream), cell('Upload confirmation + secure_url',2600), cell('Image / GLB file upload (products, hero, models)',2160)),
      row(cell('Admin Browser',2200,C.light,C.brand,true), cell('↔ Two-way',1400,C.cream), cell('Product edits, order status updates, inventory changes',2600), cell('Dashboard data, charts, order items, staff list',2160)),
      row(cell('Vercel (Frontend Host)',2200,C.light,C.brand,true), cell('→ Inbound',1400,C.cream), cell('HTTP requests from user browsers',2600), cell('Serves React SPA, VITE_API_URL points to Railway',2160)),
      row(cell('Railway (DB + API Host)',2200,C.light,C.brand,true), cell('↔ Two-way',1400,C.cream), cell('Environment variables, DB connection',2600), cell('REST API responses, Socket.io events',2160)),
    ]),
    spacer(200),

    h3('Core System Responsibilities', C.teal),
    bullet('Authenticate users (JWT + Google OAuth)'),
    bullet('Serve 3D model URLs and builder configuration from database'),
    bullet('Process cart additions with snapshot image storage'),
    bullet('Calculate order totals including discount codes'),
    bullet('Initiate and verify Paymob payment transactions'),
    bullet('Broadcast real-time viewer counts via Socket.io'),
    bullet('Manage all CRUD operations for products, inventory, and content'),
    divider(),
  ];
}

// 3. DATA FLOW DIAGRAM
function dfdDiagram() {
  return [
    sectionBanner('3.  Data Flow Diagram'),
    spacer(200),
    h2('Level 0 — Top-Level Data Flows'),
    spacer(160),

    tbl([2800, 2000, 4560], [
      row(hdrCell('Process',2800), hdrCell('Data Store',2000), hdrCell('Key Flows',4560)),
      row(cell('P1: User Auth',2800,C.light,C.brand,true), cell('D1: users',2000), cell('Register/login → JWT token; Google token → user lookup/create',4560)),
      row(cell('P2: Candle Builder',2800,C.light,C.brand,true), cell('D2: cup_shapes, mold_shapes, colors, scents, candle_models',2000), cell('Customer selections → 3D preview; Confirm → custom_candles + cart_items + preview_image',4560)),
      row(cell('P3: Cart Management',2800,C.light,C.brand,true), cell('D3: carts, cart_items, custom_candles',2000), cell('Add/remove items ↔ cart; base64 snapshot stored in custom_candles.preview_image',4560)),
      row(cell('P4: Checkout',2800,C.light,C.brand,true), cell('D4: orders, order_items, discount_codes',2000), cell('Cart → order record; coupon validation → discount; stock decrement → prebuilt_candles',4560)),
      row(cell('P5: Payment',2800,C.light,C.brand,true), cell('D5: payments, orders',2000), cell('Checkout → Paymob API → iframe token; Paymob callback → HMAC verify → order status update',4560)),
      row(cell('P6: Admin Dashboard',2800,C.light,C.brand,true), cell('D6: all tables',2000), cell('Admin actions → CRUD on products/orders/inventory; Cloudinary upload → image_url stored',4560)),
      row(cell('P7: Real-time Viewers',2800,C.light,C.brand,true), cell('D7: in-memory (viewersCount, socketRooms)',2000), cell('Socket.io join/leave/disconnect events → viewer count → broadcast to product room',4560)),
      row(cell('P8: Showcase Card',2800,C.light,C.brand,true), cell('D8: showcase_designs',2000), cell('Admin creates design → stored; Homepage fetches active designs → MiniCandleViewer cycles with fade',4560)),
    ]),
    spacer(300),

    h2('Level 1 — Candle Builder Detail'),
    p('Expanded view of Process P2 (most complex flow):'),
    spacer(120),

    tbl([3200, 6160], [
      row(hdrCell('Step',3200), hdrCell('Data Flow',6160)),
      row(cell('P2.1 Load Assets',3200,C.cream), cell('Frontend → GET /cup-shapes, /mold-shapes, /colors, /scents, /admin/models → Database → JSON arrays returned',6160)),
      row(cell('P2.2 Select Shape',3200,C.cream), cell('Customer picks cup shape → sizes/colors parsed from cup_shapes.sizes (JSON) and cup_shapes.colors (JSON) → dropdowns populated',6160)),
      row(cell('P2.3 Live 3D Preview',3200,C.cream), cell('Selected options → CandlePreview3D props (cupColor, waxColor, layerColors, modelUrl) → Three.js updates mesh materials in real-time, no server call',6160)),
      row(cell('P2.4 Snapshot',3200,C.cream), cell('Customer clicks Confirm → canvas.toDataURL("image/png") → base64 string → sent as snapshot field in payload',6160)),
      row(cell('P2.5 Persist',3200,C.cream), cell('POST /cart/add → INSERT custom_candles (type, scent_id, cup_shape_id, cup_size ml, cup_color_id rgba, total_price, preview_image) → INSERT custom_candle_layers (one row per wax layer) → INSERT cart_items',6160)),
    ]),
    spacer(300),

    h2('Level 1 — Checkout & Payment Detail'),
    tbl([3200, 6160], [
      row(hdrCell('Step',3200), hdrCell('Data Flow',6160)),
      row(cell('P4.1 Validate Cart',3200,C.cream), cell('POST /checkout → SELECT cart_items → check prebuilt stock → if insufficient return 400 error',6160)),
      row(cell('P4.2 Apply Coupon',3200,C.cream), cell('POST /coupons/validate → discount_codes table → check expiry/uses/min-max order → return discount value + type',6160)),
      row(cell('P4.3 Create Order',3200,C.cream), cell('INSERT orders (user_id, total, status_id=1) → INSERT order_items snapshot → UPDATE prebuilt stock → DELETE cart_items',6160)),
      row(cell('P5.1 Initiate Payment',3200,C.cream), cell('POST /paymob/initiate → Paymob auth/tokens → Paymob ecommerce/orders → Paymob acceptance/payment_keys → return {paymentToken, iframeId}',6160)),
      row(cell('P5.2 Verify Callback',3200,C.cream), cell('POST /paymob/callback → HMAC-SHA512 verification over 18 fields → if success=true UPDATE orders SET status_id=2',6160)),
    ]),
    divider(),
  ];
}

// 4. ACTIVITY DIAGRAM
function activityDiagram() {
  return [
    sectionBanner('4.  Activity Diagram'),
    spacer(200),
    h2('Activity Flow — Custom Candle Order End-to-End'),
    spacer(160),

    // Column headers
    tbl([1600, 2800, 2800, 2160], [
      row(hdrCell('Phase',1600), hdrCell('Customer',2800), hdrCell('System',2800), hdrCell('External',2160)),

      row(cell('START',1600,C.dark,C.white,true,true),
          cell('Open GlowAroma website',2800,C.cream),
          cell('Serve React SPA from Vercel; load homepage',2800,C.light),
          cell('',2160)),

      row(cell('Auth',1600,C.brand,C.white,true,true),
          cell('Click Sign In → Enter email/password OR Google',2800,C.cream),
          cell('Validate credentials → Issue JWT → Store userId in localStorage',2800,C.light),
          cell('Google: verify access_token → return email+name',2160,C.cream)),

      row(cell('Browse',1600,C.brand,C.white,true,true),
          cell('Navigate to Create Your Own page',2800,C.cream),
          cell('GET /cup-shapes, /mold-shapes, /colors, /scents, /admin/models → populate dropdowns',2800,C.light),
          cell('',2160)),

      row(cell('Configure',1600,C.brand,C.white,true,true),
          cell('Select: cup shape → size → cup color → wax color → scent',2800,C.cream),
          cell('CandlePreview3D updates Three.js mesh materials in real-time (no API call)',2800,C.light),
          cell('',2160)),

      row(cell('[If mold]',1600,C.accent,C.white,false,true),
          cell('Select mold shape → assign color per layer',2800,C.cream),
          cell('layerColors array updates Three.js mold meshes by colorable_parts index',2800,C.light),
          cell('',2160)),

      row(cell('Confirm',1600,C.brand,C.white,true,true),
          cell('Click "Confirm Candle"',2800,C.cream),
          cell('Validate all fields → canvas.toDataURL() → POST /cart/add with snapshot',2800,C.light),
          cell('',2160)),

      row(cell('Cart',1600,C.brand,C.white,true,true),
          cell('Navigate to Cart → review items',2800,C.cream),
          cell('GET /cart/:userId → JOIN query returns name, wax_colors, scent, snapshot image',2800,C.light),
          cell('',2160)),

      row(cell('[Optional]',1600,C.accent,C.white,false,true),
          cell('Enter promo code',2800,C.cream),
          cell('POST /coupons/validate → check rules → return discount',2800,C.light),
          cell('',2160)),

      row(cell('Checkout',1600,C.brand,C.white,true,true),
          cell('Fill address form → click Pay Online',2800,C.cream),
          cell('POST /checkout → create order → POST /paymob/initiate → show iframe',2800,C.light),
          cell('Paymob: render payment iframe',2160,C.cream)),

      row(cell('Payment',1600,C.brand,C.white,true,true),
          cell('Enter card details in Paymob iframe',2800,C.cream),
          cell('Await Paymob callback → verify HMAC → UPDATE order status_id=2',2800,C.light),
          cell('Paymob: process card → POST callback to /paymob/callback',2160,C.cream)),

      row(cell('END',1600,C.green,C.white,true,true),
          cell('See order confirmation',2800,C.cream),
          cell('Return orderId → frontend shows success screen',2800,C.light),
          cell('',2160)),
    ]),
    spacer(300),

    h2('Activity Flow — Admin Order Management'),
    tbl([1800, 3200, 4360], [
      row(hdrCell('Step',1800), hdrCell('Admin Action',3200), hdrCell('System Response',4360)),
      row(cell('1',1800,C.cream), cell('Login with role 2 or 3',3200), cell('JWT issued → localStorage roleId set → redirect to /dashboard',4360)),
      row(cell('2',1800,C.cream), cell('View Orders tab',3200), cell('GET /admin/orders → display table with customer name, total, status badge',4360)),
      row(cell('3',1800,C.cream), cell('Click View on an order',3200), cell('GET /admin/orders/:id/items → show item names, quantities, details, prices',4360)),
      row(cell('4',1800,C.cream), cell('Select new status from dropdown',3200), cell('PUT /admin/orders/:id/status → UPDATE orders SET status_id',4360)),
      row(cell('5',1800,C.cream), cell('Customer sees updated status',3200), cell('GET /orders/user/:userId reflects new status in order history',4360)),
    ]),
    divider(),
  ];
}

// 5. CLASS DIAGRAM
function classDiagram() {
  return [
    sectionBanner('5.  Class Diagram'),
    spacer(200),
    h2('Domain Model — Core Entities & Relationships'),
    spacer(160),

    // User cluster
    h3('User & Auth Classes', C.blue),
    tbl([2000, 2400, 4960], [
      row(hdrCell('Class',2000), hdrCell('Attributes',2400), hdrCell('Methods / Behaviours',4960)),
      row(cell('User',2000,C.light,C.brand,true), cell('id, name, email, password_hash, role_id, phone, created_at',2400), cell('register(), login(), loginWithGoogle(), deleteAccount(), updateProfile()',4960)),
      row(cell('UserRole',2000,C.light,C.brand,true), cell('id, name (customer/admin/super admin)',2400), cell('isAdmin(), isSuperAdmin()',4960)),
      row(cell('UserAddress',2000,C.light,C.brand,true), cell('id, user_id, full_name, phone, governorate, area, street, building, floor_apt, notes',2400), cell('save(), update(), delete()',4960)),
    ]),
    spacer(200),

    h3('Product Classes', C.green),
    tbl([2000, 2800, 4560], [
      row(hdrCell('Class',2000), hdrCell('Attributes',2800), hdrCell('Methods / Behaviours',4560)),
      row(cell('PrebuiltCandle',2000,C.light,C.brand,true), cell('id, name, description, price, stock_quantity, image_url, is_active',2800), cell('getAll(), getById(), create(), update(), delete(), decrementStock(qty)',4560)),
      row(cell('CustomCandle',2000,C.light,C.brand,true), cell('id, type (cup/mold), scent_id, cup_shape_id, cup_size, cup_color_id, mold_shape_id, preview_image, total_price',2800), cell('create(), addLayer(), calculatePrice()',4560)),
      row(cell('CandleLayer',2000,C.light,C.brand,true), cell('id, custom_candle_id, color_id, layer_index',2800), cell('assignColor()',4560)),
      row(cell('WaxColor',2000,C.light,C.brand,true), cell('id, name, hex_code, price_modifier, is_available',2800), cell('softDelete()',4560)),
      row(cell('Scent',2000,C.light,C.brand,true), cell('id, name, price_modifier, is_available, scent_family_id',2800), cell('softDelete()',4560)),
      row(cell('CupShape',2000,C.light,C.brand,true), cell('id, name, price_modifier, model_url, is_available, sizes (JSON), colors (JSON)',2800), cell('getSizes(), getColors()',4560)),
      row(cell('MoldShape',2000,C.light,C.brand,true), cell('id, name, layers, price_modifier, model_url, is_available',2800), cell('getLayerCount()',4560)),
      row(cell('CandleModel',2000,C.light,C.brand,true), cell('id, name, type, model_url, thumbnail_url, flat_shading, layers, colorable_parts (JSON)',2800), cell('getColorableParts()',4560)),
    ]),
    spacer(200),

    h3('Cart & Order Classes', C.orange),
    tbl([2000, 2800, 4560], [
      row(hdrCell('Class',2000), hdrCell('Attributes',2800), hdrCell('Methods / Behaviours',4560)),
      row(cell('Cart',2000,C.light,C.brand,true), cell('id, user_id, created_at',2800), cell('getItems(), addItem(), removeItem(), clear()',4560)),
      row(cell('CartItem',2000,C.light,C.brand,true), cell('id, cart_id, custom_candle_id, prebuilt_candle_id, quantity',2800), cell('increaseQty(), decreaseQty()',4560)),
      row(cell('Order',2000,C.light,C.brand,true), cell('id, user_id, status_id, total, created_at',2800), cell('create(), updateStatus(), getItems()',4560)),
      row(cell('OrderItem',2000,C.light,C.brand,true), cell('id, order_id, item_type, item_name, unit_price, quantity, details',2800), cell('snapshot of purchase, read-only',4560)),
      row(cell('Payment',2000,C.light,C.brand,true), cell('id, order_id, amount, status_id',2800), cell('initiate(), verifyCallback(hmac)',4560)),
      row(cell('DiscountCode',2000,C.light,C.brand,true), cell('id, code, discount_type, discount_value, min/max_order_amount, max_uses, times_used, expires_at, is_active',2800), cell('validate(orderTotal), apply(), toggle(), incrementUsage()',4560)),
    ]),
    spacer(200),

    h3('Relationships'),
    tbl([2400, 1200, 2400, 3360], [
      row(hdrCell('Class A',2400), hdrCell('Cardinality',1200), hdrCell('Class B',2400), hdrCell('Notes',3360)),
      row(cell('User',2400,C.cream), cell('1 — 1',1200,C.light), cell('Cart',2400,C.cream), cell('One cart per user (UNIQUE constraint)',3360)),
      row(cell('Cart',2400,C.cream), cell('1 — N',1200,C.light), cell('CartItem',2400,C.cream), cell('Multiple items per cart',3360)),
      row(cell('CartItem',2400,C.cream), cell('0..1 — 1',1200,C.light), cell('CustomCandle',2400,C.cream), cell('Mutually exclusive with PrebuiltCandle',3360)),
      row(cell('CartItem',2400,C.cream), cell('0..1 — 1',1200,C.light), cell('PrebuiltCandle',2400,C.cream), cell('Mutually exclusive with CustomCandle',3360)),
      row(cell('CustomCandle',2400,C.cream), cell('1 — N',1200,C.light), cell('CandleLayer',2400,C.cream), cell('Cup = 1 layer, Mold = N layers',3360)),
      row(cell('User',2400,C.cream), cell('1 — N',1200,C.light), cell('Order',2400,C.cream), cell('Customer can have many orders',3360)),
      row(cell('Order',2400,C.cream), cell('1 — N',1200,C.light), cell('OrderItem',2400,C.cream), cell('Snapshot of items at purchase time',3360)),
      row(cell('Order',2400,C.cream), cell('1 — 1',1200,C.light), cell('Payment',2400,C.cream), cell('One payment record per order',3360)),
      row(cell('CupShape',2400,C.cream), cell('1 — N',1200,C.light), cell('CustomCandle',2400,C.cream), cell('Via cup_shape_id FK',3360)),
    ]),
    divider(),
  ];
}

// 6. STATE DIAGRAM
function stateDiagram() {
  return [
    sectionBanner('6.  State Diagram'),
    spacer(200),
    h2('Order Lifecycle States'),
    spacer(120),

    tbl([2000, 2000, 2000, 3360], [
      row(hdrCell('State',2000), hdrCell('status_id',2000), hdrCell('Triggered By',2000), hdrCell('Description',3360)),
      row(cell('● START',2000,C.dark,C.white,true), cell('—',2000), cell('Customer confirms cart',2000), cell('Order record does not exist yet',3360)),
      row(cell('Processing',2000,C.orange,C.white,true), cell('1',2000,C.cream), cell('POST /checkout success',2000), cell('Order inserted; stock decremented; cart cleared; awaiting payment',3360)),
      row(cell('Paid',2000,C.blue,C.white,true), cell('2',2000,C.cream), cell('Paymob callback (success=true)',2000), cell('HMAC verified; order updated; ready to ship',3360)),
      row(cell('Shipped',2000,C.teal,C.white,true), cell('2',2000,C.cream), cell('Admin updates status',2000), cell('Admin marks as shipped (same status_id 2 in current schema)',3360)),
      row(cell('Delivered',2000,C.green,C.white,true), cell('3',2000,C.cream), cell('Admin updates status',2000), cell('Confirmed delivery to customer',3360)),
      row(cell('Cancelled',2000,C.danger,C.white,true), cell('4',2000,C.cream), cell('Admin updates status',2000), cell('Order cancelled (stock not auto-restored)',3360)),
      row(cell('■ END',2000,C.dark,C.white,true), cell('—',2000), cell('Final state',2000), cell('Delivered or Cancelled — no further transitions',3360)),
    ]),
    spacer(300),

    h2('Custom Candle Builder States'),
    tbl([2000, 2800, 4560], [
      row(hdrCell('State',2000), hdrCell('Transition',2800), hdrCell('Notes',4560)),
      row(cell('Idle',2000,C.light,C.brand,true), cell('→ ShapeSelected (user picks cup/mold shape)',2800), cell('Default state when Create page loads; no model shown',4560)),
      row(cell('ShapeSelected',2000,C.light,C.brand,true), cell('→ Configuring (user sets colors/size/scent)',2800), cell('CandlePreview3D loads GLB model; Three.js scene initialised',4560)),
      row(cell('Configuring',2000,C.light,C.brand,true), cell('→ Configuring (each selection updates 3D live)',2800), cell('No API calls; mesh materials updated via useEffect',4560)),
      row(cell('Configuring',2000,C.light,C.brand,true), cell('→ Validating (user clicks Confirm)',2800), cell('All required fields must be non-default',4560)),
      row(cell('Validating',2000,C.light,C.brand,true), cell('→ Configuring (validation fails)',2800), cell('Warning toast shown; user must fix selections',4560)),
      row(cell('Validating',2000,C.light,C.brand,true), cell('→ Capturing (all valid)',2800), cell('canvas.toDataURL() called to capture snapshot',4560)),
      row(cell('Capturing',2000,C.light,C.brand,true), cell('→ Saving (snapshot ready)',2800), cell('POST /cart/add with all data + base64 snapshot',4560)),
      row(cell('Saving',2000,C.light,C.brand,true), cell('→ Success / Error',2800), cell('Server inserts custom_candles + layers + cart_items',4560)),
      row(cell('Success',2000,C.green,C.white,true), cell('→ Idle (form resets)',2800), cell('Success toast shown; all selections reset to default',4560)),
    ]),
    spacer(300),

    h2('User Authentication States'),
    tbl([2000, 2800, 4560], [
      row(hdrCell('State',2000), hdrCell('Transition',2800), hdrCell('Notes',4560)),
      row(cell('Unauthenticated',2000,C.light,C.brand,true), cell('→ Authenticating (login/signup attempt)',2800), cell('No userId in localStorage; restricted routes redirect to /signin',4560)),
      row(cell('Authenticating',2000,C.light,C.brand,true), cell('→ Authenticated (success)',2800), cell('JWT + userId + roleId stored in localStorage',4560)),
      row(cell('Authenticating',2000,C.light,C.brand,true), cell('→ Unauthenticated (failure)',2800), cell('Error toast shown; localStorage unchanged',4560)),
      row(cell('Authenticated',2000,C.light,C.brand,true), cell('→ Admin (role 2 or 3)',2800), cell('Dashboard and inventory routes accessible',4560)),
      row(cell('Authenticated',2000,C.light,C.brand,true), cell('→ Unauthenticated (logout/delete)',2800), cell('localStorage.clear() called',4560)),
    ]),
    divider(),
  ];
}

// 7. SEQUENCE DIAGRAM
function sequenceDiagram() {
  return [
    sectionBanner('7.  Sequence Diagrams'),
    spacer(200),
    h2('Sequence 1 — Custom Candle Add to Cart'),
    p('Participants: Customer Browser | React App | Express API | MySQL | Cloudinary (n/a for this flow)'),
    spacer(120),

    tbl([700, 2200, 2200, 2200, 2060], [
      row(hdrCell('#',700), hdrCell('Customer',2200), hdrCell('React App',2200), hdrCell('Express API',2200), hdrCell('MySQL',2060)),
      row(cell('1',700,C.cream), cell('Opens /create',2200), cell('Mounts Create.jsx → fetches builder assets',2200), cell('GET /cup-shapes, /colors, /scents etc.',2200), cell('Returns all config tables',2060)),
      row(cell('2',700,C.cream), cell('Selects options',2200), cell('Updates CandlePreview3D props → Three.js re-renders',2200), cell('(no API call — all client-side)',2200), cell('',2060)),
      row(cell('3',700,C.cream), cell('Clicks Confirm',2200), cell('Validates selections → canvas.toDataURL() → builds payload',2200), cell('',2200), cell('',2060)),
      row(cell('4',700,C.cream), cell('',2200), cell('POST /cart/add {type,userId,scentId,cupShapeId,cupSize,cupColor,candleColorId,snapshot,totalPrice}',2200), cell('Finds/creates cart → INSERT custom_candles',2200), cell('Returns insertId',2060)),
      row(cell('5',700,C.cream), cell('',2200), cell('',2200), cell('INSERT custom_candle_layers (one per layer)',2200), cell('Returns OK',2060)),
      row(cell('6',700,C.cream), cell('',2200), cell('',2200), cell('INSERT cart_items (cart_id, custom_candle_id)',2200), cell('Returns OK',2060)),
      row(cell('7',700,C.cream), cell('',2200), cell('Returns 200 {message: "New unique item added"}',2200), cell('',2200), cell('',2060)),
      row(cell('8',700,C.cream), cell('Sees success toast',2200), cell('Resets form to default state',2200), cell('',2200), cell('',2060)),
    ]),
    spacer(300),

    h2('Sequence 2 — Checkout & Paymob Payment'),
    p('Participants: Customer | React App | Express API | MySQL | Paymob API'),
    spacer(120),

    tbl([700, 1900, 2000, 2000, 2760], [
      row(hdrCell('#',700), hdrCell('Customer',1900), hdrCell('React App',2000), hdrCell('Express API',2000), hdrCell('MySQL / Paymob',2760)),
      row(cell('1',700,C.cream), cell('Fills address form',1900), cell('POST /checkout {userId, total, items, couponCode}',2000), cell('SELECT cart items → validate stock',2000), cell('SELECT cart_items JOIN custom_candles',2760)),
      row(cell('2',700,C.cream), cell('',1900), cell('',2000), cell('INSERT orders (status_id=1)',2000), cell('Returns new orderId',2760)),
      row(cell('3',700,C.cream), cell('',1900), cell('',2000), cell('INSERT order_items (snapshot of all items)',2000), cell('',2760)),
      row(cell('4',700,C.cream), cell('',1900), cell('',2000), cell('UPDATE prebuilt stock, DELETE cart_items',2000), cell('',2760)),
      row(cell('5',700,C.cream), cell('',1900), cell('Returns 201 {orderId}',2000), cell('',2000), cell('',2760)),
      row(cell('6',700,C.cream), cell('Clicks Pay Online',1900), cell('POST /paymob/initiate {amountCents, orderId, shippingDetails}',2000), cell('POST Paymob /auth/tokens → get authToken',2000), cell('Paymob: validates API key',2760)),
      row(cell('7',700,C.cream), cell('',1900), cell('',2000), cell('POST Paymob /ecommerce/orders → get paymobOrderId',2000), cell('Paymob: creates order',2760)),
      row(cell('8',700,C.cream), cell('',1900), cell('',2000), cell('POST Paymob /acceptance/payment_keys → get paymentToken',2000), cell('Paymob: returns token',2760)),
      row(cell('9',700,C.cream), cell('',1900), cell('Returns {paymentToken, iframeId}',2000), cell('',2000), cell('',2760)),
      row(cell('10',700,C.cream), cell('Enters card in iframe',1900), cell('Displays Paymob iframe',2000), cell('',2000), cell('Paymob: processes card',2760)),
      row(cell('11',700,C.cream), cell('',1900), cell('',2000), cell('POST /paymob/callback {obj, hmac}',2000), cell('Paymob → backend webhook',2760)),
      row(cell('12',700,C.cream), cell('',1900), cell('',2000), cell('Verify HMAC-SHA512 signature',2000), cell('',2760)),
      row(cell('13',700,C.cream), cell('',1900), cell('',2000), cell('UPDATE orders SET status_id=2',2000), cell('MySQL: order marked paid',2760)),
      row(cell('14',700,C.cream), cell('Sees confirmation page',1900), cell('Shows order success',2000), cell('',2000), cell('',2760)),
    ]),
    spacer(300),

    h2('Sequence 3 — Google OAuth Login'),
    p('Participants: Customer | React App | Google API | Express API | MySQL'),
    spacer(120),

    tbl([700, 1900, 2200, 2200, 2360], [
      row(hdrCell('#',700), hdrCell('Customer',1900), hdrCell('React App / Google',2200), hdrCell('Express API',2200), hdrCell('MySQL',2360)),
      row(cell('1',700,C.cream), cell('Clicks Google Sign-In',1900), cell('Google OAuth popup → user grants access',2200), cell('',2200), cell('',2360)),
      row(cell('2',700,C.cream), cell('',1900), cell('Receives access_token from Google',2200), cell('',2200), cell('',2360)),
      row(cell('3',700,C.cream), cell('',1900), cell('POST /auth/google {access_token}',2200), cell('GET google.com/userinfo with token',2200), cell('',2360)),
      row(cell('4',700,C.cream), cell('',1900), cell('',2200), cell('Receives {email, name} from Google',2200), cell('',2360)),
      row(cell('5',700,C.cream), cell('',1900), cell('',2200), cell('SELECT users WHERE email = ?',2200), cell('Returns user or empty',2360)),
      row(cell('6a',700,C.cream), cell('',1900), cell('',2200), cell('[User exists] → sign JWT → return token',2200), cell('',2360)),
      row(cell('6b',700,C.cream), cell('',1900), cell('',2200), cell('[New user] → bcrypt random password → INSERT users → sign JWT',2200), cell('INSERT users (name,email,hashed_password,role_id=1)',2360)),
      row(cell('7',700,C.cream), cell('',1900), cell('Store token,userId,roleId in localStorage',2200), cell('Returns {token, userId, userName, roleId}',2200), cell('',2360)),
      row(cell('8',700,C.cream), cell('Logged in, redirected to home',1900), cell('',2200), cell('',2200), cell('',2360)),
    ]),
    spacer(300),

    h2('Sequence 4 — Live Viewer Count (Socket.io)'),
    p('Participants: Browser A | Browser B | Express + Socket.io | In-Memory Store'),
    spacer(120),

    tbl([700, 2400, 2400, 3860], [
      row(hdrCell('#',700), hdrCell('Browser A',2400), hdrCell('Browser B',2400), hdrCell('Server (Socket.io + viewersCount)',3860)),
      row(cell('1',700,C.cream), cell('Opens /product/5 → new io() connection',2400), cell('',2400), cell('Socket connects; socketRooms[socketA] = undefined',3860)),
      row(cell('2',700,C.cream), cell('emit("join_product", "5")',2400), cell('',2400), cell('socket.join("5"); viewersCount["5"] = 1; emit update_viewers(1) to room',3860)),
      row(cell('3',700,C.cream), cell('Receives update_viewers(1) → setViewers(1) → badge hidden',2400), cell('',2400), cell('',3860)),
      row(cell('4',700,C.cream), cell('',2400), cell('Opens /product/5 → new io() connection',2400), cell('Socket connects',3860)),
      row(cell('5',700,C.cream), cell('',2400), cell('emit("join_product", "5")',2400), cell('socket.join("5"); viewersCount["5"] = 2; emit update_viewers(2) to room',3860)),
      row(cell('6',700,C.cream), cell('Receives update_viewers(2) → badge "2 viewing"',2400), cell('Receives update_viewers(2) → badge "2 viewing"',2400), cell('Both browsers in room "5" receive event',3860)),
      row(cell('7',700,C.cream), cell('Navigates away → emit("leave_product","5") → socket.disconnect()',2400), cell('',2400), cell('socketRooms cleanup; viewersCount["5"] = 1; emit update_viewers(1)',3860)),
      row(cell('8',700,C.cream), cell('',2400), cell('Receives update_viewers(1) → badge hidden',2400), cell('',3860)),
    ]),
    divider(),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLE DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '\u2022',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{ size:40, bold:true, font:'Arial', color: C.brand },
        paragraph:{ spacing:{ before:480, after:240 }, outlineLevel:0 } },
      { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{ size:28, bold:true, font:'Arial', color: C.brand },
        paragraph:{ spacing:{ before:320, after:160 }, outlineLevel:1 } },
      { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{ size:24, bold:true, font:'Arial', color: C.accent },
        paragraph:{ spacing:{ before:240, after:120 }, outlineLevel:2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 15840, height: 12240 }, // landscape A3-ish wide format
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom:{ style:BorderStyle.SINGLE, size:2, color: C.accent, space:1 } },
          children: [
            new TextRun({ text:'GlowAroma  ', bold:true, size:20, font:'Arial', color: C.brand }),
            new TextRun({ text:'— System Diagrams', size:20, font:'Arial', color: C.gray }),
            new TextRun({ text:'\t', size:20 }),
            new TextRun({ text:'May 2026', size:18, font:'Arial', color: C.gray, italics:true }),
          ],
          tabStops:[{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top:{ style:BorderStyle.SINGLE, size:2, color: C.accent, space:1 } },
          children: [
            new TextRun({ text:'Confidential  |  ', size:16, font:'Arial', color: C.gray }),
            new TextRun({ text:'\t', size:16 }),
            new TextRun({ text:'Page ', size:16, font:'Arial', color: C.gray }),
            new TextRun({ children: [PageNumber.CURRENT], size:16, font:'Arial', color: C.gray }),          ],
          tabStops:[{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
        })]
      })
    },
    children: [
      // Cover
      new Paragraph({ spacing:{before:2400,after:400}, alignment:AlignmentType.CENTER,
        children:[new TextRun({ text:'GlowAroma', bold:true, size:96, font:'Arial', color: C.brand })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:200},
        children:[new TextRun({ text:'System Design Diagrams', size:48, font:'Arial', color: C.accent })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:1200},
        children:[new TextRun({ text:'Use Case  ·  Context  ·  DFD  ·  Activity  ·  Class  ·  State  ·  Sequence', size:24, font:'Arial', color: C.gray, italics:true })] }),
      new Paragraph({ children:[new PageBreak()] }),

      ...useCaseDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...contextDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...dfdDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...activityDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...classDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...stateDiagram(),
      new Paragraph({ children:[new PageBreak()] }),
      ...sequenceDiagram(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('./GlowAroma_Diagrams.docx', buf);
  console.log('Done');
});