<script setup>
import ApiService from '@/services/ApiService'
import JwtService from '@/services/JwtService'
import axios from 'axios'
import Moment from 'moment'
import { computed, reactive, ref } from 'vue'

const pageLoading = ref(false)
const searchInput = ref('')
const searchValue = ref('')
const showCreateDialog = ref(false)

const plantsOptions = ref([])
const storageLocations = ref([])
const filters = reactive({ plant_id: null, plant_code: null, storage_locations: [], storage_location_id: null })

const selectedItems = ref([])
const serverItems = ref([])
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-created_at')

const lastOptions = ref({})

onMounted(() => loadPlants())

const loadPlants = async () => {
  try {
    const token = JwtService.getToken()
    const response = await axios.get('/managed-plant-storage-locations', {
      headers: { Authorization: `Bearer ${token}` },
    })
    plantsOptions.value = (response.data.plants ?? [])
      .filter(item => item.name !== null)
      .map(item => ({ value: item.id, title: item.name, plant_code: item.plant_code, storage_locations: item.storage_locations }))
    if (plantsOptions.value.length > 0) {
      filters.plant_id = plantsOptions.value[0].value
      filters.plant_code = plantsOptions.value[0].plant_code
      filters.storage_locations = plantsOptions.value[0].storage_locations
    }
    storageLocations.value = filters.storage_locations.map(item => ({ value: item.id, title: item.name, code: item.code, plant_code: item.plant_code }))
    if(filters.storage_locations.length > 0) {
      filters.storage_location_id = filters.storage_locations[0].value
    }
  } catch (error) {
    console.error(error)
  }
}

const headers = [
  { title: 'BATCH', key: 'batch' },
  { title: 'MATERIAL', key: 'material_id' },
  { title: 'PHYSICAL ID', key: 'physical_id' },
  { title: 'MFG DATE', key: 'mfg_date' },
  { title: 'QUANTITY', key: 'quantity', align: 'center' },
  { title: 'STATUS', key: 'commodity_status', sortable: false },
  { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
  { title: 'LAYER', key: 'layer', sortable: false },
]

const loadItems = ({ page, itemsPerPage, sortBy }) => {
  const options = { page, itemsPerPage, sortBy, search: searchValue.value, plant_id: filters.plant_id }
  const isSame = JSON.stringify(lastOptions.value) === JSON.stringify(options)
  if (isSame) return
  lastOptions.value = options

  pageLoading.value = true

  if (sortBy && sortBy.length > 0) {
    const sort = sortBy[0]
    sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
  } else {
    sortQuery.value = '-created_at'
  }

  ApiService.query('inventories/fetch-inventories', {
    params: {
      page,
      itemsPerPage,
      sort: sortQuery.value,
      search: searchValue.value,
      plant_id: filters.plant_id,
      commodity_status_id: 1,
    },
  })
    .then((response) => {
      totalItems.value = response.data.total
      serverItems.value = response.data.data
      pageLoading.value = false
    })
    .catch((error) => {
      console.error(error)
      pageLoading.value = false
    })
}

// watch(() => filters.plant_id, () => {
//   loadItems({
//     page: page.value,
//     itemsPerPage: itemsPerPage.value,
//     sortBy: [{ key: sortQuery.value.replace('-', ''), order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }],
//   })
// })

const handleSearch = () => {
  searchValue.value = searchInput.value
  lastOptions.value = {}
}

const handleSelectionChange = (val) => {
  selectedItems.value = val
}

const totalSelectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
)

const dispoForm = reactive({ remarks: null })
const dispoLoading = ref(false)
const grGiSlipNumber = ref('')
const refDocNumber = ref('')
const postingDate = ref(new Date().toISOString().split('T')[0])
const qualityInspectionStatus = ref('for-qc-dispo')
const qualityInspectionStatusOptions = [
  { title: 'For QC Dispo', value: 'for-qc-dispo' },
]
const simulateCompleted = ref(false)
const simulationErrors = ref([])
const dialogAlert = ref({ show: false, type: 'info', message: '' })
const chunkResults = ref([])

