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

// Per-pallet stage (fumigation_items.status)
export const FUMIGATION_ITEM_STATUSES = {
  'for_transfer': { label: 'For Transfer', color: 'info' },
  'fumigated': { label: 'In Chamber', color: 'warning' },
  'aeration': { label: 'Aeration', color: 'secondary' },
  'for_release': { label: 'For Release', color: 'primary' },
  'completed': { label: 'Completed', color: 'success' },
  'removed': { label: 'Removed', color: 'error' },
  'cancelled': { label: 'Cancelled', color: 'error' },
}

export const fumigationItemStatusLabel = status => FUMIGATION_ITEM_STATUSES[status]?.label ?? status ?? '—'

export const fumigationItemStatusColor = status => FUMIGATION_ITEM_STATUSES[status]?.color ?? 'secondary'

// Early termination request (fumigation_termination_requests.status)
export const FUMIGATION_TERMINATION_STATUSES = {
  'pending': { label: 'Pending', color: 'warning' },
  'approved': { label: 'Approved', color: 'success' },
  'rejected': { label: 'Rejected', color: 'error' },
}

export const fumigationTerminationStatusLabel = status => FUMIGATION_TERMINATION_STATUSES[status]?.label ?? status ?? '—'

export const fumigationTerminationStatusColor = status => FUMIGATION_TERMINATION_STATUSES[status]?.color ?? 'secondary'
