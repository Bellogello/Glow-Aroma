import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';
import '../styles/Inventory.css';

// 1. Import your notification hook
import { useNotification } from '../components/NotificationContext';

// ── Config for each category (Mapped EXACTLY to your Database schema) ──
const CATEGORIES = [
  {
    key: 'scents',
    label: 'Scents',
    icon: '🕯️',
    endpoint: 'scents',
    fields: [
      { name: 'name',         label: 'Scent Name',   type: 'text',   required: true },
      { name: 'scent_family', label: 'Scent Family', type: 'text',   required: false },
      { name: 'price',        label: 'Price (L.E.)', type: 'number', required: false },
      { name: 'is_available', label: 'Available',    type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'colors',
    label: 'Wax Colors',
    icon: '🎨',
    endpoint: 'colors',
    fields: [
      { name: 'name',         label: 'Color Name',   type: 'text',   required: true },
      { name: 'hex_code',     label: 'Hex Code',     type: 'color',  required: false },
      { name: 'price',        label: 'Price (L.E.)', type: 'number', required: false },
      { name: 'is_available', label: 'Available',    type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price || 0).toFixed(2)} L.E.`,
    swatch: (item) => item.hex_code,
  },
  {
    key: 'cup-colors',
    label: 'Cup Colors',
    icon: '🫙',
    endpoint: 'cup-colors',
    fields: [
      { name: 'name',         label: 'Color Name',   type: 'text',   required: true },
      { name: 'hex_code',     label: 'Hex Code',     type: 'color',  required: false },
      // Note: Cup colors do not have a price or is_available column in your database!
    ],
    display: (item) => item.name,
    sub: (item) => '', // No extra cost text needed
    swatch: (item) => item.hex_code,
  },
  {
    key: 'cup-sizes',
    label: 'Cup Sizes',
    icon: '📏',
    endpoint: 'cup-sizes',
    fields: [
      { name: 'size_ml',        label: 'Size (ml)',            type: 'number', required: true },
      { name: 'price_modifier', label: 'Price Modifier (L.E.)', type: 'number', required: false },
    ],
    display: (item) => `${item.size_ml} ml`,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'cup-shapes',
    label: 'Cup Shapes',
    icon: '🔷',
    endpoint: 'cup-shapes',
    fields: [
      { name: 'name',         label: 'Shape Name',        type: 'text',   required: true },
      { name: 'base_price',   label: 'Base Price (L.E.)', type: 'number', required: false },
      { name: 'is_available', label: 'Available',         type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.base_price || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'mold-shapes',
    label: 'Mold Shapes',
    icon: '🔶',
    endpoint: 'mold-shapes',
    fields: [
      { name: 'name',         label: 'Shape Name',        type: 'text',   required: true },
      { name: 'layers',       label: 'Number of Layers',  type: 'number', required: true },
      { name: 'base_price',   label: 'Base Price (L.E.)', type: 'number', required: false },
      { name: 'is_available', label: 'Available',         type: 'toggle', required: false },
    ],
    display: (item) => `${item.name} (${item.layers} layer${item.layers > 1 ? 's' : ''})`,
    sub: (item) => `+${Number(item.base_price || 0).toFixed(2)} L.E.`,
  },
];

// ── Default form state for a category ─────────────────────────────────────────
const defaultForm = (fields) => {
  const obj = {};
  fields.forEach(f => {
    if (f.type === 'toggle') obj[f.name] = true;
    else if (f.type === 'number') obj[f.name] = '';
    else if (f.type === 'color') obj[f.name] = '#c8a97e';
    else obj[f.name] = '';
  });
  return obj;
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Inventory = () => {
  useTitle("Inventory | Glow Aroma");
  const navigate = useNavigate();

  // Initialize notifications
  const { success, error, warning } = useNotification();

  const [activeKey, setActiveKey]   = useState('scents');
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm]             = useState({});

  const category = CATEGORIES.find(c => c.key === activeKey);

  // Auth guard — super admin and admin only
  useEffect(() => {
    const roleId = localStorage.getItem('roleId');
    if (roleId !== '2' && roleId !== '3') navigate('/');
  }, [navigate]);

  // Fetch items whenever category changes
  useEffect(() => {
    fetchItems();
  }, [activeKey]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      error('Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setForm(defaultForm(category.fields));
    setShowDialog(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    const f = {};
    category.fields.forEach(field => {
      f[field.name] = item[field.name] !== undefined ? item[field.name] : (field.type === 'toggle' ? true : '');
    });
    setForm(f);
    setShowDialog(true);
  };

  const handleFormChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    const requiredField = category.fields.find(f => f.required && (form[f.name] === '' || form[f.name] === undefined));
    if (requiredField) {
      warning(`${requiredField.label} is required.`);
      return;
    }
    
    setSubmitting(true);
    
    // SANITIZE: Safely convert empty string numbers to 0 to prevent 500 crashes!
    const sanitizedForm = { ...form };
    category.fields.forEach(field => {
      if (field.type === 'number') {
        sanitizedForm[field.name] = sanitizedForm[field.name] === '' ? 0 : Number(sanitizedForm[field.name]);
      }
    });

    try {
      const url = editingItem
        ? `${API_BASE_URL}/admin/inventory/${category.endpoint}/${editingItem.id}`
        : `${API_BASE_URL}/admin/inventory/${category.endpoint}`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedForm)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      
      success(editingItem ? 'Updated successfully!' : 'Added successfully!');
      await fetchItems();
      setTimeout(() => setShowDialog(false), 800);
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this item? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete.');
      
      setItems(prev => prev.filter(i => i.id !== item.id));
      success("Item deleted.");
    } catch (err) {
      error(err.message);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, is_available: !item.is_available })
      });
      
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
      success(item.is_available ? "Item hidden from customers." : "Item is now available.");
    } catch (err) {
      error('Failed to update availability.');
    }
  };

  return (
    <div className="home-container inventory-bg">
      <Navbar />
      <div className="inventory-wrapper">

        <div className="inventory-header">
          <div>
            <h1 className="inventory-title">Custom Candle Inventory</h1>
            <p className="inventory-subtitle">Manage options available to customers when building their candles</p>
          </div>
          <Link to="/Dashboard" className="inv-back-btn">← Dashboard</Link>
        </div>

        {/* Category Tabs */}
        <div className="inv-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`inv-tab ${activeKey === cat.key ? 'active' : ''}`}
              onClick={() => setActiveKey(cat.key)}
            >
              <span className="inv-tab-icon">{cat.icon}</span>
              <span>{cat.label}</span>
              {activeKey === cat.key && <span className="inv-tab-count">{items.length}</span>}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div className="inv-card">
          <div className="inv-card-header">
            <h2>{category.icon} {category.label}</h2>
            <button className="inv-add-btn" onClick={openAddDialog}>+ Add {category.label.replace(/s$/, '')}</button>
          </div>

          {loading ? (
            <div className="inv-loading">Loading...</div>
          ) : items.length === 0 ? (
            <div className="inv-empty">
              <p>No {category.label.toLowerCase()} yet.</p>
              <button className="inv-add-btn" onClick={openAddDialog}>Add your first one</button>
            </div>
          ) : (
            <div className="inv-grid">
              {items.map(item => (
                <div key={item.id} className={`inv-item ${item.is_available === false ? 'inv-item-disabled' : ''}`}>
                  <div className="inv-item-left">
                    {category.swatch && category.swatch(item) && (
                      <div className="inv-swatch" style={{ backgroundColor: category.swatch(item) }} />
                    )}
                    <div className="inv-item-info">
                      <span className="inv-item-name">{category.display(item)}</span>
                      {category.sub(item) && <span className="inv-item-sub">{category.sub(item)}</span>}
                    </div>
                  </div>
                  <div className="inv-item-actions">
                    {item.is_available !== undefined && (
                      <button
                        className={`inv-toggle-btn ${item.is_available ? 'available' : 'unavailable'}`}
                        onClick={() => handleToggleAvailability(item)}
                        title={item.is_available ? 'Click to hide from customers' : 'Click to show to customers'}
                      >
                        {item.is_available ? 'Active' : 'Hidden'}
                      </button>
                    )}
                    <button className="inv-edit-btn" onClick={() => openEditDialog(item)}>Edit</button>
                    <button className="inv-delete-btn" onClick={() => handleDelete(item)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      {showDialog && (
        <div className="inv-dialog-overlay" onClick={(e) => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="inv-dialog">
            <div className="inv-dialog-header">
              <h3>{editingItem ? `Edit ${category.label.replace(/s$/, '')}` : `Add ${category.label.replace(/s$/, '')}`}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>

            <div className="inv-dialog-body">

              {category.fields.map(field => (
                <div key={field.name} className="inv-field">
                  <label className="inv-field-label">
                    {field.label}
                    {field.required && <span className="inv-required">*</span>}
                  </label>

                  {field.type === 'toggle' ? (
                    <div className="inv-toggle-row">
                      <label className="inv-switch">
                        <input
                          type="checkbox"
                          checked={!!form[field.name]}
                          onChange={e => handleFormChange(field.name, e.target.checked)}
                        />
                        <span className="inv-switch-slider" />
                      </label>
                      <span className="inv-toggle-label">{form[field.name] ? 'Available to customers' : 'Hidden from customers'}</span>
                    </div>
                  ) : field.type === 'color' ? (
                    <div className="inv-color-row">
                      <input
                        type="color"
                        value={form[field.name] || '#c8a97e'}
                        onChange={e => handleFormChange(field.name, e.target.value)}
                        className="inv-color-picker"
                      />
                      <input
                        type="text"
                        value={form[field.name] || ''}
                        onChange={e => handleFormChange(field.name, e.target.value)}
                        placeholder="#c8a97e"
                        className="inv-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      value={form[field.name] || ''}
                      onChange={e => handleFormChange(field.name, e.target.value)}
                      placeholder={field.type === 'number' ? '0' : `Enter ${field.label.toLowerCase()}`}
                      className="inv-input"
                      step={field.type === 'number' ? '0.01' : undefined}
                      min={field.type === 'number' ? '0' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="inv-dialog-footer">
              <button className="inv-cancel-btn" onClick={() => setShowDialog(false)} disabled={submitting}>Cancel</button>
              <button className="inv-save-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Inventory;