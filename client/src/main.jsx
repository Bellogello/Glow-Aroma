import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/style.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'; // <-- 1. Add the import here

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Wrap your router and app inside the Google Provider */}
    <GoogleOAuthProvider clientId="923168446479-6gk364rg4ilvg0p9j5v5vnre6su00qi0.apps.googleusercontent.com">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)