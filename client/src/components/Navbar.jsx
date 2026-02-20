import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import logo from '../assets/logo.png'; 
import '../styles/Navbar.css'; 

function AppNavbar() {
  return (
    <Navbar collapseOnSelect expand="lg" className="bg-body-tertiary">
      <Container>
        {/* 1. Use Navbar.Brand for your logo */}
        <Navbar.Brand href="/">
          <img src={logo} 
            alt="Glow Aroma Logo" className="logo" />
        </Navbar.Brand>

        {/* 2. Toggle button for mobile */}
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />

        {/* 3. Everything inside Collapse will hide on mobile */}
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="/contact">Contact</Nav.Link>
            <Nav.Link href="/products">Products</Nav.Link>
            
            <NavDropdown title="Services" id="basic-nav-dropdown">
              <NavDropdown.Item href="#action/3.1">Design</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.2">Development</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href="#action/3.3">Consulting</NavDropdown.Item>
            </NavDropdown>
          </Nav>

          {/* 4. Use a second Nav for right-aligned icons (Cart/Profile) */}
          <Nav className="ms-auto">
             <Nav.Link href="/cart" className="cart"></Nav.Link>
             <Nav.Link href="/profile" className="profile"></Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;