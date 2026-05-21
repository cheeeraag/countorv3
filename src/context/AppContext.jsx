import { createContext, useContext, useState, useEffect } from 'react'
import {
  getSession, setSession, clearSession,
  getHistory, addEntry, getUserByEmail,
  SUPERADMIN_EMAIL,
} from '../utils/storage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user,    setUser]    = useState(null)   // { name, email, role, orgId, approved }
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (session) {
      // Re-hydrate role from users store in case it changed (e.g. org approved)
      const fresh = getUserByEmail(session.email)
      const merged = fresh ? { ...session, role: fresh.role, orgId: fresh.orgId, approved: fresh.approved } : session
      setUser(merged)
      setSession(merged)
      setHistory(getHistory(merged.email))
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setSession(userData)
    setUser(userData)
    setHistory(getHistory(userData.email))
  }

  const logout = () => {
    clearSession()
    setUser(null)
    setHistory([])
  }

  const saveCheckin = (result) => {
    const updated = addEntry(user.email, result)
    setHistory(updated)
    return updated
  }

  // Helpers
  const isSuperAdmin = user?.role === 'superadmin'
  const isOrgAdmin   = user?.role === 'org_admin'
  const isAdmin      = isSuperAdmin || isOrgAdmin
  const isPending    = user?.role === 'org_admin_pending'
  const isRejected   = user?.role === 'rejected'

  return (
    <AppContext.Provider value={{
      user, history, loading,
      login, logout, saveCheckin,
      isSuperAdmin, isOrgAdmin, isAdmin, isPending, isRejected,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
