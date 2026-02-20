import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/logo.png'; 
import '../styles/Navbar.css'; 

function AppNavbar() {
  return (
    <Navbar collapseOnSelect expand="lg" className="custom-navbar">
<Container>
  <Navbar.Brand href="/">          {/* logo */}
    <img src={logo} className="logo" alt="Glow Aroma" />
  </Navbar.Brand>


  <Navbar.Collapse id="responsive-navbar-nav">
    <Nav className="links">   {/* ms-auto pushes to right */}
      <Nav.Link href="/">Home</Nav.Link>
      <Nav.Link href="/contact">Contact</Nav.Link>
      <Nav.Link href="/products">Products</Nav.Link>
      <Nav.Link href="/cart" className='cart'></Nav.Link>
      <Nav.Link href="/profile" className='profile'></Nav.Link>
    </Nav>
  </Navbar.Collapse>
</Container>
    </Navbar>
  );
}

export default AppNavbar;