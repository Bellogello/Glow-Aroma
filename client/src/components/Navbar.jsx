import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom'; 
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';
import { API_BASE_URL } from '../config';

function AppNavbar() {
  const [expanded, setExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation(); 

  const userId = localStorage.getItem('userId');

  const fetchCartCount = () => {
    if (!userId) {
      setCartCount(0);
      return;
    }
    
    fetch(`${API_BASE_URL}/cart/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);
          setCartCount(totalItems);
        }
      })
      .catch(err => console.error("Failed to fetch cart count:", err));
  };

  useEffect(() => {
    const roleId = localStorage.getItem('roleId');
    setIsAdmin(roleId === '2' || roleId === '3');
  }, [location]);

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, [userId]);

  const closeMenu = () => setExpanded(false);

  // ✨ NEW: Helper function to render icons so we don't duplicate code
  // We use Bootstrap's display classes (d-none, d-lg-flex) to control visibility
  const renderIcons = (isMobile) => (
    <div className={`icon-group ${isMobile ? 'd-flex d-lg-none mobile-icons' : 'd-none d-lg-flex desktop-icons'}`}>
      <div className="cart-icon-wrapper">
        <Nav.Link 
          as={Link} 
          to="/cart" 
          className="cart" 
          onClick={closeMenu}
          aria-label="View Cart"
        ></Nav.Link>
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </div>
      <Nav.Link 
        as={Link} 
        to="/profile" 
        className="profile" 
        onClick={closeMenu}
        aria-label="View Profile"
      ></Nav.Link>
    </div>
  );

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

        {/* --- 📱 MOBILE ICONS: Rendered right before the hamburger menu --- */}
        {renderIcons(true)}

        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto align-items-center">
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
          </Nav>

          {/* --- 💻 DESKTOP ICONS: Rendered at the end of the menu links --- */}
          {renderIcons(false)}

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;