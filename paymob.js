const axios = require('axios');
const crypto = require('crypto');

const BASE = 'https://accept.paymob.com/api';

// Step 1: Authenticate
async function getAuthToken() {
  const res = await axios.post(`${BASE}/auth/tokens`, {
    api_key: process.env.PAYMOB_API_KEY
  });
  return res.data.token;
}

// Step 2: Register order with Paymob
async function registerOrder(authToken, amountCents, orderId, items) {
  const res = await axios.post(`${BASE}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: 'EGP',
    merchant_order_id: orderId,
    items: items
  });
  return res.data.id; // paymob_order_id
}

// Step 3: Get payment key
async function getPaymentKey(authToken, paymobOrderId, amountCents, billingData) {
  const res = await axios.post(`${BASE}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: billingData,
    currency: 'EGP',
    integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID)
  });
  return res.data.token; // payment_token → goes to frontend
}

// Verify HMAC on Paymob's callback (security!)
function verifyHmac(data, receivedHmac) {
  const fields = [
    'amount_cents', 'created_at', 'currency', 'error_occured',
    'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
    'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
    'is_voided', 'order.id', /* ⬅️ CHANGED THIS FROM 'order' */ 
    'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 
    'source_data.type', 'success'
  ];

  const str = fields.map(f => {
    let val = f.split('.').reduce((obj, k) => obj?.[k], data);
    
    // Paymob strictly expects lowercase string representations of booleans
    if (val === true) return 'true';
    if (val === false) return 'false';
    
    return val ?? '';
  }).join('');

  const computed = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
    .update(str)
    .digest('hex');

  return computed === receivedHmac;
}

module.exports = { getAuthToken, registerOrder, getPaymentKey, verifyHmac };