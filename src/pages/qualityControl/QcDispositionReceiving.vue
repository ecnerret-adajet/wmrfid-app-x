<script setup>
import Toast from '@/components/Toast.vue'
import ApiService from '@/services/ApiService'
import JwtService from '@/services/JwtService'
import axios from 'axios'
import Moment from 'moment'
import { computed, onMounted, reactive, ref } from 'vue'

const plantsOptions = ref([])
const todayStr = Moment().format('YYYY-MM-DD')

const filters = reactive({
  plant_id: null,
  plant_code: null,
  receiving_status: 'for-qc-receiving',
  dateFrom: null,
  dateTo: null,
})

const receivingStatusOptions = [
  { title: 'For QC Receiving', value: 'for-qc-receiving' },
  { title: 'QC Received', value: 'qc-received' },
  { title: 'All', value: 'all' },
]

const searchInput = ref('')
const searchValue = ref('')
const serverItems = ref([])
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-id')
const tableLoading = ref(false)

const toast = ref({ message: '', color: 'success', show: false })

const headers = [
  { title: 'MOVEMENT TYPE', key: 'movement_type', align: 'center', sortable: false },
  { title: 'PLANT', key: 'plant', sortable: false },
  { title: 'ISSUING SLOC', key: 'issuing_sloc', sortable: false },
  { title: 'RECEIVING SLOC', key: 'receiving_sloc', sortable: false },
  { title: 'POSTING DATE', key: 'posting_date' },
  { title: 'DOCUMENT DATE', key: 'document_date' },
  { title: 'MATERIAL DOC', key: 'material_document' },
  { title: 'ITEMS', key: 'items_count', align: 'center', sortable: false },
  { title: 'STATUS', key: 'receiving_status', align: 'center', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

onMounted(() => loadPlants())

const loadPlants = async () => {
  try {
    const token = JwtService.getToken()

    const response = await axios.get('/managed-plant-storage-locations', {
      headers: { Authorization: `Bearer ${token}` },
    })

    plantsOptions.value = (response.data.plants ?? [])
      .filter(item => item.name !== null)
      .map(item => ({ value: item.id, title: item.name, plant_code: item.plant_code }))
    if (plantsOptions.value.length > 0) {
      filters.plant_id = plantsOptions.value[0].value
      filters.plant_code = plantsOptions.value[0].plant_code
    }
    loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
  } catch (error) {
    console.error(error)
  }
}

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
  if (!filters.plant_code) return
  tableLoading.value = true

  if (sortBy && sortBy.length > 0) {
    const sort = sortBy[0]

    sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
  } else {
    sortQuery.value = '-id'
  }

  ApiService.query(`quality-control/disposition-receiving/${filters.plant_code}`, {
    params: {
      page: pageVal,
      itemsPerPage: perPage,
      sort: sortQuery.value,
      search: searchValue.value,
      receiving_status: filters.receiving_status,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    },
  })
    .then(response => {
      totalItems.value = response.data.total
      serverItems.value = response.data.data
    })
    .catch(error => {
      console.error(error)
    })
    .finally(() => {
      tableLoading.value = false
    })
}

const handleSearch = () => {
  const selectedPlant = plantsOptions.value.find(p => p.value === filters.plant_id)

  filters.plant_code = selectedPlant?.plant_code ?? null
  searchValue.value = searchInput.value
  loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
}

const isReceived = log => log.receiving_status === 'qc-received'

const actionList = log => [
  { title: 'Confirm Receiving', key: 'receive', disabled: isReceived(log) },
]

const handleAction = (item, action) => {
  if (action.key === 'receive') openReceivingDialog(item)
}

// ── Confirm Receiving (315) ─────────────────────────────────────────
const showReceivingDialog = ref(false)
const selectedLog = ref(null)

const receivingForm = reactive({
  gr_gi_slip_number: '',
  ref_doc_number: '',
  posting_date: todayStr,
  remarks: null,
})

const receivingLoading = ref(false)
const simulateCompleted = ref(false)
const simulationErrors = ref([])
const dialogAlert = ref({ show: false, type: 'info', message: '' })

const selectedItems = computed(() => selectedLog.value?.active_items ?? [])

const totalSelectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + (Number(item.entry_qty) || 0), 0),
)

const openReceivingDialog = log => {
  selectedLog.value = log
  receivingForm.gr_gi_slip_number = log.material_document ?? ''
  receivingForm.ref_doc_number = ''
  receivingForm.posting_date = todayStr
  receivingForm.remarks = null
  simulateCompleted.value = false
  simulationErrors.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }
  showReceivingDialog.value = true
}

