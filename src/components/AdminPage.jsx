import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  getAllData, exportCSV, getUsersList,
  getOrgs, approveOrg, rejectOrg, getOrgById,
  SUPERADMIN_EMAIL,
} from '../utils/storage'
import { TIERS } from '../data/recommendations'
import { useApp } from '../context/AppContext'
import { PageShell, SectionHeader, Avatar } from './UI'

export function AdminPage() {
  const { user, isSuperAdmin, isOrgAdmin } = useApp()

  // Gate — should never reach here for regular users, but just in case
  if (!isSuperAdmin && !isOrgAdmin) {
    return (
      <PageShell>
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <p style={{ fontSize:40, marginBottom:12 }}>🚫</p>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:20, marginBottom:8 }}>Access Denied</h2>
          <p style={{ color:'var(--muted)', fontSize:14 }}>You do not have permission to view this page.</p>
        </div>
      </PageShell>
    )
  }

  return isSuperAdmin
    ? <SuperAdminDashboard />
    : <OrgAdminDashboard orgId={user.orgId} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPERADMIN DASHBOARD — full access
// ═══════════════════════════════════════════════════════════════════════════════
function SuperAdminDashboard() {
  const [tab, setTab] = useState('overview')

  const allData    = useMemo(() => getAllData(), [tab])
  const allUsers   = useMemo(() => getUsersList(), [tab])
  const allOrgs    = useMemo(() => getOrgs(), [tab])
  const pendingOrgs = allOrgs.filter(o => !o.approved)
  const approvedOrgs = allOrgs.filter(o => o.approved)

  const TABS = [
    { id:'overview', label:'📊 Overview' },
    { id:'orgs',     label:`🏢 Organisations ${pendingOrgs.length > 0 ? `(${pendingOrgs.length} pending)` : ''}` },
    { id:'users',    label:'👥 All Users' },
    { id:'export',   label:'📥 Export' },
  ]

  return (
    <PageShell>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"'Lora',serif", fontSize:22 }}>🔐 Superadmin Dashboard</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>{allUsers.length} users · {allOrgs.length} orgs · {allData.length} total check-ins</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--cream2)', padding:4, borderRadius:10, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'7px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .2s', background: tab===t.id ? 'var(--white)' : 'transparent', color: tab===t.id ? 'var(--green)' : 'var(--muted)', boxShadow: tab===t.id ? 'var(--shadow-sm)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab allData={allData} allUsers={allUsers} approvedOrgs={approvedOrgs} />}
      {tab === 'orgs'     && <OrgsTab allOrgs={allOrgs} onRefresh={() => setTab('overview')} />}
      {tab === 'users'    && <UsersTab users={allUsers} showOrg />}
      {tab === 'export'   && <ExportTab allData={allData} allUsers={allUsers} approvedOrgs={approvedOrgs} />}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ADMIN DASHBOARD — filtered to their org only
