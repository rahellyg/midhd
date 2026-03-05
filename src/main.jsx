import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.jsx'
import '@/index.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Activate the new service worker and reload so users always see latest changes.
    updateSW(true)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
