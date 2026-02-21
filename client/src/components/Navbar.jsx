import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';

function AppNavbar() {
  return (
    <Navbar collapseOnSelect expand="lg" variant="light" className="custom-navbar">
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
            <Nav.Link className="home" href="/">Home</Nav.Link>
            <Nav.Link className="contact" href="/contact">Contact</Nav.Link>
            <Nav.Link className="products" href="/products">Products</Nav.Link>
            
            {/* The wrapper that keeps icons side-by-side */}
            <div className="icon-group">
              <Nav.Link href="/cart" className="cart"></Nav.Link>
              <Nav.Link href="/profile" className="profile"></Nav.Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;