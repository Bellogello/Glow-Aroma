import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';
import '../styles/Inventory.css';
import { useNotification } from '../components/NotificationContext';

// ── Inventory categories config ───────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'scent-families',
    label: 'Scent Families',
    icon: '🌿',
    endpoint: 'scent-families',
    fields: [
      { name: 'name', label: 'Family Name', type: 'text', required: true },
    ],
    display: (item) => item.name,
    sub: () => '',
  },
  {
    key: 'scents',
    label: 'Scents',
    icon: '🕯️',
    endpoint: 'scents',
    fields: [
      { name: 'name',             label: 'Scent Name',        type: 'text',         required: true },
      { name: 'scent_family_id',  label: 'Scent Family',      type: 'scent_family', required: false },
      { name: 'price_modifier',   label: 'Price (L.E.)',      type: 'number',       required: false }, // Scents use price_modifier
      { name: 'is_available',     label: 'Available',         type: 'toggle',       required: false },
    ],
    display: (item) => item.name,
    sub: (item) => item.family_name ? `${item.family_name} · +${Number(item.price_modifier || 0).toFixed(2)} L.E.` : `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'colors',
    label: 'Wax Colors',
    icon: '🎨',
    endpoint: 'colors',
    fields: [
      { name: 'name',           label: 'Color Name',            type: 'text',   required: true },
      { name: 'hex_code',       label: 'Color',                 type: 'color',  required: false },
      { name: 'price_modifier', label: 'Price (L.E.)',          type: 'number', required: false },
      { name: 'is_available',   label: 'Available',             type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
    swatch: (item) => item.hex_code,
  },
  {
    key: 'cup-colors',
    label: 'Cup Colors',
    icon: '🫙',
    endpoint: 'cup-colors',
    fields: [
      { name: 'name',     label: 'Color Name',   type: 'text',   required: true },
      { name: 'hex_code', label: 'Color',        type: 'color',  required: false },
      { name: 'price_modifier', label: 'Price (L.E.)', type: 'number', required: false }, // Added this as your backend PUT expects it
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
    swatch: (item) => item.hex_code,
  },
  {
    key: 'cup-sizes',
    label: 'Cup Sizes',
    icon: '📏',
    endpoint: 'cup-sizes',
    fields: [
      { name: 'size_ml',        label: 'Size (ml)',             type: 'number', required: true },
      { name: 'price_modifier', label: 'Price (L.E.)',          type: 'number', required: false },
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
      { name: 'name',           label: 'Shape Name',            type: 'text',   required: true },
      { name: 'price_modifier', label: 'Base Price (L.E.)',     type: 'number', required: false },
      { name: 'is_available',   label: 'Available',             type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'mold-shapes',
    label: 'Mold Shapes',
    icon: '🔶',
    endpoint: 'mold-shapes',
    fields: [
      { name: 'name',           label: 'Shape Name',            type: 'text',   required: true },
      { name: 'price_modifier', label: 'Base Price (L.E.)',     type: 'number', required: false },
      { name: 'is_available',   label: 'Available',             type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
  },
];

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

// ── MODELS TAB (separate from inventory categories) ───────────────────────────
const ModelsTab = ({ notify }) => {
  const { success, error } = notify;
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('cup');
  const [layers, setLayers] = useState(1);
  const [flatShading, setFlatShading] = useState(false);
  const [colorableParts, setColorableParts] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [modelFile, setModelFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  useEffect(() => { fetchModels(); }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/models`);
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch { error('Failed to load models.'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingModel(null);
    setName(''); setType('cup'); setLayers(1); setFlatShading(false);
    setColorableParts(''); setIsAvailable(true); setModelFile(null); setThumbnailFile(null);
    setShowDialog(true);
  };

  const openEdit = (m) => {
    setEditingModel(m);
    setName(m.name); setType(m.type); setLayers(m.layers || 1);
    setFlatShading(!!m.flat_shading); setIsAvailable(!!m.is_available);
    setColorableParts(Array.isArray(m.colorable_parts) ? m.colorable_parts.join(', ') : '');
    setModelFile(null); setThumbnailFile(null);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!name || !type) { error('Name and type are required.'); return; }
    if (!editingModel && !modelFile) { error('Please upload a .glb model file.'); return; }
    setSubmitting(true);

    try {
      // Parse colorable parts from comma-separated string
      const partsArray = colorableParts
        .split(',').map(s => s.trim()).filter(Boolean);

      if (editingModel) {
        // Edit — just update metadata, no re-upload needed
        const res = await fetch(`${API_BASE_URL}/admin/models/${editingModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, type, layers: parseInt(layers), flat_shading: flatShading,
            colorable_parts: partsArray, is_available: isAvailable
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        success('Model updated!');
      } else {
        // New model — use FormData to send files
        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);
        formData.append('layers', layers);
        formData.append('flat_shading', flatShading);
        formData.append('colorable_parts', JSON.stringify(partsArray));
        formData.append('is_available', isAvailable);
        formData.append('model', modelFile);
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

        const res = await fetch(`${API_BASE_URL}/admin/models`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        success('Model uploaded successfully!');
      }

      await fetchModels();
      setTimeout(() => setShowDialog(false), 500);
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete model "${m.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/models/${m.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModels(prev => prev.filter(x => x.id !== m.id));
      success('Model deleted.');
    } catch (err) { error(err.message); }
  };

  return (
    <div className="inv-card">
      <div className="inv-card-header">
        <h2>🧊 3D Models</h2>
        <button className="inv-add-btn" onClick={openAdd}>+ Upload Model</button>
      </div>

      {loading ? <div className="inv-loading">Loading...</div> :
        models.length === 0 ? (
          <div className="inv-empty">
            <p>No models uploaded yet.</p>
            <button className="inv-add-btn" onClick={openAdd}>Upload your first model</button>
          </div>
        ) : (
          <div className="inv-grid">
            {models.map(m => (
              <div key={m.id} className={`inv-item ${!m.is_available ? 'inv-item-disabled' : ''}`}>
                <div className="inv-item-left">
                  {m.thumbnail_url && (
                    <img src={m.thumbnail_url} alt={m.name}
                      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div className="inv-item-info">
                    <span className="inv-item-name">{m.name}</span>
                    <span className="inv-item-sub">
                      {m.type === 'cup' ? '🔷 Cup' : '🔶 Mold'} ·
                      {m.layers > 1 ? ` ${m.layers} layers ·` : ''}
                      {m.flat_shading ? ' Flat shading ·' : ''}
                      {m.colorable_parts?.length ? ` ${m.colorable_parts.length} colorable parts` : ''}
                    </span>
                  </div>
                </div>
                <div className="inv-item-actions">
                  <button className="inv-edit-btn" onClick={() => openEdit(m)}>Edit</button>
                  <button className="inv-delete-btn" onClick={() => handleDelete(m)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showDialog && (
        <div className="inv-dialog-overlay" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="inv-dialog" style={{ maxWidth: 560 }}>
            <div className="inv-dialog-header">
              <h3>{editingModel ? 'Edit Model' : 'Upload 3D Model'}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>

            <div className="inv-dialog-body">
              {/* Name */}
              <div className="inv-field">
                <label className="inv-field-label">Model Name <span className="inv-required">*</span></label>
                <input className="inv-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diamond Cup" />
              </div>

              {/* Type */}
              <div className="inv-field">
                <label className="inv-field-label">Type <span className="inv-required">*</span></label>
                <div className="inv-type-row">
                  <button className={`inv-type-btn ${type === 'cup' ? 'active' : ''}`} onClick={() => setType('cup')}>🔷 Cup</button>
                  <button className={`inv-type-btn ${type === 'mold' ? 'active' : ''}`} onClick={() => setType('mold')}>🔶 Mold</button>
                </div>
              </div>

              {/* Layers — only for mold */}
              {type === 'mold' && (
                <div className="inv-field">
                  <label className="inv-field-label">Number of Layers</label>
                  <input className="inv-input" type="number" min="1" max="10" value={layers}
                    onChange={e => setLayers(e.target.value)} />
                </div>
              )}

              {/* Colorable Parts */}
              <div className="inv-field">
                <label className="inv-field-label">
                  Colorable Mesh Names
                  <span className="inv-field-hint"> (comma-separated, exact names from Blender)</span>
                </label>
                <input className="inv-input" value={colorableParts}
                  onChange={e => setColorableParts(e.target.value)}
                  placeholder={type === 'cup' ? 'e.g. Cylinder_0, Cylinder001_1' : 'e.g. Cylinder001_1'} />
                <p className="inv-field-note">
                  These are the mesh object names from your Blender file.
                  {type === 'cup' ? ' Cylinder_0 = cup glass, Cylinder001_1 = wax' : ' Cylinder001_1 = wax layers'}
                </p>
              </div>

              {/* Flat Shading toggle */}
              <div className="inv-field">
                <label className="inv-field-label">Flat Shading</label>
                <div className="inv-toggle-row">
                  <label className="inv-switch">
                    <input type="checkbox" checked={flatShading} onChange={e => setFlatShading(e.target.checked)} />
                    <span className="inv-switch-slider" />
                  </label>
                  <span className="inv-toggle-label">{flatShading ? 'On (faceted look)' : 'Off (smooth shading)'}</span>
                </div>
              </div>

              {/* Available toggle */}
              <div className="inv-field">
                <label className="inv-field-label">Available to customers</label>
                <div className="inv-toggle-row">
                  <label className="inv-switch">
                    <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                    <span className="inv-switch-slider" />
                  </label>
                  <span className="inv-toggle-label">{isAvailable ? 'Visible' : 'Hidden'}</span>
                </div>
              </div>

              {/* File uploads — only shown when adding new */}
              {!editingModel && (
                <>
                  <div className="inv-field">
                    <label className="inv-field-label">GLB Model File <span className="inv-required">*</span></label>
                    <input type="file" accept=".glb,.gltf" className="inv-input"
                      onChange={e => setModelFile(e.target.files[0])} />
                    {modelFile && <p className="inv-field-note">✓ {modelFile.name}</p>}
                  </div>
                  <div className="inv-field">
                    <label className="inv-field-label">Thumbnail Image <span className="inv-field-hint">(optional)</span></label>
                    <input type="file" accept="image/*" className="inv-input"
                      onChange={e => setThumbnailFile(e.target.files[0])} />
                    {thumbnailFile && <p className="inv-field-note">✓ {thumbnailFile.name}</p>}
                  </div>
                </>
              )}
            </div>

            <div className="inv-dialog-footer">
              <button className="inv-cancel-btn" onClick={() => setShowDialog(false)} disabled={submitting}>Cancel</button>
              <button className="inv-save-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Uploading...' : editingModel ? 'Save Changes' : 'Upload Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Inventory Component ───────────────────────────────────────────────────
const Inventory = () => {
  useTitle("Inventory | Glow Aroma");
  const navigate = useNavigate();
  const notif = useNotification();
  const { success, error, warning } = notif;

  const [activeKey, setActiveKey]     = useState('scents');
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [showDialog, setShowDialog]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm]               = useState({});
  const [scentFamilies, setScentFamilies] = useState([]);

  const category = CATEGORIES.find(c => c.key === activeKey);
  const isModelsTab = activeKey === 'models';

  useEffect(() => {
    const roleId = localStorage.getItem('roleId');
    if (roleId !== '2' && roleId !== '3') navigate('/');
  }, [navigate]);

  useEffect(() => {
    // Load scent families for the dropdown
    fetch(`${API_BASE_URL}/admin/inventory/scent-families`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setScentFamilies(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isModelsTab) fetchItems();
  }, [activeKey]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { error('Failed to load items.'); }
    finally { setLoading(false); }
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

  const handleFormChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
    const requiredField = category.fields.find(f => f.required && (form[f.name] === '' || form[f.name] === undefined || form[f.name] === null));
    if (requiredField) { warning(`${requiredField.label} is required.`); return; }

    setSubmitting(true);
    const sanitized = { ...form };
    category.fields.forEach(f => {
      if (f.type === 'number') sanitized[f.name] = sanitized[f.name] === '' ? 0 : Number(sanitized[f.name]);
    });

    try {
      const url = editingItem
        ? `${API_BASE_URL}/admin/inventory/${category.endpoint}/${editingItem.id}`
        : `${API_BASE_URL}/admin/inventory/${category.endpoint}`;
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      success(editingItem ? 'Updated!' : 'Added!');
      await fetchItems();
      // Refresh scent families if we just modified them
      if (activeKey === 'scent-families') {
        fetch(`${API_BASE_URL}/admin/inventory/scent-families`)
          .then(r => r.json()).then(d => { if (Array.isArray(d)) setScentFamilies(d); });
      }
      setTimeout(() => setShowDialog(false), 500);
    } catch (err) { error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(prev => prev.filter(i => i.id !== item.id));
      success('Deleted.');
    } catch (err) { error(err.message); }
  };

  const handleToggle = async (item) => {
    try {
      await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, is_available: !item.is_available })
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
      success(item.is_available ? 'Hidden from customers.' : 'Now visible to customers.');
    } catch { error('Failed to update.'); }
  };

  const ALL_TABS = [
    { key: 'scent-families', label: 'Scent Families', icon: '🌿' },
    { key: 'scents',         label: 'Scents',         icon: '🕯️' },
    { key: 'colors',         label: 'Wax Colors',     icon: '🎨' },
    { key: 'cup-colors',     label: 'Cup Colors',     icon: '🫙' },
    { key: 'cup-sizes',      label: 'Cup Sizes',      icon: '📏' },
    { key: 'cup-shapes',     label: 'Cup Shapes',     icon: '🔷' },
    { key: 'mold-shapes',    label: 'Mold Shapes',    icon: '🔶' },
    { key: 'models',         label: '3D Models',      icon: '🧊' },
  ];

  return (
    <div className="home-container inventory-bg">
      <Navbar />
      <div className="inventory-wrapper">

        <div className="inventory-header">
          <div>
            <h1 className="inventory-title">Custom Candle Inventory</h1>
            <p className="inventory-subtitle">Manage all options customers see when building their candles</p>
          </div>
          <Link to="/Dashboard" className="inv-back-btn">← Dashboard</Link>
        </div>

        <div className="inv-tabs">
          {ALL_TABS.map(tab => (
            <button key={tab.key} className={`inv-tab ${activeKey === tab.key ? 'active' : ''}`}
              onClick={() => setActiveKey(tab.key)}>
              <span className="inv-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeKey === tab.key && !isModelsTab && <span className="inv-tab-count">{items.length}</span>}
            </button>
          ))}
        </div>

        {/* Models tab renders its own card */}
        {isModelsTab ? (
          <ModelsTab notify={{ success, error }} />
        ) : (
          <div className="inv-card">
            <div className="inv-card-header">
              <h2>{category.icon} {category.label}</h2>
              <button className="inv-add-btn" onClick={openAddDialog}>
                + Add {category.label.replace(/s$/, '').replace(/ies$/, 'y')}
              </button>
            </div>

            {loading ? <div className="inv-loading">Loading...</div> :
              items.length === 0 ? (
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
                          <button className={`inv-toggle-btn ${item.is_available ? 'available' : 'unavailable'}`}
                            onClick={() => handleToggle(item)}>
                            {item.is_available ? 'Active' : 'Hidden'}
                          </button>
                        )}
                        <button className="inv-edit-btn" onClick={() => openEditDialog(item)}>Edit</button>
                        <button className="inv-delete-btn" onClick={() => handleDelete(item)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && !isModelsTab && (
        <div className="inv-dialog-overlay" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
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
                        <input type="checkbox" checked={!!form[field.name]}
                          onChange={e => handleFormChange(field.name, e.target.checked)} />
                        <span className="inv-switch-slider" />
                      </label>
                      <span className="inv-toggle-label">
                        {form[field.name] ? 'Available to customers' : 'Hidden from customers'}
                      </span>
                    </div>

                  ) : field.type === 'color' ? (
                    <div className="inv-color-row">
                      <input type="color" value={form[field.name] || '#c8a97e'}
                        onChange={e => handleFormChange(field.name, e.target.value)}
                        className="inv-color-picker" />
                      <div className="inv-color-preview" style={{ backgroundColor: form[field.name] || '#c8a97e' }} />
                      <input type="text" value={form[field.name] || ''}
                        onChange={e => handleFormChange(field.name, e.target.value)}
                        placeholder="#c8a97e" className="inv-input inv-hex-input" />
                    </div>

                  ) : field.type === 'scent_family' ? (
                    <select className="inv-input" value={form[field.name] || ''}
                      onChange={e => handleFormChange(field.name, e.target.value || null)}>
                      <option value="">— No family —</option>
                      {scentFamilies.map(sf => (
                        <option key={sf.id} value={sf.id}>{sf.name}</option>
                      ))}
                    </select>

                  ) : (
                    <input type={field.type} value={form[field.name] || ''}
                      onChange={e => handleFormChange(field.name, e.target.value)}
                      placeholder={field.type === 'number' ? '0' : `Enter ${field.label.toLowerCase()}`}
                      className="inv-input"
                      step={field.type === 'number' ? '0.01' : undefined}
                      min={field.type === 'number' ? '0' : undefined} />
                  )}
                </div>
              ))}
            </div>

            <div className="inv-dialog-footer">
              <button className="inv-cancel-btn" onClick={() => setShowDialog(false)} disabled={submitting}>Cancel</button>
              <button className="inv-save-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add'}
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