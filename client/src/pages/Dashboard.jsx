import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';
import '../styles/create.css'; // INJECTED CREATOR CSS HERE
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config';
import { useNotification } from '../components/NotificationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import CandlePreview3D from '../components/CandlePreview3D';

const Dashboard = () => {
  usePushNotifications(isAuthorized);
  
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
  const [heroImages, setHeroImages] = useState([]);
  const [showcaseDesigns, setShowcaseDesigns] = useState([]);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');

  // Dialog Controls
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [showViewMessageDialog, setShowViewMessageDialog] = useState(false);
  const [showAddHeroDialog, setShowAddHeroDialog] = useState(false);
  const [showEditShowcaseDialog, setShowEditShowcaseDialog] = useState(false);
  const [showAddShowcaseDialog, setShowAddShowcaseDialog] = useState(false);

  // Asset States for the Design Studio
  const [availableCups, setAvailableCups] = useState([]);
  const [availableMolds, setAvailableMolds] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [dbModels, setDbModels] = useState([]);

  // CONSOLIDATED STUDIO STATE
  const [editShowcaseForm, setEditShowcaseForm] = useState({
    name: '',
    type: 'cup',
    cupShape: 'default',
    cupColor: 'default',
    waxColor: 'default',
    moldShape: 'default',
    model_url: '',
    layers: [],
  });

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
      const [prodRes, orderRes, showcaseRes, heroRes, msgRes, staffRes, discRes, cupRes, moldRes, colorRes, modelRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/admin/orders`),
        fetch(`${API_BASE_URL}/admin/showcase`),
        fetch(`${API_BASE_URL}/admin/hero-images`),
        fetch(`${API_BASE_URL}/admin/messages`),
        fetch(`${API_BASE_URL}/admin/staff`),
        fetch(`${API_BASE_URL}/admin/discount-codes`),
        fetch(`${API_BASE_URL}/admin/inventory/cup-shapes`),
        fetch(`${API_BASE_URL}/mold-shapes`),
        fetch(`${API_BASE_URL}/colors`),
        fetch(`${API_BASE_URL}/admin/models`),
      ]);

      const data = await Promise.all([
        prodRes.json(), orderRes.json(), showcaseRes.json(), heroRes.json(), 
        msgRes.json(), staffRes.json(), discRes.json(), cupRes.json(), 
        moldRes.json(), colorRes.json(), modelRes.json()
      ]);

      setProducts(data[0]); setOrders(data[1]); setShowcaseDesigns(data[2]);
      setHeroImages(data[3]); setMessages(data[4]); setStaff(data[5]); setDiscountCodes(data[6]);
      setAvailableCups(data[7]); setAvailableMolds(data[8]); setAvailableColors(data[9]);
      setDbModels(data[10]);
    } catch (err) { console.error("Sync Error:", err); error("Failed to sync dashboard data."); }
    finally { setLoading(false); }
  };

  // --- STATS ---
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

  // --- STAFF HANDLERS ---
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

  // --- PRODUCT HANDLERS ---
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
    } catch (err) { setDialogError(err.message); } finally { setSubmitting(false); }
  };
  const handleDeleteHeroImage = async (id) => {
    if (!window.confirm('Remove this image from the homepage slideshow?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/hero-images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      setHeroImages(prev => prev.filter(img => img.id !== id));
      success('Image removed from slideshow.');
    } catch (err) { error(err.message); }
  };
  const handleToggleHeroImage = async (id, currentStatus) => {
    try {
      await fetch(`${API_BASE_URL}/admin/hero-images/${id}/toggle`, { method: 'PATCH' });
      setHeroImages(prev => prev.map(img => img.id === id ? { ...img, is_active: !currentStatus } : img));
      success(currentStatus ? 'Image hidden from homepage.' : 'Image added to homepage!');
    } catch (err) { error("Failed to toggle image status."); }
  };
  const handleMoveHeroImage = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= heroImages.length) return;
    const newOrder = [...heroImages];
    const temp = newOrder[index];
    newOrder[index] = newOrder[newIndex];
    newOrder[newIndex] = temp;
    setHeroImages(newOrder);
    try {
      const orderedIds = newOrder.map(img => img.id);
      await fetch(`${API_BASE_URL}/admin/hero-images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) { error("Failed to save new order."); }
  };

  // --- SHOWCASE HANDLERS ---
