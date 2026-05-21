// ─── Namespace + helpers ──────────────────────────────────────────────────────
const NS = 'countor_'
const s = {
  get:    (k)    => { try { const r = localStorage.getItem(NS+k); return r ? JSON.parse(r) : null } catch { return null } },
  set:    (k, v) => { try { localStorage.setItem(NS+k, JSON.stringify(v)) } catch {} },
  remove: (k)    => { try { localStorage.removeItem(NS+k) } catch {} },
}

// ─── Superadmin config ────────────────────────────────────────────────────────
// Change this to your own email before deploying.
export const SUPERADMIN_EMAIL = 'admin@countor.app'

// ─── Session ──────────────────────────────────────────────────────────────────
export const getSession   = ()     => s.get('session')
export const setSession   = (user) => s.set('session', user)
export const clearSession = ()     => s.remove('session')

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = () => s.get('users') || {}

export function saveUser(email, data) {
  const users = getUsers()
  users[email] = data
  s.set('users', users)
}

export function getUserByEmail(email) {
  return getUsers()[email] || null
}

// ─── Organisations ────────────────────────────────────────────────────────────
export function getOrgs()  { return s.get('orgs') || [] }
export function saveOrgs(orgs) { s.set('orgs', orgs) }

export function getOrgById(id) { return getOrgs().find(o => o.id === id) || null }

export function requestOrg(org) {
  // org = { id, name, adminEmail, adminName, createdAt, approved: false }
  const orgs = getOrgs().filter(o => o.id !== org.id)
  orgs.push(org)
  saveOrgs(orgs)
}

export function approveOrg(orgId) {
  const orgs = getOrgs().map(o => o.id === orgId ? { ...o, approved: true } : o)
  saveOrgs(orgs)
  // also flip the org_admin_pending user to org_admin
  const org   = orgs.find(o => o.id === orgId)
  if (org) {
    const users = getUsers()
    if (users[org.adminEmail]) {
      users[org.adminEmail].role = 'org_admin'
      users[org.adminEmail].approved = true
      s.set('users', users)
    }
  }
}

export function rejectOrg(orgId) {
  const org  = getOrgs().find(o => o.id === orgId)
  const orgs = getOrgs().filter(o => o.id !== orgId)
  saveOrgs(orgs)
  if (org) {
    const users = getUsers()
    if (users[org.adminEmail]) {
      users[org.adminEmail].role = 'rejected'
      s.set('users', users)
    }
  }
}

export function getApprovedOrgs() { return getOrgs().filter(o => o.approved) }
export function getPendingOrgs()  { return getOrgs().filter(o => !o.approved) }

// ─── Score history ────────────────────────────────────────────────────────────
const hKey = (email) => `history_${email.replace(/[@.]/g, '_')}`

export function getHistory(email) { return s.get(hKey(email)) || [] }

export function addEntry(email, entry) {
  const today   = new Date().toISOString().split('T')[0]
  let   history = getHistory(email).filter(h => h.date !== today)
  history.push({ ...entry, date: today, ts: Date.now() })
  history.sort((a, b) => new Date(a.date) - new Date(b.date))
  if (history.length > 365) history = history.slice(-365)
  s.set(hKey(email), history)
  return history
}

// ─── Data aggregation ─────────────────────────────────────────────────────────
// Returns all check-in records, optionally filtered by orgId
export function getAllData(orgId = null) {
  const users = getUsers()
  return Object.keys(users)
    .filter(email => !orgId || users[email].orgId === orgId)
    .flatMap(email =>
      getHistory(email).map(h => ({
        email,
        name:  users[email]?.name  || '',
        orgId: users[email]?.orgId || '',
        role:  users[email]?.role  || 'user',
        ...h,
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

// Returns users list, optionally filtered by orgId
export function getUsersList(orgId = null) {
  const users = getUsers()
  return Object.values(users)
    .filter(u => u.role !== 'superadmin')
    .filter(u => !orgId || u.orgId === orgId)
    .map(u => ({
      ...u,
      history:    getHistory(u.email),
      avgScore:   (() => { const h = getHistory(u.email); return h.length ? Math.round(h.reduce((s, e) => s + (e.score ?? e.wellness ?? 0), 0) / h.length) : null })(),
      lastCheckin: (() => { const h = getHistory(u.email); return h.length ? h[h.length - 1].date : null })(),
      lastTier:    (() => { const h = getHistory(u.email); return h.length ? h[h.length - 1].tier : null })(),
    }))
}

// ─── CSV export ───────────────────────────────────────────────────────────────
export function exportCSV(orgId = null, email = null) {
  let data
  if (email) {
    data = getHistory(email).map(h => ({ email, name: getUsers()[email]?.name || '', orgId: getUsers()[email]?.orgId || '', ...h }))
  } else {
    data = getAllData(orgId)
  }

  const headers = ['Date','Name','Email','Organisation','Wellness Score','Raw Score','Depression','Anxiety','Tier','Timestamp']
  const rows    = data.map(d => [
    d.date,
    d.name || '',
    d.email,
    d.orgId ? (getOrgById(d.orgId)?.name || d.orgId) : 'Individual',
    d.score ?? d.wellness ?? '',
    d.raw ?? '',
    d.depression ?? '',
    d.anxiety ?? '',
    d.tier || '',
    d.ts ? new Date(d.ts).toISOString() : '',
  ])

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  const org  = orgId ? getOrgById(orgId) : null
  a.download = org ? `countor_${org.name.replace(/\s+/g,'_')}.csv` : email ? `countor_${email}.csv` : 'countor_all.csv'
  a.click()
  URL.revokeObjectURL(url)
}
