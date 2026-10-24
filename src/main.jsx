import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StudioProvider } from './state/StudioContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StudioProvider>
        <App />
      </StudioProvider>
    </BrowserRouter>
  </StrictMode>,
)
