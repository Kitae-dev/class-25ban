import React, { createContext, useContext, useState } from 'react'
const Ctx = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('class_admin') === 'true')
  const login = (pw) => {
    const correct = import.meta.env.VITE_ADMIN_PASSWORD || 'class1234'
    if (pw === correct) { sessionStorage.setItem('class_admin','true'); setIsAdmin(true); return true }
    return false
  }
  const logout = () => { sessionStorage.removeItem('class_admin'); setIsAdmin(false) }
  return <Ctx.Provider value={{ isAdmin, login, logout }}>{children}</Ctx.Provider>
}
export const useAdmin = () => useContext(Ctx)
