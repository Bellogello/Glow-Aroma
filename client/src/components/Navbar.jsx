import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom'; 
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';
import { API_BASE_URL } from '../config'; // <-- Make sure to import this!

function AppNavbar() {
  const [expanded, setExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // <-- NEW: Cart state -->
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation(); 

  // Retrieve userId for fetching cart
  const userId = localStorage.getItem('userId');

  // <-- NEW: Function to fetch cart count -->
  const fetchCartCount = () => {
    if (!userId) {
      setCartCount(0);
      return;
    }
    
    fetch(`${API_BASE_URL}/cart/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Add up the 'quantity' of every item in the cart
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

  // <-- NEW: Effect to load cart count and listen for updates -->
  useEffect(() => {
    fetchCartCount();

    // Listen for global custom event when items are added/removed
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, [userId]);

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
              
              {/* --- NEW WRAPPER FOR CART AND BADGE --- */}
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
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;