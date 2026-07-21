// ════════════════════════════════════════════════════════════
// APCP v3 — Shared Print Engine
// Renders finalized HTML form layouts identical to standalone HTML forms
// ════════════════════════════════════════════════════════════

import { AXION_LOGO } from './axionLogo'
import { employeeService } from '../services/employeeService'
import { signatureService } from '../services/signatureService'

const chk = (v) => v ? '&#9746;' : '&#9744;'
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return String(dt.getDate()).padStart(2,'0') + '/' +
    String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear()
}
const now = () => {
  const d = new Date()
  return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
}

// Looks up an uploaded digital signature for a free-text signer name (e.g. the
// "Prepared By" / "Project Engineer" field on a form) by matching it against
// the Employee Register. Returns the base64 signature image, or '' if the name
// is blank, no employee matches, or that employee has no active signature —
// callers fall back to the usual blank signing line in all of those cases.
export async function getSignatureForName(name) {
  const employee = await employeeService.getByFullName(name)
  if (!employee) return ''
  const sig = await signatureService.getForEmployee(employee.id)
  return sig?.signature_image || ''
}

// Renders an uploaded signature image if present, else the original blank
// underscore line — same visual footprint either way. mix-blend-mode:multiply
// drops out a white background (transparent PNG or not) so the signature
// blends into the page instead of showing as a white box.
const signatureLine = (f, widthPt = 300) =>
  f.signatureImg
    ? `<img src="${f.signatureImg}" style="max-height:50pt;max-width:${widthPt}pt;object-fit:contain;vertical-align:middle;mix-blend-mode:multiply">`
    : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'


// Merge project-level logos into form data (project record is source of truth)
// Call this in each buildIF* before rendering
export const mergeProjectLogos = (f, project) => {
  if (!project) return f
  return {
    ...f,
    clientLogo: f.clientLogo || project.client_logo || '',
    consultantLogo: f.consultantLogo || project.consultant_logo || '',
    client: f.client || project.client || '',
    consultant: f.consultant || project.consultant || '',
    contractor: f.contractor || project.contractor || '',
    projName: f.projName || project.project_name || '',
  }
}

// Three-logo header (shared across all forms)
const buildHeader = (f, docNo, title, splitTitle = false) => {
  const consultantLogo = f.consultantLogo
    ? `<img src="${f.consultantLogo}" style="max-height:44pt;max-width:130pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:8.5pt;font-weight:700;text-align:center;padding:6pt 4pt">${f.consultant || 'Consultant'}</div>`

  const clientLogo = f.clientLogo
    ? `<img src="${f.clientLogo}" style="max-height:44pt;max-width:130pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:8.5pt;font-weight:700;text-align:center;padding:6pt 4pt">${f.client || 'Client'}</div>`

  const logoRow = `
    <table style="width:100%;border-collapse:collapse;border:1.5pt solid #000">
      <tr>
        <td style="width:34%;border-right:1pt solid #000;padding:6pt 8pt;vertical-align:middle;text-align:center">
          ${clientLogo}
        </td>
        <td style="width:32%;border-right:1pt solid #000;padding:6pt 8pt;vertical-align:middle">
          <img src="${AXION_LOGO}" style="max-height:46pt;max-width:150pt;object-fit:contain;display:block;margin:auto">
        </td>
        <td style="width:34%;padding:6pt 8pt;vertical-align:middle;text-align:center">
          ${consultantLogo}
        </td>
      </tr>
      <tr style="border-top:1pt solid #000">
        <td style="border-right:1pt solid #000;padding:4pt 8pt;font-size:7.5pt">Document No. <b>${docNo}</b></td>
        <td style="border-right:1pt solid #000;padding:4pt 8pt;font-size:7.5pt;text-align:center">Issue. <b>${f.issue || '0'}</b></td>
        <td style="padding:4pt 8pt;font-size:7.5pt">
          <span>Date: <b>${fmtDate(f.date)}</b></span>
          <span style="float:right">Page <b>1 of 1</b></span>
        </td>
      </tr>
    </table>`

  const titleBar = splitTitle
    ? `<table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none">
        <tr>
          <td style="width:55%;background:#222;color:#fff;padding:6pt 10pt;font-size:10pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${title}</td>
          <td style="width:45%;background:#222;color:#fff;padding:5pt 10pt;font-size:8pt;border-left:1pt solid #555">
            <div><b>Ref no :</b> ${f.ref || ''}</div>
            <div style="margin-top:3pt"><b>Date:</b> ${fmtDate(f.date)}</div>
          </td>
        </tr>
      </table>`
    : `<div style="background:#000;color:#fff;text-align:center;padding:7pt 10pt;font-size:13pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10pt">${title}</div>`

  return logoRow + titleBar
}

const wrapper = (content, width = '190mm', padding = '10mm 0') =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#000;width:${width};margin:0 auto;padding:${padding}">${content}</div>`

const generated = (f, ref) =>
  `<div style="margin-top:10pt;font-size:6pt;color:#888;text-align:center">Generated electronically by APCP &nbsp;|&nbsp; ${now()} &nbsp;|&nbsp; Ref: ${ref || ''}</div>`

