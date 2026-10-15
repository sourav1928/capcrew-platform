import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AdminApp from '../src/admin/AdminApp'
import '../src/index.css'

// This is the admin website. It is built and deployed separately from the shop,
// so the shop never contains (or links to) any admin screens.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
  </React.StrictMode>
)
