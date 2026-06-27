# APCP v3 — Axion Project Control Platform

**Axion Imagineering Construction Co. W.L.L**  
React + Vite + Supabase · Hosted on Netlify

---

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (fwfwmdquqewndzlkfjpr · Singapore)
- **Hosting:** Netlify (axionpcp.netlify.app)
- **Auth:** Supabase Auth (email + password)

---

## Projects

| Code | Name |
|------|------|
| ANT  | Al Noor Tower |
| MRS  | Marina Residences |

---

## Roles

Admin · PM · Planning · Procurement · Site Engineer · Accountant · Viewer

---

## Document Numbering

Format: `TYPE-PROJCODE-YEAR-SEQUENCE`  
Example: `MRF-ANT-2025-00001`

---

## Deploy Steps

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com) → your project (fwfwmdquqewndzlkfjpr)
2. SQL Editor → New Query → paste `supabase-schema.sql` → Run
3. Auth → Users → Add user (email + password) for each team member
4. After creating first user, run the update query at the bottom of the schema to set them as Admin

### 2. Netlify Setup
1. Connect repo: Netlify → Add new site → Import from GitHub → Equelinor/apcp
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment Variables → Add:
   - `VITE_SUPABASE_URL` = `https://fwfwmdquqewndzlkfjpr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (your anon key)
5. Deploy

### 3. Local Development (optional)
```bash
npm install
npm run dev
```
Open http://localhost:5173

---

## Modules — Phase 1

| Module | Status |
|--------|--------|
| Dashboard | ✅ |
| MRF Register | ✅ |
| Procurement | ✅ |
| Delivery Tracking | ✅ |
| Document Control | 🔜 |
| QA/QC | 🔜 |
| Site | 🔜 |
| Management | 🔜 |

---

## Security Notes

- `.env` is in `.gitignore` — never committed
- Supabase anon key is safe for frontend use (Row Level Security enforced)
- Set environment variables in Netlify dashboard, never in code
