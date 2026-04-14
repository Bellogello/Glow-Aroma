import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';

const Dashboard = () => {
  useTitle("Dashboard");
  const navigate = useNavigate();

  // --- AUTH & ROLES ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  // --- DATABASE STATES ---
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  // --- DIALOG VISIBILITY STATES ---
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [showViewMessageDialog, setShowViewMessageDialog] = useState(false);

  // --- SELECTED ITEM STATES ---
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // --- FORM STATES ---
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '', role_id: '2' });
  const [productForm, setProductForm] = useState({ name: '', price: '', stock_quantity: '', description: '', image: null });
  const [editProductForm, setEditProductForm] = useState({ id: '', name: '', price: '', stock_quantity: '', description: '', image_url: '', image: null });
  const [newStatusId, setNewStatusId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [discountForm, setDiscountForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_order_amount: '', max_uses: '', expires_at: '',
  });

  // --- FEEDBACK STATES ---
  const [dialogError, setDialogError] = useState('');
  const [dialogSuccess, setDialogSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // --- INITIALIZATION ---
  // ==========================================
  useEffect(() => {
    const uId = localStorage.getItem('userId');
    setIsAuthorized(true);
    setUserRole('3'); // Forcing Super Admin for testing
    setUserId(uId);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes, staffRes, discountRes, msgRes] = await Promise.all([
        fetch('${import.meta.env.VITE_API_URL}/products'),
        fetch('${import.meta.env.VITE_API_URL}/admin/orders'),
        fetch('${import.meta.env.VITE_API_URL}/admin/staff'),
        fetch('${import.meta.env.VITE_API_URL}/admin/discount-codes'),
        fetch('${import.meta.env.VITE_API_URL}/admin/messages'),
      ]);
      
      const [prodData, orderData, staffData, discountData, msgData] = await Promise.all([
        prodRes.json(), orderRes.json(), staffRes.json(), discountRes.json(), msgRes.json(),
      ]);
      
      setProducts(Array.isArray(prodData) ? prodData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setDiscountCodes(Array.isArray(discountData) ? discountData : []);
      setMessages(Array.isArray(msgData) ? msgData : []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDialogState = () => { setDialogError(''); setDialogSuccess(''); setSubmitting(false); };
  const getStatusLabel = (s) => s === 1 ? 'Processing' : s === 2 ? 'Shipped' : 'Delivered';
  const getStatusBg = (s) => s === 1 ? 'warning' : s === 2 ? 'info' : 'success';

  // ==========================================
  // --- STAFF FUNCTIONS ---
  // ==========================================
  const handleOpenAddStaff = () => { setStaffForm({ name: '', email: '', phone: '', password: '', role_id: '2' }); resetDialogState(); setShowAddStaffDialog(true); };
  const handleAddStaff = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError(''); setDialogSuccess('');
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/admin/add-staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staffForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add staff member.');
      setDialogSuccess('Staff member added successfully!');
      setStaff((prev) => [...prev, data.newStaff]);
      setTimeout(() => setShowAddStaffDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleRemoveStaff = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/staff/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove staff member.');
      setStaff((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  // ==========================================
  // --- PRODUCT FUNCTIONS ---
  // ==========================================
  const handleOpenAddProduct = () => { setProductForm({ name: '', price: '', stock_quantity: '', description: '', image: null }); resetDialogState(); setShowAddProductDialog(true); };
  const handleAddProduct = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError(''); setDialogSuccess('');
    const formData = new FormData();
    formData.append('name', productForm.name);
    formData.append('price', productForm.price);
    formData.append('stock_quantity', productForm.stock_quantity);
    formData.append('description', productForm.description);
    if (productForm.image) formData.append('image', productForm.image);

    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/admin/products', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add product.');
      setDialogSuccess('Product added successfully!');
      setProducts((prev) => [...prev, data.newProduct]);
      setTimeout(() => setShowAddProductDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };

  const handleOpenEditProduct = (product) => { 
    setEditProductForm({ ...product, image: null }); 
    resetDialogState(); 
    setShowEditProductDialog(true); 
  };
  const handleUpdateProduct = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError(''); setDialogSuccess('');
    const formData = new FormData();
    formData.append('name', editProductForm.name);
    formData.append('price', editProductForm.price);
    formData.append('stock_quantity', editProductForm.stock_quantity);
    formData.append('description', editProductForm.description);
    formData.append('existing_image_url', editProductForm.image_url || ''); 
    if (editProductForm.image) formData.append('image', editProductForm.image);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/products/${editProductForm.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update product.');
      setDialogSuccess('Product updated successfully!');
      setProducts((prev) => prev.map((p) => (p.id === editProductForm.id ? { ...p, ...editProductForm, image_url: data.image_url } : p)));
      setTimeout(() => setShowEditProductDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to completely remove this product?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete product.');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setShowEditProductDialog(false);
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  // ==========================================
  // --- ORDER FUNCTIONS ---
  // ==========================================
  const handleOpenOrderDialog = async (order) => { 
    setSelectedOrder(order); 
    setNewStatusId(String(order.status_id)); 
    resetDialogState(); 
    setSelectedOrderItems([]); 
    setShowOrderDialog(true); 

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/${order.id}/items`);
      const data = await res.json();
      if (!data.error) setSelectedOrderItems(data);
    } catch (err) {
      console.error("Failed to load order items", err);
    }
  };

  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault(); 
    setSubmitting(true); 
    setDialogError(''); 
    setDialogSuccess('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/${selectedOrder.id}/status`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status_id: Number(newStatusId) }) 
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to update order status.');
      
      setDialogSuccess('Order status updated!');
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? { ...o, status_id: Number(newStatusId) } : o)));
      
      setTimeout(() => setShowOrderDialog(false), 1500);
    } catch (err) { 
      setDialogError(err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  // ==========================================
  // --- ACCOUNT & DISCOUNT FUNCTIONS ---
  // ==========================================
  const handleOpenDeleteAccount = () => { setDeletePassword(''); resetDialogState(); setShowDeleteAccountDialog(true); };
  const handleDeleteAccount = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/delete-account`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, password: deletePassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete account.');
      alert('Account successfully deleted. You will now be logged out.');
      localStorage.clear();
      navigate('/');
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };

  const handleOpenAddDiscount = () => { setDiscountForm({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_order_amount: '', max_uses: '', expires_at: '' }); resetDialogState(); setShowAddDiscountDialog(true); };
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'GLOW-';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setDiscountForm({ ...discountForm, code: result });
  };
  const handleAddDiscountCode = async (e) => {
    e.preventDefault();
    const { code, discount_type, discount_value, min_order_amount, max_order_amount, max_uses, expires_at } = discountForm;
    if (!code.trim() || !discount_value) { setDialogError('Code and discount value are required.'); return; }
    setSubmitting(true); setDialogError(''); setDialogSuccess('');
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/admin/discount-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase(), discount_type, discount_value: Number(discount_value), min_order_amount: min_order_amount ? Number(min_order_amount) : null, max_order_amount: max_order_amount ? Number(max_order_amount) : null, max_uses: max_uses ? Number(max_uses) : null, expires_at: expires_at || null }) });
      if (!res.ok) throw new Error('Failed to create discount code.');
      setDialogSuccess('Discount code created successfully!');
      fetchDashboardData();
      setTimeout(() => { setShowAddDiscountDialog(false); resetDialogState(); }, 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleToggleDiscount = async (id, currentActive) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/discount-codes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !currentActive }) });
      fetchDashboardData();
    } catch (err) { console.error(err.message); }
  };
  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Delete this code permanently?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/discount-codes/${id}`, { method: 'DELETE' });
      fetchDashboardData();
    } catch (err) { console.error(err.message); }
  };
  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/messages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setShowViewMessageDialog(false);
      }
    } catch (err) { console.error(err.message); }
  };

  if (!isAuthorized) return null;

  // ==========================================
  // --- MAIN RENDER ---
  // ==========================================
  return (
    <>
      <div className="home-container dashboard-bg">
        <Navbar />
        <div className="dashboard-container">

          {/* 1. ORDERS */}
          <div className="dashboard-card">
            <div className="card-header-flex"><h2>Recent Orders</h2></div>
            {loading ? <p className="text-muted">Loading orders...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {orders.length === 0
                      ? <tr><td colSpan="6" className="text-center text-muted py-4">No orders found.</td></tr>
                      : orders.map((order) => (
                        <tr key={order.id} className="table-row-hover">
                          <td><strong>#{order.id}</strong></td>
                          <td>{order.customer_name}</td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{Number(order.total).toFixed(2)} L.E.</td>
                          <td><Badge bg={getStatusBg(order.status_id)} className="custom-badge">{getStatusLabel(order.status_id)}</Badge></td>
                          <td><button className="btn-action" onClick={() => handleOpenOrderDialog(order)}>View</button></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* 2. PRODUCTS */}
          <div className="dashboard-card">
            <div className="card-header-flex">
              <h2>Products Inventory</h2>
              <button className="custom-pill-btn-small" onClick={handleOpenAddProduct}>+ Add Product</button>
            </div>
            {loading ? <p className="text-muted">Loading inventory...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>ID</th><th>Product Name</th><th>Stock Level</th><th>Price</th><th>Action</th></tr></thead>
                  <tbody>
                    {products.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-4">No products found.</td></tr>
                      : products.map((product) => (
                        <tr key={product.id} className="table-row-hover">
                          <td>{product.id}</td>
                          <td>
                            {product.image_url && (
                              <img src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL}${product.image_url}`} alt={product.name} style={{width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px'}} />
                            )}
                            <strong>{product.name}</strong>
                          </td>
                          <td><span className={product.stock_quantity === 0 ? 'text-danger fw-bold' : ''}>{product.stock_quantity} units</span></td>
                          <td>{Number(product.price).toFixed(2)} L.E.</td>
                          <td><button className="btn-action" onClick={() => handleOpenEditProduct(product)}>Edit</button></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* 3. PROMO CODES */}
          {userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>Promo Codes</h2>
                <button className="custom-pill-btn-small" onClick={handleOpenAddDiscount}>+ New Code</button>
              </div>
              {loading ? <p className="text-muted">Loading codes...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min. Order</th><th>Max Order</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {discountCodes.length === 0
                        ? <tr><td colSpan="9" className="text-center text-muted py-4">No codes found.</td></tr>
                        : discountCodes.map((dc) => (
                          <tr key={dc.id} className="table-row-hover">
                            <td><strong>{dc.code}</strong></td>
                            <td>{dc.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                            <td>{dc.discount_type === 'percentage' ? `${dc.discount_value}%` : `${Number(dc.discount_value).toFixed(2)} L.E.`}</td>
                            <td>{dc.min_order_amount ? `${Number(dc.min_order_amount).toFixed(2)} L.E.` : '—'}</td>
                            <td>{dc.max_order_amount ? `${Number(dc.max_order_amount).toFixed(2)} L.E.` : '—'}</td>
                            <td>{dc.times_used ?? 0}{dc.max_uses ? ` / ${dc.max_uses}` : ' / ∞'}</td>
                            <td>{dc.expires_at ? new Date(dc.expires_at).toLocaleDateString() : '—'}</td>
                            <td><Badge bg={dc.is_active ? 'success' : 'secondary'} className="custom-badge">{dc.is_active ? 'Active' : 'Inactive'}</Badge></td>
                            <td className="d-flex gap-2">
                              <button className={dc.is_active ? 'btn-action-danger' : 'btn-action'} onClick={() => handleToggleDiscount(dc.id, dc.is_active)}>{dc.is_active ? 'Disable' : 'Enable'}</button>
                              <button className="btn-action-danger" onClick={() => handleDeleteDiscount(dc.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* 4. CUSTOMER MESSAGES */}
          <div className="dashboard-card">
            <div className="card-header-flex">
              <h2>Customer Messages</h2>
            </div>
            {loading ? <p className="text-muted">Loading messages...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead>
                  <tbody>
                    {messages.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-4">No messages found.</td></tr>
                      : messages.map((msg) => (
                        <tr key={msg.id} className="table-row-hover">
                          <td>{new Date(msg.created_at).toLocaleDateString()}</td>
                          <td><strong>{msg.name}</strong></td>
                          <td><a href={`mailto:${msg.email}`} className="text-decoration-none">{msg.email}</a></td>
                          <td>{msg.phone ? <a href={`tel:${msg.phone}`} className="text-decoration-none text-muted">{msg.phone}</a> : <span className="text-muted">—</span>}</td>
                          <td><button className="btn-action" onClick={() => { setSelectedMessage(msg); setShowViewMessageDialog(true); }}>Read</button></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* 5. ACCOUNT SETTINGS */}
          <div className="dashboard-card">
            <h2>Account Settings</h2>
            <p className="text-muted mt-3">Manage your personal admin profile and security.</p>
            <div style={{ padding: '2rem 0', color: '#a89f91' }}>Profile management features coming soon...</div>
          </div>

          {/* 6. STAFF */}
          {userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>Staff Management</h2>
                <button className="custom-pill-btn-small" onClick={handleOpenAddStaff}>+ Add New Admin</button>
              </div>
              <p className="text-muted">Manage your admin team below.</p>
              {loading ? <p className="text-muted">Loading staff...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} className="table-row-hover">
                          <td>{member.id}</td>
                          <td><strong>{member.name}</strong></td>
                          <td>{member.email}</td>
                          <td><Badge bg={member.role_id === 3 ? 'danger' : 'primary'} className="custom-badge">{member.role_id === 3 ? 'Super Admin' : 'Admin'}</Badge></td>
                          <td>{member.role_id !== 3 && <button className="btn-action-danger" onClick={() => handleRemoveStaff(member.id)}>Remove</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* 7. DELETE ACCOUNT */}
          <div className="dashboard-card">
            <div className="card-header-flex"><h2 className="text-danger">Delete Account</h2></div>
            <p className="text-muted">Account deletion is permanent. Proceed with caution.</p>
            <div className="danger-zone-card mt-4">
              <div className="danger-text">
                <h5>Danger Zone</h5>
                <p>Permanently delete your admin account. This action cannot be undone.</p>
              </div>
              <button className="btn-danger-pill" onClick={handleOpenDeleteAccount}>Delete My Account</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* ========================================== */}
      {/* DIALOGS */}
      {/* ========================================== */}

      {/* VIEW ORDER DIALOG (WITH RECEIPT) */}
      {showOrderDialog && selectedOrder && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Order #{selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setShowOrderDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleUpdateOrderStatus}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              
              <div className="order-details-box mb-3">
                <p className="mb-2"><strong>Customer:</strong> <span className="text-muted">{selectedOrder.customer_name}</span></p>
                <p className="mb-2"><strong>Date:</strong> <span className="text-muted">{new Date(selectedOrder.created_at).toLocaleDateString()}</span></p>
                <p className="mb-2"><strong>Total:</strong> <span className="fw-bold text-success">{Number(selectedOrder.total).toFixed(2)} L.E.</span></p>
                
                <div className="d-flex align-items-center mt-3">
                  <strong className="me-2">Current Status:</strong>
                  <Badge bg={getStatusBg(selectedOrder.status_id)} className="custom-badge fs-6">{getStatusLabel(selectedOrder.status_id)}</Badge>
                </div>
              </div>

              {/* THE ITEMIZED RECEIPT */}
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#fdfbf7', border: '1px solid #e0dcd3' }}>
                <h6 className="fw-bold mb-3" style={{ color: '#4a3728' }}>Order Items</h6>
                {selectedOrderItems.length === 0 ? (
                  <p className="text-muted small mb-0">No items found for this order.</p>
                ) : (
                  <ul className="list-unstyled mb-0" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                    {selectedOrderItems.map(item => (
                      <li key={item.id} className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                        <div>
                          <div>
                            <span className="fw-bold text-dark">{item.quantity}x</span> {item.item_name}
                            {item.item_type !== 'prebuilt' && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem'}}>Custom</span>}
                          </div>
                          
                          {/* THE NEW RECEIPT DETAILS FOR CUSTOM CANDLES */}
                          {item.details && item.details !== 'Standard Pre-built' && item.details !== 'See order details' && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.85rem', marginLeft: '1.5rem', lineHeight: '1.4' }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                        <span className="text-muted fw-semibold">{(Number(item.unit_price) * item.quantity).toFixed(2)} L.E.</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Update Status</Form.Label>
                <Form.Select className="custom-input form-select" value={newStatusId} onChange={(e) => setNewStatusId(e.target.value)} required>
                  <option value="1">Processing</option>
                  <option value="2">Shipped</option>
                  <option value="3">Delivered</option>
                </Form.Select>
              </Form.Group>
              
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowOrderDialog(false)}>Close</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save Changes'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT DIALOG */}
      {showEditProductDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Edit Product</h3>
              <button className="close-btn" onClick={() => setShowEditProductDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleUpdateProduct}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Product Name</Form.Label>
                <Form.Control type="text" className="custom-input" placeholder="e.g. Lavender Bliss" value={editProductForm.name} onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })} required />
              </Form.Group>
              
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-semibold">Price (L.E.)</Form.Label>
                  <Form.Control type="number" className="custom-input" placeholder="0.00" min="0" step="0.01" value={editProductForm.price} onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })} required />
                </Form.Group>
                
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-semibold">Stock Quantity</Form.Label>
                  <Form.Control 
                    type="number" 
                    className="custom-input" 
                    placeholder="0" 
                    min="0" 
                    value={editProductForm.stock_quantity} 
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/^0+(?=\d)/, '');
                      setEditProductForm({ ...editProductForm, stock_quantity: cleanValue });
                    }} 
                    required 
                  />
                </Form.Group>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Description</Form.Label>
                <Form.Control as="textarea" className="custom-input" rows={2} placeholder="Describe the product..." value={editProductForm.description || ''} onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })} />
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Update Image <span className="text-muted fw-normal">(Leave blank to keep current)</span></Form.Label>
                <Form.Control type="file" accept="image/*" className="custom-input" onChange={(e) => setEditProductForm({ ...editProductForm, image: e.target.files[0] })} />
              </Form.Group>
              
              <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn-action-danger" onClick={() => handleDeleteProduct(editProductForm.id)}>Delete Product</button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-cancel" onClick={() => setShowEditProductDialog(false)}>Cancel</button>
                  <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save Changes'}</button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* ADD STAFF DIALOG */}
      {showAddStaffDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Add New Admin</h3>
              <button className="close-btn" onClick={() => setShowAddStaffDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleAddStaff}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Full Name</Form.Label><Form.Control type="text" className="custom-input" placeholder="Enter full name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Email Address</Form.Label><Form.Control type="email" className="custom-input" placeholder="Enter email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Phone Number</Form.Label><Form.Control type="tel" className="custom-input" placeholder="Enter phone number" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Assign Role</Form.Label><Form.Select className="custom-input form-select" value={staffForm.role_id} onChange={(e) => setStaffForm({ ...staffForm, role_id: e.target.value })} required><option value="2">Admin (Manage Orders & Products)</option><option value="3">Super Admin (Full Access)</option></Form.Select></Form.Group>
              <Form.Group className="mb-4"><Form.Label className="fw-semibold">Password</Form.Label><Form.Control type="password" className="custom-input" placeholder="Set a temporary password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required minLength={6} /></Form.Group>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddStaffDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Add Admin'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT DIALOG */}
      {showAddProductDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Add New Product</h3>
              <button className="close-btn" onClick={() => setShowAddProductDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleAddProduct}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Product Name</Form.Label><Form.Control type="text" className="custom-input" placeholder="e.g. Lavender Bliss" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required /></Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Price (L.E.)</Form.Label><Form.Control type="number" className="custom-input" placeholder="0.00" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required /></Form.Group>
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Stock Quantity</Form.Label><Form.Control type="number" className="custom-input" placeholder="0" min="0" value={productForm.stock_quantity} onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })} required /></Form.Group>
              </div>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Description</Form.Label><Form.Control as="textarea" className="custom-input" rows={2} placeholder="Describe the product..." value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Upload Product Image</Form.Label>
                <Form.Control type="file" accept="image/*" className="custom-input" onChange={(e) => setProductForm({ ...productForm, image: e.target.files[0] })} />
              </Form.Group>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddProductDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Add Product'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT DIALOG */}
      {showDeleteAccountDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ borderTop: '6px solid #dc3545' }}>
            <div className="dialog-header">
              <h3 className="text-danger">Delete Account</h3>
              <button className="close-btn" onClick={() => setShowDeleteAccountDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleDeleteAccount}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              <Alert variant="warning" className="rounded-4 mb-4"><strong>Warning:</strong> This action is permanent and cannot be undone.</Alert>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Confirm Password</Form.Label><Form.Control type="password" className="custom-input" placeholder="Enter your password to confirm" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required /></Form.Group>
              <div className="dialog-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowDeleteAccountDialog(false)}>Cancel</button>
                <button type="submit" className="btn-danger-pill" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Permanently Delete'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* PROMO CODE DIALOG */}
      {showAddDiscountDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Create Promo Code</h3>
              <button className="close-btn" onClick={() => setShowAddDiscountDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleAddDiscountCode}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Discount Code</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control type="text" className="custom-input" placeholder="e.g. GLOW10" value={discountForm.code} onChange={e => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })} required />
                  <button type="button" className="btn-action" onClick={generateRandomCode}>Random</button>
                </div>
              </Form.Group>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Type</Form.Label><Form.Select className="custom-input form-select" value={discountForm.discount_type} onChange={e => setDiscountForm({ ...discountForm, discount_type: e.target.value })}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (L.E.)</option></Form.Select></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Value</Form.Label><Form.Control type="number" className="custom-input" placeholder="e.g. 15" min="0" value={discountForm.discount_value} onChange={e => setDiscountForm({ ...discountForm, discount_value: e.target.value })} required /></div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Min. Order (L.E.) <span className="text-muted">(optional)</span></Form.Label><Form.Control type="number" className="custom-input" placeholder="e.g. 200" min="0" value={discountForm.min_order_amount} onChange={e => setDiscountForm({ ...discountForm, min_order_amount: e.target.value })} /></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Max Order (L.E.) <span className="text-muted">(optional)</span></Form.Label><Form.Control type="number" className="custom-input" placeholder="e.g. 1000" min="0" value={discountForm.max_order_amount} onChange={e => setDiscountForm({ ...discountForm, max_order_amount: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Max Uses <span className="text-muted">(optional)</span></Form.Label><Form.Control type="number" className="custom-input" placeholder="∞" min="1" value={discountForm.max_uses} onChange={e => setDiscountForm({ ...discountForm, max_uses: e.target.value })} /></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Expiry Date <span className="text-muted">(optional)</span></Form.Label><Form.Control type="date" className="custom-input" value={discountForm.expires_at} onChange={e => setDiscountForm({ ...discountForm, expires_at: e.target.value })} /></div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddDiscountDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Create Code'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* VIEW MESSAGE DIALOG */}
      {showViewMessageDialog && selectedMessage && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Message from {selectedMessage.name}</h3>
              <button className="close-btn" onClick={() => setShowViewMessageDialog(false)}>&times;</button>
            </div>
            <div className="p-2 mb-3">
              <p className="mb-1"><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p>
              <p className="mb-1"><strong>Phone:</strong> {selectedMessage.phone ? <a href={`tel:${selectedMessage.phone}`}>{selectedMessage.phone}</a> : <span className="text-muted">Not provided</span>}</p>
              <p className="mb-3 text-muted" style={{ fontSize: '0.85rem' }}>
                <strong>Received:</strong> {new Date(selectedMessage.created_at).toLocaleString()}
              </p>
              <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #e0dcd3' }}>
                {selectedMessage.message}
              </div>
            </div>
            <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn-action-danger" onClick={() => handleDeleteMessage(selectedMessage.id)}>Delete</button>
              <button className="btn btn-cancel" onClick={() => setShowViewMessageDialog(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      
    </>
  );
};

export default Dashboard;