// ═══════════════════════════════════════════════════════════════════════════════
function OrgAdminDashboard({ orgId }) {
  const [tab,     setTab]     = useState('users')
  const [search,  setSearch]  = useState('')
  const org      = getOrgById(orgId)
  const orgData  = useMemo(() => getAllData(orgId), [tab])
  const orgUsers = useMemo(() => getUsersList(orgId), [tab])

  const filtered = search
    ? orgUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : orgUsers

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, background:'var(--green-pale)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏢</div>
          <div>
            <h1 style={{ fontFamily:"'Lora',serif", fontSize:20 }}>{org?.name || 'Organisation'} Admin</h1>
            <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>{orgUsers.length} members · {orgData.length} total check-ins</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--cream2)', padding:4, borderRadius:10, width:'fit-content' }}>
        {[['users','👥 Members'],['export','📥 Export']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:'7px 18px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background: tab===id ? 'var(--white)' : 'transparent', color: tab===id ? 'var(--green)' : 'var(--muted)', boxShadow: tab===id ? 'var(--shadow-sm)' : 'none', transition:'all .2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid-3" style={{ marginBottom:20 }}>
        {[
          { icon:'👥', label:'Total Members',    value: orgUsers.length },
          { icon:'📊', label:'Total Check-ins',  value: orgData.length },
          { icon:'📈', label:'Avg Wellness',      value: orgData.length ? `${Math.round(orgData.reduce((s,e) => s+(e.score??e.wellness??0),0)/orgData.length)}/100` : '—' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center', padding:'14px 10px' }}>
            <p style={{ fontSize:18, marginBottom:4 }}>{s.icon}</p>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:"'Lora',serif", marginTop:4 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div style={{ marginBottom:14 }}>
            <input type="search" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <UsersTab users={filtered} showOrg={false} orgExportId={orgId} />
        </>
      )}
      {tab === 'export' && <ExportTab allData={orgData} allUsers={orgUsers} approvedOrgs={[]} orgId={orgId} orgName={org?.name} />}
    </PageShell>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function OverviewTab({ allData, allUsers, approvedOrgs }) {
  const today = new Date().toISOString().split('T')[0]
  const todayCount = allData.filter(e => e.date === today).length
  const avg = allData.length ? Math.round(allData.reduce((s,e) => s+(e.score??e.wellness??0),0)/allData.length) : 0

  const tierDist = Object.entries(TIERS).map(([key, t]) => ({
    name: t.label, count: allData.filter(d => d.tier === key).length, color: t.color,
  }))

  const daily7 = Array.from({ length:7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i))
    const ds = d.toISOString().split('T')[0]
    const dd = allData.filter(e => e.date === ds)
    return { label: d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric' }), checkins: dd.length }
  })

  return (
    <>
      <div className="grid-3" style={{ marginBottom:20 }}>
        {[
          { icon:'👥', label:'Total Users',        value: allUsers.length },
          { icon:'🏢', label:'Approved Orgs',       value: approvedOrgs.length },
          { icon:'📊', label:'Total Check-ins',     value: allData.length },
          { icon:'📅', label:"Today's Check-ins",   value: todayCount },
          { icon:'📈', label:'Overall Avg Score',   value: avg ? `${avg}/100` : '—' },
          { icon:'🆘', label:'Severe (<33)',         value: allData.filter(e=>(e.score??e.wellness??100)<33).length },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center', padding:'14px 10px' }}>
            <p style={{ fontSize:18, marginBottom:4 }}>{s.icon}</p>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:"'Lora',serif", marginTop:4 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <SectionHeader icon="📅" title="7-Day Activity" />
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={daily7} margin={{ top:5, right:5, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5EE" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize:11, fill:'#6B8069' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#6B8069' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background:'#fff', border:'1px solid #DCE8DC', borderRadius:10, fontSize:12, fontFamily:'Nunito,sans-serif' }} />
            <Bar dataKey="checkins" fill="#1B5E3B" radius={[6,6,0,0]} name="Check-ins" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <SectionHeader icon="🎯" title="Tier Distribution" />
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {tierDist.map(t => {
            const pct = allData.length ? Math.round((t.count/allData.length)*100) : 0
            return (
              <div key={t.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', minWidth:120 }}>{t.name}</span>
                <div style={{ flex:1, height:8, background:'var(--cream2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:t.color, borderRadius:4, transition:'width .5s ease' }} />
                </div>
                <span style={{ fontSize:12, color:'var(--muted)', minWidth:55, textAlign:'right' }}>{t.count} ({pct}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function OrgsTab({ allOrgs, onRefresh }) {
  const [busy, setBusy] = useState(null)
  const pending  = allOrgs.filter(o => !o.approved)
  const approved = allOrgs.filter(o => o.approved)

  const handleApprove = (id) => {
    setBusy(id)
    approveOrg(id)
    setTimeout(() => { setBusy(null); onRefresh() }, 400)
  }
  const handleReject = (id) => {
    if (!confirm('Reject this org request?')) return
    setBusy(id)
    rejectOrg(id)
    setTimeout(() => { setBusy(null); onRefresh() }, 400)
  }

  return (
    <>
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom:16, border:'1.5px solid #F5C580' }}>
          <SectionHeader icon="⏳" title="Pending Requests" subtitle={`${pending.length} awaiting approval`} />
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {pending.map(o => (
              <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--amber-pale)', borderRadius:10 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#F5C580', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏢</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{o.name}</p>
                  <p style={{ fontSize:12, color:'var(--muted)' }}>Requested by {o.adminName} · {o.adminEmail}</p>
                  <p style={{ fontSize:11, color:'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-primary" onClick={() => handleApprove(o.id)} disabled={busy===o.id} style={{ padding:'7px 14px', fontSize:12 }}>
                    ✅ Approve
                  </button>
                  <button onClick={() => handleReject(o.id)} disabled={busy===o.id} style={{ padding:'7px 14px', fontSize:12, background:'var(--red)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700 }}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <SectionHeader icon="✅" title="Approved Organisations" subtitle={`${approved.length} active`} />
        {approved.length === 0 ? (
          <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>No approved organisations yet.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {approved.map((o, i) => {
              const orgUsers = getUsersList(o.id)
              const orgData  = getAllData(o.id)
              return (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--cream)', borderRadius:10, borderTop: i===0 ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:'var(--green-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏢</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{o.name}</p>
                    <p style={{ fontSize:12, color:'var(--muted)' }}>Admin: {o.adminEmail}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>{orgUsers.length} members</p>
                    <p style={{ fontSize:11, color:'var(--muted)' }}>{orgData.length} check-ins</p>
                  </div>
                  <button className="btn-ghost" onClick={() => exportCSV(o.id)} style={{ fontSize:12 }}>CSV ↓</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function UsersTab({ users, showOrg = false }) {
  const [search, setSearch] = useState('')
  const filtered = search ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users

  return (
    <>
      <div style={{ marginBottom:14 }}>
        <input type="search" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card">
        {filtered.length === 0
          ? <p style={{ textAlign:'center', padding:20, color:'var(--muted)', fontSize:13 }}>No users found</p>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map((u, i) => {
                const t    = u.lastTier ? TIERS[u.lastTier] : null
                const org  = u.orgId ? getOrgById(u.orgId) : null
                return (
                  <div key={u.email} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i===0 ? 'none' : '1px solid var(--border)' }}>
                    <Avatar initials={u.name.slice(0,2).toUpperCase()} size={40} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{u.name}</p>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{u.email}</p>
                      {showOrg && org && <span className="badge badge-green" style={{ fontSize:10, marginTop:3 }}>🏢 {org.name}</span>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {u.avgScore && <p style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>{u.avgScore}/100 avg</p>}
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{u.history.length} check-ins</p>
                      {u.lastCheckin && <p style={{ fontSize:11, color:'var(--muted)' }}>{u.lastCheckin}</p>}
                    </div>
                    {t && <span className="badge" style={{ background:t.bg, color:t.color, fontSize:10, flexShrink:0 }}>{t.label}</span>}
                    <button className="btn-ghost" onClick={() => exportCSV(null, u.email)} style={{ fontSize:11, flexShrink:0 }}>CSV ↓</button>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </>
  )
}

function ExportTab({ allData, allUsers, approvedOrgs, orgId=null, orgName=null }) {
  const [done, setDone] = useState(false)
  const doExport = () => { exportCSV(orgId); setDone(true); setTimeout(() => setDone(false), 2500) }

  return (
    <div className="card">
      <SectionHeader icon="📥" title={orgId ? `Export — ${orgName}` : 'Export All Data'} subtitle="Download as CSV" />
      <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:16 }}>
        {orgId
          ? `Exports all check-in records for members of ${orgName}. Includes date, name, email, scores, tier, and timestamp.`
          : 'Exports all check-in records across all users and organisations.'}
      </p>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
        {[{ label:'Users', value:allUsers.length }, { label:'Records', value:allData.length }].map(s => (
          <div key={s.label} className="card" style={{ flex:1, textAlign:'center', padding:'12px', minWidth:100, background:'var(--cream)' }}>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:"'Lora',serif" }}>{s.value}</p>
            <p style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</p>
          </div>
        ))}
        {!orgId && approvedOrgs.length > 0 && (
          <div className="card" style={{ flex:1, textAlign:'center', padding:'12px', minWidth:100, background:'var(--cream)' }}>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:"'Lora',serif" }}>{approvedOrgs.length}</p>
            <p style={{ fontSize:11, color:'var(--muted)' }}>Organisations</p>
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={doExport} style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
        {done ? '✅ Downloaded!' : `📥 Export ${orgId ? orgName : 'All'} Data as CSV`}
      </button>

      {/* Per-org export buttons for superadmin */}
      {!orgId && approvedOrgs.length > 0 && (
        <div style={{ marginTop:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Export by Organisation</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {approvedOrgs.map(o => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--cream)', borderRadius:10 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>🏢 {o.name}</p>
                  <p style={{ fontSize:11, color:'var(--muted)' }}>{getAllData(o.id).length} records</p>
                </div>
                <button className="btn-outline" onClick={() => exportCSV(o.id)} style={{ padding:'6px 14px', fontSize:12 }}>
                  CSV ↓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
