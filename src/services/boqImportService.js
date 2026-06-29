// ════════════════════════════════════════════════════════════
// BOQ Import Service — CSV / Excel parser
// Supported columns (case-insensitive, flexible naming):
//   Section Code, Section Name, BOQ Item No, Description,
//   Unit, Quantity, Rate, Amount, Trade, Remarks
// ════════════════════════════════════════════════════════════

// Column name aliases
const COL_MAP = {
  section_code:  ['section code', 'section_code', 'sec code', 'sec_code', 'section no', 'section number'],
  section_name:  ['section name', 'section_name', 'trade name', 'section title'],
  item_no:       ['boq item no', 'item no', 'item_no', 'item number', 'boq no', 'ref no', 'ref', 'item'],
  description:   ['description', 'desc', 'item description', 'work description'],
  unit:          ['unit', 'uom', 'unit of measure'],
  quantity:      ['quantity', 'qty', 'qnty'],
  rate:          ['rate', 'unit rate', 'unit price', 'price'],
  amount:        ['amount', 'total', 'total amount', 'sum', 'value'],
  trade:         ['trade', 'discipline', 'category'],
  remarks:       ['remarks', 'notes', 'comment', 'comments'],
}

function normalise(str) {
  return (str || '').toString().trim().toLowerCase()
}

function findCol(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => normalise(h) === alias)
    if (idx >= 0) return idx
  }
  return -1
}

function num(v) {
  const n = parseFloat((v || '').toString().replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { sections: [], items: [], errors: ['File appears empty'] }

  // Detect delimiter
  const delim = lines[0].includes('\t') ? '\t' : ','

  const parseLine = (line) => {
    const result = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === delim && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const colIdx  = {}
  for (const [key, aliases] of Object.entries(COL_MAP)) {
    colIdx[key] = findCol(headers, aliases)
  }

  const errors  = []
  const sections = {}
  const items    = []
  let sortOrder  = 0

  for (let r = 1; r < lines.length; r++) {
    const row = parseLine(lines[r])
    if (row.every(c => !c)) continue

    const get = (key) => colIdx[key] >= 0 ? (row[colIdx[key]] || '').trim() : ''

    const itemNo  = get('item_no')
    const desc    = get('description')
    if (!itemNo && !desc) continue

    const sectionCode = get('section_code') || '00'
    const sectionName = get('section_name') || 'General'
    const qty  = num(get('quantity'))
    const rate = num(get('rate'))
    let   amt  = num(get('amount'))
    if (!amt && qty && rate) amt = qty * rate

    if (!sections[sectionCode]) {
      sections[sectionCode] = {
        section_code: sectionCode,
        section_name: sectionName,
        trade: get('trade') || '',
        sort_order: sortOrder++,
        total_amount: 0,
      }
    }
    sections[sectionCode].total_amount += amt

    items.push({
      section_code: sectionCode,
      item_no:      itemNo || `${sectionCode}.${r}`,
      description:  desc,
      unit:         get('unit'),
      quantity:     qty,
      rate:         rate,
      amount:       amt,
      trade:        get('trade') || sections[sectionCode].trade || '',
      remarks:      get('remarks'),
      completed_qty: 0,
      progress_pct:  0,
      completed_value: 0,
      balance_value: amt,
      status: 'Not Started',
    })
  }

  if (items.length === 0) errors.push('No valid BOQ items found. Check column headers.')

  return {
    sections: Object.values(sections),
    items,
    errors,
    summary: `${items.length} items across ${Object.keys(sections).length} sections`,
  }
}

// Excel parsing using SheetJS (loaded dynamically)
export async function parseExcel(file) {
  const XLSX = await import('xlsx')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const csv = XLSX.utils.sheet_to_csv(ws)
        resolve(parseCSV(csv))
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export async function parseFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    const text = await file.text()
    return parseCSV(text)
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(file)
  }
  throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls')
}
