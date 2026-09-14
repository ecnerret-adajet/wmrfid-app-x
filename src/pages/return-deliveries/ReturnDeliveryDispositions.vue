<script setup>
import ApiService from '@/services/ApiService'
import JwtService from '@/services/JwtService'
import axios from 'axios'
import Moment from 'moment'
import { computed, ref } from 'vue'

const pageLoading = ref(false)
const searchInput = ref('')
const searchValue = ref('')

const plantsOptions = ref([])
const filters = reactive({ plant_id: null, plant_code: null })

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

const totalSelectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
)

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
  { title: 'RETURN DATE', key: 'return_date', sortable: false },
  { title: 'CONFIRMED BY', key: 'confirmed_by', sortable: false },
  { title: 'CONFIRMED AT', key: 'confirmed_at', sortable: false },
]

const loadItems = ({ page, itemsPerPage, sortBy }) => {
  const options = { page, itemsPerPage, sortBy, search: searchValue.value, plant_code: filters.plant_code }
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

const handleSearch = () => {
  searchValue.value = searchInput.value
  lastOptions.value = {}
  selectedItems.value = []
}

const handleSelectionChange = (val) => {
  selectedItems.value = val
}

const handleConfirm = () => {
  if (selectedItems.value.length === 0) return

  grGiSlipNumber.value = ''
  refDocNumber.value = ''
  postingDate.value = new Date().toISOString().split('T')[0]
  dispositionStatus.value = null
  dispositionRemarks.value = ''
  showDispositionDialog.value = true
}

const submitDisposition = () => {
  if (selectedItems.value.length === 0) return

  confirmLoading.value = true

  ApiService.post('return-deliveries/confirm-disposition-items', {
    ids: selectedItems.value.map(item => item.id),
    gr_gi_slip_number: grGiSlipNumber.value,
    ref_doc_number: refDocNumber.value,
    posting_date: postingDate.value,
    status: dispositionStatus.value,
    remarks: dispositionRemarks.value,
  })
    .then(() => {
      showDispositionDialog.value = false
      selectedItems.value = []
      lastOptions.value = {}
      loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
    })
    .catch((error) => {
      console.error(error)
    })
    .finally(() => {
      confirmLoading.value = false
    })
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
    <VCol cols="12" md="3" class="d-flex align-center">
      <v-select
        label="Filter by Plant"
        density="compact"
        hide-details
        :items="plantsOptions.length > 1 ? [{ title: 'All', value: null }, ...plantsOptions] : plantsOptions"
        v-model="filters.plant_id"
        @update:model-value="(val) => { filters.plant_code = plantsOptions.find(p => p.value === val)?.plant_code ?? null; lastOptions.value = {} }"
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
          v-model="dispositionStatus"
          label="Select Status"
          :items="dispositionStatusOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details="auto"
        />
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
          :disabled="confirmLoading"
          @click="showDispositionDialog = false"
        >
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="success"
          :loading="confirmLoading"
          @click="submitDisposition"
        >
          Submit
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

      <template #item.return_date="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.created_at ? Moment(item.return_delivery_pallet_assignment_item.created_at).format('MMMM D, YYYY h:mm A') : '' }}
      </template>

      <template #item.confirmed_by="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.confirmed_by?.name ?? '' }}
      </template>

      <template #item.confirmed_at="{ item }">
        {{ item.return_delivery_pallet_assignment_item?.confirmed_at ? Moment(item.return_delivery_pallet_assignment_item.confirmed_at).format('MMMM D, YYYY h:mm A') : '' }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
