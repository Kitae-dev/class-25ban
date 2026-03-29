import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider, useAdmin } from './lib/adminAuth.jsx'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import LoginPage from './pages/Login.jsx'

function ProtectedAdmin() {
  const { isAdmin } = useAdmin()
  return isAdmin ? <Admin /> : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*"           element={<Home />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/*"     element={<ProtectedAdmin />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  )
}
