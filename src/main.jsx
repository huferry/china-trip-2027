import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { InWindowProvider } from './contexts/InWindowContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <InWindowProvider>
        <App />
      </InWindowProvider>
    </AuthProvider>
  </StrictMode>,
)
