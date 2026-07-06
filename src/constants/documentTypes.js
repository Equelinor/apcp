export const DOC_TYPE = {
  MRF:  { code: 'MRF',  label: 'Material Request Form',         color: '#1E40AF' },
  PO:   { code: 'PO',   label: 'Purchase Order',                color: '#065F46' },
  DN:   { code: 'DN',   label: 'Delivery Note',                 color: '#065F46' },
  MIR:  { code: 'MIR',  label: 'Material Inspection Request',   color: '#5B21B6' },
  DRW:  { code: 'DRW',  label: 'Drawing',                       color: '#1E40AF' },
  DOC:  { code: 'DOC',  label: 'Document',                      color: '#5B21B6' },
  IF04: { code: 'IF04', label: 'Shop Drawing Submittal',        color: '#065F46' },
  MAC:  { code: 'MAC',  label: 'Material Approval Certificate', color: '#92400E' },
  MUI:  { code: 'MUI',  label: 'Mock-up Inspection',            color: '#1558A0' },
  DS:   { code: 'DS',   label: 'Document Submittal',            color: '#5B21B6' },
  RFI:  { code: 'RFI',  label: 'Request For Information',       color: '#B91C1C' },
  IR:   { code: 'IR',   label: 'Inspection Request',            color: '#065F46' },
  SCA:  { code: 'SCA',  label: 'Sub-contractor Approval',       color: '#92400E' },
  DAR:  { code: 'DAR',  label: 'Daily Activity Report',         color: '#0F766E' },
  NCR:  { code: 'NCR',  label: 'Non-Conformance Report',        color: '#B91C1C' },
  SOR:  { code: 'SOR',  label: 'Site Observation Report',       color: '#92400E' },
  SUP:  { code: 'SUP',  label: 'Supplier',                      color: '#374151' },
  PRJ:  { code: 'PRJ',  label: 'Project',                       color: '#0F766E' },
}

export const DOC_CATEGORIES = [
  'Method Statement', 'ITP', 'Risk Assessment', 'Technical Submittal',
  'Material Submittal', 'Shop Drawing', 'As-Built', 'Certificate',
  'Letter', 'Transmittal', 'Minutes of Meeting', 'Report', 'Other',
]

export const DRAWING_REVISIONS = [
  'Rev 00', 'Rev 01', 'Rev 02', 'Rev 03', 'Rev 04', 'Rev 05', 'IFC', 'As Built',
]

// Response codes (consultant) — single source of truth is config/docTypes.js.
export { RESPONSE_CODES } from '../config/docTypes'

export const UNITS = ['CUM', 'MT', 'NOS', 'SQM', 'LM', 'BAG', 'KG', 'TON', 'SET', 'EA', 'LT']
