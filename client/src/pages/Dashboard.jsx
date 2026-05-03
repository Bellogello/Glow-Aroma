import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
  const [activeTab, setActiveTab] = useState('overview');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  
  // Replaced models with heroImages
  const [heroImages, setHeroImages] = useState([]);

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
  
  // New Dialog for Hero Images
  const [showAddHeroDialog, setShowAddHeroDialog] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '', role_id: '2' });
  const [productForm, setProductForm] = useState({ name: '', price: '', stock_quantity: '', description: '', image: null });
  const [editProductForm, setEditProductForm] = useState({ id: '', name: '', price: '', stock_quantity: '', description: '', image_url: '', image: null });
  const [newStatusId, setNewStatusId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);

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
      const [prodRes, orderRes, staffRes, discountRes, msgRes, heroRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/admin/orders`),
        fetch(`${API_BASE_URL}/admin/staff`),
        fetch(`${API_BASE_URL}/admin/discount-codes`),
        fetch(`${API_BASE_URL}/admin/messages`),
        fetch(`${API_BASE_URL}/admin/hero-images`),
            ]);
      const [prodData, orderData, staffData, discountData, msgData, heroData] = await Promise.all([
        prodRes.json(), orderRes.json(), staffRes.json(), discountRes.json(), msgRes.json(), heroRes.json(),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setDiscountCodes(Array.isArray(discountData) ? discountData : []);
      setMessages(Array.isArray(msgData) ? msgData : []);
      setHeroImages(Array.isArray(heroData) ? heroData : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      error("Failed to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // --- STATS CALCULATIONS ---
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const processingOrders = orders.filter(o => o.status_id === 1).length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5).length;
  const unreadMessages = messages.length;

  // --- CHART DATA ---
  const revenueByDay = orders.reduce((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = acc.find(d => d.date === date);
    if (existing) existing.revenue += Number(order.total || 0);
    else acc.push({ date, revenue: Number(order.total || 0) });
    return acc;
  }, []).slice(-7);

  const ordersByStatus = [
    { name: 'Processing', count: orders.filter(o => o.status_id === 1).length, fill: '#f59e0b' },
    { name: 'Shipped', count: orders.filter(o => o.status_id === 2).length, fill: '#3b82f6' },
    { name: 'Delivered', count: orders.filter(o => o.status_id === 3).length, fill: '#10b981' },
  ];

  const resetDialogState = () => { setDialogError(''); setDialogSuccess(''); setSubmitting(false); };
  const getStatusLabel = (s) => s === 1 ? 'Processing' : s === 2 ? 'Shipped' : 'Delivered';
  const getStatusBg = (s) => s === 1 ? 'warning' : s === 2 ? 'info' : 'success';

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) || order.id.toString().includes(orderSearch);
    const matchesStatus = orderStatusFilter === 'All' || order.status_id.toString() === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()));

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

  // --- HERO IMAGES HANDLERS ---
  const handleAddHeroImage = async (e) => {
    e.preventDefault();
    if (!heroImageFile) return setDialogError('Please select an image file.');
    setSubmitting(true); setDialogError(''); setDialogSuccess('');
    
    const formData = new FormData();
    formData.append('image', heroImageFile);
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/hero-images`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image.');
      setDialogSuccess('Image added to slideshow!');
      setHeroImages(prev => [...prev, data.newImage]);
      setTimeout(() => { setShowAddHeroDialog(false); setHeroImageFile(null); }, 1500);
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHeroImage = async (id) => {
    if (!window.confirm('Remove this image from the homepage slideshow?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/hero-images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      setHeroImages(prev => prev.filter(img => img.id !== id));
      success('Image removed from slideshow.');
    } catch (err) {
      error(err.message);
    }
  };
  const handleToggleHeroImage = async (id, currentStatus) => {
    try {
      await fetch(`${API_BASE_URL}/admin/hero-images/${id}/toggle`, { method: 'PATCH' });
      setHeroImages(prev => prev.map(img => img.id === id ? { ...img, is_active: !currentStatus } : img));
      success(currentStatus ? 'Image hidden from homepage.' : 'Image added to homepage!');
    } catch (err) {
      error("Failed to toggle image status.");
    }
  };

  const handleMoveHeroImage = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= heroImages.length) return;
    
    // Swap locally for instant UI update
    const newOrder = [...heroImages];
    const temp = newOrder[index];
    newOrder[index] = newOrder[newIndex];
    newOrder[newIndex] = temp;
    setHeroImages(newOrder);

    // Save to backend
    try {
      const orderedIds = newOrder.map(img => img.id);
      await fetch(`${API_BASE_URL}/admin/hero-images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      error("Failed to save new order.");
    }
  };

  // --- ORDERS ---
  const handleOpenOrderDialog = async (order) => {
    setSelectedOrder(order);
    setNewStatusId(order.status_id.toString());
    setSelectedOrderItems([]);
    setShowOrderDialog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${order.id}`);
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

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'orders', label: '📦 Orders' },
    { id: 'products', label: '🕯️ Products' },
    { id: 'hero', label: '🖼️ Hero Images' }, // Replaced 'models' with 'hero'
    ...(userRole === '3' ? [{ id: 'promos', label: '🎟️ Promos' }] : []),
    { id: 'messages', label: '💬 Messages' },
    ...(userRole === '3' ? [{ id: 'staff', label: '👥 Staff' }] : []),
    { id: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <>
      <div className="home-container dashboard-bg">
        <Navbar />
        <div className="dashboard-container">

          {/* TAB NAV */}
          <div className="dash-tab-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`dash-tab ${activeTab === tab.id ? 'dash-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'messages' && unreadMessages > 0 && (
                  <span className="dash-tab-badge">{unreadMessages}</span>
                )}
                {tab.id === 'orders' && processingOrders > 0 && (
                  <span className="dash-tab-badge dash-tab-badge--amber">{processingOrders}</span>
                )}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <>
              {/* STAT CARDS */}
              <div className="stats-grid">
                <div className="stat-card stat-card--revenue">
                  <div className="stat-card__icon">💰</div>
                  <div className="stat-card__body">
                    <p className="stat-card__label">Total Revenue</p>
                    <h2 className="stat-card__value">{totalRevenue.toFixed(0)} <span>L.E.</span></h2>
                    <p className="stat-card__sub">{orders.length} orders total</p>
                  </div>
                </div>
                <div className="stat-card stat-card--orders">
                  <div className="stat-card__icon">📦</div>
                  <div className="stat-card__body">
                    <p className="stat-card__label">Processing</p>
                    <h2 className="stat-card__value">{processingOrders}</h2>
                    <p className="stat-card__sub">orders need attention</p>
                  </div>
                </div>
                <div className="stat-card stat-card--products">
                  <div className="stat-card__icon">🕯️</div>
                  <div className="stat-card__body">
                    <p className="stat-card__label">Products</p>
                    <h2 className="stat-card__value">{products.length}</h2>
                    <p className="stat-card__sub">{lowStockProducts > 0 ? <span className="text-warning">{lowStockProducts} low stock</span> : 'all stocked'}</p>
                  </div>
                </div>
                <div className="stat-card stat-card--messages">
                  <div className="stat-card__icon">💬</div>
                  <div className="stat-card__body">
                    <p className="stat-card__label">Messages</p>
                    <h2 className="stat-card__value">{unreadMessages}</h2>
                    <p className="stat-card__sub">customer messages</p>
                  </div>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="charts-grid">
                <div className="dashboard-card">
                  <div className="card-header-flex">
                    <h2>Revenue (Last 7 Days)</h2>
                  </div>
                  {revenueByDay.length === 0 ? (
                    <p className="text-muted text-center py-4">No revenue data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={revenueByDay}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4a3728" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#4a3728" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e0dcd3', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#4a3728" strokeWidth={2.5} fill="url(#revenueGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="dashboard-card">
                  <div className="card-header-flex">
                    <h2>Orders by Status</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ordersByStatus} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e0dcd3' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {ordersByStatus.map((entry, index) => (
                          <rect key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECENT ORDERS MINI */}
              <div className="dashboard-card">
                <div className="card-header-flex">
                  <h2>Recent Orders</h2>
                  <button className="custom-pill-btn-small" onClick={() => setActiveTab('orders')}>View All</button>
                </div>
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map(order => (
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
              </div>

              {/* LOW STOCK ALERT */}
              {lowStockProducts > 0 && (
                <div className="dashboard-card low-stock-card">
                  <div className="card-header-flex">
                    <h2>⚠️ Low Stock Alert</h2>
                    <button className="custom-pill-btn-small" onClick={() => setActiveTab('products')}>Manage Products</button>
                  </div>
                  <div className="table-scroll-wrapper">
                    <Table responsive className="custom-table borderless align-left-table mb-0">
                      <thead><tr><th>Product</th><th>Stock</th><th>Action</th></tr></thead>
                      <tbody>
                        {products.filter(p => p.stock_quantity <= 5).map(p => (
                          <tr key={p.id} className="table-row-hover">
                            <td><strong>{p.name}</strong></td>
                            <td><span className={p.stock_quantity === 0 ? 'badge bg-danger' : 'badge bg-warning text-dark'}>{p.stock_quantity === 0 ? 'Out of Stock' : `${p.stock_quantity} left`}</span></td>
                            <td><button className="btn-action" onClick={() => { handleOpenEditProduct(p); }}>Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== ORDERS TAB ===== */}
          {activeTab === 'orders' && (
            <div className="dashboard-card">
              <div className="card-header-flex"><h2>All Orders</h2></div>
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
          )}

          {/* ===== PRODUCTS TAB ===== */}
          {activeTab === 'products' && (
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
                            <td><span className={product.stock_quantity === 0 ? 'text-danger fw-bold' : product.stock_quantity <= 5 ? 'text-warning fw-bold' : ''}>{product.stock_quantity} units</span></td>
                            <td>{Number(product.price).toFixed(2)} L.E.</td>
                            <td><button className="btn-action" onClick={() => handleOpenEditProduct(product)}>Edit</button></td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ===== HERO IMAGES TAB ===== */}
          {activeTab === 'hero' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>🖼️ Homepage Slideshow Images</h2>
                <button className="custom-pill-btn-small" onClick={() => { setHeroImageFile(null); resetDialogState(); setShowAddHeroDialog(true); }}>
                  + Add Image
                </button>
              </div>
              {loading ? <p className="text-muted">Loading images...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead><tr><th>Order</th><th>Preview</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {heroImages.length === 0
                        ? <tr><td colSpan="4" className="text-center text-muted py-4">No hero images uploaded yet. The homepage will be blank until you add one!</td></tr>
                        : heroImages.map((img, index) => (
                          <tr key={img.id} className="table-row-hover">
                            <td style={{ width: '80px' }}>
                              <div className="d-flex flex-column gap-1 align-items-center" style={{ width: 'fit-content' }}>
                                <button className="btn-action" style={{ padding: '2px 8px' }} disabled={index === 0} onClick={() => handleMoveHeroImage(index, -1)}>▲</button>
                                <button className="btn-action" style={{ padding: '2px 8px' }} disabled={index === heroImages.length - 1} onClick={() => handleMoveHeroImage(index, 1)}>▼</button>
                              </div>
                            </td>
                            <td>
                              <img 
                                src={img.image_url.startsWith('http') ? img.image_url : `${API_BASE_URL}${img.image_url}`} 
                                alt="hero slide" 
                                style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0dcd3', opacity: img.is_active ? 1 : 0.4 }} 
                              />
                            </td>
                            <td>
                              <Badge bg={img.is_active ? 'success' : 'secondary'} className="custom-badge">
                                {img.is_active ? 'Active' : 'Hidden'}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button 
                                  className={img.is_active ? 'btn-action-danger' : 'btn-action'} 
                                  style={{ width: '70px' }}
                                  onClick={() => handleToggleHeroImage(img.id, img.is_active)}
                                >
                                  {img.is_active ? 'Hide' : 'Show'}
                                </button>
                                <button className="btn-action-danger" onClick={() => handleDeleteHeroImage(img.id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ===== PROMOS TAB ===== */}
          {activeTab === 'promos' && userRole === '3' && (
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

          {/* ===== MESSAGES TAB ===== */}
          {activeTab === 'messages' && (
            <div className="dashboard-card">
              <div className="card-header-flex"><h2>Customer Messages</h2></div>
              {loading ? <p className="text-muted">Loading messages...</p> : (
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless align-left-table mb-0">
                    <thead>
                      <tr><th>Date</th><th>Name</th><th>Email</th><th>Order Ref</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {messages.length === 0
                        ? <tr><td colSpan="5" className="text-center text-muted py-4">No messages.</td></tr>
                        : messages.map(msg => (
                          <tr key={msg.id} className="table-row-hover">
                            <td>{new Date(msg.created_at).toLocaleDateString()}</td>
                            <td><strong>{msg.name}</strong></td>
                            <td><a href={`mailto:${msg.email}`} className="text-decoration-none" style={{ color: '#c8a97e' }}>{msg.email}</a></td>
                            
                            {/* NEW: Show Order ID Badge if it exists */}
                            <td>
                              {msg.order_id 
                                ? <Badge bg="info" className="custom-badge">#{msg.order_id}</Badge> 
                                : <span className="text-muted">—</span>
                              }
                            </td>

                            <td><button className="btn-action" onClick={() => { setSelectedMessage(msg); setShowViewMessageDialog(true); }}>Read</button></td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ===== STAFF TAB ===== */}
          {activeTab === 'staff' && userRole === '3' && (
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

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="dashboard-card">
              <h2>Account Settings</h2>
              <p className="text-muted mt-3">Manage your personal admin profile and security.</p>
              <div style={{ padding: '2rem 0', color: '#a89f91' }}>Profile management features coming soon...</div>
              <div className="danger-zone-card mt-4">
                <div className="danger-text">
                  <h5>Danger Zone</h5>
                  <p>Permanently delete your admin account. This cannot be undone.</p>
                </div>
                <button className="btn-danger-pill" onClick={handleOpenDeleteAccount}>Delete My Account</button>
              </div>
            </div>
          )}

        </div>
        <Footer />
      </div>

      {/* --- ADD HERO IMAGE DIALOG --- */}
      {showAddHeroDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Upload Hero Image</h3>
              <button className="close-btn" onClick={() => setShowAddHeroDialog(false)}>&times;</button>
            </div>
            <Form onSubmit={handleAddHeroImage}>
              <div className="dialog-body-scroll">
                {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
                {dialogSuccess && <Alert variant="success" className="rounded-4">{dialogSuccess}</Alert>}
                
                <Form.Group className="mb-3">
                  <label className="form-label-enhanced">Image File (Recommended: 1920x1080)</label>
                  <Form.Control type="file" accept="image/*" className="custom-input" onChange={e => setHeroImageFile(e.target.files[0])} required />
                </Form.Group>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddHeroDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Upload'}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

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

              {/* --- UPDATED ORDER ITEMS SECTION --- */}
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#fdfbf7', border: '1px solid #e0dcd3' }}>
                <h6 className="fw-bold mb-3" style={{ color: '#4a3728' }}>Order Items</h6>
                {selectedOrderItems.length === 0 ? <p className="text-muted small mb-0">No items found.</p> : (
                  <ul className="list-unstyled mb-0" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                    {selectedOrderItems.map(item => (
                      <li key={item.order_item_id || item.id} className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                        <div>
                          
                          {/* Item Name & Custom Badge */}
                          <div>
                            <span className="fw-bold text-dark">{item.quantity}x</span> {item.item_name}
                            {item.item_type !== 'prebuilt' && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>Custom</span>}
                          </div>

                          {/* Typed-out Components (Scent, Layers, etc.) */}
                          {item.details && item.details !== 'Standard Pre-built' && item.details !== 'Standard' && (
                            <div className="text-muted mt-2" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                              <span className="fw-semibold" style={{ color: '#8c7e70', display: 'block', marginBottom: '2px' }}>Components:</span>
                              <div style={{ paddingLeft: '8px', borderLeft: '2px solid #e0dcd3' }}>
                                {item.details}
                              </div>
                            </div>
                          )}

                        </div>
                        
                        {/* Price */}
                        <span className="text-muted fw-semibold">
                          {(Number(item.unit_price) * item.quantity).toFixed(2)} L.E.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* --- END UPDATED ORDER ITEMS SECTION --- */}

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
              <div className="dialog-body-scroll">
                {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
                
                <Form.Group className="mb-3">
                  <label className="form-label-enhanced">Product Name</label>
                  <Form.Control type="text" className="custom-input" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required />
                </Form.Group>
                
                <div className="dialog-grid-2">
                  <Form.Group>
                    <label className="form-label-enhanced">Price (L.E.)</label>
                    <Form.Control type="number" className="custom-input" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required />
                  </Form.Group>
                  <Form.Group>
                    <label className="form-label-enhanced">Initial Stock</label>
                    <Form.Control type="number" className="custom-input" min="0" value={productForm.stock_quantity} onChange={e => setProductForm({ ...productForm, stock_quantity: e.target.value })} required />
                  </Form.Group>
                </div>
                
                <Form.Group className="mb-3">
                  <label className="form-label-enhanced">Description</label>
                  <Form.Control as="textarea" className="custom-input" rows={3} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                </Form.Group>
                
                <Form.Group className="mb-2">
                  <label className="form-label-enhanced">Product Image</label>
                  <Form.Control type="file" accept="image/*" className="custom-input" onChange={e => setProductForm({ ...productForm, image: e.target.files[0] })} />
                </Form.Group>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddProductDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save Product'}</button>
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
              <div className="dialog-body-scroll">
                {dialogError && <Alert variant="danger" className="rounded-4">{dialogError}</Alert>}
                
                <Form.Group className="mb-3">
                  <label className="form-label-enhanced">Promo Code</label>
                  <div className="input-group-flush">
                    <Form.Control type="text" className="custom-input" value={discountForm.code} onChange={e => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })} required />
                    <button type="button" className="btn-action" onClick={generateRandomCode}>Generate</button>
                  </div>
                </Form.Group>

                <div className="dialog-grid-2">
                  <Form.Group>
                    <label className="form-label-enhanced">Discount Type</label>
                    <Form.Select className="custom-input form-select" value={discountForm.discount_type} onChange={e => setDiscountForm({ ...discountForm, discount_type: e.target.value })}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (L.E.)</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <label className="form-label-enhanced">Value</label>
                    <Form.Control type="number" className="custom-input" min="0" value={discountForm.discount_value} onChange={e => setDiscountForm({ ...discountForm, discount_value: e.target.value })} required />
                  </Form.Group>
                </div>

                <div className="dialog-grid-2">
                  <Form.Group>
                    <label className="form-label-enhanced">Min Order (Opt)</label>
                    <Form.Control type="number" className="custom-input" min="0" placeholder="0.00" value={discountForm.min_order_amount} onChange={e => setDiscountForm({ ...discountForm, min_order_amount: e.target.value })} />
                  </Form.Group>
                  <Form.Group>
                    <label className="form-label-enhanced">Max Order (Opt)</label>
                    <Form.Control type="number" className="custom-input" min="0" placeholder="No limit" value={discountForm.max_order_amount} onChange={e => setDiscountForm({ ...discountForm, max_order_amount: e.target.value })} />
                  </Form.Group>
                </div>

                <div className="dialog-grid-2">
                  <Form.Group>
                    <label className="form-label-enhanced">Usage Limit (Opt)</label>
                    <Form.Control type="number" className="custom-input" min="1" placeholder="Unlimited" value={discountForm.max_uses} onChange={e => setDiscountForm({ ...discountForm, max_uses: e.target.value })} />
                  </Form.Group>
                  <Form.Group>
                    <label className="form-label-enhanced">Expiry Date (Opt)</label>
                    <Form.Control type="date" className="custom-input" value={discountForm.expires_at} onChange={e => setDiscountForm({ ...discountForm, expires_at: e.target.value })} />
                  </Form.Group>
                </div>
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
              <h3>Inbox</h3>
              <button className="close-btn" onClick={() => setShowViewMessageDialog(false)}>&times;</button>
            </div>
            
            <div className="message-read-header">
              <p><strong>From:</strong> {selectedMessage.name}</p>
              <p><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`} className="text-decoration-none" style={{ color: '#c8a97e' }}>{selectedMessage.email}</a></p>
              <p><strong>Phone:</strong> {selectedMessage.phone ? <a href={`tel:${selectedMessage.phone}`} className="text-decoration-none text-muted">{selectedMessage.phone}</a> : <span className="text-muted">Not provided</span>}</p>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Received: {new Date(selectedMessage.created_at).toLocaleString()}</p>
              
              {selectedMessage.order_id && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #c8a97e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#8c7e70', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Regarding Order</span>
                    <strong style={{ fontSize: '1.1rem', color: '#2d241c' }}>#{selectedMessage.order_id}</strong>
                  </div>
                  <button 
                    className="custom-pill-btn-small" 
                    style={{ margin: 0 }}
                    onClick={() => {
                      const linkedOrder = orders.find(o => o.id === selectedMessage.order_id);
                      if (linkedOrder) {
                        setShowViewMessageDialog(false);
                        handleOpenOrderDialog(linkedOrder);
                      } else {
                        error("Order details not found in current memory. It may be too old.");
                      }
                    }}
                  >
                    View Order Details →
                  </button>
                </div>
              )}
            </div>

            <div className="message-content-box">
              {selectedMessage.message}
            </div>

            <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn-action-danger" onClick={() => handleDeleteMessage(selectedMessage.id)}>Delete Message</button>
              <button className="btn btn-cancel" onClick={() => setShowViewMessageDialog(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;