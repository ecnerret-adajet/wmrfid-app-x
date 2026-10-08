// Stored fumigation request lifecycle status (fumigation_requests.status)
export const FUMIGATION_STATUSES = {
  'for_transfer': { label: 'For Transfer', color: 'info' },
  'fumigating': { label: 'Fumigating', color: 'warning' },
  'aeration': { label: 'Aeration', color: 'secondary' },
  'for_release': { label: 'For Release', color: 'primary' },
  'completed': { label: 'Completed', color: 'success' },
  'cancelled': { label: 'Cancelled', color: 'error' },
}

export const fumigationStatusLabel = status => FUMIGATION_STATUSES[status]?.label ?? status ?? '—'

export const fumigationStatusColor = status => FUMIGATION_STATUSES[status]?.color ?? 'secondary'

export const fumigationStatusOptions = Object.entries(FUMIGATION_STATUSES)
  .map(([value, { label }]) => ({ value, title: label }))
