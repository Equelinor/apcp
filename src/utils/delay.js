export function delayStatus(mrf) {
  const now = new Date(); now.setHours(0, 0, 0, 0)

  if (['Approved for Use', 'Used at Site'].includes(mrf.site_status)) return 'On Track'
  if (mrf.site_status === 'Rejected') return 'Delayed'

  const lrd = mrf.latest_raise_date ? new Date(mrf.latest_raise_date) : null
  const ed  = mrf.expected_delivery  ? new Date(mrf.expected_delivery)  : null
  const ros = mrf.required_on_site   ? new Date(mrf.required_on_site)   : null

  if (lrd && now > lrd && mrf.approval_status === 'Draft') return 'Late to Raise'
  if (ed && ros && ed > ros) return 'Delayed'
  if (ros && !ed && lrd && now > lrd) return 'At Risk'
  if (ros) {
    const days = Math.ceil((ros - now) / 86400000)
    if (days <= 5 && !mrf.po_number) return 'At Risk'
  }
  return 'On Track'
}

export function calcLatestRaiseDate(requiredOnSite, leadTimeDays) {
  if (!requiredOnSite || !leadTimeDays) return null
  const d = new Date(requiredOnSite)
  d.setDate(d.getDate() - parseInt(leadTimeDays))
  return d.toISOString().slice(0, 10)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
