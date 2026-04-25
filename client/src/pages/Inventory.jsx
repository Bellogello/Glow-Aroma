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
      { name: 'price_modifier',   label: 'Price Modifier (L.E.)', type: 'number',  required: false },
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
      { name: 'price_modifier', label: 'Price Modifier (L.E.)', type: 'number', required: false },
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
      { name: 'name',     label: 'Color Name', type: 'text',  required: true },
      { name: 'hex_code', label: 'Color',      type: 'color', required: false },
      { name: 'price_modifier', label: 'Price Modifier (L.E.)', type: 'number', required: false },
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
      { name: 'name',           label: 'Shape Name',            type: 'text',   required: true },
      { name: 'price_modifier', label: 'Base Price (L.E.)',     type: 'number', required: false },
      { name: 'model_url',      label: 'Linked 3D Model',       type: 'model',  required: false },
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
      { name: 'layers',         label: 'Number of Layers',      type: 'number', required: true },
      { name: 'model_url',      label: 'Linked 3D Model',       type: 'model',  required: false },
      { name: 'is_available',   label: 'Available',             type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E. | ${item.layers || 1} Layer(s)`,
  },
];

const defaultForm = (fields) => {
  const obj = {};
  fields.forEach(f => {
    if (f.type === 'toggle') obj[f.name] = true;
    else if (f.type === 'number') obj[f.name] = f.name === 'layers' ? 1 : '';
    else if (f.type === 'color') obj[f.name] = '#c8a97e';
    else obj[f.name] = '';
  });
  return obj;
};

// ── MODELS TAB ───────────────────────────────────────────────────────────────
const ModelsTab = ({ notify, models, fetchModels }) => {
  const { success, error } = notify;
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('cup');
  const [layers, setLayers] = useState(1);
  const [flatShading, setFlatShading] = useState(false);
  const [colorableParts, setColorableParts] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [modelFile, setModelFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

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
      const partsArray = colorableParts.split(',').map(s => s.trim()).filter(Boolean);

      if (editingModel) {
        const res = await fetch(`${API_BASE_URL}/admin/models/${editingModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, type, layers: parseInt(layers), flat_shading: flatShading,
            colorable_parts: partsArray, is_available: isAvailable
          })
        });
        if (!res.ok) throw new Error('Update failed');
        success('Model updated!');
      } else {
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
        if (!res.ok) throw new Error('Upload failed');
        success('Model uploaded!');
      }
      await fetchModels();
      setShowDialog(false);
    } catch (err) { error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete model "${m.name}"?`)) return;
    try {
      await fetch(`${API_BASE_URL}/admin/models/${m.id}`, { method: 'DELETE' });
      await fetchModels();
      success('Model deleted.');
    } catch { error('Delete failed.'); }
  };

  return (
    <div className="inv-card">
      <div className="inv-card-header">
        <h2>🧊 3D Models</h2>
        <button className="inv-add-btn" onClick={openAdd}>+ Upload Model</button>
      </div>

      {loading ? <div className="inv-loading">Loading...</div> : (
        <div className="inv-grid">
          {models.map(m => (
            <div key={m.id} className={`inv-item ${!m.is_available ? 'inv-item-disabled' : ''}`}>
              <div className="inv-item-left">
                {m.thumbnail_url && (
                  <img src={m.thumbnail_url} alt={m.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                )}
                <div className="inv-item-info">
                  <span className="inv-item-name">{m.name}</span>
                  <span className="inv-item-sub">{m.type} • {Array.isArray(m.colorable_parts) ? m.colorable_parts.join(', ') : ''}</span>
                </div>
              </div>
              <div className="inv-item-actions">
                <button className="inv-edit-btn" onClick={() => openEdit(m)}>Edit</button>
                <button className="inv-delete-btn" onClick={() => handleDelete(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="inv-dialog-overlay" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="inv-dialog">
            <div className="inv-dialog-header">
              <h3>{editingModel ? 'Edit Model Info' : 'Upload Model'}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>
            <div className="inv-dialog-body">
              <div className="inv-field">
                <label>Name</label>
                <input className="inv-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="inv-field">
                <label>Colorable Parts (Comma Separated)</label>
                <input 
                  className="inv-input" 
                  placeholder="e.g. Sphere.001, Sphere.002" 
                  value={colorableParts} 
                  onChange={e => setColorableParts(e.target.value)} 
                />
              </div>
              {!editingModel && (
                <div className="inv-field">
                  <label>GLB File</label>
                  <input type="file" accept=".glb" onChange={e => setModelFile(e.target.files[0])} />
                </div>
              )}
            </div>
            <div className="inv-dialog-footer">
              <button onClick={handleSubmit} className="inv-save-btn">{submitting ? 'Processing...' : 'Save'}</button>
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
  const { success, error, warning } = useNotification();

  const [activeKey, setActiveKey]     = useState('scents');
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [showDialog, setShowDialog]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm]               = useState({});
  const [scentFamilies, setScentFamilies] = useState([]);
  
  const [availableModels, setAvailableModels] = useState([]);

  const category = CATEGORIES.find(c => c.key === activeKey);
  const isModelsTab = activeKey === 'models';

  useEffect(() => {
    const roleId = localStorage.getItem('roleId');
    if (roleId !== '2' && roleId !== '3') navigate('/');
  }, [navigate]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/inventory/scent-families`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setScentFamilies(d); });
      
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/models`);
      const data = await res.json();
      setAvailableModels(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load available models.'); }
  };

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

  // --- NEW: DELETE LOGIC FOR SHAPES/ITEMS ---
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${category.display(item)}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      success(`${category.label} deleted.`);
      fetchItems();
    } catch (err) {
      error('Failed to delete item.');
    }
  };

  const handleFormChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
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
      if (!res.ok) throw new Error('Save failed');
      success(editingItem ? 'Updated!' : 'Added!');
      await fetchItems();
      setShowDialog(false);
    } catch (err) { error(err.message); }
    finally { setSubmitting(false); }
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
            <h1 className="inventory-title">Inventory Management</h1>
          </div>
          <Link to="/Dashboard" className="inv-back-btn">← Dashboard</Link>
        </div>

        <div className="inv-tabs">
          {ALL_TABS.map(tab => (
            <button key={tab.key} className={`inv-tab ${activeKey === tab.key ? 'active' : ''}`}
              onClick={() => setActiveKey(tab.key)}>
              <span>{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>

        {isModelsTab ? (
          <ModelsTab notify={{ success, error }} models={availableModels} fetchModels={fetchModels} />
        ) : (
          <div className="inv-card">
            <div className="inv-card-header">
              <h2>{category.label}</h2>
              <button className="inv-add-btn" onClick={openAddDialog}>+ Add New</button>
            </div>
            <div className="inv-grid">
              {items.map(item => (
                <div key={item.id} className="inv-item">
                   <div className="inv-item-info">
                      <span className="inv-item-name">{category.display(item)}</span>
                      <span className="inv-item-sub">{category.sub(item)}</span>
                   </div>
                   {/* --- NEW: DELETE BUTTON ADDED --- */}
                   <div className="inv-item-actions">
                      <button className="inv-edit-btn" onClick={() => openEditDialog(item)}>Edit</button>
                      <button className="inv-delete-btn" onClick={() => handleDeleteItem(item)}>Delete</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDialog && !isModelsTab && (
        <div className="inv-dialog-overlay" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="inv-dialog">
            <div className="inv-dialog-header">
              <h3>{editingItem ? 'Edit' : 'Add'} {category.label}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>
            <div className="inv-dialog-body">
              {category.fields.map(field => (
                <div key={field.name} className="inv-field">
                  <label>{field.label}</label>
                  
                  {field.type === 'scent_family' ? (
                    <select className="inv-input" value={form[field.name] || ''} onChange={e => handleFormChange(field.name, e.target.value)}>
                      <option value="">None</option>
                      {scentFamilies.map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}
                    </select>
                  ) : field.type === 'model' ? (
                    <select className="inv-input" value={form[field.name] || ''} onChange={e => handleFormChange(field.name, e.target.value)}>
                      <option value="">Select a 3D Model</option>
                      {availableModels.map(m => <option key={m.id} value={m.model_url}>{m.name}</option>)}
                    </select>
                  ) : field.type === 'toggle' ? (
                    <input type="checkbox" checked={!!form[field.name]} onChange={e => handleFormChange(field.name, e.target.checked)} />
                  ) : (
                    <input className="inv-input" type={field.type} value={form[field.name] || ''} onChange={e => handleFormChange(field.name, e.target.value)} />
                  )}
                  
                </div>
              ))}
            </div>
            <div className="inv-dialog-footer">
              <button onClick={handleSubmit} className="inv-save-btn">{submitting ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Inventory;