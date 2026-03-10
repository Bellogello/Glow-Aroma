import React, { useState } from 'react';
import { Nav, Tab, Table, Badge } from 'react-bootstrap'; // Removed 'Container'
import Navbar from '../components/Navbar';
import '../styles/dashboard.css';

const Dashboard = () => {
  const [orders] = useState([
    { id: '#1024', customer: 'Habiba Elsayed', date: 'Oct 24, 2026', total: '$43.49', status: 'Processing' },
    { id: '#1023', customer: 'Haged Hesham', date: 'Oct 23, 2026', total: '$18.50', status: 'Shipped' },
    { id: '#1022', customer: 'Sarah Johnson', date: 'Oct 21, 2026', total: '$65.00', status: 'Delivered' },
  ]);

  const [products] = useState([
    { id: 'P01', name: 'Matte Black Jar', stock: 45, price: '$24.99' },
    { id: 'P02', name: 'Classic Glass', stock: 12, price: '$18.50' },
    { id: 'P03', name: 'Travel Tin', stock: 0, price: '$12.00' },
  ]);

  return (
    <div className="home-container dashboard-bg">
      <Navbar />
      
      {/* Changed this from a Bootstrap Container to a plain div */}
      <div className="dashboard-container">
        <Tab.Container id="dashboard-tabs" defaultActiveKey="orders">
          
          <div className="dashboard-layout">
            
            {/* 1. THE SIDEBAR */}
            <div className="dashboard-sidebar">
              <h3 className="sidebar-title">Admin Panel</h3>
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

              </Tab.Content>
            </div>

          </div>
        </Tab.Container>
      </div>
    </div>
  );
};

export default Dashboard;