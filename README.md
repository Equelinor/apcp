# Axion Project Control Platform (APCP)
**Axion Imagineering Construction Co. W.L.L**

## Phase 1 — Standalone HTML Forms

All forms are self-contained HTML files with embedded logos and localStorage persistence.

### Forms
| File | Description |
|------|-------------|
| `DAR-Daily-Activity-Report.html` | Daily manpower, equipment, activity reporting |
| `MRF-Material-Request-Form.html` | Material request, approval workflow, vendor tracking |
| `IF04-Shop-Drawing-Submittal.html` | Shop drawing submittal and register |
| `IF05-Material-Approval-Certificate.html` | MAC — material approval with 10-item details |
| `IF06-Sample-Mockup-Inspection-Request.html` | Sample/mockup inspection request |
| `IF07-Document-Submittal-Form.html` | Document submittal and register |
| `IF08-Request-For-Information.html` | RFI — 2-page, discipline checkboxes, cost/time impact |
| `IF09-Activity-Inspection-Request.html` | Activity inspection request with concrete fields |
| `IF12-Sub-Contractor-Approval-Form.html` | Sub-contractor approval and register |

### Tech Stack — Phase 1
- Pure HTML + CSS + JavaScript
- localStorage (no backend required)
- Axion logo embedded as base64
- PDF export via window.print()
- Drag & drop consultant/client logo upload per project

### Tech Stack — Phase 2 (planned)
- React + Vite
- Supabase (project: `fwfwmdquqewndzlkfjpr`, Singapore region)
- Netlify hosting
- Real authentication + role-based access

### Roles
Admin · Project Manager · Planning Engineer · Procurement · Site Engineer · Accountant · Viewer

### Projects
- ANT — Al Noor Tower
- MRS — Marina Residences

### Document Numbering
`TYPE-PROJCODE-YEAR-SEQUENCE` e.g. `MRF-ANT-2025-00001`
