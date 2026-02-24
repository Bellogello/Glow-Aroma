import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';

function AppNavbar() {
  const [expanded, setExpanded] = useState(false);

  return (
<Navbar 
  collapseOnSelect 
  expand="lg" 
  className={`custom-navbar ${expanded ? 'nav-expanded' : ''}`} 
  expanded={expanded}
  onToggle={() => setExpanded(!expanded)}
>
      <Container>
        {/* Brand / Logo */}
        <Navbar.Brand href="/">
          <img src={logo} alt="Glow Aroma Logo" className="logo" />
        </Navbar.Brand>

        {/* The Hamburger Menu Toggle Button */}
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />

        {/* Collapsible content */}
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link className="home" href="/" onClick={() => setExpanded(false)}>Home</Nav.Link>
            <Nav.Link className="contact" href="/contact" onClick={() => setExpanded(false)}>Contact</Nav.Link>
            <Nav.Link className="products" href="/products" onClick={() => setExpanded(false)}>Products</Nav.Link>

            {/* The wrapper that keeps icons side-by-side */}
            <div className="icon-group">
              <Nav.Link href="/cart" className="cart" onClick={() => setExpanded(false)}></Nav.Link>
              <Nav.Link href="/profile" className="profile" onClick={() => setExpanded(false)}></Nav.Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;