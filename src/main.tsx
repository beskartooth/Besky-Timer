import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Silent page-load usage count (no cookies / personal data). Fail quietly.
void fetch('https://abacus.jasoncameron.dev/hit/besky-nap-timer/page-loads').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Background alarm survivor — lives in public/sw.js → dist/sw.js with base './'.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
