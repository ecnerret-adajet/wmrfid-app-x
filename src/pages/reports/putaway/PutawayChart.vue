<template>
  <VCard>
    <VCardTitle class="text-h5 font-weight-bold">
      Putaway Summary
    </VCardTitle>

    <VCardText>
      <VRow>
        <!-- Total -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="info"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Total Pallets
                </div>
                <VIcon
                  icon="ri-stack-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Total Count
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.total.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Good -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="primary-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Good
                </div>
                <VIcon
                  icon="ri-checkbox-circle-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  40 bags per pallet
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.good_non_loose.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Empty -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Empty
                </div>
                <VIcon
                  icon="ri-inbox-unarchive-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Empty pallet/No batch
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.empty.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Inline Rejected -->

        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            color="error-darken-1"
            variant="tonal"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Inline Reject
                </div>
                <VIcon
                  icon="ri-close-circle-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Invalid/Wrong Ticket no.
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.inline_rejected.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="warning"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                  Loose
                </div>
                <VIcon
                  icon="ri-layout-row-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Less than 40 bags per pallet
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.is_loose.toLocaleString() }}
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
                    Good
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`good_non_loose-${row.date}`"
                  >
                    {{ formatNumber(row.good_non_loose) }}
                  </td>
                </tr>

                <tr class="empty-row">
                  <td class="type-column font-weight-medium">
                    Empty
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`empty-${row.date}`"
                  >
                    {{ formatNumber(row.empty) }}
                  </td>
                </tr>

                <tr class="inline-rejected-row">
                  <td class="type-column font-weight-medium">
                    Inline Reject
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`rejected-${row.date}`"
                  >
                    {{ formatNumber(row.inline_rejected) }}
                  </td>
                </tr>

                <tr class="loose-row">
                  <td class="type-column font-weight-medium">
                    Loose
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`loose-${row.date}`"
                  >
                    {{ formatNumber(row.is_loose) }}
                  </td>
                </tr>

                <tr class="total-row">
                  <td class="type-column font-weight-bold">
                    Total
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`total-${row.date}`"
                    class="font-weight-bold"
                  >
                    {{ formatNumber(row.total) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </VCardText>

  </VCard>

  <VCard class="mt-4">
    <VCardTitle class="text-h5 font-weight-bold">
      Putaway Pallet RFID Condition Summary
    </VCardTitle>

    <VCardText>
      <VRow>
        <!-- Total -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="info"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Total Pallets
                </div>
                <VIcon
                  icon="ri-stack-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Total Count
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.total.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="primary-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Active
                </div>
                <VIcon
                  icon="ri-signal-wifi-fill"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Active RFID tags
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.not_weak_pallet.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

         <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="error-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Weak
                </div>
                <VIcon
                  icon="ri-signal-wifi-error-fill"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Weak RFID tags
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.weak_pallet.toLocaleString() }}
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
                <tr class="weak-pallet-row">
                  <td class="type-column font-weight-medium">
                    Active
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`weak-${row.date}`"
                  >
                    {{ formatNumber(row.not_weak_pallet) }}
                  </td>
                </tr>
                <tr class="weak-pallet-row">
                  <td class="type-column font-weight-medium">
                    Weak
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`weak-${row.date}`"
                  >
                    {{ formatNumber(row.weak_pallet) }}
                  </td>
                </tr>
                <tr class="total-row">
                  <td class="type-column font-weight-bold">
                    Total
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`total-${row.date}`"
                    class="font-weight-bold"
                  >
                    {{ formatNumber(row.total) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </VCardText>
  </VCard>

  <VCard class="mt-4">
    <VCardTitle class="text-h5 font-weight-bold">
      Putaway Pallet QR Code Tracking Summary
    </VCardTitle>

    <VCardText>
      <VRow>
        <!-- Total -->
        <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="info"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    Total Pallets
                </div>
                <VIcon
                  icon="ri-stack-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  Total Count
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.total.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

       <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="primary-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    With QR Code
                </div>
                <VIcon
                  icon="ri-qr-code-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  With QR Code Sticker
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.with_qr.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

         <VCol
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <VCard
            variant="tonal"
            color="error-darken-1"
            class="h-100"
          >
            <VCardText class="d-flex flex-column  justify-space-between">
              <div class="d-flex align-center justify-space-between">
                <div class="text-h5">
                    No QR Code
                </div>
                <VIcon
                  icon="ri-close-line"
                  size="32"
                />
              </div>

              <div >
                <div class="text-caption text-medium-emphasis ">
                  No QR Code Sticker
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totals.without_qr.toLocaleString() }}
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
                <tr class="weak-pallet-row">
                  <td class="type-column font-weight-medium">
                    With QR Code
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`with-qr-${row.date}`"
                  >
                    {{ formatNumber(row.with_qr) }}
                  </td>
                </tr>

                <tr class="weak-pallet-row">
                  <td class="type-column font-weight-medium">
                    No QR Code
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`no-qr-${row.date}`"
                  >
                    {{ formatNumber(row.without_qr) }}
                  </td>
                </tr>

                <tr class="total-row">
                  <td class="type-column font-weight-bold">
                    Total
                  </td>

                  <td
                    v-for="row in props.data"
                    :key="`total-${row.date}`"
                    class="font-weight-bold"
                  >
                    {{ formatNumber(row.total) }}
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
      result.total += Number(row.total || 0)
      result.good_non_loose += Number(row.good_non_loose || 0)
      result.empty += Number(row.empty || 0)
      result.inline_rejected += Number(row.inline_rejected || 0)
      result.weak_pallet += Number(row.weak_pallet || 0)
      result.without_qr += Number(row.without_qr || 0)
      result.not_weak_pallet += Number(row.not_weak_pallet || 0)
      result.with_qr += Number(row.with_qr || 0)
      result.is_loose += Number(row.is_loose || 0)

      return result
    },
    {
      total: 0,
      good_non_loose: 0,
      empty: 0,
      inline_rejected: 0,
      weak_pallet: 0,
      without_qr: 0,
      not_weak_pallet: 0,
      with_qr: 0,
      is_loose: 0,
    }
  )
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
