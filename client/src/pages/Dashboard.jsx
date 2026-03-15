import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav, Tab, Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  // --- AUTH & ROLES ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  // --- REAL DATABASE STATES ---
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DIALOG VISIBILITY STATES ---
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  // --- FORM STATES ---
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [productForm, setProductForm] = useState({ name: '', price: '', stock_quantity: '', description: '', image_url: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatusId, setNewStatusId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // --- FEEDBACK STATES ---
  const [dialogError, setDialogError] = useState('');
  const [dialogSuccess, setDialogSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const roleId = localStorage.getItem('roleId');
    const uId = localStorage.getItem('userId');
    
    if (!roleId || roleId === '1') {
      alert('Access Denied: Admin permissions required.');
      navigate('/');
    } else {
      setIsAuthorized(true);
      setUserRole(roleId);
      setUserId(uId);
      fetchDashboardData();
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes, staffRes] = await Promise.all([
        fetch('http://localhost:5000/products'),
        fetch('http://localhost:5000/admin/orders'),
        fetch('http://localhost:5000/admin/staff'),
      ]);
      const [prodData, orderData, staffData] = await Promise.all([
        prodRes.json(),
        orderRes.json(),
        staffRes.json(),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDialogState = () => {
    setDialogError('');
    setDialogSuccess('');
    setSubmitting(false);
  };

  const getStatusLabel = (statusId) => {
    if (statusId === 1) return 'Processing';
    if (statusId === 2) return 'Shipped';
    if (statusId === 3) return 'Delivered';
    return 'Unknown';
  };

  const getStatusBg = (statusId) => {
    if (statusId === 1) return 'warning';
    if (statusId === 2) return 'info';
    if (statusId === 3) return 'success';
    return 'secondary';
  };

  // --- STAFF ---
  const handleOpenAddStaff = () => {
    setStaffForm({ name: '', email: '', phone: '', password: '' });
    resetDialogState();
    setShowAddStaffDialog(true);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDialogError('');
    setDialogSuccess('');
    try {
      const res = await fetch('http://localhost:5000/admin/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add staff member.');
      setDialogSuccess('Staff member added successfully!');
      setStaff((prev) => [...prev, data.newStaff]);
      setTimeout(() => setShowAddStaffDialog(false), 1500); 
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/staff/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove staff member.');
      setStaff((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- PRODUCTS ---
  const handleOpenAddProduct = () => {
    setProductForm({ name: '', price: '', stock_quantity: '', description: '', image_url: '' });
    resetDialogState();
    setShowAddProductDialog(true);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDialogError('');
    setDialogSuccess('');
    try {
      const res = await fetch('http://localhost:5000/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add product.');
      setDialogSuccess('Product added successfully!');
      setProducts((prev) => [...prev, data.newProduct]);
      setTimeout(() => setShowAddProductDialog(false), 1500); 
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- ORDERS ---
  const handleOpenOrderDialog = (order) => {
    setSelectedOrder(order);
    setNewStatusId(String(order.status_id));
    resetDialogState();
    setShowOrderDialog(true);
  };

  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDialogError('');
    setDialogSuccess('');
    try {
      const res = await fetch(`http://localhost:5000/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: Number(newStatusId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order status.');
      setDialogSuccess('Order status updated!');
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, status_id: Number(newStatusId) } : o))
      );
      setTimeout(() => setShowOrderDialog(false), 1500); 
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- DELETE ACCOUNT ---
  const handleOpenDeleteAccount = () => {
    setDeletePassword('');
    resetDialogState();
    setShowDeleteAccountDialog(true);
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDialogError('');
    
    try {
      const res = await fetch(`http://localhost:5000/admin/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete account.');
      
      alert("Account successfully deleted. You will now be logged out.");
      localStorage.clear();
      navigate('/');
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <>
      <div className="home-container dashboard-bg">
        <Navbar />
        <div className="dashboard-container">
          <Tab.Container id="dashboard-tabs" defaultActiveKey="orders">
            <div className="dashboard-layout">

              {/* SIDEBAR */}
              <div className="dashboard-sidebar">
                <h3 className="sidebar-title">
                  {userRole === '3' ? 'Super Admin Panel' : 'Admin Panel'}
                </h3>
                <Nav variant="pills" className="flex-column custom-sidebar-nav">
                  <Nav.Item><Nav.Link eventKey="orders">Orders</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="products">Products Inventory</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="settings">Store Settings</Nav.Link></Nav.Item>
                  {userRole === '3' && (
                    <Nav.Item><Nav.Link eventKey="staff">Manage Staff</Nav.Link></Nav.Item>
                  )}
                </Nav>
              </div>

              {/* MAIN CONTENT */}
              <div className="dashboard-content-area">
                <Tab.Content>

                  {/* ORDERS TAB */}
                  <Tab.Pane eventKey="orders">
                    <div className="dashboard-card">
                      <div className="card-header-flex">
                        <h2>Recent Orders</h2>
                      </div>
                      {loading ? <p className="text-muted">Loading orders...</p> : (
                        <Table responsive className="custom-table borderless">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Customer</th>
                              <th>Date</th>
                              <th>Total</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.length === 0
                              ? <tr><td colSpan="6" className="text-center text-muted">No orders found.</td></tr>
                              : orders.map((order) => (
                                <tr key={order.id} className="table-row-hover">
                                  <td><strong>#{order.id}</strong></td>
                                  <td>{order.customer_name}</td>
                                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                  <td>{Number(order.total).toFixed(2)} L.E.</td>
                                  <td>
                                    <Badge bg={getStatusBg(order.status_id)} className="custom-badge">
                                      {getStatusLabel(order.status_id)}
                                    </Badge>
                                  </td>
                                  <td>
                                    <button className="btn-action" onClick={() => handleOpenOrderDialog(order)}>
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      )}
                    </div>
                  </Tab.Pane>

                  {/* PRODUCTS TAB */}
                  <Tab.Pane eventKey="products">
                    <div className="dashboard-card">
                      <div className="card-header-flex">
                        <h2>Products Inventory</h2>
                        <button className="btn btn-gold custom-pill-btn-small" onClick={handleOpenAddProduct}>
                          + Add Product
                        </button>
                      </div>
                      {loading ? <p className="text-muted">Loading inventory...</p> : (
                        <Table responsive className="custom-table borderless">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Product Name</th>
                              <th>Stock Level</th>
                              <th>Price</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.length === 0
                              ? <tr><td colSpan="5" className="text-center text-muted">No products found.</td></tr>
                              : products.map((product) => (
                                <tr key={product.id} className="table-row-hover">
                                  <td>{product.id}</td>
                                  <td><strong>{product.name}</strong></td>
                                  <td>
                                    <span className={product.stock_quantity === 0 ? 'text-danger fw-bold' : ''}>
                                      {product.stock_quantity} units
                                    </span>
                                  </td>
                                  <td>{Number(product.price).toFixed(2)} L.E.</td>
                                  <td><button className="btn-action">Edit</button></td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      )}
                    </div>
                  </Tab.Pane>

                  {/* SETTINGS TAB */}
                  <Tab.Pane eventKey="settings" className="h-100">
                    <div className="dashboard-card d-flex flex-column" style={{ minHeight: '60vh' }}>
                      
                      {/* Top Section: Normal Settings */}
                      <div>
                        <h2>Store Settings</h2>
                        <p className="text-muted mt-3">Manage your personal account settings below.</p>
                        <hr className="my-4" />
                        
                        {/* Future normal settings (like changing your name/email) will go here! */}
                        
                      </div>

                      {/* Bottom Section: Danger Zone (Pushed to the very bottom) */}
                      <div className="danger-zone p-4 rounded-4 mt-auto" style={{ backgroundColor: '#fff5f5', border: '2px dashed #f5c6cb' }}>
                        <h5 className="text-danger fw-bold mb-2">Danger Zone</h5>
                        <p className="text-muted mb-3" style={{ fontSize: '0.95rem' }}>
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button 
                          className="btn btn-outline-danger rounded-pill px-4 fw-bold" 
                          onClick={handleOpenDeleteAccount}
                        >
                          Delete My Account
                        </button>
                      </div>

                    </div>
                  </Tab.Pane>

                  {/* STAFF TAB */}
                  {userRole === '3' && (
                    <Tab.Pane eventKey="staff">
                      <div className="dashboard-card">
                        <div className="card-header-flex">
                          <h2>Staff Management</h2>
                          <button className="btn btn-gold custom-pill-btn-small" onClick={handleOpenAddStaff}>
                            + Add New Admin
                          </button>
                        </div>
                        <p className="text-muted">Manage your admin team below.</p>
                        {loading ? <p className="text-muted">Loading staff...</p> : (
                          <Table responsive className="custom-table borderless">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {staff.map((member) => (
                                <tr key={member.id} className="table-row-hover">
                                  <td>{member.id}</td>
                                  <td><strong>{member.name}</strong></td>
                                  <td>{member.email}</td>
                                  <td>
                                    <Badge bg={member.role_id === 3 ? 'danger' : 'primary'} className="custom-badge">
                                      {member.role_id === 3 ? 'Super Admin' : 'Admin'}
                                    </Badge>
                                  </td>
                                  <td>
                                    {member.role_id !== 3 && (
                                      <button className="btn-action-danger" onClick={() => handleRemoveStaff(member.id)}>
                                        Remove
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </div>
                    </Tab.Pane>
                  )}

                </Tab.Content>
              </div>
            </div>
          </Tab.Container>
        </div>
      </div>

      {/* ============================================================ */}
      {/* THE PURE CSS DIALOG BOXES                                    */}
      {/* ============================================================ */}

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

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Full Name</Form.Label>
                <Form.Control type="text" className="custom-input" placeholder="Enter full name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Email Address</Form.Label>
                <Form.Control type="email" className="custom-input" placeholder="Enter email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Phone Number</Form.Label>
                <Form.Control type="tel" className="custom-input" placeholder="Enter phone number" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Password</Form.Label>
                <Form.Control type="password" className="custom-input" placeholder="Set a temporary password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required minLength={6} />
              </Form.Group>

              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddStaffDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Add Admin'}
                </button>
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

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Product Name</Form.Label>
                <Form.Control type="text" className="custom-input" placeholder="e.g. Lavender Bliss" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
              </Form.Group>

              <div className="d-flex gap-3 mb-3">
                  <Form.Group className="flex-fill">
                  <Form.Label className="fw-semibold">Price (L.E.)</Form.Label>
                  <Form.Control type="number" className="custom-input" placeholder="0.00" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                  </Form.Group>

                  <Form.Group className="flex-fill">
                  <Form.Label className="fw-semibold">Stock Quantity</Form.Label>
                  <Form.Control type="number" className="custom-input" placeholder="0" min="0" value={productForm.stock_quantity} onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })} required />
                  </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Description</Form.Label>
                <Form.Control as="textarea" className="custom-input" rows={2} placeholder="Describe the product..." value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Image URL</Form.Label>
                <Form.Control type="url" className="custom-input" placeholder="https://..." value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} />
              </Form.Group>

              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddProductDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Add Product'}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DIALOG */}
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

              <div className="order-details-box mb-4">
                <p className="mb-2"><strong>Customer:</strong> <span className="text-muted">{selectedOrder.customer_name}</span></p>
                <p className="mb-2"><strong>Date:</strong> <span className="text-muted">{new Date(selectedOrder.created_at).toLocaleDateString()}</span></p>
                <p className="mb-2"><strong>Total:</strong> <span className="fw-bold text-success">{Number(selectedOrder.total).toFixed(2)} L.E.</span></p>
                <div className="d-flex align-items-center mt-3">
                  <strong className="me-2">Current Status:</strong>
                  <Badge bg={getStatusBg(selectedOrder.status_id)} className="custom-badge fs-6">
                    {getStatusLabel(selectedOrder.status_id)}
                  </Badge>
                </div>
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
                <button type="submit" className="btn btn-gold-solid" disabled={submitting}>
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
                </button>
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
              
              <Alert variant="warning" className="rounded-4 mb-4">
                <strong>Warning:</strong> This action is permanent and cannot be undone. All of your data will be erased.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                <Form.Control type="password" className="custom-input" placeholder="Enter your password to confirm" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required />
              </Form.Group>

              <div className="dialog-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setShowDeleteAccountDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger rounded-pill px-4 fw-bold" disabled={submitting}>
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Permanently Delete'}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

    </>
  );
};

export default Dashboard;