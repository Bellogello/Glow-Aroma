import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/style.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GOOGLE_CLIENT_ID } from './config'
import { NotificationProvider } from './components/NotificationContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Use the GOOGLE_CLIENT_ID from config.js which has the fallback */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)