const openCreateDialog = () => {
  dispoForm.remarks = null
  grGiSlipNumber.value = ''
  refDocNumber.value = ''
  postingDate.value = new Date().toISOString().split('T')[0]
  qualityInspectionStatus.value = 'for-qc-dispo'
  simulateCompleted.value = false
  simulationErrors.value = []
  chunkResults.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }
  showCreateDialog.value = true
}

const handleCreateDispo = async (method) => {
  dispoLoading.value = true
  simulationErrors.value = []
  chunkResults.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }

  if (!dispoForm.remarks) {
    dialogAlert.value = { show: true, type: 'error', message: 'Remarks is required.' }
    dispoLoading.value = false
    return
  }

  try {
    const response = await ApiService.post('inventories/quality-inspection', {
      ...dispoForm,
      method,
      gr_gi_slip_number: grGiSlipNumber.value,
      ref_doc_number: refDocNumber.value,
      posting_date: postingDate.value,
      status: qualityInspectionStatus.value,
      plant_code: filters.plant_code,
      storage_location_id: filters.storage_location_id,
      from_qc_disposition: true,
      type: 'qc-disposition',
      items: selectedItems.value.map(item => ({
        physical_id: item.physical_id,
        rfid_code: item.rfid_code,
        rfid_type: item.type,
        type_slug: item.type_slug,
        batch: item.batch,
        material_code: item.material?.bu_material,
        entry_qty: item.quantity,
        designated_block_id: item.block_id,
        layer_position: item.position_in_block,
      })),
    }, { timeout: 300000 })

    const data = response.data

    // Handle new synchronous chunked response format
    if (data.results && Array.isArray(data.results)) {
      chunkResults.value = data.results
      const failedChunks = data.results.filter(r => r.status === 'E' || r.status === 'failed')
      const succeededChunks = data.results.filter(r => r.status === 'S')

      if (failedChunks.length > 0) {
        simulationErrors.value = failedChunks.flatMap(r => (r.errors ?? []).map(e => e.MESSAGE))

        if (method === 'simulate') {
          simulateCompleted.value = false
          dialogAlert.value = { show: true, type: 'error', message: `Simulation completed with errors. ${succeededChunks.length} of ${data.results.length} chunk(s) succeeded.` }
        } else {
          const totalSuccess = succeededChunks.reduce((sum, r) => sum + (r.item_count || 0), 0)
          dialogAlert.value = { show: true, type: 'warning', message: `QC Disposition completed with errors. ${totalSuccess} of ${data.total_items} items processed.` }
        }
        return
      }

      // All chunks succeeded
      const docNumbers = succeededChunks
        .filter(r => r.material_document_313 || r.material_document_315)
        .map(r => [r.material_document_313, r.material_document_315].filter(Boolean).join(', '))
        .join(' | ')

      if (method === 'simulate') {
        simulateCompleted.value = true
        dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the QC disposition.' }
      } else {
        const docInfo = docNumbers ? ` Material Doc(s): ${docNumbers}` : ''
        dialogAlert.value = { show: true, type: 'success', message: `QC Disposition created successfully! ${data.total_items} items processed across ${data.total_chunks} chunk(s).${docInfo}` }
        simulateCompleted.value = false
        showCreateDialog.value = false
        selectedItems.value = []
        lastOptions.value = {}
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
      }
      return
    }

    // Legacy response format fallback
    let hasError = false
    const errorMessages = []

    if (data.goods_movement_313?.status === 'E') {
      hasError = true
      errorMessages.push(...(data.goods_movement_313.returns ?? []).filter(r => r.MESSAGE).map(r => r.MESSAGE))
    }
    if (data.goods_movement_315?.status === 'E') {
      hasError = true
      errorMessages.push(...(data.goods_movement_315.returns ?? []).filter(r => r.MESSAGE).map(r => r.MESSAGE))
    }

    if (hasError) {
      simulationErrors.value = errorMessages
      simulateCompleted.value = false
      dialogAlert.value = { show: true, type: 'error', message: 'Simulation failed. Please check the errors below.' }
      return
    }

    if (method === 'simulate') {
      simulateCompleted.value = true
      dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the QC disposition.' }
    } else {
      dialogAlert.value = { show: true, type: 'success', message: 'QC Disposition created successfully!' }
      simulateCompleted.value = false
      showCreateDialog.value = false
      selectedItems.value = []
      lastOptions.value = {}
      loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
    }
  } catch (error) {
    dialogAlert.value = {
      show: true,
      type: 'error',
      message: error.response?.data?.message || 'An unexpected error occurred.',
    }
  } finally {
    dispoLoading.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12" md="3">
      <v-skeleton-loader v-if="pageLoading" type="article" />
      <v-card v-else class="pa-4" elevation="2" style="border-radius: 10px; background-color: #f9fafb;">
        <div class="d-flex align-center">
          <div
            class="d-flex align-center justify-center mr-4"
            style="width: 48px; height: 48px; background-color: #cae2fa; border-radius: 12px;"
          >
            <v-icon icon="ri-list-check" color="primary" size="24" />
          </div>
          <div>
            <span class="text-subtitle-1 font-weight-bold text-grey-700">Total Goods Status</span>
            <div class="text-h4 font-weight-bold text-primary mt-1">{{ totalItems }}</div>
          </div>
        </div>
      </v-card>
    </VCol>
  </VRow>

  <VRow class="align-center mb-3">
    <VCol cols="12" md="3" class="d-flex align-center">
      <v-select
        label="Filter by Plant"
        density="compact"
        hide-details
        :items="plantsOptions.length > 1 ? [{ title: 'All', value: null }, ...plantsOptions] : plantsOptions"
        v-model="filters.plant_id"
      />
    </VCol>
    <VCol cols="12" md="5">
      <VTextField
        v-model="searchInput"
        placeholder="Search..."
        append-inner-icon="ri-search-line"
        single-line
        hide-details
        density="compact"
        @keyup.enter="handleSearch"
      />
    </VCol>
    <VCol cols="12" md="2" class="d-flex align-center">
      <v-btn
        block
        :loading="pageLoading"
        prepend-icon="ri-search-line"
        color="primary"
        @click="handleSearch"
      >
        <template v-slot:loader>
          <v-progress-circular indeterminate color="white" size="24" />
        </template>
        Search
      </v-btn>
    </VCol>
    <VCol cols="12" md="2" class="d-flex align-center">
      <v-btn
        block
        color="warning"
        prepend-icon="ri-add-line"
        :disabled="selectedItems.length === 0"
        @click="openCreateDialog"
      >
        Create QC Dispo
      </v-btn>
    </VCol>
  </VRow>

  <v-dialog
    v-model="showCreateDialog"
    max-width="700"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6 font-weight-bold pa-4">
        QC Disposition Request
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-alert
          v-if="dialogAlert.show"
          :type="dialogAlert.type"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="dialogAlert.show = false"
        >
          <div>{{ dialogAlert.message }}</div>
          <ul v-if="simulationErrors.length > 0" class="ml-4 mt-1">
            <li v-for="(err, i) in simulationErrors" :key="i">{{ err }}</li>
          </ul>
        </v-alert>

        <div v-if="chunkResults.length > 0" class="mb-4">
          <v-card
            v-for="chunk in chunkResults"
            :key="chunk.chunk_index"
            variant="tonal"
            :color="chunk.status === 'S' ? 'success' : 'error'"
            class="mb-2"
            rounded="lg"
          >
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="font-weight-bold">
                  Chunk {{ chunk.chunk_index + 1 }}
                  <span class="text-medium-emphasis">({{ chunk.item_count }} items)</span>
                </span>
                <v-badge
                  :color="chunk.status === 'S' ? 'success' : 'error'"
                  :content="chunk.status === 'S' ? 'Success' : 'Failed'"
                  inline
                />
              </div>
              <div v-if="chunk.status === 'S' && (chunk.material_document_313 || chunk.material_document_315)" class="text-body-2">
                <span v-if="chunk.material_document_313">Material Doc 313: <strong>{{ chunk.material_document_313 }}</strong></span>
                <span v-if="chunk.material_document_315" class="ml-4">Material Doc 315: <strong>{{ chunk.material_document_315 }}</strong></span>
              </div>
              <div v-if="chunk.item_physical_ids && chunk.item_physical_ids.length > 0" class="text-body-2 text-medium-emphasis mt-1">
                Physical IDs: {{ chunk.item_physical_ids.join(', ') }}
              </div>
              <ul v-if="chunk.errors && chunk.errors.length > 0" class="ml-4 mt-1">
                <li v-for="(err, i) in chunk.errors" :key="i" class="text-body-2">{{ err.MESSAGE }}</li>
              </ul>
            </v-card-text>
          </v-card>
        </div>
        <VTextField
          v-model="grGiSlipNumber"
          label="GR GI Slip Number"
          placeholder="Enter GR GI Slip Number"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
        />
        <VTextField
          v-model="refDocNumber"
          label="Ref Doc Number"
          placeholder="Enter Ref Doc Number"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
        />
        <VTextField
          v-model="postingDate"
          label="Posting Date"
          type="date"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
        />
        <v-select
          v-model="qualityInspectionStatus"
          label="Select Status"
          :items="qualityInspectionStatusOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
          disabled
        />
        <v-textarea
          v-model="dispoForm.remarks"
          class="mb-4"
          clear-icon="ri-close-line"
          label="Remarks"
          lines="1"
          variant="outlined"
          density="compact"
          clearable
        />
        <v-divider class="mb-4" />
        <div class="d-flex gap-3 mb-4">
          <v-card
            variant="tonal"
            color="primary"
            rounded="lg"
            class="flex-1-1"
          >
            <v-card-text class="pa-3">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Total Pallets</div>
              <div class="text-h5 font-weight-bold">{{ selectedItems.length }}</div>
            </v-card-text>
          </v-card>
          <v-card
            variant="tonal"
            color="success"
            rounded="lg"
            class="flex-1-1"
          >
            <v-card-text class="pa-3">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Total Quantity</div>
              <div class="text-h5 font-weight-bold">{{ totalSelectedQuantity }}</div>
            </v-card-text>
          </v-card>
        </div>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Physical ID</th>
              <th>Batch</th>
              <th class="text-center">Quantity</th>
              <th>Bin Location</th>
              <th class="text-center">Layer</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in selectedItems"
              :key="item.id"
            >
              <td>{{ item.physical_id }}</td>
              <td>{{ item.batch }}</td>
              <td class="text-center">{{ item.quantity }}</td>
              <td>{{ item.block?.lot?.label && item.block?.label ? `${item.block.lot.label} - ${item.block.label}` : '--' }}</td>
              <td class="text-center">{{ item.position_in_block ?? '--' }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn
          color="error"
          variant="outlined"
          :disabled="dispoLoading"
          @click="showCreateDialog = false"
        >
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="secondary"
          :disabled="!qualityInspectionStatus || dispoLoading"
          :loading="dispoLoading && !simulateCompleted"
          @click="handleCreateDispo('simulate')"
        >
          Simulate
        </v-btn>
        <v-btn
          v-if="simulateCompleted"
          color="primary"
          :loading="dispoLoading && simulateCompleted"
          @click="handleCreateDispo('')"
        >
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <VCard>
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      :model-value="selectedItems"
      :headers="headers"
      :items="serverItems"
      :items-length="totalItems"
      :loading="pageLoading"
      item-value="id"
      :search="searchValue"
      show-select
      return-object
      @update:options="loadItems"
      @update:model-value="handleSelectionChange"
      class="text-no-wrap"
    >
      <template #item.material_id="{ item }">
        {{ item.material?.description }}
      </template>

      <template #item.mfg_date="{ item }">
        {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
      </template>

      <template #item.commodity_status="{ item }">
        <span class="font-weight-bold">
          {{ item.commodity_status?.name ?? '' }}
        </span>
      </template>

      <template #item.bin_location="{ item }">
        {{ item.block?.label && item.block?.lot?.label ? `${item.block.lot.label} - ${item.block.label}` : '' }}
      </template>

      <template #item.layer="{ item }">
        {{ item.position_in_block }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
