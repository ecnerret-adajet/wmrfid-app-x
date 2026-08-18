<template>
  <VCard>
    <VCardTitle class="text-h5 font-weight-bold">
      Outbound Performance Summary
    </VCardTitle>

    <VCardText>
      <VRow>
        <!-- Total -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <VCard
            variant="tonal"
            color="info"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Total Reserved
                </div>
                <VIcon
                  icon="ri-stack-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Total Pallets To Be Issued
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.total_reserved.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Bay Scanned -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <VCard
            variant="tonal"
            color="primary-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Bay Scanned
                </div>
                <VIcon
                  icon="ri-checkbox-circle-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Loading Completed
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.bay_scanned.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Pending Bay Scan -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <VCard
            color="warning"
            variant="tonal"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Pending Bay Scan
                </div>
                <VIcon
                  icon="ri-time-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Scanned, awaiting bay assignment
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.pending_bay_scan.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- No QR (Skipped) -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <VCard
            variant="tonal"
            color="secondary"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    No QR (Skipped)
                </div>
                <VIcon
                  icon="ri-qr-scan-2-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  QR scanning not applicable
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.no_qr_skipped.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Completion Rate -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <VCard
            variant="tonal"
            color="success"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Completion Rate
                </div>
                <VIcon
                  icon="ri-percent-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Bay Scanned / Applicable (QR) Pallets
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ completionRate }}%
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

      </VRow>
       <div class="mt-6">
          <div class="text-h6 font-weight-bold mb-3">
            Daily Summary
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
                <tr class="good-row">
                  <td class="type-column font-weight-medium">
                    Bay Scanned
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`bay_scanned-${row.date}`"
                  >
                    {{ formatNumber(row.bay_scanned) }}
                  </td>
                </tr>

                <tr class="warning-row">
                  <td class="type-column font-weight-medium">
                    Pending Bay Scan
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`pending-${row.date}`"
                  >
                    {{ formatNumber(row.pending_bay_scan) }}
                  </td>
                </tr>

                <tr class="weak-pallet-row">
                  <td class="type-column font-weight-medium">
                    No QR (Skipped)
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`no_qr-${row.date}`"
                  >
                    {{ formatNumber(row.no_qr_skipped) }}
                  </td>
                </tr>

                <tr class="total-row">
                  <td class="type-column font-weight-bold">
                    Total Reserved
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`total-${row.date}`"
                    class="font-weight-bold"
                  >
                    {{ formatNumber(row.total_reserved) }}
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

const totals = computed(() => {
  return props.data.reduce(
    (result, row) => {
      result.total_reserved += Number(row.total_reserved || 0)
      result.bay_scanned += Number(row.bay_scanned || 0)
      result.pending_bay_scan += Number(row.pending_bay_scan || 0)
      result.no_qr_skipped += Number(row.no_qr_skipped || 0)

      return result
    },
    {
      total_reserved: 0,
      bay_scanned: 0,
      pending_bay_scan: 0,
      no_qr_skipped: 0,
    }
  )
})

const completionRate = computed(() => {
  const applicable = totals.value.total_reserved - totals.value.no_qr_skipped

  if (!applicable) return '0.00'

  return ((totals.value.bay_scanned / applicable) * 100).toFixed(2)
})

const formatNumber = value => {
  return Number(value || 0).toLocaleString()
}

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
