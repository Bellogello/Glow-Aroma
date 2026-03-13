import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom'; 
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';

function AppNavbar() {
  const [expanded, setExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation(); 

  useEffect(() => {
    // Check if they are Admin (2) or Super Admin (3)
    const roleId = localStorage.getItem("roleId");
    setIsAdmin(roleId === '2' || roleId === '3');
  }, [location]); 

  return (
    <Navbar 
      collapseOnSelect 
      expand="lg" 
      className={`custom-navbar ${expanded ? 'nav-expanded' : ''}`} 
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/">
          <img src={logo} alt="Glow Aroma Logo" className="logo" />
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="responsive-navbar-nav" />

        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {isAdmin && (
              <Nav.Link 
                as={Link} 
                to="/Dashboard" 
                className="dashboard-link"
                onClick={() => setExpanded(false)}
              >
                Dashboard
              </Nav.Link>
            )}
            <Nav.Link as={Link} to="/" onClick={() => setExpanded(false)}>Home</Nav.Link>
            

            <Nav.Link as={Link} to="/contact" onClick={() => setExpanded(false)}>Contact</Nav.Link>
            <Nav.Link as={Link} to="/products" onClick={() => setExpanded(false)}>Products</Nav.Link>

            <div className="icon-group">
              <Nav.Link as={Link} to="/cart" className="cart" onClick={() => setExpanded(false)}></Nav.Link>
              <Nav.Link as={Link} to="/profile" className="profile" onClick={() => setExpanded(false)}></Nav.Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;