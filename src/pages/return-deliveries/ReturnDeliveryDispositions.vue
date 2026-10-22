<script setup>
import ApiService from '@/services/ApiService'
import Moment from 'moment'
import { computed, ref, watch } from 'vue'

const pageLoading = ref(false)
const searchInput = ref('')
const searchValue = ref('')

const plantsOptions = ref([])
const plantsLoaded = ref(false)

const today = Moment()
const filters = reactive({
  plant_id: null,
  plant_code: null,
  dateFrom: today.clone().subtract(1, 'day').format('YYYY-MM-DD'),
  dateTo: today.format('YYYY-MM-DD'),
})

const serverItems = ref([])
const totalItems = ref(0)
const itemsPerPage = ref(10)
const sortQuery = ref('-created_at')

const lastOptions = ref({})

const selectedItems = ref([])
const confirmLoading = ref(false)

const showDispositionDialog = ref(false)
const grGiSlipNumber = ref('')
const refDocNumber = ref('')
const postingDate = ref(new Date().toISOString().split('T')[0])
const dispositionStatus = ref(null)
const dispositionStatusOptions = [
  { title: 'Good', value: 'good' },
  { title: 'For RTM', value: 'for-rtm' },
  { title: 'Disposal', value: 'disposal' },
]
const dispositionRemarks = ref('')
const simulateCompleted = ref(false)
const simulationErrors = ref([])
const dialogAlert = ref({ show: false, type: 'info', message: '' })
const chunkResults = ref([])

const statusError = ref('')

const totalSelectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
)

const assignmentOf = item => item.return_delivery_pallet_assignment_item?.return_delivery_pallet_assignment

// Distinct material documents across the selection; GR GI Slip / Ref Doc are prefilled from it.
const selectedMaterialDocuments = computed(() =>
  [...new Set(selectedItems.value.map(item => assignmentOf(item)?.material_document).filter(Boolean))]
)

// Locked once the value comes from the RDO's material document.
const isDocNumberLocked = computed(() => selectedMaterialDocuments.value.length === 1)

const binLocationOf = item => item.block?.label && item.block?.lot?.label ? `${item.block.lot.label} - ${item.block.label}` : ''

// BU plant/sloc of the return delivery item; the 313 issues from here.
const originOf = item => {
  const assignment = assignmentOf(item)

  return assignment?.issuing_plant && assignment?.issuing_sloc ? `${assignment.issuing_plant} / ${assignment.issuing_sloc}` : ''
}

// Only put-away pallets with a known return delivery origin can be dispositioned.
const isSelectable = item => !!binLocationOf(item) && !!originOf(item)

// One 313 per post, so the selection must share one origin.
const selectedOrigins = computed(() => [...new Set(selectedItems.value.map(originOf).filter(Boolean))])

watch(dispositionStatus, val => { if (val) statusError.value = '' })

// Any change after a simulation must be simulated again before posting.
watch(
  [dispositionStatus, grGiSlipNumber, refDocNumber, postingDate, () => selectedItems.value.length],
  () => { simulateCompleted.value = false }
)

onMounted(async () => {
  await loadPlants()
  reloadTable()
})

const loadPlants = async () => {
  try {
    const response = await ApiService.get('managed-plant-storage-locations')
    plantsOptions.value = (response.data.plants ?? [])
      .filter(item => item.name !== null)
      .map(item => ({ value: item.id, title: item.name, plant_code: item.plant_code }))
    if (plantsOptions.value.length > 0) {
      filters.plant_id = plantsOptions.value[0].value
      filters.plant_code = plantsOptions.value[0].plant_code
    }
  } catch (error) {
    console.error(error)
  } finally {
    plantsLoaded.value = true
  }
}

const reloadTable = () => {
  lastOptions.value = {}
  selectedItems.value = []
  loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
}

const onPlantChange = (val) => {
  filters.plant_code = plantsOptions.value.find(p => p.value === val)?.plant_code ?? null
  reloadTable()
}

