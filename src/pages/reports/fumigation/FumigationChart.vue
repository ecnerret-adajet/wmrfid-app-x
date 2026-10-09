<template>
  <VCard>
    <VCardTitle class="text-h5 font-weight-bold">
      Fumigation Summary
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol
          v-for="card in cards"
          :key="card.key"
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            :color="card.color"
            class="h-100"
          >
            <VCardText class="d-flex flex-column justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                  {{ card.title }}
                </div>
                <VIcon
                  :icon="card.icon"
                  size="32"
                />
              </div>

              <div>
                <div class="text-caption text-medium-emphasis">
                  {{ card.caption }}
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ formatNumber(totals[card.key]) }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <div class="mt-6">
        <div class="text-h6 font-weight-bold mb-3">
          Daily Summary (by encoded date)
        </div>

        <div class="summary-table-wrapper">
          <table class="summary-table">
            <thead>
              <tr>
                <th class="type-column">
                  Type
                </th>
                <th
                  v-for="row in props.data"
                  :key="row.date"
                  class="date-column"
                >
                  {{ formatDate(row.date) }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="line in dailyRows"
                :key="line.key"
                :class="{ 'total-row': line.key === 'total' }"
              >
                <td
                  class="type-column"
                  :class="line.key === 'total' ? 'font-weight-bold' : 'font-weight-medium'"
                >
                  {{ line.title }}
                </td>
                <td
                  v-for="row in props.data"
                  :key="`${line.key}-${row.date}`"
                  :class="{ 'font-weight-bold': line.key === 'total' }"
                >
                  {{ formatNumber(row[line.key]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const cards = [
  { key: 'total', title: 'Total Pallets', caption: 'Encoded for fumigation', icon: 'ri-stack-line', color: 'info' },
  { key: 'sales', title: 'c/o Sales', caption: 'Reserved to a sensitive DO', icon: 'ri-user-star-line', color: 'primary' },
  { key: 'alc', title: 'c/o ALC', caption: 'Unreserved stock', icon: 'ri-search-eye-line', color: 'secondary' },
  { key: 'in_process', title: 'In Process', caption: 'Not yet back in FG', icon: 'ri-loader-4-line', color: 'warning' },
  { key: 'completed', title: 'Completed', caption: 'Back in FG as Good', icon: 'ri-checkbox-circle-line', color: 'success' },
  { key: 'early_terminated', title: 'Early Terminated', caption: 'Approved early termination', icon: 'ri-timer-flash-line', color: 'error' },
]

const dailyRows = [
  { key: 'sales', title: 'c/o Sales' },
  { key: 'alc', title: 'c/o ALC' },
  { key: 'in_process', title: 'In Process' },
  { key: 'completed', title: 'Completed' },
  { key: 'early_terminated', title: 'Early Terminated' },
  { key: 'cancelled', title: 'Cancelled / Removed' },
  { key: 'total', title: 'Total' },
]

const totals = computed(() => {
  const keys = ['total', 'sales', 'alc', 'in_process', 'completed', 'cancelled', 'early_terminated']

  return (props.data ?? []).reduce((result, row) => {
    keys.forEach(key => { result[key] += Number(row[key] || 0) })

    return result
  }, Object.fromEntries(keys.map(key => [key, 0])))
})

const formatNumber = value => Number(value || 0).toLocaleString()

const formatDate = date => {
  if (!date) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${date}T00:00:00`))
}
</script>

<style scoped>
.summary-table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}

.summary-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.summary-table th,
.summary-table td {
  padding: 12px 16px;
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.summary-table th {
  font-weight: 600;
  background: rgb(var(--v-theme-surface));
}

.summary-table .type-column {
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 160px;
  text-align: left;
  background: rgb(var(--v-theme-surface));
}

.summary-table thead .type-column {
  z-index: 3;
}

.summary-table .date-column {
  min-width: 100px;
}

.summary-table tbody tr:last-child td {
  border-bottom: 0;
}

.summary-table .total-row td {
  background: rgba(var(--v-theme-grey-100));
}
</style>