const handleConfirmReceiving = async method => {
  receivingLoading.value = true
  simulationErrors.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }

  if (!receivingForm.remarks) {
    dialogAlert.value = { show: true, type: 'error', message: 'Remarks is required.' }
    receivingLoading.value = false
    
    return
  }

  try {
    const response = await ApiService.post(`quality-control/disposition-receiving/${selectedLog.value.id}/post-315`, {
      method,
      gr_gi_slip_number: receivingForm.gr_gi_slip_number,
      ref_doc_number: receivingForm.ref_doc_number,
      posting_date: receivingForm.posting_date,
      remarks: receivingForm.remarks,
    }, { timeout: 300000 })

    const data = response.data

    if (data.status !== 'S') {
      simulationErrors.value = (data.errors ?? []).map(e => e.MESSAGE || e.message).filter(Boolean)
      simulateCompleted.value = false
      dialogAlert.value = {
        show: true,
        type: 'error',
        message: method === 'simulate' ? 'Simulation failed. Please check the errors below.' : 'QC Receiving failed. Please check the errors below.',
      }
      
      return
    }

    if (method === 'simulate') {
      simulateCompleted.value = true
      dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the QC receiving.' }
    } else {
      toast.value = {
        message: `QC Received. Material Doc 315: ${data.material_document}`,
        color: 'success',
        show: true,
      }
      simulateCompleted.value = false
      showReceivingDialog.value = false
      loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
    }
  } catch (error) {
    dialogAlert.value = {
      show: true,
      type: 'error',
      message: error.response?.data?.message || 'An unexpected error occurred.',
    }
  } finally {
    receivingLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="pa-4">
      <h4 class="text-h5 font-weight-bold mb-2">
        Total 313 References : <span class="font-bold text-primary">{{ totalItems }}</span>
      </h4>
    </div>

    <VRow class="align-center mb-3">
      <VCol
        cols="12"
        md="3"
      >
        <VSelect
          v-model="filters.plant_id"
          label="Filter by Plant"
          density="compact"
          hide-details
          :items="plantsOptions"
          @update:model-value="handleSearch"
        />
      </VCol>
      <VCol
        cols="12"
        md="2"
      >
        <VSelect
          v-model="filters.receiving_status"
          label="Status"
          density="compact"
          hide-details
          :items="receivingStatusOptions"
          @update:model-value="handleSearch"
        />
      </VCol>
      <VCol
        cols="12"
        md="2"
      >
        <VTextField
          v-model="searchInput"
          placeholder="Search material doc..."
          append-inner-icon="ri-search-line"
          single-line
          hide-details
          density="compact"
          @keyup.enter="handleSearch"
        />
      </VCol>
      <VCol
        cols="12"
        md="2"
      >
        <VTextField
          v-model="filters.dateFrom"
          label="Date From"
          type="date"
          density="compact"
          variant="outlined"
          hide-details
        />
      </VCol>
      <VCol
        cols="12"
        md="2"
      >
        <VTextField
          v-model="filters.dateTo"
          label="Date To"
          type="date"
          density="compact"
          variant="outlined"
          hide-details
        />
      </VCol>
      <VCol
        cols="12"
        md="1"
        class="d-flex align-center"
      >
        <VBtn
          color="primary"
          class="d-flex align-center"
          prepend-icon="ri-search-eye-line"
          @click="handleSearch"
        >
          <template #prepend>
            <VIcon color="white" />
          </template>
          Search
        </VBtn>
      </VCol>
    </VRow>

    <VCard>
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="tableLoading"
        item-value="id"
        :search="searchValue"
        class="text-no-wrap"
        @update:options="loadItems"
      >
        <template #item.movement_type="{ item }">
          <VChip
            color="warning"
            size="small"
            label
          >
            {{ item.movement_type }}
          </VChip>
        </template>

        <template #item.issuing_sloc="{ item }">
          {{ item.issuing_sloc || '--' }}
        </template>

        <template #item.material_document="{ item }">
          {{ item.material_document || '--' }}
        </template>

        <template #item.items_count="{ item }">
          <VChip
            size="small"
            variant="tonal"
            color="secondary"
          >
            {{ item.active_items?.length ?? 0 }}
          </VChip>
        </template>

        <template #item.receiving_status="{ item }">
          <div class="d-flex flex-column align-center gap-1 py-1">
            <VChip
              :color="isReceived(item) ? 'success' : 'warning'"
              size="small"
              variant="tonal"
            >
              {{ isReceived(item) ? 'QC Received' : 'For QC Receiving' }}
            </VChip>
            <span
              v-if="item.receiving315?.material_document"
              class="text-caption text-medium-emphasis"
            >
              315: {{ item.receiving315.material_document }}
            </span>
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end">
            <VMenu location="start">
              <template #activator="{ props }">
                <VBtn
                  icon="ri-more-2-line"
                  variant="text"
                  v-bind="props"
                  color="grey"
                />
              </template>
              <VList>
                <VListItem
                  v-for="(action, i) in actionList(item)"
                  :key="i"
                  :value="i"
                  :disabled="action.disabled"
                  @click="handleAction(item, action)"
                >
                  <VListItemTitle>{{ action.title }}</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <VDialog
      v-model="showReceivingDialog"
      max-width="700"
      persistent
    >
      <VCard>
        <VCardTitle class="text-h6 font-weight-bold pa-4">
          QC Receiving
          <div class="text-body-2 text-medium-emphasis">
            313 Material Doc: <strong>{{ selectedLog?.material_document }}</strong>
            ({{ selectedLog?.issuing_sloc }} → {{ selectedLog?.receiving_sloc }})
          </div>
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VAlert
            v-if="dialogAlert.show"
            :type="dialogAlert.type"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="dialogAlert.show = false"
          >
            <div>{{ dialogAlert.message }}</div>
            <ul
              v-if="simulationErrors.length > 0"
              class="ms-4 mt-1"
            >
              <li
                v-for="(err, i) in simulationErrors"
                :key="i"
              >
                {{ err }}
              </li>
            </ul>
          </VAlert>

          <VTextField
            v-model="receivingForm.gr_gi_slip_number"
            label="GR GI Slip Number"
            placeholder="Enter GR GI Slip Number"
            density="compact"
            variant="outlined"
            class="mb-3"
            hide-details="auto"
          />
          <VTextField
            v-model="receivingForm.ref_doc_number"
            label="Ref Doc Number"
            placeholder="Enter Ref Doc Number"
            density="compact"
            variant="outlined"
            class="mb-3"
            hide-details="auto"
          />
          <VTextField
            v-model="receivingForm.posting_date"
            label="Posting Date"
            type="date"
            density="compact"
            variant="outlined"
            class="mb-3"
            hide-details="auto"
          />
          <VTextarea
            v-model="receivingForm.remarks"
            class="mb-4"
            clear-icon="ri-close-line"
            label="Remarks"
            lines="1"
            variant="outlined"
            density="compact"
            clearable
          />
          <VDivider class="mb-4" />
          <div class="d-flex gap-3 mb-4">
            <VCard
              variant="tonal"
              color="primary"
              rounded="lg"
              class="flex-1-1"
            >
              <VCardText class="pa-3">
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">
                  Total Pallets
                </div>
                <div class="text-h5 font-weight-bold">
                  {{ selectedItems.length }}
                </div>
              </VCardText>
            </VCard>
            <VCard
              variant="tonal"
              color="success"
              rounded="lg"
              class="flex-1-1"
            >
              <VCardText class="pa-3">
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">
                  Total Quantity
                </div>
                <div class="text-h5 font-weight-bold">
                  {{ totalSelectedQuantity }}
                </div>
              </VCardText>
            </VCard>
          </div>
          <VTable density="compact">
            <thead>
              <tr>
                <th>Physical ID</th>
                <th>Batch</th>
                <th class="text-center">
                  Quantity
                </th>
                <th>Bin Location</th>
                <th class="text-center">
                  Layer
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in selectedItems"
                :key="item.id"
              >
                <td>{{ item.pallet_physical_id || '--' }}</td>
                <td>{{ item.batch }}</td>
                <td class="text-center">
                  {{ item.entry_qty }}
                </td>
                <td>{{ item.bin_location || '--' }}</td>
                <td class="text-center">
                  {{ item.layer ?? '--' }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VBtn
            color="error"
            variant="outlined"
            :disabled="receivingLoading"
            @click="showReceivingDialog = false"
          >
            Cancel
          </VBtn>
          <VSpacer />
          <VBtn
            color="secondary"
            :disabled="receivingLoading"
            :loading="receivingLoading && !simulateCompleted"
            @click="handleConfirmReceiving('simulate')"
          >
            Simulate
          </VBtn>
          <VBtn
            v-if="simulateCompleted"
            color="primary"
            :loading="receivingLoading && simulateCompleted"
            @click="handleConfirmReceiving('')"
          >
            Confirm
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <Toast
      v-model:show="toast.show"
      :message="toast.message"
      :color="toast.color"
    />
  </div>
</template>
