import { useState } from 'react'
import { getUsers, saveUser, requestOrg, getApprovedOrgs, SUPERADMIN_EMAIL } from '../utils/storage'
import { useApp } from '../context/AppContext'
import { Spinner } from './UI'

// Simple uid generator
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function AuthScreen() {
  const { login } = useApp()
  const [mode,    setMode]    = useState('login')   // login | user | org | super
  const [form,    setForm]    = useState({ name:'', email:'', password:'', orgName:'', orgId:'' })
  const [err,     setErr]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const approvedOrgs = getApprovedOrgs()

  const submit = async () => {
    setErr(''); setSuccess('')
    if (!form.email || !form.password) { setErr('Please fill in all fields.'); return }
    if (mode !== 'login' && !form.name) { setErr('Please enter your name.'); return }
    if (form.password.length < 6)       { setErr('Password must be at least 6 characters.'); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 350))

    const users = getUsers()

    // ── LOGIN ──────────────────────────────────────────────────────────────────
    if (mode === 'login') {
      if (!users[form.email])                           { setErr('No account found. Please sign up.'); setLoading(false); return }
      if (users[form.email].password !== form.password) { setErr('Incorrect password.'); setLoading(false); return }
      const u = users[form.email]
      if (u.role === 'rejected') { setErr('Your organisation request was not approved. Contact admin@countor.app.'); setLoading(false); return }
      login({ name: u.name, email: u.email, role: u.role, orgId: u.orgId || null, approved: u.approved ?? true })
      setLoading(false)
      return
    }

    // ── SIGNUP: duplicate check ────────────────────────────────────────────────
    if (users[form.email]) { setErr('Account already exists. Please log in.'); setLoading(false); return }

    // ── SIGNUP: Individual user ────────────────────────────────────────────────
    if (mode === 'user') {
      const role  = form.email === SUPERADMIN_EMAIL ? 'superadmin' : 'user'
      const orgId = form.orgId || null
      saveUser(form.email, { name: form.name, email: form.email, password: form.password, role, orgId, approved: true })
      login({ name: form.name, email: form.email, role, orgId, approved: true })
      setLoading(false)
      return
    }

    // ── SIGNUP: Superadmin ─────────────────────────────────────────────────────
    if (mode === 'super') {
      if (form.email !== SUPERADMIN_EMAIL) { setErr(`Superadmin email must be ${SUPERADMIN_EMAIL}`); setLoading(false); return }
      saveUser(form.email, { name: form.name, email: form.email, password: form.password, role: 'superadmin', approved: true })
      login({ name: form.name, email: form.email, role: 'superadmin', orgId: null, approved: true })
      setLoading(false)
      return
    }

    // ── SIGNUP: Org admin request ──────────────────────────────────────────────
    if (mode === 'org') {
      if (!form.orgName.trim()) { setErr('Please enter your organisation name.'); setLoading(false); return }
      const orgId = uid()
      saveUser(form.email, { name: form.name, email: form.email, password: form.password, role: 'org_admin_pending', orgId, approved: false })
      requestOrg({ id: orgId, name: form.orgName.trim(), adminEmail: form.email, adminName: form.name, createdAt: Date.now(), approved: false })
      setSuccess('✅ Request submitted! You will be notified once the Countor team approves your organisation.')
      setLoading(false)
      return
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:460 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:60, height:60, background:'var(--green)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:30, boxShadow:'0 8px 24px rgba(27,94,59,.25)' }}>🧠</div>
          <h1 style={{ fontSize:28, marginBottom:4 }}>Countor</h1>
          <p style={{ color:'var(--muted)', fontSize:13 }}>Mental wellness check-in &amp; community</p>
        </div>

        <div className="card" style={{ padding:28 }}>

          {/* Mode tabs */}
          <div style={{ display:'flex', background:'#F0EDE8', borderRadius:10, padding:4, marginBottom:22, gap:3 }}>
            {[['login','Log In'],['user','Individual'],['org','Organisation'],['super','Superadmin']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setErr(''); setSuccess('') }} style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', fontSize:11, fontWeight:700, transition:'all .2s', background: mode===m ? 'var(--white)' : 'transparent', color: mode===m ? 'var(--green)' : 'var(--muted)', boxShadow: mode===m ? 'var(--shadow-sm)' : 'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Mode description banners */}
          {mode === 'org' && (
            <div style={{ background:'var(--amber-pale)', border:'1px solid #F5C9A0', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#7A4010', lineHeight:1.6 }}>
                🏢 <strong>Organisation Admins</strong> get a private dashboard showing only their organisation's users and CSV export. Requires approval from the Countor team before access is granted.
              </p>
            </div>
          )}
          {mode === 'super' && (
            <div style={{ background:'var(--red-pale)', border:'1px solid #F1A9A0', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#922B21', lineHeight:1.6 }}>
                🔐 <strong>Superadmin</strong> access is restricted to <code style={{ background:'rgba(0,0,0,.06)', padding:'1px 6px', borderRadius:4 }}>{SUPERADMIN_EMAIL}</code> only.
              </p>
            </div>
          )}

          {/* Fields */}
          {mode !== 'login' && <Field label="Full Name" value={form.name} onChange={v => up('name', v)} placeholder="Your name" onEnter={submit} />}

          <Field label="Email" type="email" value={form.email} onChange={v => up('email', v)} placeholder="you@example.com" onEnter={submit} />

          <Field label="Password" type="password" value={form.password} onChange={v => up('password', v)} placeholder="Min 6 characters" onEnter={submit} />

          {/* Org name — only for org signup */}
          {mode === 'org' && (
            <Field label="Organisation Name" value={form.orgName} onChange={v => up('orgName', v)} placeholder="e.g. Tata Consultancy Services" onEnter={submit} />
          )}

          {/* Org selector — only for individual signup */}
          {mode === 'user' && approvedOrgs.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                Organisation (optional)
              </label>
              <select value={form.orgId} onChange={e => up('orgId', e.target.value)}>
                <option value="">— I'm an individual user —</option>
                {approvedOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>Select if your organisation uses Countor. This lets your org admin view your anonymised scores.</p>
            </div>
          )}

          {err     && <div style={{ background:'#FDEDEC', border:'1px solid #F1A9A0', borderRadius:8, padding:'10px 14px', marginBottom:14 }}><p style={{ color:'var(--red)', fontSize:13 }}>⚠️ {err}</p></div>}
          {success && <div style={{ background:'var(--green-pale)', border:'1px solid var(--green-pale2)', borderRadius:8, padding:'10px 14px', marginBottom:14 }}><p style={{ color:'var(--green)', fontSize:13 }}>{success}</p></div>}

          {!success && (
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ width:'100%', padding:'13px', fontSize:15, justifyContent:'center' }}>
              {loading ? <Spinner /> : mode === 'login' ? 'Log In →' : mode === 'org' ? 'Request Organisation Access →' : 'Create Account →'}
            </button>
          )}

          {success && (
            <button className="btn-outline" onClick={() => { setMode('login'); setSuccess(''); setForm({ name:'', email:'', password:'', orgName:'', orgId:'' }) }} style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
              Back to Log In →
            </button>
          )}
        </div>

        <p style={{ textAlign:'center', marginTop:14, fontSize:12, color:'var(--muted)' }}>🔒 Data stays on your device. No external servers.</p>
      </div>
    </div>
  )
}

function Field({ label, type='text', value, onChange, placeholder, onEnter, last=false }) {
  return (
    <div style={{ marginBottom: last ? 20 : 14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key==='Enter' && onEnter()} />
    </div>
  )
}
