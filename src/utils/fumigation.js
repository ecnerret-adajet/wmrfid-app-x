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

// Inventory commodity statuses used by the warehouse map (mirrors App\Models\CommodityStatus)
export const COMMODITY_STATUS = {
  'GOOD': 1,
  'QUALITY_INSPECTION': 3,
  'FUMIGATED': 7,
  'FOR_FUMIGATION': 12,
  'AERATION': 13,
}

export const isFumigationBin = block =>
  block?.is_fumigation_bin === true || Number(block?.is_fumigation_bin) === 1

// Fumigation state of one map block: stage priority for-fumigation > fumigating > aeration,
// so a chamber still receiving pallets is never shown as fumigating
export const blockFumigationInfo = block => {
  const isChamber = isFumigationBin(block)
  const statuses = (block?.inventories || []).map(inventory => Number(inventory?.commodity_status_id))

  const counts = {
    forFumigation: statuses.filter(status => status === COMMODITY_STATUS.FOR_FUMIGATION).length,
    fumigated: statuses.filter(status => status === COMMODITY_STATUS.FUMIGATED).length,
    aeration: statuses.filter(status => status === COMMODITY_STATUS.AERATION).length,
  }

  const fumigationPallets = counts.forFumigation + counts.fumigated + counts.aeration

  let stage = null

  if (counts.forFumigation)
    stage = 'for-fumigation'
  else if (counts.fumigated)
    stage = 'fumigating'
  else if (counts.aeration)
    stage = 'aeration'

  // A chamber holding a pallet outside the fumigation process (GOOD, QI, no status...)
  const mismatch = isChamber && statuses.length > fumigationPallets

  return { isChamber, stage, mismatch, counts }
}
