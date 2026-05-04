<script setup>
import ApiService from '@/services/ApiService'
import JwtService from '@/services/JwtService'
import axios from 'axios'
import Moment from 'moment'
import { computed, reactive, ref, watch } from 'vue'

const pageLoading = ref(false)
const searchInput = ref('')
const searchValue = ref('')
const showCreateDialog = ref(false)

const plantsOptions = ref([])
const filters = reactive({ plant_id: null })

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
    const response = await axios.get('/production-runs/get-data-dropdown', {
      headers: { Authorization: `Bearer ${token}` },
    })
    plantsOptions.value = (response.data.plants ?? [])
      .filter(item => item.name !== null)
      .map(item => ({ value: item.id, title: item.name }))
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

watch(() => filters.plant_id, () => {
  loadItems({
    page: page.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: [{ key: sortQuery.value.replace('-', ''), order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }],
  })
})

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
const dispoError = ref(null)

const openCreateDialog = () => {
  dispoForm.remarks = null
  dispoError.value = null
  showCreateDialog.value = true
}

const handleCreateDispo = async () => {
  dispoLoading.value = true
  dispoError.value = null

  if (!dispoForm.remarks) {
    dispoError.value = 'Remarks is required.'
    dispoLoading.value = false
    return
  }

  try {
    await ApiService.post('qc-disposition/create', {
      ...dispoForm,
      items: selectedItems.value,
    })
    showCreateDialog.value = false
    selectedItems.value = []
    lastOptions.value = {}
    loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] })
  } catch (error) {
    dispoError.value = error.response?.data?.message || 'An unexpected error occurred.'
  } finally {
    dispoLoading.value = false
  }
}
</script>

<template>
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
        @click="handleSearch"
      >
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
        <VAlert
          v-if="dispoError"
          color="error"
          variant="tonal"
          class="mb-4"
        >
          {{ dispoError }}
        </VAlert>
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
          color="primary"
          :loading="dispoLoading"
          @click="handleCreateDispo"
        >
          Create
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
