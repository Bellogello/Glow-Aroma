import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';     
import { Nav, Tab, Table, Badge } from 'react-bootstrap'; 
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // We save the specific role so we can hide/show the Super Admin buttons
  const [userRole, setUserRole] = useState(null); 

  // --- SECURITY BOUNCER ---
  useEffect(() => {
    const roleId = localStorage.getItem("roleId");

    // If no role found OR if user is a customer (role 1), kick them out
    if (!roleId || roleId === '1') {
      alert("Access Denied: Admin permissions required.");
      navigate('/'); 
    } else {
      setIsAuthorized(true);
      setUserRole(roleId); // Save whether they are a 2 (Admin) or 3 (Super Admin)
    }
  }, [navigate]);

  const [orders] = useState([
    { id: '#1024', customer: 'Habiba Elsayed', date: 'Oct 24, 2026', total: '43.49 L.E.', status: 'Processing' },
    { id: '#1023', customer: 'Haged Hesham', date: 'Oct 23, 2026', total: '18.50 L.E.', status: 'Shipped' },
    { id: '#1022', customer: 'Sarah Johnson', date: 'Oct 21, 2026', total: '65.00 L.E.', status: 'Delivered' },
  ]);

  const [products] = useState([
    { id: 'P01', name: 'Matte Black Jar', stock: 45, price: '24.99 L.E.' },
    { id: 'P02', name: 'Classic Glass', stock: 12, price: '18.50 L.E.' },
    { id: 'P03', name: 'Travel Tin', stock: 0, price: '12.00 L.E.' },
  ]);

  // Don't render anything if the user isn't authorized yet (prevents "flicker")
  if (!isAuthorized) return null;

  return (
    <div className="home-container dashboard-bg">
      <Navbar />
      
      <div className="dashboard-container">
        <Tab.Container id="dashboard-tabs" defaultActiveKey="orders">
          
          <div className="dashboard-layout">
            
            {/* 1. THE SIDEBAR */}
            <div className="dashboard-sidebar">
              <h3 className="sidebar-title">
                {userRole === '3' ? 'Super Admin Panel' : 'Admin Panel'}
              </h3>
              <Nav variant="pills" className="flex-column custom-sidebar-nav">
                <Nav.Item>
                  <Nav.Link eventKey="orders">Orders</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="products">Products Inventory</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="settings">Store Settings</Nav.Link>
                </Nav.Item>

                {/* --- SUPER ADMIN ONLY TAB --- */}
                {userRole === '3' && (
                  <Nav.Item>
                    <Nav.Link eventKey="staff">Manage Staff</Nav.Link>
                  </Nav.Item>
                )}

              </Nav>
            </div>

            {/* 2. THE MAIN CONTENT AREA */}
            <div className="dashboard-content-area">
              <Tab.Content>
                
                {/* ORDERS TAB */}
                <Tab.Pane eventKey="orders">
                  <div className="dashboard-card">
                    <div className="card-header-flex">
                      <h2>Recent Orders</h2>
                    </div>
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
                        {orders.map((order, index) => (
                          <tr key={index}>
                            <td><strong>{order.id}</strong></td>
                            <td>{order.customer}</td>
                            <td>{order.date}</td>
                            <td>{order.total}</td>
                            <td>
                              <Badge 
                                bg={order.status === 'Processing' ? 'warning' : order.status === 'Shipped' ? 'info' : 'success'}
                                className="custom-badge"
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td><button className="btn-action">View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Tab.Pane>

                {/* PRODUCTS TAB */}
                <Tab.Pane eventKey="products">
                  <div className="dashboard-card">
                    <div className="card-header-flex">
                      <h2>Products Inventory</h2>
                      <button className="btn custom-pill-btn-small">+ Add Product</button>
                    </div>
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
                        {products.map((product, index) => (
                          <tr key={index}>
                            <td>{product.id}</td>
                            <td><strong>{product.name}</strong></td>
                            <td>
                                <span className={product.stock === 0 ? 'text-danger fw-bold' : ''}>
                                    {product.stock} units
                                </span>
                            </td>
                            <td>{product.price}</td>
                            <td><button className="btn-action">Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Tab.Pane>

                {/* SETTINGS TAB */}
                <Tab.Pane eventKey="settings">
                  <div className="dashboard-card">
                    <h2>Store Settings</h2>
                    <p className="text-muted">General configurations will go here.</p>
                  </div>
                </Tab.Pane>

                {/* STAFF MANAGEMENT TAB (Super Admin Only) */}
                {userRole === '3' && (
                  <Tab.Pane eventKey="staff">
                    <div className="dashboard-card">
                      <div className="card-header-flex">
                        <h2>Staff Management</h2>
                        <button className="btn custom-pill-btn-small">+ Add New Admin</button>
                      </div>
                      <p className="text-muted">Only Super Admins can see this page. Here you can promote users to Admins or remove their access.</p>
                      {/* You can add a table here later to list all admins! */}
                    </div>
                  </Tab.Pane>
                )}

              </Tab.Content>
            </div>

          </div>
        </Tab.Container>
      </div>
    </div>
  );
};

export default Dashboard;