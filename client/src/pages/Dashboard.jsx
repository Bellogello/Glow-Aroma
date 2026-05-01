import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config';
import { useNotification } from '../components/NotificationContext';

const Dashboard = () => {
  useTitle("Dashboard");
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');

  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [showViewMessageDialog, setShowViewMessageDialog] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '', role_id: '2' });
  const [productForm, setProductForm] = useState({ name: '', price: '', stock_quantity: '', description: '', image: null });
  const [editProductForm, setEditProductForm] = useState({ id: '', name: '', price: '', stock_quantity: '', description: '', image_url: '', image: null });
  const [newStatusId, setNewStatusId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [discountForm, setDiscountForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_order_amount: '', max_uses: '', expires_at: '',
  });

  const [dialogError, setDialogError] = useState('');
  const [dialogSuccess, setDialogSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const uId = localStorage.getItem('userId');
    const roleId = localStorage.getItem('roleId');
    if (roleId !== '2' && roleId !== '3') { navigate('/'); return; }
    setIsAuthorized(true);
    setUserRole(roleId);
    setUserId(uId);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes, staffRes, discountRes, msgRes, modelRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/admin/orders`),
        fetch(`${API_BASE_URL}/admin/staff`),
        fetch(`${API_BASE_URL}/admin/discount-codes`),
        fetch(`${API_BASE_URL}/admin/messages`),
        fetch(`${API_BASE_URL}/admin/models`),
      ]);
      const [prodData, orderData, staffData, discountData, msgData, modelData] = await Promise.all([
        prodRes.json(), orderRes.json(), staffRes.json(), discountRes.json(), msgRes.json(), modelRes.json(),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setDiscountCodes(Array.isArray(discountData) ? discountData : []);
      setMessages(Array.isArray(msgData) ? msgData : []);
      setModels(Array.isArray(modelData) ? modelData : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      error("Failed to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const resetDialogState = () => { setDialogError(''); setDialogSuccess(''); setSubmitting(false); };
  const getStatusLabel = (s) => s === 1 ? 'Processing' : s === 2 ? 'Shipped' : 'Delivered';
  const getStatusBg = (s) => s === 1 ? 'warning' : s === 2 ? 'info' : 'success';

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          order.id.toString().includes(orderSearch);
    const matchesStatus = orderStatusFilter === 'All' || order.status_id.toString() === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // --- STAFF ---
  const handleOpenAddStaff = () => { setStaffForm({ name: '', email: '', phone: '', password: '', role_id: '2' }); resetDialogState(); setShowAddStaffDialog(true); };
  const handleAddStaff = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError(''); setDialogSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/add-staff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staffForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add staff member.');
      setDialogSuccess('Staff member added!');
      setStaff(prev => [...prev, data.newStaff]);
      setTimeout(() => setShowAddStaffDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleRemoveStaff = async (memberId) => {
    if (!window.confirm('Remove this admin?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/staff/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStaff(prev => prev.filter(m => m.id !== memberId));
      success("Admin removed.");
    } catch (err) { error(err.message); }
  };

  // --- PRODUCTS ---
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
      const res = await fetch(`${API_BASE_URL}/admin/products`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add product.');
      setDialogSuccess('Product added!');
      setProducts(prev => [...prev, data.newProduct]);
      setTimeout(() => setShowAddProductDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleOpenEditProduct = (product) => { setEditProductForm({ ...product, image: null }); resetDialogState(); setShowEditProductDialog(true); };
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
      const res = await fetch(`${API_BASE_URL}/admin/products/${editProductForm.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update product.');
      setDialogSuccess('Product updated!');
      setProducts(prev => prev.map(p => p.id === editProductForm.id ? { ...p, ...editProductForm, image_url: data.image_url } : p));
      setTimeout(() => setShowEditProductDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProducts(prev => prev.filter(p => p.id !== id));
      setShowEditProductDialog(false);
      success("Product deleted.");
    } catch (err) { error(err.message); }
  };

  // --- ORDERS ---
  const handleOpenOrderDialog = async (order) => {
    setSelectedOrder(order);
    setNewStatusId(order.status_id.toString());
    setSelectedOrderItems([]);
    setShowOrderDialog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${order.id}/items`);
      const data = await res.json();
      setSelectedOrderItems(Array.isArray(data) ? data : []);
    } catch { error("Could not load order items."); }
  };
  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError(''); setDialogSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: Number(newStatusId) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDialogSuccess('Status updated!');
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status_id: Number(newStatusId) } : o));
      setTimeout(() => setShowOrderDialog(false), 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };

  // --- DISCOUNT ---
  const handleOpenDeleteAccount = () => { setDeletePassword(''); resetDialogState(); setShowDeleteAccountDialog(true); };
  const handleDeleteAccount = async (e) => {
    e.preventDefault(); setSubmitting(true); setDialogError('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/delete-account`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, password: deletePassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      success('Account deleted. Logging out.');
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
    if (!code.trim() || !discount_value) { setDialogError('Code and value are required.'); return; }
    setSubmitting(true); setDialogError(''); setDialogSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/discount-codes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase(), discount_type, discount_value: Number(discount_value), min_order_amount: min_order_amount ? Number(min_order_amount) : null, max_order_amount: max_order_amount ? Number(max_order_amount) : null, max_uses: max_uses ? Number(max_uses) : null, expires_at: expires_at || null }) });
      if (!res.ok) throw new Error('Failed to create code.');
      setDialogSuccess('Code created!');
      fetchDashboardData();
      setTimeout(() => { setShowAddDiscountDialog(false); resetDialogState(); }, 1500);
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleToggleDiscount = async (id, currentActive) => {
    try {
      await fetch(`${API_BASE_URL}/admin/discount-codes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !currentActive }) });
      fetchDashboardData();
      success(currentActive ? "Code disabled." : "Code activated.");
    } catch { error("Failed to toggle code."); }
  };
  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Delete this code?')) return;
    try {
      await fetch(`${API_BASE_URL}/admin/discount-codes/${id}`, { method: 'DELETE' });
      fetchDashboardData();
      success("Code deleted.");
    } catch { error("Failed to delete."); }
  };
  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/messages/${id}`, { method: 'DELETE' });
      if (res.ok) { setMessages(prev => prev.filter(m => m.id !== id)); setShowViewMessageDialog(false); success("Message deleted."); }
      else error("Failed to delete.");
    } catch { error("Server error."); }
  };

  if (!isAuthorized) return null;

  return (
    <>
      <div className="home-container dashboard-bg">
        <Navbar />
        <div className="dashboard-container">

          {/* 1. ORDERS */}
          <div className="dashboard-card">
            <div className="card-header-flex"><h2>Recent Orders</h2></div>
            <div className="dashboard-controls-row mb-4">
              <Form.Control type="text" placeholder="Search by Order ID or Customer..." className="custom-input flex-grow-1" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              <Form.Select className="custom-input w-auto" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="1">Processing</option>
                <option value="2">Shipped</option>
                <option value="3">Delivered</option>
              </Form.Select>
            </div>
            {loading ? <p className="text-muted">Loading orders...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredOrders.length === 0
                      ? <tr><td colSpan="6" className="text-center text-muted py-4">No matching orders.</td></tr>
                      : filteredOrders.map(order => (
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
              <div className="d-flex gap-2">
                <Link to="/inventory" className="custom-pill-btn-small" style={{ textDecoration: 'none' }}>🧊 Manage Options</Link>
                <button className="custom-pill-btn-small" onClick={handleOpenAddProduct}>+ Add Product</button>
              </div>
            </div>
            <div className="dashboard-controls-row mb-4">
              <Form.Control type="text" placeholder="Search products..." className="custom-input" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            {loading ? <p className="text-muted">Loading inventory...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>ID</th><th>Product Name</th><th>Stock</th><th>Price</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredProducts.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-4">No matching products.</td></tr>
                      : filteredProducts.map(product => (
                        <tr key={product.id} className="table-row-hover">
                          <td>{product.id}</td>
                          <td>
                            {product.image_url && (
                              <img src={product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`}
                                alt={product.name} style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4, marginRight: 10 }} />
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

          {/* 3. 3D MODELS — quick overview, full management in /inventory */}
          <div className="dashboard-card">
            <div className="card-header-flex">
              <h2>🧊 3D Models</h2>
              <Link to="/inventory" className="custom-pill-btn-small" style={{ textDecoration: 'none' }}
                onClick={() => localStorage.setItem('inv_tab', 'models')}>
                Manage Models
              </Link>
            </div>
            {loading ? <p className="text-muted">Loading models...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Name</th><th>Type</th><th>Layers</th><th>Flat Shading</th><th>Status</th></tr></thead>
                  <tbody>
                    {models.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-4">No models uploaded yet. <Link to="/inventory">Upload one →</Link></td></tr>
                      : models.map(m => (
                        <tr key={m.id} className="table-row-hover">
                          <td>
                            {m.thumbnail_url && <img src={m.thumbnail_url} alt={m.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', marginRight: 8 }} />}
                            <strong>{m.name}</strong>
                          </td>
                          <td><Badge bg={m.type === 'cup' ? 'primary' : 'warning'} className="custom-badge">{m.type}</Badge></td>
                          <td>{m.layers || 1}</td>
                          <td>{m.flat_shading ? '✓ On' : '— Off'}</td>
                          <td><Badge bg={m.is_available ? 'success' : 'secondary'} className="custom-badge">{m.is_available ? 'Active' : 'Hidden'}</Badge></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* 4. PROMO CODES — Super Admin only */}
          {userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>Promo Codes</h2>
                <button className="custom-pill-btn-small" onClick={handleOpenAddDiscount}>+ New Code</button>
              </div>
              {loading ? <p className="text-muted">Loading codes...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min</th><th>Max</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {discountCodes.length === 0
                        ? <tr><td colSpan="9" className="text-center text-muted py-4">No codes found.</td></tr>
                        : discountCodes.map(dc => (
                          <tr key={dc.id} className="table-row-hover">
                            <td><strong>{dc.code}</strong></td>
                            <td>{dc.discount_type === 'percentage' ? '%' : 'L.E.'}</td>
                            <td>{dc.discount_type === 'percentage' ? `${dc.discount_value}%` : `${Number(dc.discount_value).toFixed(2)} L.E.`}</td>
                            <td>{dc.min_order_amount ? `${Number(dc.min_order_amount).toFixed(0)} L.E.` : '—'}</td>
                            <td>{dc.max_order_amount ? `${Number(dc.max_order_amount).toFixed(0)} L.E.` : '—'}</td>
                            <td>{dc.times_used ?? 0}{dc.max_uses ? ` / ${dc.max_uses}` : ' / ∞'}</td>
                            <td>{dc.expires_at ? new Date(dc.expires_at).toLocaleDateString() : '—'}</td>
                            <td><Badge bg={dc.is_active ? 'success' : 'secondary'} className="custom-badge">{dc.is_active ? 'Active' : 'Off'}</Badge></td>
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

          {/* 5. MESSAGES */}
          <div className="dashboard-card">
            <div className="card-header-flex"><h2>Customer Messages</h2></div>
            {loading ? <p className="text-muted">Loading messages...</p> : (
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead>
                  <tbody>
                    {messages.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-4">No messages.</td></tr>
                      : messages.map(msg => (
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

          {/* 6. ACCOUNT SETTINGS */}
          <div className="dashboard-card">
            <h2>Account Settings</h2>
            <p className="text-muted mt-3">Manage your personal admin profile and security.</p>
            <div style={{ padding: '2rem 0', color: '#a89f91' }}>Profile management features coming soon...</div>
          </div>

          {/* 7. STAFF — Super Admin only */}
          {userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>Staff Management</h2>
                <button className="custom-pill-btn-small" onClick={handleOpenAddStaff}>+ Add Admin</button>
              </div>
              {loading ? <p className="text-muted">Loading staff...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                    <tbody>
                      {staff.map(member => (
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

          {/* 8. DELETE ACCOUNT */}
          <div className="dashboard-card">
            <div className="card-header-flex"><h2 className="text-danger">Delete Account</h2></div>
            <p className="text-muted">Account deletion is permanent.</p>
            <div className="danger-zone-card mt-4">
              <div className="danger-text">
                <h5>Danger Zone</h5>
                <p>Permanently delete your admin account. This cannot be undone.</p>
              </div>
              <button className="btn-danger-pill" onClick={handleOpenDeleteAccount}>Delete My Account</button>
            </div>
          </div>

        </div>
        <Footer />
      </div>

      {/* ORDER DIALOG */}
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
                  <strong className="me-2">Status:</strong>
                  <Badge bg={getStatusBg(selectedOrder.status_id)} className="custom-badge fs-6">{getStatusLabel(selectedOrder.status_id)}</Badge>
                </div>
              </div>
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#fdfbf7', border: '1px solid #e0dcd3' }}>
                <h6 className="fw-bold mb-3" style={{ color: '#4a3728' }}>Order Items</h6>
                {selectedOrderItems.length === 0 ? <p className="text-muted small mb-0">No items found.</p> : (
                  <ul className="list-unstyled mb-0" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedOrderItems.map(item => (
                      <li key={item.id} className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                        <div>
                          <div><span className="fw-bold text-dark">{item.quantity}x</span> {item.item_name}
                            {item.item_type !== 'prebuilt' && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>Custom</span>}
                          </div>
                          {item.details && item.details !== 'Standard Pre-built' && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.85rem', marginLeft: '1.5rem' }}>
                              {item.details.split(', ').map((detail, i) => (
                                <div key={i}>{detail}</div>
                              ))}
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
                <Form.Select className="custom-input form-select" value={newStatusId} onChange={e => setNewStatusId(e.target.value)} required>
                  <option value="1">Processing</option>
                  <option value="2">Shipped</option>
                  <option value="3">Delivered</option>
                </Form.Select>
              </Form.Group>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowOrderDialog(false)}>Close</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save'}</button>
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
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Name</Form.Label><Form.Control type="text" className="custom-input" value={editProductForm.name} onChange={e => setEditProductForm({ ...editProductForm, name: e.target.value })} required /></Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Price (L.E.)</Form.Label><Form.Control type="number" className="custom-input" min="0" step="0.01" value={editProductForm.price} onChange={e => setEditProductForm({ ...editProductForm, price: e.target.value })} required /></Form.Group>
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Stock</Form.Label><Form.Control type="number" className="custom-input" min="0" value={editProductForm.stock_quantity} onChange={e => setEditProductForm({ ...editProductForm, stock_quantity: e.target.value.replace(/^0+(?=\d)/, '') })} required /></Form.Group>
              </div>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Description</Form.Label><Form.Control as="textarea" className="custom-input" rows={2} value={editProductForm.description || ''} onChange={e => setEditProductForm({ ...editProductForm, description: e.target.value })} /></Form.Group>
              <Form.Group className="mb-4"><Form.Label className="fw-semibold">Image <span className="text-muted fw-normal">(leave blank to keep current)</span></Form.Label><Form.Control type="file" accept="image/*" className="custom-input" onChange={e => setEditProductForm({ ...editProductForm, image: e.target.files[0] })} /></Form.Group>
              <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn-action-danger" onClick={() => handleDeleteProduct(editProductForm.id)}>Delete Product</button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-cancel" onClick={() => setShowEditProductDialog(false)}>Cancel</button>
                  <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save'}</button>
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
            <div className="dialog-header"><h3>Add New Admin</h3><button className="close-btn" onClick={() => setShowAddStaffDialog(false)}>&times;</button></div>
            <Form onSubmit={handleAddStaff}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Full Name</Form.Label><Form.Control type="text" className="custom-input" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} required /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Email</Form.Label><Form.Control type="email" className="custom-input" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} required /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Phone</Form.Label><Form.Control type="tel" className="custom-input" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Role</Form.Label><Form.Select className="custom-input form-select" value={staffForm.role_id} onChange={e => setStaffForm({ ...staffForm, role_id: e.target.value })} required><option value="2">Admin</option><option value="3">Super Admin</option></Form.Select></Form.Group>
              <Form.Group className="mb-4"><Form.Label className="fw-semibold">Password</Form.Label><Form.Control type="password" className="custom-input" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} required minLength={6} /></Form.Group>
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
            <div className="dialog-header"><h3>Add New Product</h3><button className="close-btn" onClick={() => setShowAddProductDialog(false)}>&times;</button></div>
            <Form onSubmit={handleAddProduct}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Name</Form.Label><Form.Control type="text" className="custom-input" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required /></Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Price (L.E.)</Form.Label><Form.Control type="number" className="custom-input" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required /></Form.Group>
                <Form.Group className="flex-fill"><Form.Label className="fw-semibold">Stock</Form.Label><Form.Control type="number" className="custom-input" min="0" value={productForm.stock_quantity} onChange={e => setProductForm({ ...productForm, stock_quantity: e.target.value })} required /></Form.Group>
              </div>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Description</Form.Label><Form.Control as="textarea" className="custom-input" rows={2} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} /></Form.Group>
              <Form.Group className="mb-4"><Form.Label className="fw-semibold">Image</Form.Label><Form.Control type="file" accept="image/*" className="custom-input" onChange={e => setProductForm({ ...productForm, image: e.target.files[0] })} /></Form.Group>
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
            <div className="dialog-header"><h3 className="text-danger">Delete Account</h3><button className="close-btn" onClick={() => setShowDeleteAccountDialog(false)}>&times;</button></div>
            <Form onSubmit={handleDeleteAccount}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              <Alert variant="warning" className="rounded-4 mb-4"><strong>Warning:</strong> This is permanent.</Alert>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Confirm Password</Form.Label><Form.Control type="password" className="custom-input" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required /></Form.Group>
              <div className="dialog-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowDeleteAccountDialog(false)}>Cancel</button>
                <button type="submit" className="btn-danger-pill" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Delete Permanently'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* PROMO CODE DIALOG */}
      {showAddDiscountDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Create Promo Code</h3><button className="close-btn" onClick={() => setShowAddDiscountDialog(false)}>&times;</button></div>
            <Form onSubmit={handleAddDiscountCode}>
              {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
              {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Code</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control type="text" className="custom-input" value={discountForm.code} onChange={e => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })} required />
                  <button type="button" className="btn-action" onClick={generateRandomCode}>Random</button>
                </div>
              </Form.Group>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Type</Form.Label><Form.Select className="custom-input form-select" value={discountForm.discount_type} onChange={e => setDiscountForm({ ...discountForm, discount_type: e.target.value })}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (L.E.)</option></Form.Select></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Value</Form.Label><Form.Control type="number" className="custom-input" min="0" value={discountForm.discount_value} onChange={e => setDiscountForm({ ...discountForm, discount_value: e.target.value })} required /></div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Min Order <span className="text-muted">(opt)</span></Form.Label><Form.Control type="number" className="custom-input" min="0" value={discountForm.min_order_amount} onChange={e => setDiscountForm({ ...discountForm, min_order_amount: e.target.value })} /></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Max Order <span className="text-muted">(opt)</span></Form.Label><Form.Control type="number" className="custom-input" min="0" value={discountForm.max_order_amount} onChange={e => setDiscountForm({ ...discountForm, max_order_amount: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Max Uses <span className="text-muted">(opt)</span></Form.Label><Form.Control type="number" className="custom-input" min="1" value={discountForm.max_uses} onChange={e => setDiscountForm({ ...discountForm, max_uses: e.target.value })} /></div>
                <div className="col-md-6 mb-3"><Form.Label className="fw-semibold">Expiry <span className="text-muted">(opt)</span></Form.Label><Form.Control type="date" className="custom-input" value={discountForm.expires_at} onChange={e => setDiscountForm({ ...discountForm, expires_at: e.target.value })} /></div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddDiscountDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Create'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* VIEW MESSAGE DIALOG */}
      {showViewMessageDialog && selectedMessage && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Message from {selectedMessage.name}</h3><button className="close-btn" onClick={() => setShowViewMessageDialog(false)}>&times;</button></div>
            <div className="p-2 mb-3">
              <p className="mb-1"><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p>
              <p className="mb-1"><strong>Phone:</strong> {selectedMessage.phone ? <a href={`tel:${selectedMessage.phone}`}>{selectedMessage.phone}</a> : <span className="text-muted">—</span>}</p>
              <p className="mb-3 text-muted" style={{ fontSize: '0.85rem' }}><strong>Received:</strong> {new Date(selectedMessage.created_at).toLocaleString()}</p>
              <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', border: '1px solid #e0dcd3' }}>{selectedMessage.message}</div>
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