const headers = [
  { title: 'MATERIAL', key: 'material_id' },
  { title: 'BATCH', key: 'batch' },
  { title: 'PHYSICAL ID', key: 'physical_id' },
  { title: 'QUANTITY', key: 'quantity', align: 'center' },
  { title: 'UOM', key: 'uom', sortable: false },
  { title: 'MFG DATE', key: 'mfg_date' },
  { title: 'RDO REFERENCE', key: 'rdo_reference', sortable: false },
  { title: 'MATERIAL DOCUMENT', key: 'material_document', sortable: false },
  { title: 'MAT DOC ID', key: 'material_document_item', sortable: false },
  { title: 'ORIGIN', key: 'origin', sortable: false },
  { title: 'STATUS', key: 'commodity_status', sortable: false, align: 'center' },
  { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
  { title: 'LAYER', key: 'layer', sortable: false },
  { title: 'PROCESSED AT', key: 'processed_at', sortable: false },
  // { title: 'RETURN DATE', key: 'return_date', sortable: false },
  { title: 'CONFIRMED BY', key: 'confirmed_by', sortable: false },
  { title: 'CONFIRMED AT', key: 'confirmed_at', sortable: false },
]

const loadItems = ({ page, itemsPerPage, sortBy }) => {
  // Wait for the default plant, otherwise the first fetch runs unfiltered.
  if (!plantsLoaded.value) return

  const options = {
    page,
    itemsPerPage,
    sortBy,
    search: searchValue.value,
    plant_code: filters.plant_code,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  }
  
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

  ApiService.query('return-deliveries/disposition-inventories', {
    params: {
      page,
      itemsPerPage,
      sort: sortQuery.value,
      search: searchValue.value,
      plant_code: filters.plant_code,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    },
  })
    .then((response) => {
      totalItems.value = response.data.total
      serverItems.value = response.data.data

      // Drop selected pallets that came back unselectable (e.g. lost their bin)
      const fresh = new Map(serverItems.value.map(item => [item.id, item]))
      selectedItems.value = selectedItems.value.filter(item => !fresh.has(item.id) || isSelectable(fresh.get(item.id)))
      pageLoading.value = false
    })
    .catch((error) => {
      console.error(error)
      pageLoading.value = false
    })
}

const handleSearch = () => {
  searchValue.value = searchInput.value
  reloadTable()
}

const handleSelectionChange = (val) => {
  selectedItems.value = val
}

const handleConfirm = () => {
  if (selectedItems.value.length === 0) return

  const materialDocument = isDocNumberLocked.value ? selectedMaterialDocuments.value[0] : ''

  grGiSlipNumber.value = materialDocument
  refDocNumber.value = materialDocument
  postingDate.value = new Date().toISOString().split('T')[0]
  dispositionStatus.value = null
  statusError.value = ''
  dispositionRemarks.value = ''
  simulateCompleted.value = false
  simulationErrors.value = []
  chunkResults.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }
  if (selectedMaterialDocuments.value.length > 1) {
    showDialogError(`Selected pallets belong to different material documents (${selectedMaterialDocuments.value.join(', ')}). Select pallets from one material document only.`)
  }
  if (selectedOrigins.value.length > 1) {
    showDialogError(`Selected pallets come from different storage locations (${selectedOrigins.value.join(', ')}). Select pallets from one storage location only.`)
  }
  showDispositionDialog.value = true
}

const showDialogError = (message) => {
  dialogAlert.value = { show: true, type: 'error', message }
}

