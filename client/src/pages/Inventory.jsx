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
      { name: 'price_modifier',   label: 'Price (+ L.E.)',    type: 'number',       required: false },
      { name: 'is_available',     label: 'Available',         type: 'toggle',       required: false },
    ],
    display: (item) => item.name,
    sub: (item) => item.family_name ? `${item.family_name} · +${Number(item.price_modifier || 0).toFixed(2)} L.E.` : `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
  },
  {
    key: 'colors',
    label: 'Wax Colors', // --- RENAMED back to global Wax Colors
    icon: '🎨',
    endpoint: 'colors',
    fields: [
      { name: 'name',           label: 'Color Name',            type: 'text',   required: true },
      { name: 'hex_code',       label: 'Color',                 type: 'color',  required: false },
      { name: 'price_modifier', label: 'Price (+ L.E.)',        type: 'number', required: false },
      { name: 'is_available',   label: 'Available',             type: 'toggle', required: false },
    ],
    display: (item) => item.name,
    sub: (item) => `+${Number(item.price_modifier || 0).toFixed(2)} L.E.`,
    swatch: (item) => item.hex_code,
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
    sub: (item) => `Base: ${Number(item.price_modifier || 0).toFixed(2)} L.E. | ${item.layers || 1} Layer(s)`,
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

// ── CUSTOM CUPS TAB (Master Settings) ─────────────────────────────────────────
const CupsTab = ({ notify, availableModels }) => {
  const { success, error } = notify;
  const [loading, setLoading] = useState(false);
  const [cups, setCups] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCup, setEditingCup] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Core Fields
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState(''); // We use this as the single "Base Price"
  const [modelUrl, setModelUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Dynamic Array Fields
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);

  useEffect(() => { fetchCups(); }, []);

  const fetchCups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/cup-shapes`);
      const data = await res.json();
      setCups(Array.isArray(data) ? data : []);
    } catch { error('Failed to load cups.'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingCup(null);
    setName(''); setPriceModifier(''); setModelUrl(''); setIsAvailable(true);
    setSizes([{ ml: 200, price_modifier: 0 }]);
    // --- UPDATED: Removed 'type' entirely. This is just for the Glass/Cup now.
    setColors([{ name: 'Clear', hex_code: '#ffffff', price_modifier: 0 }]);
    setShowDialog(true);
  };

  const openEdit = (c) => {
    setEditingCup(c);
    setName(c.name); setPriceModifier(c.price_modifier || 0); 
    setModelUrl(c.model_url || ''); setIsAvailable(!!c.is_available);
    
    try { setSizes(typeof c.sizes === 'string' ? JSON.parse(c.sizes) : (c.sizes || [])); } catch { setSizes([]); }
    try { setColors(typeof c.colors === 'string' ? JSON.parse(c.colors) : (c.colors || [])); } catch { setColors([]); }
    
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!name) return error('Name is required.');
    setSubmitting(true);
    try {
      const url = editingCup ? `${API_BASE_URL}/admin/inventory/cup-shapes/${editingCup.id}` : `${API_BASE_URL}/admin/inventory/cup-shapes`;
      const method = editingCup ? 'PUT' : 'POST';
      
      const payload = {
        name, price_modifier: priceModifier, model_url: modelUrl, is_available: isAvailable, sizes, colors
      };

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      success(editingCup ? 'Cup Updated!' : 'Cup Added!');
      fetchCups(); setShowDialog(false);
    } catch (err) { error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await fetch(`${API_BASE_URL}/admin/inventory/cup-shapes/${c.id}`, { method: 'DELETE' });
      success('Deleted.'); fetchCups();
    } catch { error('Delete failed.'); }
  };

  return (
    <div className="inv-card">
      <div className="inv-card-header">
        <h2>🔷 Master Cup Settings</h2>
        <button className="inv-add-btn" onClick={openAdd}>+ Add Cup Master</button>
      </div>

      {loading ? <div className="inv-loading">Loading...</div> : (
        <div className="inv-grid">
          {cups.map(c => {
             const parsedSizes = typeof c.sizes === 'string' ? JSON.parse(c.sizes) : (c.sizes || []);
             const parsedColors = typeof c.colors === 'string' ? JSON.parse(c.colors) : (c.colors || []);
             
             return (
              <div key={c.id} className={`inv-item ${!c.is_available ? 'inv-item-disabled' : ''}`}>
                <div className="inv-item-info">
                  <span className="inv-item-name">{c.name}</span>
                  <span className="inv-item-sub">
                    Base: {Number(c.price_modifier || 0).toFixed(2)} L.E. | {parsedSizes.length} Sizes | {parsedColors.length} Glass Colors
                  </span>
                </div>
                <div className="inv-item-actions">
                  <button className="inv-edit-btn" onClick={() => openEdit(c)}>Edit Details</button>
                  <button className="inv-delete-btn" onClick={() => handleDelete(c)}>Delete</button>
                </div>
              </div>
             )
          })}
        </div>
      )}

      {showDialog && (
        <div className="inv-dialog-overlay" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="inv-dialog" style={{ maxWidth: '700px' }}>
            <div className="inv-dialog-header">
              <h3>{editingCup ? 'Edit Master Cup' : 'New Master Cup'}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>
            
            <div className="inv-dialog-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* --- 1. CORE SETTINGS --- */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div className="inv-field" style={{ flex: 1 }}>
                  <label>Cup Shape Name</label>
                  <input className="inv-input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="inv-field" style={{ flex: 1 }}>
                  <label>Base Price (L.E.)</label>
                  <input className="inv-input" type="number" value={priceModifier} onChange={e => setPriceModifier(e.target.value)} />
                </div>
              </div>

              <div className="inv-field">
                <label>Linked 3D Model</label>
                <select className="inv-input" value={modelUrl} onChange={e => setModelUrl(e.target.value)}>
                  <option value="">Select a 3D Model</option>
                  {availableModels.map(m => <option key={m.id} value={m.model_url}>{m.name}</option>)}
                </select>
              </div>

              <div className="inv-field" style={{ marginBottom: '30px' }}>
                <input type="checkbox" id="avail" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                <label htmlFor="avail" style={{ marginLeft: '8px', cursor: 'pointer' }}>Available on Storefront</label>
              </div>

              {/* --- 2. SIZES FOR THIS CUP --- */}
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#333' }}>Available Sizes</h4>
                  <button onClick={() => setSizes([...sizes, { ml: '', price_modifier: 0 }])} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>+ Add Size</button>
                </div>
                
                {sizes.length === 0 && <p style={{ fontSize: '12px', color: '#666' }}>No sizes added yet.</p>}
                
                {sizes.map((s, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Size (ml)</label>
                      <input className="inv-input" type="number" value={s.ml} onChange={e => { const newArr = [...sizes]; newArr[index].ml = e.target.value; setSizes(newArr); }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Price (+ L.E.)</label>
                      <input className="inv-input" type="number" value={s.price_modifier} onChange={e => { const newArr = [...sizes]; newArr[index].price_modifier = e.target.value; setSizes(newArr); }} />
                    </div>
                    <button onClick={() => setSizes(sizes.filter((_, i) => i !== index))} style={{ height: '38px', padding: '0 15px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  </div>
                ))}
              </div>

              {/* --- 3. COLORS FOR THIS CUP --- */}
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#333' }}>Available Glass/Cup Colors</h4>
                  <button onClick={() => setColors([...colors, { name: '', hex_code: '#ffffff', price_modifier: 0 }])} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>+ Add Color</button>
                </div>
                
                {colors.length === 0 && <p style={{ fontSize: '12px', color: '#666' }}>No colors added yet.</p>}

                {colors.map((c, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Color Name</label>
                      <input className="inv-input" type="text" value={c.name} onChange={e => { const newArr = [...colors]; newArr[index].name = e.target.value; setColors(newArr); }} />
                    </div>
                    
                    <div style={{ width: '50px' }}>
                      <label style={{ fontSize: '12px' }}>Hex</label>
                      <input type="color" value={c.hex_code} onChange={e => { const newArr = [...colors]; newArr[index].hex_code = e.target.value; setColors(newArr); }} style={{ height: '38px', width: '100%', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px' }}>Price (+ L.E.)</label>
                      <input className="inv-input" type="number" value={c.price_modifier} onChange={e => { const newArr = [...colors]; newArr[index].price_modifier = e.target.value; setColors(newArr); }} />
                    </div>

                    <button onClick={() => setColors(colors.filter((_, i) => i !== index))} style={{ height: '38px', padding: '0 15px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  </div>
                ))}
              </div>

            </div>
            
            <div className="inv-dialog-footer">
              <button onClick={handleSubmit} className="inv-save-btn">{submitting ? 'Processing...' : 'Save Master Setup'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const [isAvailable, setIsAvailable] = useState(true);
  const [modelFile, setModelFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [layerNames, setLayerNames] = useState(['']); 

  useEffect(() => {
    const num = parseInt(layers) || 1;
    setLayerNames(prev => {
      const newArr = [...prev];
      while (newArr.length < num) newArr.push('');
      while (newArr.length > num) newArr.pop();
      return newArr;
    });
  }, [layers]);

  const handleLayerNameChange = (index, value) => {
    const newArr = [...layerNames];
    newArr[index] = value;
    setLayerNames(newArr);
  };

  const openAdd = () => {
    setEditingModel(null);
    setName(''); setType('cup'); setLayers(1); setFlatShading(false);
    setIsAvailable(true); setModelFile(null); setThumbnailFile(null);
    setLayerNames(['']);
    setShowDialog(true);
  };

  const openEdit = (m) => {
    setEditingModel(m);
    setName(m.name); setType(m.type); setLayers(m.layers || 1);
    setFlatShading(!!m.flat_shading); setIsAvailable(!!m.is_available);
    setModelFile(null); setThumbnailFile(null);
    try {
      const parts = typeof m.colorable_parts === 'string' ? JSON.parse(m.colorable_parts) : m.colorable_parts;
      if (Array.isArray(parts) && parts.length > 0) setLayerNames(parts);
      else setLayerNames(Array(m.layers || 1).fill(''));
    } catch(e) { setLayerNames(Array(m.layers || 1).fill('')); }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!name || !type) { error('Name and type are required.'); return; }
    if (!editingModel && !modelFile) { error('Please upload a .glb model file.'); return; }
    if (layerNames.some(ln => ln.trim() === '')) { error('Please provide a mesh name for every layer.'); return; }

    setSubmitting(true);
    try {
      const partsArrayString = JSON.stringify(layerNames.map(s => s.trim()));

      if (editingModel) {
        const res = await fetch(`${API_BASE_URL}/admin/models/${editingModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, type, layers: parseInt(layers), flat_shading: flatShading,
            colorable_parts: partsArrayString, is_available: isAvailable
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
        formData.append('colorable_parts', partsArrayString);
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
                  <span className="inv-item-sub">{m.type} • {m.layers} Layer(s)</span>
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
          <div className="inv-dialog" style={{ maxWidth: '600px' }}>
            <div className="inv-dialog-header">
              <h3>{editingModel ? 'Edit Model Info' : 'Upload Model'}</h3>
              <button className="inv-dialog-close" onClick={() => setShowDialog(false)}>×</button>
            </div>
            <div className="inv-dialog-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="inv-field" style={{ flex: 1 }}>
                  <label>Name</label>
                  <input className="inv-input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="inv-field" style={{ flex: 1 }}>
                  <label>Number of Layers</label>
                  <input className="inv-input" type="number" min="1" value={layers} onChange={e => setLayers(e.target.value)} />
                </div>
                <div className="inv-field" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <input type="checkbox" id="flatShading" style={{ width: '18px', height: '18px', cursor: 'pointer' }} checked={flatShading} onChange={e => setFlatShading(e.target.checked)} />
                  <label htmlFor="flatShading" style={{ margin: 0, cursor: 'pointer' }}>Flat Shading</label>
                </div>
              </div>

              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginTop: '10px', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Name Your Layers</h4>
                <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666' }}>Type the exact mesh name from Blender (e.g. <strong>Sphere.001</strong>).</p>
                
                {layerNames.map((layerName, index) => (
                  <div key={index} className="inv-field">
                    <label style={{ fontSize: '12px' }}>Layer {index + 1} Mesh Name</label>
                    <input className="inv-input" placeholder={`e.g. Sphere.00${index + 1}`} value={layerName} onChange={e => handleLayerNameChange(index, e.target.value)} />
                  </div>
                ))}
              </div>

              {!editingModel && (
                <div className="inv-field">
                  <label>GLB File</label>
                  <input type="file" accept=".glb" onChange={e => setModelFile(e.target.files[0])} />
                </div>
              )}

            </div>
            <div className="inv-dialog-footer">
              <button onClick={handleSubmit} className="inv-save-btn">{submitting ? 'Processing...' : 'Save Config'}</button>
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

  const [activeKey, setActiveKey]     = useState('cup-shapes'); 
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
  const isCupsTab = activeKey === 'cup-shapes'; 

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
    if (!isModelsTab && !isCupsTab) fetchItems();
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

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${category.display(item)}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inventory/${category.endpoint}/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      success(`${category.label} deleted.`);
      fetchItems();
    } catch (err) { error('Failed to delete item.'); }
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
    { key: 'cup-shapes',     label: 'Cup Setup',      icon: '🔷' }, 
    { key: 'mold-shapes',    label: 'Mold Shapes',    icon: '🔶' },
    { key: 'colors',         label: 'Wax Colors',     icon: '🎨' },
    { key: 'scent-families', label: 'Scent Families', icon: '🌿' },
    { key: 'scents',         label: 'Scents',         icon: '🕯️' },
    { key: 'models',         label: '3D Models',      icon: '🧊' },
  ];

  return (
    <div className="home-container inventory-bg">
      <Navbar />
      <div className="inventory-wrapper">
        <div className="inventory-header">
          <div><h1 className="inventory-title">Inventory Management</h1></div>
          <Link to="/Dashboard" className="inv-back-btn">← Dashboard</Link>
        </div>

        <div className="inv-tabs">
          {ALL_TABS.map(tab => (
            <button key={tab.key} className={`inv-tab ${activeKey === tab.key ? 'active' : ''}`} onClick={() => setActiveKey(tab.key)}>
              <span>{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>

        {isModelsTab ? (
          <ModelsTab notify={{ success, error }} models={availableModels} fetchModels={fetchModels} />
        ) : isCupsTab ? (
          <CupsTab notify={{ success, error }} availableModels={availableModels} />
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

      {showDialog && !isModelsTab && !isCupsTab && (
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