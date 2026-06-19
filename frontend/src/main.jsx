import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // Keep only this CSS import
import App from './App.jsx'
// Remove the import './output.css' line

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)