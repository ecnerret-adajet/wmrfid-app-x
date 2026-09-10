<script setup>
import ApiService from '@/services/ApiService'
import JwtService from '@/services/JwtService'
import axios from 'axios'
import Moment from 'moment'
import { ref } from 'vue'

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
  </VRow>

  <VCard>
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="serverItems"
      :items-length="totalItems"
      :loading="pageLoading"
      item-value="id"
      :search="searchValue"
      @update:options="loadItems"
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
