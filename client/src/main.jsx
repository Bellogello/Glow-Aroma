import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/style.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
// 1. Import the "Central Brain"
import { GOOGLE_CLIENT_ID } from './config'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Use the GOOGLE_CLIENT_ID from config.js which has the fallback */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)