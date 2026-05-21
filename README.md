# 🧠 Countor v3 — Mental Wellness Platform

React + Vite app with PHQ-9/GAD-7 screening, community forum, therapist directory, streaks, and a **3-tier role-based admin system**.

---

## ✨ What's New in v3

| Feature | Details |
|---|---|
| 🔐 3-tier roles | `superadmin`, `org_admin`, `user` — each sees only what they should |
| 🏢 Org admin signup | Orgs request access via a dedicated signup tab — goes live only after superadmin approval |
| ⏳ Approval workflow | Pending orgs shown in superadmin dashboard with Approve / Reject buttons |
| 📊 Org-scoped dashboard | Org admins see only their organisation's members and check-in data |
| 📥 Scoped CSV export | Superadmin can export all data or per-org; org admins export their org only |
| 🚫 Admin tab hidden | Regular users never see the Admin link in the nav bar |

---

## 🚀 Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## 👤 Roles & How to Set Up

### 1. Superadmin (you)
- Edit `src/utils/storage.js` and set `SUPERADMIN_EMAIL` to your email.
- Sign up using the **Superadmin** tab with that exact email.
- You get full access: all users, all orgs, pending org requests, full CSV.

```js
// src/utils/storage.js — line 7
export const SUPERADMIN_EMAIL = 'your@email.com'
```

### 2. Organisation Admin
- Any company signs up via the **Organisation** tab.
- Their account is locked as `org_admin_pending` until you approve.
- You approve/reject from **Super Admin → Organisations tab**.
- Once approved, they log in and see only their org's members and data.

### 3. Individual User
- Signs up via the **Individual** tab.
- Optionally selects an approved organisation from a dropdown (so their org admin can see their data).
- Never sees the Admin link — it is conditionally hidden in `TopNav.jsx`.

---

## 📁 Updated File Structure

```
src/
├── App.jsx                    ← pending/rejected states, admin route guard
├── context/AppContext.jsx     ← isSuperAdmin, isOrgAdmin, isAdmin, isPending helpers
├── utils/storage.js           ← org CRUD, role-based getAllData(), scoped exportCSV()
└── components/
    ├── AuthScreen.jsx         ← 4-tab auth: Login | Individual | Organisation | Superadmin
    ├── TopNav.jsx             ← admin link shown only if isAdmin
    └── AdminPage.jsx          ← SuperAdminDashboard + OrgAdminDashboard (separated)
```

---

## 🔐 Security Notes (for production)

- Move `SUPERADMIN_EMAIL` to an environment variable: `import.meta.env.VITE_SUPERADMIN_EMAIL`
- Replace localStorage with **Firebase Firestore** — roles, orgs, and scores must live server-side
- Add server-side role checks — never trust client-side role alone
- Org admin approval emails should be sent via **Firebase Functions + SendGrid**

---

## ⚠️ Disclaimer

Countor is a screening tool, not a medical device. **iCall: 9152987821** (India, free, Mon–Sat 9am–10pm).