const handleToggleShowcase = async (e, design) => {
  e.stopPropagation(); 
  try {
    const toggledState = design.is_active ? 0 : 1;
    const res = await fetch(`${API_BASE_URL}/admin/showcase/${design.id}/toggle`, {
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: toggledState }) 
    });
    if (res.ok) {
      setShowcaseDesigns(prev => prev.map(d => 
        d.id === design.id ? { ...d, is_active: toggledState } : d
      ));
      success(toggledState === 1 ? "Design enabled." : "Design disabled.");
    } else {
      error("Failed to toggle design.");
    }
  } catch (err) { 
    error("Network error while toggling."); 
  }
};

const handleCreateShowcase = async (e) => {
    e.preventDefault();
    
    // 1. STRICT VALIDATION: Ensure colors are actually picked before pushing
    if (editShowcaseForm.type === 'cup' && editShowcaseForm.waxColor === 'default') {
      return error("Please select a Candle Wax Color.");
    }
    if (editShowcaseForm.type === 'mold' && editShowcaseForm.layers.includes('default')) {
      return error("Please select colors for all layers.");
    }

    setSubmitting(true);
    
    // 2. Identify the active assets
    const cup = availableCups.find(s => String(s.id) === String(editShowcaseForm.cupShape));
    const mold = availableMolds.find(s => String(s.id) === String(editShowcaseForm.moldShape));
    const activeVessel = editShowcaseForm.type === 'cup' ? cup : mold;
      
    // 3. Resolve Colors with safety fallbacks to prevent NULLs in the DB
    const waxHex = availableColors.find(c => String(c.id) === String(editShowcaseForm.waxColor))?.hex_code || '#ffffff';
    
    const validLayerColors = editShowcaseForm.layers.map(id => {
      const match = availableColors.find(c => String(c.id) === String(id));
      return match ? match.hex_code : '#ffffff';
    });

    const autoGeneratedName = activeVessel ? `Featured ${activeVessel.name}` : 'Custom Design';

    // 4. Construct Payload with explicit fallbacks
    const payload = {
      name: autoGeneratedName,
      model_url: activeVessel?.model_url || '',
      // We use waxHex for cups and the first valid layer color for molds. 
      // This ensures hex_color is never undefined.
      hex_color: editShowcaseForm.type === 'cup' ? waxHex : (validLayerColors[0] || '#ffffff'),
      layers_json: JSON.stringify(validLayerColors),
      type: editShowcaseForm.type,
      // Fix: Ensure we don't send the literal string 'default' to the database
      cup_color: editShowcaseForm.cupColor === 'default' ? '#ffffff' : editShowcaseForm.cupColor
    };

    try {
      const res = await fetch(`${API_BASE_URL}/admin/showcase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        success("Design Pushed to Storefront!");
        setShowAddShowcaseDialog(false);
        fetchDashboardData(); // Refreshes the local state
      } else {
        const errorData = await res.json();
        error(errorData.error || "Failed to push design.");
      }
    } catch (err) { 
      console.error("Save error:", err);
      error("Failed to save. Check your connection."); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDeleteShowcase = async (id) => {
    if (!window.confirm('Remove this showcase design?')) return;
    try {
      await fetch(`${API_BASE_URL}/admin/showcase/${id}`, { method: 'DELETE' });
      setShowcaseDesigns(prev => prev.filter(d => d.id !== id));
      success("Design removed.");
    } catch (err) { error("Failed to delete."); }
  };

  // --- ORDERS HANDLERS ---
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

  // --- DELETE ACCOUNT HANDLERS ---
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

  // --- DISCOUNT HANDLERS ---
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

  // --- MESSAGE HANDLERS ---
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
    { id: 'store_settings', label: '🎨 Store Settings' },
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

              <div className="charts-grid">
                <div className="dashboard-card">
                  <div className="card-header-flex"><h2>Revenue (Last 7 Days)</h2></div>
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
                  <div className="card-header-flex"><h2>Orders by Status</h2></div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ordersByStatus} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#8c7e70' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e0dcd3' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
                          <td><strong>#{order.id}</strong></td><td>{order.customer_name}</td><td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{Number(order.total).toFixed(2)} L.E.</td>
                          <td><Badge bg={getStatusBg(order.status_id)} className="custom-badge">{getStatusLabel(order.status_id)}</Badge></td>
                          <td><button className="btn-action" onClick={() => handleOpenOrderDialog(order)}>View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>

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
                            <td><button className="btn-action" onClick={() => handleOpenEditProduct(p)}>Edit</button></td>
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
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredOrders.length === 0
                      ? <tr><td colSpan="6" className="text-center text-muted py-4">No matching orders.</td></tr>
                      : filteredOrders.map(order => (
                        <tr key={order.id} className="table-row-hover">
                          <td><strong>#{order.id}</strong></td><td>{order.customer_name}</td><td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{Number(order.total).toFixed(2)} L.E.</td>
                          <td><Badge bg={getStatusBg(order.status_id)} className="custom-badge">{getStatusLabel(order.status_id)}</Badge></td>
                          <td><button className="btn-action" onClick={() => handleOpenOrderDialog(order)}>View</button></td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
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
            </div>
          )}

          {/* ===== STORE SETTINGS TAB ===== */}
          {activeTab === 'store_settings' && (
            <div className="d-flex flex-column gap-4">
              <div className="dashboard-card">
                <div className="card-header-flex">
                  <h2>🖼️ Homepage Slideshow</h2>
                  <button className="custom-pill-btn-small" onClick={() => { resetDialogState(); setShowAddHeroDialog(true); }}>+ Add Slide</button>
                </div>
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless mb-0">
                    <thead><tr><th>Order</th><th>Preview</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {heroImages.length === 0
                        ? <tr><td colSpan="4" className="text-center py-4 text-muted">No images uploaded yet.</td></tr>
                        : heroImages.map((img, index) => (
                          <tr key={img.id} className="table-row-hover">
                            <td>
                              <div className="d-flex flex-column gap-1">
                                <button className="btn-action" disabled={index === 0} onClick={() => handleMoveHeroImage(index, -1)}>▲</button>
                                <button className="btn-action" disabled={index === heroImages.length - 1} onClick={() => handleMoveHeroImage(index, 1)}>▼</button>
                              </div>
                            </td>
                            <td><img src={img.image_url} alt="hero" style={{ width: '100px', borderRadius: '8px' }} /></td>
                            <td><Badge bg={img.is_active ? 'success' : 'secondary'}>{img.is_active ? 'Active' : 'Hidden'}</Badge></td>
                            <td>
                              <button className="btn-action me-2" onClick={() => handleToggleHeroImage(img.id, img.is_active)}>{img.is_active ? 'Hide' : 'Show'}</button>
                              <button className="btn-action-danger" onClick={() => handleDeleteHeroImage(img.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="card-header-flex">
                  <div>
                    <h2>✨ 3D Builder Showcase</h2>
                    <p className="text-muted small mb-0">These models cycle through the "Create Your Own" card in your shop.</p>
                  </div>
                  <button className="custom-pill-btn-small" onClick={() => { 
                    setEditShowcaseForm({ name: '', type: 'cup', cupShape: 'default', cupColor: 'default', waxColor: 'default', moldShape: 'default', model_url: '', layers: [] }); 
                    resetDialogState(); setShowAddShowcaseDialog(true); 
                  }}>+ New Design</button>
                </div>
                <div className="table-scroll-wrapper">
                  <Table responsive className="custom-table borderless mb-0">
                    <thead><tr><th>Design Name</th><th>Wax Color</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {showcaseDesigns.length === 0
                        ? <tr><td colSpan="4" className="text-center py-4 text-muted">No designs saved yet.</td></tr>
                        : showcaseDesigns.map(design => (
                          <tr key={design.id} className="table-row-hover">
                            <td><strong>{design.name}</strong></td>
                            <td>
                              <div style={{ 
                                width: '24px', 
                                height: '24px', 
                                backgroundColor: design.hex_color || (design.layers_json ? JSON.parse(design.layers_json)[0] : '#ffffff'), 
                                borderRadius: '50%', 
                                border: '1px solid #ddd' 
                              }}></div>
                            </td>
                            <td><Badge bg={design.is_active ? 'success' : 'secondary'}>{design.is_active ? 'Visible' : 'Hidden'}</Badge></td>
                            <td>
                              <div className="d-flex gap-2">
                                <button 
                                  className={design.is_active ? 'btn-action-danger' : 'btn-action'} 
                                  onClick={(e) => handleToggleShowcase(e, design)}
                                >
                                  {design.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button className="btn-action-danger" onClick={() => handleDeleteShowcase(design.id)}>Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* ===== PROMOS TAB ===== */}
          {activeTab === 'promos' && userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex">
                <h2>Promo Codes</h2>
                <button className="custom-pill-btn-small" onClick={handleOpenAddDiscount}>+ New Code</button>
              </div>
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min</th><th>Max</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {discountCodes.map(dc => (
                      <tr key={dc.id} className="table-row-hover">
                        <td><strong>{dc.code}</strong></td><td>{dc.discount_type === 'percentage' ? '%' : 'L.E.'}</td>
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
            </div>
          )}

          {/* ===== MESSAGES TAB ===== */}
          {activeTab === 'messages' && (
            <div className="dashboard-card">
              <div className="card-header-flex"><h2>Customer Messages</h2></div>
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Order Ref</th><th>Action</th></tr></thead>
                  <tbody>
                    {messages.map(msg => (
                      <tr key={msg.id} className="table-row-hover">
                        <td>{new Date(msg.created_at).toLocaleDateString()}</td><td><strong>{msg.name}</strong></td><td><a href={`mailto:${msg.email}`} className="text-decoration-none" style={{ color: '#c8a97e' }}>{msg.email}</a></td>
                        <td>{msg.order_id ? <Badge bg="info" className="custom-badge">#{msg.order_id}</Badge> : <span className="text-muted">—</span>}</td>
                        <td><button className="btn-action" onClick={() => { setSelectedMessage(msg); setShowViewMessageDialog(true); }}>Read</button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* ===== STAFF TAB ===== */}
          {activeTab === 'staff' && userRole === '3' && (
            <div className="dashboard-card">
              <div className="card-header-flex"><h2>Staff Management</h2><button className="custom-pill-btn-small" onClick={handleOpenAddStaff}>+ Add Admin</button></div>
              <div className="table-scroll-wrapper">
                <Table responsive className="custom-table borderless align-left-table mb-0">
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                  <tbody>
                    {staff.map(member => (
                      <tr key={member.id} className="table-row-hover">
                        <td>{member.id}</td><td><strong>{member.name}</strong></td><td>{member.email}</td>
                        <td><Badge bg={member.role_id === 3 ? 'danger' : 'primary'} className="custom-badge">{member.role_id === 3 ? 'Super Admin' : 'Admin'}</Badge></td>
                        <td>{member.role_id !== 3 && <button className="btn-action-danger" onClick={() => handleRemoveStaff(member.id)}>Remove</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="dashboard-card">
              <h2>Account Settings</h2>
              <p className="text-muted mt-3">Manage your personal admin profile and security.</p>
              <div style={{ padding: '2rem 0', color: '#a89f91' }}>Profile management features coming soon...</div>
              <div className="danger-zone-card mt-4">
                <div className="danger-text"><h5>Danger Zone</h5><p>Permanently delete your admin account.</p></div>
                <button className="btn-danger-pill" onClick={handleOpenDeleteAccount}>Delete My Account</button>
              </div>
            </div>
          )}

        </div>
        <Footer />
      </div>

      {/* --- ✨ EXACT DESIGN STUDIO MODAL --- */}
      {showAddShowcaseDialog && (
        <div className="dialog-overlay" style={{ zIndex: 1050 }}>
          <div className="dialog-box" style={{ maxWidth: '1200px', width: '95vw', padding: '2rem', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dialog-header">
              <h3 className="mb-0">Studio: New Featured Look</h3>
              <button className="close-btn" onClick={() => setShowAddShowcaseDialog(false)}>✕</button>
            </div>

            <div className='creation' style={{ marginTop: '1rem', flex: 1, minHeight: 0 }}>
              <div className='candle-div' style={{ height: '100%' }}>
                {editShowcaseForm.model_url ? (
                  <CandlePreview3D
                    modelUrl={editShowcaseForm.model_url}
                    flatShading={dbModels.find(m => m.model_url === editShowcaseForm.model_url)?.flat_shading}
                    colorableParts={(() => {
                      const modelObj = dbModels.find(m => m.model_url === editShowcaseForm.model_url);
                      if (!modelObj || !modelObj.colorable_parts) return [];
                      try { return typeof modelObj.colorable_parts === 'string' ? JSON.parse(modelObj.colorable_parts) : modelObj.colorable_parts; }
                      catch { return []; }
                    })()}
                    cupColor={editShowcaseForm.cupColor === 'default' ? 'rgba(255,255,255,0.45)' : editShowcaseForm.cupColor}
                    waxColor={availableColors.find(c => String(c.id) === String(editShowcaseForm.waxColor))?.hex_code ?? '#ffffff'}
                    layerColors={editShowcaseForm.layers.map(id => availableColors.find(c => String(c.id) === String(id))?.hex_code || '#ffffff')}
                    cupSize="medium"
                  />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                    <p>Select a shape to begin designing</p>
                  </div>
                )}
              </div>
              
              <div className='choices' style={{ overflowY: 'auto', padding: '1rem' }}> 
                <div className="type-toggle mb-4">
                  <label className={`radio-label ${editShowcaseForm.type === 'cup' ? 'active-radio' : ''}`}>
                    <input type="radio" checked={editShowcaseForm.type === 'cup'} onChange={() => setEditShowcaseForm({...editShowcaseForm, type: 'cup', model_url: '', layers: [], cupShape: 'default', moldShape: 'default', waxColor: 'default'})} className="radio-input" />
                    Cup Candle
                  </label>
                  <label className={`radio-label ${editShowcaseForm.type === 'mold' ? 'active-radio' : ''}`}>
                    <input type="radio" checked={editShowcaseForm.type === 'mold'} onChange={() => setEditShowcaseForm({...editShowcaseForm, type: 'mold', model_url: '', layers: [], cupShape: 'default', moldShape: 'default'})} className="radio-input" />
                    Mold Candle
                  </label>
                </div>

                <div className='selections'>
                  {editShowcaseForm.type === 'cup' && (
                    <>
                      <select value={editShowcaseForm.cupShape} onChange={(e) => {
                        const shape = availableCups.find(s => String(s.id) === String(e.target.value));
                        setEditShowcaseForm({...editShowcaseForm, cupShape: e.target.value, cupColor: 'default', model_url: shape?.model_url, layers: ['default']});
                      }}>
                        <option value="default">Cup Shape</option>
                        {availableCups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>

                      <select value={editShowcaseForm.cupColor} onChange={(e) => setEditShowcaseForm({...editShowcaseForm, cupColor: e.target.value})}>
                        <option value="default">Cup Color</option>
                        {(() => {
                          const cup = availableCups.find(c => String(c.id) === String(editShowcaseForm.cupShape));
                          const colors = cup ? (typeof cup.colors === 'string' ? JSON.parse(cup.colors) : cup.colors) : [];
                          return colors.map((c, i) => <option key={i} value={c.hex_code}>{c.name}</option>);
                        })()}
                      </select>

                      <select value={editShowcaseForm.waxColor} onChange={(e) => {
                        const n = [...editShowcaseForm.layers];
                        n[0] = e.target.value;
                        setEditShowcaseForm({...editShowcaseForm, waxColor: e.target.value, layers: n});
                      }}>
                        <option value="default">Candle Wax Color</option>
                        {availableColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </>
                  )}

                  {editShowcaseForm.type === 'mold' && (
                    <>
                      <select value={editShowcaseForm.moldShape} onChange={(e) => {
                        const shape = availableMolds.find(m => String(m.id) === String(e.target.value));
                        setEditShowcaseForm({
                          ...editShowcaseForm, 
                          moldShape: e.target.value, 
                          model_url: shape?.model_url,
                          layers: Array(shape?.layers || 1).fill("default")
                        });
                      }}>
                        <option value="default">Mold Shape</option>
                        {availableMolds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>

                      {editShowcaseForm.layers.map((val, i) => (
                        <select key={i} value={val} onChange={(e) => {
                          const n = [...editShowcaseForm.layers];
                          n[i] = e.target.value;
                          setEditShowcaseForm({...editShowcaseForm, layers: n});
                        }} className="layer-select">
                          <option value="default">Layer {i+1} Color</option>
                          {availableColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ))}
                    </>
                  )}

                  <div className="confirmation-area mt-4">
                    <button className="confirm w-100" style={{ margin: 0, padding: '15px' }} disabled={!editShowcaseForm.model_url || submitting} onClick={handleCreateShowcase}>
                      {submitting ? <Spinner size="sm" /> : 'Push to Storefront'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- OTHER MODALS --- */}
      {showAddHeroDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Add Slide</h3><button className="close-btn" onClick={() => setShowAddHeroDialog(false)}>✕</button></div>
            <Form onSubmit={handleAddHeroImage}>
              <Form.Control type="file" className="custom-input mb-3" onChange={e => setHeroImageFile(e.target.files[0])} required />
              <div className="dialog-footer"><button type="button" className="btn btn-cancel" onClick={() => setShowAddHeroDialog(false)}>Cancel</button><button type="submit" className="btn btn-gold-solid">Upload</button></div>
            </Form>
          </div>
        </div>
      )}

      {showOrderDialog && selectedOrder && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Order #{selectedOrder.id}</h3><button className="close-btn" onClick={() => setShowOrderDialog(false)}>✕</button></div>
            <Form onSubmit={handleUpdateOrderStatus}>
              <div className="mb-4 p-3 bg-light rounded">
                <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Total:</strong> {selectedOrder.total} L.E.</p>
                <Badge bg={getStatusBg(selectedOrder.status_id)}>{getStatusLabel(selectedOrder.status_id)}</Badge>
              </div>
              <ul className="list-unstyled mb-4">
                {selectedOrderItems.map(item => (
                  <li key={item.id} className="border-bottom pb-2 mb-2"><strong>{item.quantity}x {item.item_name}</strong> - {item.unit_price} L.E.<br/><small>{item.details}</small></li>
                ))}
              </ul>
              <Form.Select className="custom-input mb-3" value={newStatusId} onChange={e => setNewStatusId(e.target.value)} required>
                <option value="1">Processing</option><option value="2">Shipped</option><option value="3">Delivered</option>
              </Form.Select>
              <div className="dialog-footer"><button type="button" className="btn btn-cancel" onClick={() => setShowOrderDialog(false)}>Close</button><button type="submit" className="btn btn-gold-solid">Save</button></div>
            </Form>
          </div>
        </div>
      )}

      {showAddProductDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>New Product</h3><button className="close-btn" onClick={() => setShowAddProductDialog(false)}>✕</button></div>
            <Form onSubmit={handleAddProduct}>
              <Form.Control type="text" placeholder="Name" className="custom-input mb-2" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
              <Form.Control type="number" placeholder="Price" className="custom-input mb-2" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
              <Form.Control type="number" placeholder="Stock" className="custom-input mb-2" value={productForm.stock_quantity} onChange={e => setProductForm({...productForm, stock_quantity: e.target.value})} required />

              {/* ADDED: Product Description Textarea */}
              <Form.Control as="textarea" rows={3} placeholder="Product Description" className="custom-input mb-2" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required />

              <Form.Control type="file" className="custom-input mb-3" onChange={e => setProductForm({...productForm, image: e.target.files[0]})} />
              <div className="dialog-footer"><button type="button" className="btn btn-cancel" onClick={() => setShowAddProductDialog(false)}>Cancel</button><button type="submit" className="btn btn-gold-solid">Save</button></div>
            </Form>
          </div>
        </div>
      )}

      {showEditProductDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Edit Product</h3>
              <button className="close-btn" onClick={() => setShowEditProductDialog(false)}>✕</button>
            </div>
            <Form onSubmit={handleUpdateProduct}>
              <Form.Control type="text" placeholder="Name" className="custom-input mb-2" value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
              <Form.Control type="number" placeholder="Price" className="custom-input mb-2" value={editProductForm.price} onChange={e => setEditProductForm({...editProductForm, price: e.target.value})} />
              <Form.Control type="number" placeholder="Stock" className="custom-input mb-2" value={editProductForm.stock_quantity} onChange={e => setEditProductForm({...editProductForm, stock_quantity: e.target.value})} />
              
              {/* THIS IS THE DESCRIPTION BOX */}
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Product Description" 
                className="custom-input mb-3" 
                value={editProductForm.description || ''} 
                onChange={e => setEditProductForm({...editProductForm, description: e.target.value})} 
                required 
              />
              
              <Form.Control type="file" className="custom-input mb-4" onChange={e => setEditProductForm({...editProductForm, image: e.target.files[0]})} />
              
              <div className="dialog-footer">
                <button type="button" className="btn-action-danger" onClick={() => handleDeleteProduct(editProductForm.id)}>Delete</button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-cancel" onClick={() => setShowEditProductDialog(false)}>Cancel</button>
                  <button type="submit" className="btn btn-gold-solid">Save</button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* STAFF / DISCOUNT / DELETE MODALS */}
      {showAddStaffDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Add New Admin</h3><button className="close-btn" onClick={() => setShowAddStaffDialog(false)}>✕</button></div>
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

      {showDeleteAccountDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ borderTop: '6px solid #dc3545' }}>
            <div className="dialog-header"><h3 className="text-danger">Delete Account</h3><button className="close-btn" onClick={() => setShowDeleteAccountDialog(false)}>✕</button></div>
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

      {showAddDiscountDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header"><h3>Create Promo Code</h3><button className="close-btn" onClick={() => setShowAddDiscountDialog(false)}>✕</button></div>
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
            <div className="dialog-header">
              <h3>Message from {selectedMessage.name}</h3>
              <button className="close-btn" onClick={() => setShowViewMessageDialog(false)}>✕</button>
            </div>
            <div className="p-2 mb-3">
              <p className="mb-1"><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`} className="text-decoration-none" style={{ color: '#c8a97e' }}>{selectedMessage.email}</a></p>
              <p className="mb-1"><strong>Phone:</strong> {selectedMessage.phone ? <a href={`tel:${selectedMessage.phone}`} className="text-decoration-none text-muted">{selectedMessage.phone}</a> : <span className="text-muted">—</span>}</p>
              <p className="mb-3 text-muted" style={{ fontSize: '0.85rem' }}><strong>Received:</strong> {new Date(selectedMessage.created_at).toLocaleString()}</p>
              {selectedMessage.order_id && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fdfbf7', borderRadius: '0.5rem', border: '1px solid #c8a97e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#8c7e70', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Regarding Order</span>
                    <strong style={{ fontSize: '1.1rem', color: '#2d241c' }}>#{selectedMessage.order_id}</strong>
                  </div>
                  <button className="custom-pill-btn-small" style={{ margin: 0 }} onClick={() => {
                    const linkedOrder = orders.find(o => String(o.id) === String(selectedMessage.order_id));
                    if (linkedOrder) { setShowViewMessageDialog(false); handleOpenOrderDialog(linkedOrder); }
                    else error("Order not found.");
                  }}>View Order →</button>
                </div>
              )}
              <div className="p-3 bg-light rounded mt-3" style={{ whiteSpace: 'pre-wrap', border: '1px solid #e0dcd3' }}>{selectedMessage.message}</div>
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