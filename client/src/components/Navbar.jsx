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
    const roleId = localStorage.getItem('roleId');
    // roleId '2' = Admin, roleId '3' = Super Admin
    setIsAdmin(roleId === '2' || roleId === '3');
  }, [location]);

  const closeMenu = () => setExpanded(false);

  return (
    <Navbar 
      collapseOnSelect 
      expand="lg" 
      className={`custom-navbar ${expanded ? 'nav-expanded' : ''}`} 
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={closeMenu}>
          <img src={logo} alt="Glow Aroma Logo" className="logo" />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto align-items-center">
            
            {/* Only visible to Admin (2) and Super Admin (3) */}
            {isAdmin && (
              <Nav.Link 
                as={Link} 
                to="/Dashboard" 
                className="dashboard-link"
                onClick={closeMenu}
              >
                Dashboard
              </Nav.Link>
            )}

            <Nav.Link as={Link} to="/" onClick={closeMenu}>Home</Nav.Link>
            <Nav.Link as={Link} to="/contact" onClick={closeMenu}>Contact</Nav.Link>
            <Nav.Link as={Link} to="/products" onClick={closeMenu}>Products</Nav.Link>
            
            <div className="icon-group">
              <Nav.Link 
                as={Link} 
                to="/cart" 
                className="cart" 
                onClick={closeMenu}
                aria-label="View Cart"
              ></Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/profile" 
                className="profile" 
                onClick={closeMenu}
                aria-label="View Profile"
              ></Nav.Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;