const submitDisposition = async (method) => {
  if (selectedItems.value.length === 0) return

  simulationErrors.value = []
  chunkResults.value = []
  dialogAlert.value = { show: false, type: 'info', message: '' }

  if (!filters.plant_code) return showDialogError('Please select a plant in the Filter by Plant.')
  if (selectedMaterialDocuments.value.length > 1) return showDialogError('Selected pallets belong to different material documents. Select pallets from one material document only.')
  if (selectedOrigins.value.length > 1) return showDialogError('Selected pallets come from different storage locations. Select pallets from one storage location only.')
  if (!dispositionStatus.value) {
    statusError.value = 'Status is required.'
    return showDialogError('Status is required.')
  }
  if (!grGiSlipNumber.value) return showDialogError('GR GI Slip Number is required.')
  if (!refDocNumber.value) return showDialogError('Ref Doc Number is required.')
  if (!dispositionRemarks.value) return showDialogError('Remarks is required.')

  confirmLoading.value = true

  try {
    const response = await ApiService.post('return-deliveries/confirm-disposition-items', {
      method,
      plant_code: filters.plant_code,
      ids: selectedItems.value.map(item => item.id),
      gr_gi_slip_number: grGiSlipNumber.value,
      ref_doc_number: refDocNumber.value,
      posting_date: postingDate.value,
      status: dispositionStatus.value,
      remarks: dispositionRemarks.value,
    }, { timeout: 300000 })

    const data = response.data
    chunkResults.value = data.results ?? []
    const failedChunks = chunkResults.value.filter(r => r.status !== 'S')
    const succeededChunks = chunkResults.value.filter(r => r.status === 'S')

    if (failedChunks.length > 0) {
      simulationErrors.value = failedChunks.flatMap(r => (r.errors ?? []).map(e => e.MESSAGE))

      if (method === 'simulate') {
        simulateCompleted.value = false
        dialogAlert.value = { show: true, type: 'error', message: `Simulation completed with errors. ${succeededChunks.length} of ${chunkResults.value.length} chunk(s) succeeded.` }
      } else {
        const totalSuccess = succeededChunks.reduce((sum, r) => sum + (r.item_count || 0), 0)
        dialogAlert.value = { show: true, type: 'warning', message: `RDO Disposition completed with errors. ${totalSuccess} of ${data.total_items} items processed.` }

        // Posted chunks have left the list; refresh so only unposted pallets remain.
        const failedIds = new Set(failedChunks.flatMap(r => r.item_physical_ids ?? []))
        const remaining = selectedItems.value.filter(item => failedIds.has(item.physical_id))
        lastOptions.value = {}
        loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
        selectedItems.value = remaining
      }
      return
    }

    if (method === 'simulate') {
      simulateCompleted.value = true
      dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the RDO disposition.' }
    } else {
      simulateCompleted.value = false
      showDispositionDialog.value = false
      reloadTable()
    }
  } catch (error) {
    showDialogError(error.response?.data?.message || 'An unexpected error occurred.')
  } finally {
    confirmLoading.value = false
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
            <v-icon icon="ri-arrow-go-back-line" color="primary" size="24" />
          </div>
          <div>
            <span class="text-subtitle-1 font-weight-bold text-grey-700">Total For RDO Disposition</span>
            <div class="text-h4 font-weight-bold text-primary mt-1">{{ totalItems }}</div>
          </div>
        </div>
      </v-card>
    </VCol>
  </VRow>

  <VRow class="align-center mb-3">
    <VCol cols="12" md="4">
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
      <v-select
        label="Filter by Plant"
        density="compact"
        hide-details
        :items="plantsOptions.length > 1 ? [{ title: 'All', value: null }, ...plantsOptions] : plantsOptions"
        v-model="filters.plant_id"
        @update:model-value="(val) => { filters.plant_code = plantsOptions.find(p => p.value === val)?.plant_code ?? null; lastOptions.value = {} }"
      />
    </VCol>
    <VCol cols="12" sm="6" md="2" class="d-flex align-center">
      <v-text-field
        v-model="filters.dateFrom"
        label="Date From"
        type="date"
        density="compact"
        variant="outlined"
        hide-details
      />
    </VCol>
    <VCol cols="12" sm="6" md="2" class="d-flex align-center">
      <v-text-field
        v-model="filters.dateTo"
        label="Date To"
        type="date"
        density="compact"
        variant="outlined"
        hide-details
      />
    </VCol>
    <VCol cols="12" md="1" class="d-flex align-center">
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
    <VCol cols="12" md="1" class="d-flex align-center">
      <v-btn
        block
        :loading="confirmLoading"
        :disabled="selectedItems.length === 0"
        prepend-icon="ri-check-line"
        color="success"
        @click="handleConfirm"
      >
        <template v-slot:loader>
          <v-progress-circular indeterminate color="white" size="24" />
        </template>
        Confirm
      </v-btn>
    </VCol>
  </VRow>

  <v-dialog
    v-model="showDispositionDialog"
    max-width="700"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6 font-weight-bold pa-4">
        QC Disposition Approval
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

        <!-- <div v-if="chunkResults.length > 0" class="mb-4">
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
              <div v-if="chunk.material_document_313 || chunk.material_document_913" class="text-body-2">
                <span v-if="chunk.material_document_313">Material Doc 313: <strong>{{ chunk.material_document_313 }}</strong></span>
                <span v-if="chunk.material_document_913" class="ml-4">Material Doc 913: <strong>{{ chunk.material_document_913 }}</strong></span>
              </div>
              <div v-if="chunk.item_physical_ids && chunk.item_physical_ids.length > 0" class="text-body-2 text-medium-emphasis mt-1">
                Physical IDs: {{ chunk.item_physical_ids.join(', ') }}
              </div>
              <ul v-if="chunk.errors && chunk.errors.length > 0" class="ml-4 mt-1">
                <li v-for="(err, i) in chunk.errors" :key="i" class="text-body-2">{{ err.MESSAGE }}</li>
              </ul>
            </v-card-text>
          </v-card>
        </div> -->

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
          <v-card
            variant="tonal"
            color="info"
            rounded="lg"
            class="flex-1-1"
          >
            <v-card-text class="pa-3">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">313 Issuing From</div>
              <div class="text-h5 font-weight-bold">{{ selectedOrigins.join(', ') || '--' }}</div>
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
          :readonly="isDocNumberLocked"
          :bg-color="isDocNumberLocked ? 'grey-lighten-4' : undefined"
        />
        <VTextField
          v-model="refDocNumber"
          label="Ref Doc Number"
          placeholder="Enter Ref Doc Number"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
          :readonly="isDocNumberLocked"
          :bg-color="isDocNumberLocked ? 'grey-lighten-4' : undefined"
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
        <v-radio-group
          v-model="dispositionStatus"
          label="Select Status"
          inline
          class="mb-3"
          hide-details="auto"
          :error-messages="statusError"
        >
          <v-radio
            v-for="option in dispositionStatusOptions"
            :key="option.value"
            :label="option.title"
            :value="option.value"
          />
        </v-radio-group>
        <v-textarea
          v-model="dispositionRemarks"
          class="mb-4"
          clear-icon="ri-close-line"
          label="Remarks"
          lines="1"
          variant="outlined"
          density="compact"
          clearable
        />
        <v-divider class="mb-4" />
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
              <td>{{ binLocationOf(item) || '--' }}</td>
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
          :disabled="confirmLoading"
          @click="showDispositionDialog = false"
        >
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="secondary"
          :disabled="confirmLoading"
          :loading="confirmLoading && !simulateCompleted"
          @click="submitDisposition('simulate')"
        >
          Simulate
        </v-btn>
        <v-btn
          v-if="simulateCompleted"
          color="primary"
          :loading="confirmLoading && simulateCompleted"
          @click="submitDisposition('')"
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
      show-select
      return-object
      :item-selectable="isSelectable"
      @update:options="loadItems"
      @update:model-value="handleSelectionChange"
      class="text-no-wrap"
    >
      <template #item.material_id="{ item }">
        {{ item.material?.description }}
      </template>

      <template #item.uom="{ item }">
        {{ assignmentOf(item)?.uom ?? '' }}
      </template>

      <template #item.rdo_reference="{ item }">
        {{ assignmentOf(item)?.do_number ?? '' }}
      </template>

      <template #item.material_document="{ item }">
        {{ assignmentOf(item)?.material_document ?? '' }}
      </template>

      <template #item.material_document_item="{ item }">
        {{ assignmentOf(item)?.material_document_item ?? '' }}
      </template>

      <template #item.origin="{ item }">
        <span v-if="originOf(item)">{{ originOf(item) }}</span>
        <v-chip
          v-else
          color="error"
          size="small"
          label
        >
          No delivery found
        </v-chip>
      </template>

      <template #item.mfg_date="{ item }">
        {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
      </template>

      <template #item.commodity_status="{ item }">
        <v-chip 
          v-if="item.commodity_status_id === 14"
          color="warning" 
          class="font-weight-bold"
          label
          small
        >
          For Inspection
        </v-chip>
      </template>

      <template #item.bin_location="{ item }">
        <span v-if="binLocationOf(item)">{{ binLocationOf(item) }}</span>
        <v-tooltip
          v-else
          text="Put away the pallet before disposition"
        >
          <template #activator="{ props }">
            <v-chip
              v-bind="props"
              color="grey"
              size="small"
              label
            >
              No bin
            </v-chip>
          </template>
        </v-tooltip>
      </template>

      <template #item.layer="{ item }">
        {{ item.position_in_block }}
      </template>

      <template #item.processed_at="{ item }">
        {{ 
          item.return_delivery_pallet_assignment_item?.return_delivery_pallet_assignment?.created_at 
          ? Moment(item.return_delivery_pallet_assignment_item.return_delivery_pallet_assignment?.created_at).format('M/D/YY h:mm A') 
          : '' 
        }}
      </template>

      <!-- <template #item.return_date="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.created_at ? Moment(item.return_delivery_pallet_assignment_item.created_at).format('M/D/YY h:mm A') : '' }}
      </template> -->

      <template #item.confirmed_by="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.confirmed_by?.name ?? '' }}
      </template>

      <template #item.confirmed_at="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.confirmed_at ? Moment(item.return_delivery_pallet_assignment_item.confirmed_at).format('M/D/YY h:mm A') : '' }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