// ─────────────────────────────────────────────────────────
// IF04 — Shop Drawing Submittal
// ─────────────────────────────────────────────────────────
export const buildIF04 = (f) => {
  const dwgRows = (f.drawings || []).map(d =>
    `<tr>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt">${d.no || ''}</td>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt;font-weight:700;text-align:center">${d.title || ''}</td>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt;text-align:center">${d.rev || ''}</td>
    </tr>`
  ).join('')

  return wrapper(`
    ${buildHeader(f, 'AA-IF-04', 'SHOP DRAWING SUBMITTAL FORM')}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:14pt;font-size:8pt">
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;width:22%;font-weight:700;background:#f9f9f9">Project</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.projName || ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Contractor</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.contractor || 'Axion Imagineering Construction Co. W.L.L.'}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Client</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.client || ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Shop Drawing No.</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.sdFrom || ''}${f.sdTo ? ' to ' + f.sdTo : ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Date</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${fmtDate(f.date)}</td></tr>
    </table>
    <p style="font-size:8pt;margin-bottom:10pt;padding-left:4pt">We request approval of the following shop drawings for implementation in the above works.</p>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:16pt;font-size:8pt">
      <thead><tr style="background:#f0f0f0">
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:30%">Drawing Nos.</th>
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:55%">Drawing Title</th>
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:15%">Rev.</th>
      </tr></thead>
      <tbody>${dwgRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14pt">
      <tr>
        <td style="width:50%;padding:4pt 0;font-size:8pt"><u><b>Project Engineer:</b></u> ${f.prepared_by || ''}</td>
        <td style="width:50%;padding:4pt 0;font-size:8pt;text-align:right"><u><b>Signature:</b></u> ${signatureLine(f)}</td>
      </tr>
    </table>
    <div style="margin-bottom:14pt">
      <div style="font-size:8.5pt;font-weight:700;text-decoration:underline;margin-bottom:10pt">Consultant's Comments</div>
      <table style="width:100%;border-collapse:collapse;font-size:8pt">
        <tr>
          <td style="width:50%;padding:4pt 0;vertical-align:top">
            <div style="display:flex;align-items:flex-start;gap:8pt;margin-bottom:10pt"><span style="border:1pt solid #000;display:inline-block;width:10pt;height:10pt;flex-shrink:0;margin-top:1pt"></span><span>Work may proceed; Approval follows</span></div>
            <div style="display:flex;align-items:flex-start;gap:8pt"><span style="border:1pt solid #000;display:inline-block;width:10pt;height:10pt;flex-shrink:0;margin-top:1pt"></span><span>Revise and Re-submit, work may proceed subject to incorporation of comments indicated</span></div>
          </td>
          <td style="width:50%;padding:4pt 0 4pt 20pt;vertical-align:top">
            <div style="display:flex;align-items:flex-start;gap:8pt;margin-bottom:10pt"><span style="border:1pt solid #000;display:inline-block;width:10pt;height:10pt;flex-shrink:0;margin-top:1pt"></span><span>Approved with comments</span></div>
            <div style="display:flex;align-items:flex-start;gap:8pt"><span style="border:1pt solid #000;display:inline-block;width:10pt;height:10pt;flex-shrink:0;margin-top:1pt"></span><span>Revise and resubmit, work not to proceed</span></div>
          </td>
        </tr>
      </table>
    </div>
    <div style="margin-bottom:24pt"><div style="border-top:1pt solid #000;width:55%;padding-top:4pt;font-size:8pt">Signed for and on behalf of Consultant</div></div>
    <div style="margin-bottom:10pt">
      <div style="font-size:8.5pt;font-weight:700;text-decoration:underline;margin-bottom:6pt">Client's Comments:</div>
      <div style="border-bottom:1pt solid #000;height:18pt;margin-bottom:4pt"></div>
      <div style="border-bottom:0.5pt solid #ccc;height:16pt"></div>
    </div>
    <div><div style="font-size:8.5pt;font-weight:700;text-decoration:underline;margin-bottom:4pt">Client's Signature:</div><div style="border-bottom:0.5pt solid #ccc;height:16pt"></div></div>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF05 — Material Approval Certificate
// ─────────────────────────────────────────────────────────
export const buildIF05 = (f) => {
  // Maps the real if05 table columns onto the certificate's fixed 10-row item layout
  // (rows 7/9/10 have no corresponding if05 field yet, so they render blank by design)
  const it = {
    i1: f.material_desc || '',
    i2: f.desc_location || '',
    i3: f.brand || '',
    i4: f.supplier_name || '',
    i5: f.code_ref || '',
    // "Attached" is a sentinel value set via the New MAC form's Attached checkbox —
    // means a datasheet is being attached with the transmittal instead of typed specs
    i6: f.mat_spec === 'Attached' ? 'Attached' : [f.mat_spec, f.grade ? `Grade: ${f.grade}` : '', f.color ? `Color: ${f.color}` : '', f.origin ? `Origin: ${f.origin}` : ''].filter(Boolean).join('\n'),
  }
  const td = 'border:0.5pt solid #999;padding:4pt 6pt;font-size:8pt;'
  const tdl = td + 'font-weight:700;background:#f9f9f9;width:22%;'
  return wrapper(`
    ${buildHeader(f, 'AA-IF-05', 'MATERIAL APPROVAL CERTIFICATE')}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:8pt;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #000;padding:5pt 8pt;width:60%"><b>MAC No.:</b> &nbsp; ${f.if05_number || ''}</td>
        <td style="padding:5pt 8pt"><b>Date:</b> &nbsp; ${fmtDate(f.date)}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <tr><td style="${tdl}">Project:</td><td style="${td}font-weight:700">${f.projName || ''}</td></tr>
      <tr><td style="${tdl}">Client:</td><td style="${td}font-weight:700">${f.client || ''}</td></tr>
      <tr><td style="${tdl}">Contractor:</td><td style="${td}font-weight:700">${f.contractor || 'Axion Imagineering Construction Co. W.L.L.'}</td></tr>
      <tr><td style="${tdl}">Consultant:</td><td style="${td}font-weight:700">${f.consultant || ''}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <thead><tr style="background:#f0f0f0">
        <th style="border:0.5pt solid #999;padding:5pt 6pt;text-align:center;width:6%">Item No.</th>
        <th style="border:0.5pt solid #999;padding:5pt 6pt;text-align:left;width:32%">Item Description</th>
        <th style="border:0.5pt solid #999;padding:5pt 6pt;text-align:left">Remarks</th>
      </tr></thead>
      <tbody>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">1</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Material</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i1 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">2</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Description &amp; Location of Use</td><td style="border:0.5pt solid #999;padding:4pt 6pt;white-space:pre-wrap">${it.i2 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">3</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Manufacturer</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i3 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">4</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Local Supplier</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i4 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">5</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Specification Clause</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i5 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">6</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Technical Details</td><td style="border:0.5pt solid #999;padding:4pt 6pt;white-space:pre-wrap">${it.i6 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">7</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Estimated Delivery Period</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i7 || ''}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">8</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Estimated Date Reqd. at Site</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${fmtDate(it.i8)}</td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">9</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Enclosures</td><td style="border:0.5pt solid #999;padding:4pt 6pt"><span style="margin-right:16pt">${chk(f.enc_samples)} Samples</span><span style="margin-right:16pt">${chk(f.enc_catalogue)} Catalogue</span><span>${chk(f.enc_mockup)} Mock-up</span></td></tr>
        <tr><td style="border:0.5pt solid #999;padding:4pt 6pt;text-align:center;background:#fafafa">10</td><td style="border:0.5pt solid #999;padding:4pt 6pt;background:#fafafa">Warranty</td><td style="border:0.5pt solid #999;padding:4pt 6pt">${it.i10 || ''}</td></tr>
        <tr style="background:#f0f0f0">
          <td colspan="2" style="border:0.5pt solid #999;padding:5pt 8pt;font-size:8pt"><b>Contractor Engineer</b> &nbsp;&nbsp; ${f.prepared_by || ''}</td>
          <td style="border:0.5pt solid #999;padding:5pt 8pt;font-size:8pt">Signature: ${signatureLine(f)}</td>
        </tr>
      </tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:8pt;font-size:8pt">
      <tr><td style="border-right:1pt solid #000;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:60%"><b>Consultant Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Date:</td></tr>
      <tr><td style="border-right:1pt solid #000;border-bottom:0.5pt solid #999;padding:5pt 8pt"><span style="margin-right:20pt">&#9744; Approved</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Name:</td></tr>
      <tr><td style="border-right:1pt solid #000;padding:5pt 8pt">Remarks:</td><td style="padding:5pt 8pt">Signature:</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <tr><td style="border-right:1pt solid #000;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:60%"><b>Client Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Date:</td></tr>
      <tr><td style="border-right:1pt solid #000;border-bottom:0.5pt solid #999;padding:5pt 8pt"><span style="margin-right:20pt">&#9744; Approved</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Name:</td></tr>
      <tr><td style="border-right:1pt solid #000;padding:5pt 8pt">Remarks:</td><td style="padding:5pt 8pt">Signature:</td></tr>
    </table>
    ${generated(f, f.if05_number)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF06 — Sample/Mock-up Inspection Request
// ─────────────────────────────────────────────────────────
export const buildIF06 = (f) => {
  const disciplines = [
    f.civil ? '&#9746; Civil/Structural' : '&#9744; Civil/Structural',
    f.elec ? '&#9746; Electrical' : '&#9744; Electrical',
    f.mech ? '&#9746; Mechanical' : '&#9744; Mechanical',
    (f.other ? '&#9746;' : '&#9744;') + ' ' + (f.otherText || '……………'),
  ].join('&nbsp;&nbsp;&nbsp;')
  const td = 'border:0.5pt solid #999;padding:4pt 7pt;font-size:8pt;vertical-align:top;'
  const tdl = td + 'font-weight:600;background:#f9f9f9;width:36%;'
  return wrapper(`
    ${buildHeader(f, 'AA-IF-06', 'SAMPLE/MOCKUP INSPECTION REQUEST', true)}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-weight:700;font-size:8.5pt"><b>Project:</b> ${f.projName || ''}</td></tr>
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-weight:700"><b>To:</b> ${f.to || f.consultant || ''}</td></tr>
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-style:italic"><i>We request your inspection of the following works:</i></td></tr>
      <tr><td style="${tdl}">Inspection Requested For<br><i style="font-size:7pt;font-weight:400">(Please tick appropriate boxes)</i></td><td style="${td}">${disciplines}</td></tr>
      <tr><td style="${tdl}">Details of Sample/ Mockup to be Inspected:</td><td style="${td}white-space:pre-wrap">${f.details || ''}</td></tr>
      <tr><td style="${tdl}">Location of Works <i>(sketch attached)</i>:</td><td style="${td}white-space:pre-wrap">${f.location || ''}</td></tr>
      <tr><td style="${tdl}">Requested Date &amp; Time of Inspection:</td><td style="${td}">${fmtDate(f.inspDate)}${f.inspTime ? ' & ' + f.inspTime : ''}</td></tr>
      <tr><td style="${tdl}"><i>Approved Drawing Ref/MAC:<br>(as applicable)</i></td><td style="${td}">${f.macRef || ''}</td></tr>
      <tr><td colspan="2" style="border-top:0.5pt solid #999;padding:8pt 8pt;font-size:8pt">Signed by &nbsp;${signatureLine(f, 140)}:&nbsp;&nbsp; Project Engineer: &nbsp;———————————————&nbsp;&nbsp; Name: ${f.prepared_by || ''}</td></tr>
    </table>
    <div style="margin-top:14pt">
      <div style="font-size:8.5pt;font-weight:700;text-decoration:underline;margin-bottom:6pt">Consultant's Comments:</div>
      <table style="width:100%;border-collapse:collapse;border:1pt solid #000;font-size:8pt">
        <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:60%"><b>Consultant Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Date:</td></tr>
        <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt"><span style="margin-right:20pt">&#9744; Approved</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Name:</td></tr>
        <tr><td style="border-right:1pt solid #999;padding:5pt 8pt">Remarks:</td><td style="padding:5pt 8pt">Signature:</td></tr>
      </table>
    </div>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF07 — Document Submittal Form
// ─────────────────────────────────────────────────────────
export const buildIF07 = (f) => {
  const dwgRows = (f.drawings || []).map(d =>
    `<tr>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt">${d.no || ''}</td>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt;font-weight:700;text-align:center">${d.title || ''}</td>
      <td style="border:0.5pt solid #999;padding:3pt 5pt;font-size:7.5pt;text-align:center">${d.rev || ''}</td>
    </tr>`
  ).join('')
  return wrapper(`
    ${buildHeader(f, 'AA-IF-07', 'DOCUMENT SUBMITTAL FORM')}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:14pt;font-size:8pt">
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;width:22%;font-weight:700;background:#f9f9f9">Project</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.projName || ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Contractor</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.contractor || 'Axion Imagineering Construction Co. W.L.L.'}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Client</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.client || ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Shop Document No.</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${f.subNo || ''}${f.subTo ? ' to ' + f.subTo : ''}</td></tr>
      <tr><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700;background:#f9f9f9">Date</td><td style="border:0.5pt solid #999;padding:5pt 8pt;font-weight:700">${fmtDate(f.date)}</td></tr>
    </table>
    <p style="font-size:8pt;margin-bottom:10pt;padding-left:4pt">We request approval of the following shop drawings for implementation in the above works.</p>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:16pt;font-size:8pt">
      <thead><tr style="background:#f0f0f0">
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:30%">Drawing Nos.</th>
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:55%">Document Title</th>
        <th style="border:0.5pt solid #999;padding:5pt 8pt;text-align:center;font-weight:700;width:15%">Rev.</th>
      </tr></thead>
      <tbody>${dwgRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20pt">
      <tr>
        <td style="width:50%;padding:4pt 0;font-size:8pt"><u><b>Project Engineer:</b></u>&nbsp; ${f.prepared_by || ''}<br><div style="border-bottom:1pt solid #000;margin-top:22pt;width:80%"></div></td>
        <td style="width:50%;padding:4pt 0;font-size:8pt;text-align:right"><u><b>Signature:</b></u><br><div style="border-bottom:1pt solid #000;margin-top:22pt;margin-left:40%">${f.signatureImg ? `<img src="${f.signatureImg}" style="max-height:24pt;max-width:100%;object-fit:contain">` : ''}</div></td>
      </tr>
    </table>
    <div style="margin-bottom:12pt"><div style="font-size:8.5pt;font-weight:700;text-decoration:underline;margin-bottom:8pt">Consultant's Comments</div>
      <table style="width:100%;border-collapse:collapse;border:1pt solid #000;font-size:8pt">
        <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt"><b>&#9744;</b> Work may proceed; Approval follows &nbsp;&nbsp;&nbsp; <b>&#9744;</b> Approved with comments &nbsp;&nbsp;&nbsp; <b>&#9744;</b> Revise and Re-submit &nbsp;&nbsp;&nbsp; <b>&#9744;</b> Revise and resubmit, work not to proceed</td></tr>
        <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:50%">Comments:</td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Date:</td></tr>
        <tr><td style="border-right:1pt solid #999;padding:5pt 8pt">&nbsp;</td><td style="padding:5pt 8pt">Signed for and on behalf of Consultant</td></tr>
      </table>
    </div>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF08 — Request For Information
// ─────────────────────────────────────────────────────────
export const buildIF08 = (f) => {
  const disc = f.disciplines || {}
  const discRow = [
    `${chk(disc['d-arch'])} ARCH.`, `${chk(disc['d-str'])} STR`, `${chk(disc['d-civil'])} CIVIL`,
    `${chk(disc['d-mech'])} MECH`, `${chk(disc['d-elect'])} ELECT.`, `${chk(disc['d-plumb'])} PLUMBING`, `${chk(disc['d-other'])} OTHERS`
  ].join('&nbsp;&nbsp;&nbsp;')
  return wrapper(`
    ${buildHeader(f, 'AA-IF-08', 'REQUEST FOR INFORMATION')}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:28%"><b>RFI No.</b> &nbsp; ${f.rfiNo || ''}</td>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:36%">Submitted date: &nbsp; <b>${fmtDate(f.subDate)}</b></td>
        <td style="padding:5pt 7pt">Returned date: &nbsp; <b>${fmtDate(f.retDate)}</b></td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt"><tr><td style="padding:5pt 7pt">Project Name: &nbsp; <b>${f.projName || ''}</b></td></tr></table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:22%;vertical-align:top">Related drawings / specification</td>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:38%;vertical-align:top">Drawings<br><b>${f.drawings || ''}</b></td>
        <td style="padding:5pt 7pt;vertical-align:top">Specification Ref.<br><b>${f.spec || ''}${f.refDwg ? ' / ' + f.refDwg : ''}</b></td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt"><tr><td style="padding:4pt 7pt">Prime Contractor: &nbsp; ${f.prime || ''}</td></tr></table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt"><tr><td style="padding:5pt 7pt;font-weight:700">DISCIPLINE &nbsp;&nbsp; ${discRow}</td></tr></table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt"><tr><td style="padding:4pt 7pt">Sub-contractor: &nbsp; ${f.subcon || '-'}</td></tr></table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:50%;vertical-align:top">To:<br><b>${f.to || ''}</b><br><div style="border-top:0.5pt solid #999;margin-top:4pt;padding-top:2pt">—————————————————————————————</div></td>
        <td style="padding:5pt 7pt;vertical-align:top">Attn:<br><b>${f.attn || ''}</b><br><div style="border-top:0.5pt solid #999;margin-top:4pt;padding-top:2pt">————————————————————</div></td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr><td style="padding:5pt 7pt;vertical-align:top;min-height:80pt"><div style="font-weight:600;margin-bottom:6pt">Request:</div><div style="white-space:pre-wrap;line-height:1.6;min-height:70pt">${f.request || ''}</div></td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #999;padding:5pt 7pt;width:50%;vertical-align:top">Reply by: <b>${fmtDate(f.replyBy)}</b><br><br>Signed by:<br><div style="border-top:0.5pt solid #000;margin-top:18pt;width:85%"></div></td>
        <td style="padding:5pt 7pt;vertical-align:top">
          <div style="margin-bottom:6pt">Cost Implication: &nbsp; ${chk(f.costYes)} Yes &nbsp;&nbsp; ${chk(f.costNo)} No</div>
          <div style="margin-bottom:6pt">Time Implication: &nbsp; ${chk(f.timeYes)} Yes &nbsp;&nbsp; ${chk(f.timeNo)} No</div>
          <div>Remarks:<br><div style="border-bottom:0.5pt solid #ccc;height:16pt"></div></div>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt"><b>Consultant's Reply:</b></td></tr>
      <tr><td style="padding:5pt 8pt;min-height:60pt;white-space:pre-wrap">${f.reply || ''}&nbsp;</td><td style="border-left:0.5pt solid #999;padding:5pt 8pt;width:35%;vertical-align:top">Date:<br>Name:<br>Signature:</td></tr>
    </table>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF09 — Activity Inspection Request
// ─────────────────────────────────────────────────────────
export const buildIF09 = (f) => {
  const disciplines = [
    f.civil ? '&#9746; Civil/Structural' : '&#9744; Civil/Structural',
    f.elec ? '&#9746; Electrical' : '&#9744; Electrical',
    f.mech ? '&#9746; Mechanical' : '&#9744; Mechanical',
    (f.other ? '&#9746;' : '&#9744;') + ' ' + (f.otherText || '……………'),
  ].join('&nbsp;&nbsp;&nbsp;')
  const td = 'border:0.5pt solid #999;padding:4pt 7pt;font-size:8pt;vertical-align:top;'
  const tdl = td + 'font-weight:600;background:#f9f9f9;width:36%;'
  return wrapper(`
    ${buildHeader(f, 'AA-IF-09', 'ACTIVITY INSPECTION REQUEST', true)}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;border-top:none;font-size:8pt">
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-weight:700;font-size:8.5pt"><b>Project:</b> ${f.projName || ''}</td></tr>
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-weight:700"><b>To:</b> ${f.to || f.consultant || ''}</td></tr>
      <tr><td colspan="2" style="border-bottom:0.5pt solid #999;padding:5pt 8pt;font-style:italic"><i>We request your inspection of the following works:</i></td></tr>
      <tr><td style="${tdl}">Inspection Requested For<br><i style="font-size:7pt;font-weight:400">(Please tick appropriate boxes)</i></td><td style="${td}">${disciplines}</td></tr>
      <tr><td style="${tdl}">Activity ID / WBS:</td><td style="${td}">${f.activityId || ''} ${f.wbsCode ? '/ ' + f.wbsCode : ''}</td></tr>
      <tr><td style="${tdl}">Activity Description:</td><td style="${td}white-space:pre-wrap">${f.details || ''}</td></tr>
      <tr><td style="${tdl}">Location of Works:</td><td style="${td}white-space:pre-wrap">${f.location || ''}</td></tr>
      <tr><td style="${tdl}">Requested Date &amp; Time of Inspection:</td><td style="${td}">${fmtDate(f.inspDate)}${f.inspTime ? ' & ' + f.inspTime : ''}</td></tr>
      <tr><td style="${tdl}"><i>Approved Drawing Ref/MAC:<br>(as applicable)</i></td><td style="${td}">${f.macRef || ''}</td></tr>
      <tr><td colspan="2" style="border-top:0.5pt solid #999;padding:8pt 8pt;font-size:8pt">Signed by &nbsp;${signatureLine(f, 140)}:&nbsp;&nbsp; Project Engineer: &nbsp;———————————————&nbsp;&nbsp; Name: ${f.prepared_by || ''}</td></tr>
    </table>
    <div style="margin-top:14pt">
      <table style="width:100%;border-collapse:collapse;border:1pt solid #000;font-size:8pt">
        <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:60%"><b>Consultant Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Date:</td></tr>
        <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt"><span style="margin-right:16pt">&#9744; Work May Proceed</span><span style="margin-right:16pt">&#9744; Approved with Comments</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt">Name:</td></tr>
        <tr><td style="border-right:1pt solid #999;padding:5pt 8pt">Remarks:</td><td style="padding:5pt 8pt">Signature:</td></tr>
      </table>
    </div>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// IF12 — Sub-Contractor Approval Form
// ─────────────────────────────────────────────────────────
export const buildIF12 = (f) => {
  const td = 'border:0.5pt solid #999;padding:4pt 7pt;font-size:8pt;'
  const tdl = td + 'background:#f9f9f9;width:36%;'
  return wrapper(`
    ${buildHeader(f, 'AA-IF-12', 'SUB-CONTRACTOR APPROVAL FORM')}
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:8pt;font-size:8pt">
      <tr>
        <td style="border-right:1pt solid #999;padding:5pt 8pt;width:22%;background:#f9f9f9">Reference No.:</td>
        <td style="border-right:1pt solid #999;padding:5pt 8pt;font-weight:700;width:44%">${f.ref || ''}</td>
        <td style="border-right:1pt solid #999;padding:5pt 8pt;width:12%;background:#f9f9f9">Date:</td>
        <td style="padding:5pt 8pt;font-weight:700">${fmtDate(f.date)}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <tr><td style="${tdl}">Project Name</td><td style="${td}font-weight:700">${f.projName || ''}</td></tr>
      <tr><td style="${tdl}">From</td><td style="${td}font-weight:700">${f.contractor || 'Axion Imagineering Construction Co. W.L.L.'}</td></tr>
      <tr><td style="${tdl}">To</td><td style="${td}font-weight:700">${f.to || f.consultant || ''}</td></tr>
      <tr><td style="${tdl}">Attn</td><td style="${td}">${f.attn || ''}</td></tr>
      <tr><td style="${tdl}">Subject</td><td style="${td}font-weight:700">Sub-Contractor Approval Request</td></tr>
    </table>
    <p style="font-size:8pt;margin-bottom:4pt;padding:0 2pt">We confirm that the proposed subcontractor is in compliance with the requirement stated in the contract documents.</p>
    <p style="font-size:8pt;margin-bottom:10pt;padding:0 2pt">We kindly request your approval to the following Sub-Contractor to work for the above project.</p>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <tr><td style="${tdl}">Name of Sub-Contractor:</td><td style="${td}">${f.scName || ''}</td></tr>
      <tr><td style="${tdl}">Scope of Work:</td><td style="${td}">${f.scope || ''}</td></tr>
      <tr><td style="${tdl}">Details of the Sub-Contractor:</td><td style="${td}white-space:pre-wrap">${f.details || ''}</td></tr>
      <tr><td style="${tdl}">C.R. No.:</td><td style="${td}">${f.cr || ''}</td></tr>
      <tr><td style="${tdl}">Contact Person:</td><td style="${td}">${f.contactName || ''}</td></tr>
      <tr><td style="${tdl}">Contact No.:</td><td style="${td}">${f.contactNo || ''}</td></tr>
      <tr><td style="${tdl}">Enclosures:</td><td style="${td}"><span style="margin-right:20pt">${chk(f.encProfile)} Company Profile</span><span>${chk(f.encOther)} Others: ${f.encOtherText || '_______________________'}</span></td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:8pt;font-size:8pt">
      <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:55%"><b>Consultant Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt;width:15%;background:#f9f9f9">Date</td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt"></td></tr>
      <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:6pt 8pt"><span style="margin-right:22pt">&#9744; Approved</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt;background:#f9f9f9">Name</td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt"></td></tr>
      <tr><td style="border-right:1pt solid #999;padding:5pt 8pt">Remarks</td><td style="padding:5pt 8pt;background:#f9f9f9">Signature</td><td style="padding:5pt 8pt"></td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:8pt;font-size:8pt">
      <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:5pt 8pt;width:55%"><b>Client Comment:</b></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt;width:15%;background:#f9f9f9">Date</td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt"></td></tr>
      <tr><td style="border-right:1pt solid #999;border-bottom:0.5pt solid #999;padding:6pt 8pt"><span style="margin-right:22pt">&#9744; Approved</span><span>&#9744; Rejected</span></td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt;background:#f9f9f9">Name:</td><td style="border-bottom:0.5pt solid #999;padding:5pt 8pt"></td></tr>
      <tr><td style="border-right:1pt solid #999;padding:5pt 8pt">Remarks</td><td style="padding:5pt 8pt;background:#f9f9f9">Signature</td><td style="padding:5pt 8pt"></td></tr>
    </table>
    ${generated(f, f.docNumber)}
  `)
}

// ─────────────────────────────────────────────────────────
// MRF — Resource Requisition transmittal
// Axion-internal document (no client/consultant header) — matches the paper
// "Resource Requisition" template: logo only, From/Project No/Project Title,
// To (fixed "Procurement Dept.") / Date, one material row, 3 signature blocks
// (Requisitioner / Project Engineer / Project Manager). No register/log page
// for MRF, per explicit user request — transmittal only.
// ─────────────────────────────────────────────────────────
const mrfSig = (url, widthPt = 160) =>
  url
    ? `<img src="${url}" style="max-height:36pt;max-width:${widthPt}pt;object-fit:contain;vertical-align:middle;mix-blend-mode:multiply">`
    : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'

export const buildMRF = (f) => {
  const td = 'border:0.5pt solid #999;padding:4pt 5pt;font-size:7.5pt;text-align:center;vertical-align:middle;overflow-wrap:break-word;'
  const th = 'border:0.5pt solid #999;padding:5pt 4pt;font-size:7pt;line-height:1.25;text-align:center;vertical-align:middle;font-weight:700;background:#f0f0f0;overflow-wrap:break-word;word-break:normal;white-space:normal;'

  const header = `
    <table style="width:100%;border-collapse:collapse;border:1.5pt solid #000;margin-bottom:0">
      <tr><td style="padding:8pt;vertical-align:middle"><img src="${AXION_LOGO}" style="max-height:46pt;max-width:170pt;object-fit:contain"></td></tr>
    </table>
    <div style="background:#000;color:#fff;text-align:center;padding:7pt 10pt;font-size:13pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10pt">RESOURCE REQUISITION</div>
  `

  const infoBlock = `
    <table style="width:100%;border-collapse:collapse;border:1pt solid #000;margin-bottom:10pt;font-size:8pt">
      <tr>
        <td style="width:55%;border-right:1pt solid #000;padding:6pt 8pt;vertical-align:top">
          <div style="margin-bottom:5pt"><b>FROM:</b> ${f.requested_by || ''}</div>
          <div style="margin-bottom:5pt"><b>PROJECT NO:</b> ${f.projNo || ''}</div>
          <div><b>PROJECT TITLE:</b> ${f.projName || ''}</div>
        </td>
        <td style="width:45%;padding:6pt 8pt;vertical-align:top">
          <div style="margin-bottom:5pt"><b>No.:</b> ${f.mrf_number || ''}</div>
          <div style="margin-bottom:5pt"><b>To:</b> Procurement Dept.</div>
          <div><b>Date:</b> ${fmtDate(f.date)}</div>
        </td>
      </tr>
    </table>
  `

  const materialsTable = `
    <table style="width:100%;table-layout:fixed;border-collapse:collapse;border:1pt solid #000;margin-bottom:12pt">
      <thead>
        <tr>
          <th style="${th}width:2.5%" rowspan="2">S.No</th>
          <th style="${th}width:6%" rowspan="2">Item / BOQ Ref.</th>
          <th style="${th}width:14%" colspan="3">AICC Tender Quantity Allowance</th>
          <th style="${th}width:7%" rowspan="2">Material Code</th>
          <th style="${th}width:17%" rowspan="2">Description of Materials to be Purchased or Hired</th>
          <th style="${th}width:6%" rowspan="2">Total Qty Required</th>
          <th style="${th}width:6%" rowspan="2">Additional Qty</th>
          <th style="${th}width:7%" rowspan="2">Current Qty / Days Required</th>
          <th style="${th}width:6%" rowspan="2">Date Required</th>
          <th style="${th}width:4%" rowspan="2">UOM</th>
          <th style="${th}width:5%" rowspan="2">Unit Rate</th>
          <th style="${th}width:6%" rowspan="2">Total Amount</th>
          <th style="${th}width:7%" rowspan="2">Remarks</th>
        </tr>
        <tr>
          <th style="${th}">UOM</th>
          <th style="${th}">Unit Rate</th>
          <th style="${th}">Tender Allowance</th>
        </tr>
      </thead>
      <tbody>
        <tr style="height:22pt">
          <td style="${td}">1</td>
          <td style="${td}"></td>
          <td style="${td}"></td>
          <td style="${td}"></td>
          <td style="${td}">${f.tender_allowance ?? ''}</td>
          <td style="${td}">${f.material_code || ''}</td>
          <td style="${td}text-align:left">${f.material_desc || ''}</td>
          <td style="${td}">${f.qty ?? ''}</td>
          <td style="${td}">${f.additional_qty ?? ''}</td>
          <td style="${td}"></td>
          <td style="${td}">${fmtDate(f.required_on_site)}</td>
          <td style="${td}">${f.unit || ''}</td>
          <td style="${td}">${f.unit_rate ?? ''}</td>
          <td style="${td}">${f.total_amount ?? ''}</td>
          <td style="${td}text-align:left">${f.remarks || ''}</td>
        </tr>
        ${Array.from({ length: 6 }).map(() => `
        <tr style="height:22pt">
          ${Array.from({ length: 15 }).map(() => `<td style="${td}">&nbsp;</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
  `

  const notesBlock = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:16pt;font-size:8pt">
      <tr><td style="padding:3pt 0"><b>For Deliveries: Site Contact:</b> &nbsp;<span style="border-bottom:0.5pt solid #000;display:inline-block;width:70%">&nbsp;</span></td></tr>
      <tr><td style="padding:6pt 0"><b>REMARKS:</b> &nbsp;<span style="border-bottom:0.5pt solid #000;display:inline-block;width:85%">&nbsp;</span></td></tr>
    </table>
  `

  // One row, 3 equal columns (left/middle/right) — name, then signature, then
  // a line + role label underneath, mirroring the paper form's bottom row.
  const sigCol = (label, name, sig) => `
    <td style="width:33.33%;text-align:center;padding:0 10pt;vertical-align:bottom">
      <div style="font-size:8pt;font-weight:700;margin-bottom:4pt">${name || '&nbsp;'}</div>
      <div style="height:34pt;display:flex;align-items:flex-end;justify-content:center;margin-bottom:3pt">${mrfSig(sig, 130)}</div>
      <div style="border-top:1pt solid #000;padding-top:4pt;font-size:7.5pt;font-weight:700;letter-spacing:.02em">${label}</div>
    </td>
  `

  const signatures = `
    <table style="width:100%;border-collapse:collapse;margin-top:10pt">
      <tr>
        ${sigCol('REQUISITIONER', f.requested_by, f.sigReq)}
        ${sigCol('PROJECT ENGINEER', f.project_engineer, f.sigPE)}
        ${sigCol('PROJECT MANAGER / MANAGING DIRECTOR', f.project_manager, f.sigPM)}
      </tr>
    </table>
  `

  return wrapper(`
    ${header}
    ${infoBlock}
    ${materialsTable}
    ${notesBlock}
    ${signatures}
    ${generated(f, f.mrf_number)}
  `, '288mm', '4.5mm 0')
}

// ─────────────────────────────────────────────────────────
// Universal print trigger
// ─────────────────────────────────────────────────────────
export const printForm = (htmlString, title = 'APCP Form', orientation = 'portrait') => {
  const el = document.getElementById('print-area')
  if (!el) return
  el.innerHTML = htmlString
  const prev = document.title
  document.title = title

  // index.css declares a global @page { size: A4 portrait } for every
  // #print-area document. For the rare form that needs landscape (MRF's wide
  // materials table), inject a temporary override and remove it right after
  // printing — every other form keeps using the global portrait rule untouched.
  let landscapeStyle = null
  if (orientation === 'landscape') {
    landscapeStyle = document.createElement('style')
    landscapeStyle.textContent = '@media print { @page { size: A4 landscape; margin: 0; } }'
    document.head.appendChild(landscapeStyle)
  }

  // Give embedded base64 logo images time to decode/paint before the print
  // snapshot is taken — without this delay they render blank (same fix the
  // Register PDF exports already use via their own setTimeout before print()).
  setTimeout(() => {
    window.print()
    setTimeout(() => {
      document.title = prev
      if (landscapeStyle) landscapeStyle.remove()
    }, 1000)
  }, 300)
}

// ─────────────────────────────────────────────────────────
// DAR — Daily Activity Report
// Mirrors dar-v6.html buildPrintHTML exactly
// ─────────────────────────────────────────────────────────
export const buildDAR = (d) => {
  const scs       = d.subcontractors || []
  const activeSCs = scs.filter(sc => sc.name)
  const mpV       = d.mpValues || {}
  const eqV       = d.eqValues || {}

  const thS = 'background:#CCCCCC;border:0.5pt solid #999;padding:2.5pt 3pt;font-size:6.5pt;font-weight:700;text-align:center;'
  const tdL = 'border:0.5pt solid #CCC;padding:1.5pt 3pt;font-size:6.5pt;text-align:left;'
  const tdC = 'border:0.5pt solid #CCC;padding:1.5pt 3pt;font-size:6.5pt;text-align:center;'
  const shC = 'background:#CCCCCC;border:0.5pt solid #999;padding:2pt 3pt;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.03em;'
  const shS = 'background:#E0E0E0;border:0.5pt solid #999;padding:2pt 3pt;font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.03em;'
  const trS = 'background:#CCCCCC;border:0.5pt solid #999;padding:2pt 3pt;font-size:6.5pt;font-weight:700;'

  // Three-party header — same Axion / Client / Consultant convention as every other printed form
  const clientCell = d.clientLogo
    ? `<img src="${d.clientLogo}" style="max-height:40pt;max-width:130pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:8pt;font-weight:700;text-align:center;padding:6pt 4pt">${d.client || 'Client'}</div>`
  const consultantCell = d.consultantLogo
    ? `<img src="${d.consultantLogo}" style="max-height:40pt;max-width:130pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:8pt;font-weight:700;text-align:center;padding:6pt 4pt">${d.consultant || 'Consultant'}</div>`

  const tmr = new Date(d.date)
  tmr.setDate(tmr.getDate() + 1)
  const tmrDisp = (() => {
    const dt = tmr
    return String(dt.getDate()).padStart(2,'0') + '/' +
      String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear()
  })()

  // SC column headers
  let h1 = `<th style="${thS}text-align:left;min-width:90pt" rowspan="2">Labour Forces</th><th style="${thS}min-width:22pt" rowspan="2">AICC</th>`
  let h2 = ''
  activeSCs.forEach((sc, i) => {
    if (sc.hasNight) { h1 += `<th style="${thS}" colspan="2">S.C-${i+1}</th>`; h2 += `<th style="${thS}font-weight:400;font-size:5.5pt">Day</th><th style="${thS}font-weight:400;font-size:5.5pt">Night</th>` }
    else h1 += `<th style="${thS}min-width:22pt" rowspan="2">S.C-${i+1}</th>`
  })
  const scCols = activeSCs.reduce((s, sc) => s + (sc.hasNight ? 2 : 1), 0)
  const mpSpan = 2 + scCols

  const mpCells = (role) => {
    let c = `<td style="${tdL}">${role}</td><td style="${tdC}">${mpV[role+'|||aicc'] || ''}</td>`
    activeSCs.forEach((sc, i) => {
      if (sc.hasNight) {
        c += `<td style="${tdC}">${mpV[role+'|||sc'+(i+1)+'_day'] || ''}</td><td style="${tdC}">${mpV[role+'|||sc'+(i+1)+'_night'] || ''}</td>`
      } else {
        c += `<td style="${tdC}">${mpV[role+'|||sc'+(i+1)] || ''}</td>`
      }
    })
    return c
  }

  let cT=0, sT=0, cEQ=0, sEQ=0
  ;(d.commonRoles||[]).forEach(r => { Object.keys(mpV).filter(k=>k.startsWith(r+'|||')).forEach(k=>{cT+=parseInt(mpV[k])||0}) })
  ;(d.siteRoles||[]).forEach(r => { Object.keys(mpV).filter(k=>k.startsWith(r+'|||')).forEach(k=>{sT+=parseInt(mpV[k])||0}) })
  ;(d.commonEquipment||[]).forEach(eq => { cEQ += parseInt(eqV[eq])||0 })
  ;(d.siteEquipment||[]).forEach(eq => { sEQ += parseInt(eqV[eq])||0 })
  const gMP = cT + sT

  const rows = (roles, eqs, issite) => {
    const max = Math.max(roles.length, eqs.length)
    let out = ''
    for (let i = 0; i < max; i++) {
      const r = roles[i] || ''
      const eq = eqs[i] || ''
      out += `<tr>${r ? mpCells(r) : `<td style="${tdL}" colspan="${mpSpan}"></td>`}<td style="${tdL}">${eq}</td><td style="${tdC}">${eq && eqV[eq] ? eqV[eq] : ''}</td></tr>`
    }
    out += `<tr><td style="${trS}text-align:right;padding-right:5pt" colspan="${mpSpan}">Total</td><td style="${trS}">${issite ? 'Total Equipment' : 'Total'}</td><td style="${trS}text-align:center">${issite ? (sEQ || '') : (cEQ || '')}</td></tr>`
    if (issite) out += `<tr><td style="${trS}text-align:center" colspan="${mpSpan}">Total Manpower &nbsp;${gMP||''}</td><td style="${trS}">Total manpower</td><td style="${trS}text-align:center">${gMP||''}</td></tr>`
    return out
  }

  const scFtr = scs.map((sc, i) =>
    `<div style="font-size:6.5pt;margin-bottom:1pt;font-family:Arial,Helvetica,sans-serif"><i>Sub-Contractor - ${i+1}: ${sc.name || '……………………………………………'}</i></div>`
  ).join('')

  const act = `<table style="width:100%;border-collapse:collapse;border:0.5pt solid #999;border-top:none;font-size:6.5pt;font-family:Arial,Helvetica,sans-serif">
    <tr>
      <td style="width:50%;border-right:0.5pt solid #999;padding:4pt 5pt;vertical-align:top">
        <div style="font-weight:700;text-align:center;text-decoration:underline;margin-bottom:3pt;font-size:7pt">Today's activity (REPORT)</div>
        <div style="white-space:pre-wrap;line-height:1.5">${d.todayActivity || ''}</div>
        ${d.notes ? `<div style="margin-top:4pt;font-size:6pt;font-style:italic;color:#555">Note (${d.notes})</div>` : ''}
      </td>
      <td style="width:50%;padding:4pt 5pt;vertical-align:top">
        <div style="font-weight:700;text-align:center;text-decoration:underline;margin-bottom:3pt;font-size:7pt">Tomorrow's activity (PLAN) — ${tmrDisp}</div>
        <div style="white-space:pre-wrap;line-height:1.5">${d.tomorrowActivity || ''}</div>
        <div style="border-top:0.5pt solid #ccc;margin-top:5pt;padding-top:3pt;display:flex;justify-content:space-between">
          <span style="font-size:6pt;font-weight:700;text-transform:uppercase">PLANNED SITE MANPOWER ALLOCATION</span>
          <span style="font-size:9pt;font-weight:700">${d.mpSite || ''}</span>
        </div>
        <div style="border-top:0.5pt solid #ccc;margin-top:3pt;padding-top:3pt;display:flex;justify-content:space-between">
          <span style="font-size:6pt;font-weight:700;text-transform:uppercase">PLANNED SITE MANPOWER FOR SUB-CONTRACTOR'S</span>
          <span style="font-size:9pt;font-weight:700">${d.mpSC || ''}</span>
        </div>
      </td>
    </tr>
  </table>`

  const ftr = `<table style="width:100%;border-collapse:collapse;border:0.5pt solid #999;border-top:none;font-family:Arial,Helvetica,sans-serif">
    <tr><td style="padding:4pt 6pt;font-size:7pt">
      <div style="font-weight:600">For Axion Imagineering Construction Co. W.L.L</div>
      <div style="margin-top:2pt;font-style:italic;color:#555;font-size:6pt">Generated electronically by APCP — ${now()}</div>
      <div style="margin-top:1pt;color:#777;font-size:6pt">Document: ${d.filename || ''}.pdf &nbsp;|&nbsp; Submitted by: ${d.submittedBy || ''} &nbsp;|&nbsp; Status: ${d.status || ''}</div>
    </td></tr>
  </table>`

  return `<style>
    .print-page{width:210mm;min-height:297mm;background:#fff;padding:10mm 12mm 8mm 12mm;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:7pt}
    .print-header-row{width:88%;margin:0 auto 5mm;border-collapse:collapse;border:1.5pt solid #000}
    .print-title{text-align:center;font-size:12pt;font-weight:700;text-transform:uppercase;margin-bottom:6mm;letter-spacing:.04em}
    .print-project-table{width:88%;margin:0 auto;border-collapse:collapse;font-size:7pt;border:1pt solid #000}
  </style>
  <div class="print-page">
    <table class="print-header-row">
      <tr>
        <td style="width:34%;border-right:1pt solid #000;padding:6pt 8pt;vertical-align:middle">
          <img src="${AXION_LOGO}" style="max-height:46pt;max-width:150pt;object-fit:contain;display:block">
        </td>
        <td style="width:32%;border-right:1pt solid #000;padding:6pt 8pt;vertical-align:middle;text-align:center">
          ${clientCell}
        </td>
        <td style="width:34%;padding:6pt 8pt;vertical-align:middle;text-align:center">
          ${consultantCell}
        </td>
      </tr>
    </table>
    <div class="print-title">DAILY ACTIVITY REPORT</div>
    <table class="print-project-table" style="margin-bottom:0">
      <tr>
        <td style="border:0.5pt solid #999;padding:2.5pt 5pt;width:14%"><span style="font-size:6pt;color:#444">Project Name:</span></td>
        <td style="border:0.5pt solid #999;padding:2.5pt 5pt;font-weight:600;width:44%" colspan="2">${d.projName || ''}</td>
        <td style="border:0.5pt solid #999;padding:2.5pt 5pt;width:10%"><div style="font-size:6pt;color:#444">Day</div><div style="font-size:6pt;color:#444;margin-top:2pt">Date</div></td>
        <td style="border:0.5pt solid #999;padding:2.5pt 5pt;width:14%;font-weight:600"><div>${d.dayName || ''}</div><div style="margin-top:2pt">${d.dateDisp || ''}</div></td>
        <td style="border:none;width:8%"></td>
      </tr>
      <tr>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Contractor:</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600" colspan="2">Axion Imagineering Construction Co. WLL</td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Shift</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600">${d.shift || 'Day'}</td>
        <td style="border:none"></td>
      </tr>
      <tr>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Client:</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600" colspan="2">${d.client || ''}</td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"></td>
        <td style="border:none"></td>
      </tr>
      <tr>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Consultant:</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600" colspan="2">${d.consultant || ''}</td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Weather</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600">${d.weather || ''}</td>
        <td style="border:none"></td>
      </tr>
      <tr>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><span style="font-size:6pt;color:#444">Project Number:</span></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600" colspan="2">${d.projNumber || ''}</td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt"><div style="font-size:6pt;color:#444">Wind</div><div style="font-size:6pt;color:#444;margin-top:1.5pt">Humidity</div><div style="font-size:6pt;color:#444;margin-top:1.5pt">RAIN</div></td>
        <td style="border:0.5pt solid #999;padding:2pt 5pt;font-weight:600"><div>${d.wind || ''}</div><div style="margin-top:1.5pt">${d.humidity || ''}</div><div style="margin-top:1.5pt">${d.rain || ''}</div></td>
        <td style="border:none"></td>
      </tr>
      ${(d.wt1||d.wt2) ? `<tr><td colspan="6" style="border:0.5pt solid #999;padding:2pt 5pt;font-size:6pt">
        ${d.wt2 ? `<span style="margin-right:14pt"><b>${d.dateDisp}</b> Working Time: ${d.wt2}</span>` : ''}
        ${d.wt1 ? `<span><b>${tmrDisp}</b> Working Time: ${d.wt1}</span>` : ''}
      </td></tr>` : ''}
    </table>
    <div style="border:0.5pt solid #999;border-top:none;padding:2.5pt 5pt;font-size:7.5pt;font-weight:700;width:88%;margin:0 auto;margin-bottom:3mm">Date: ${d.dateDisp || ''}</div>
    <table style="width:100%;border-collapse:collapse;font-size:6.5pt">
      <thead>
        <tr>
          <th style="${thS}font-size:7pt;letter-spacing:.05em" colspan="${mpSpan}">MANPOWER</th>
          <th style="${thS}font-size:7pt;letter-spacing:.05em;text-align:left" colspan="2">List of Major Equipment &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; No.</th>
        </tr>
        <tr>${h1}<th style="${thS}text-align:left;min-width:100pt" rowspan="2">Equipment</th><th style="${thS}" rowspan="2">No.</th></tr>
        <tr>${h2}</tr>
      </thead>
      <tbody>
        <tr><td style="${shC}" colspan="${mpSpan}">Common Resources</td><td style="${shC}" colspan="2">Common Resource for Project</td></tr>
        ${rows(d.commonRoles||[], d.commonEquipment||[], false)}
        <tr><td style="${shS}" colspan="${mpSpan}">Site Resources</td><td style="${shS}" colspan="2">Site Resources</td></tr>
        ${rows(d.siteRoles||[], d.siteEquipment||[], true)}
      </tbody>
    </table>
    <div style="border:0.5pt solid #999;border-top:none;padding:3pt 5pt;font-family:Arial,Helvetica,sans-serif">${scFtr}</div>
    ${act}
    ${ftr}
  </div>`
}
