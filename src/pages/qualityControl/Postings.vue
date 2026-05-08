<script setup>
import ApiService from '@/services/ApiService'
import { onMounted, reactive, ref, watch } from 'vue'

const pageLoading = ref(false)
const searchInput = ref('')
const searchValue = ref('')

const plantsOptions = ref([])
const storageLocations = ref([])
const filters = reactive({ plant_id: null, plant_code: null, storage_locations: [], sloc: null })

const serverItems = ref([])
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-created_at')

const detailDialog = ref(false)
const selectedLog = ref(null)

const headers = [
  { title: 'PHYSICAL ID', key: 'physical_id', sortable: false },
  { title: 'BATCH', key: 'batch', sortable: false },
  { title: 'PLANT', key: 'plant', sortable: false },
  { title: 'QTY', key: 'entry_qty', align: 'center', sortable: false },
  { title: 'TRANSFER REQUEST', key: 'transfer_request', sortable: false },
  { title: 'TRANSFER ORDER', key: 'transfer_order', sortable: false },
  { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
  { title: 'POSTING DATE', key: 'posting_date', sortable: false },
  // { title: 'REQUESTED BY', key: 'requested_by', sortable: false },
  // { title: 'VERIFIED BY', key: 'verified_by', sortable: false },
  { title: 'CREATED AT', key: 'created_at', sortable: false },
  { title: 'MOVEMENT ITEMS', key: 'log_items_count', align: 'center', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const itemHeaders = [
  { title: 'MAT DOC', key: 'material_document' },
  { title: 'PALLET ID', key: 'pallet_physical_id' },
  { title: 'MOVE TYPE', key: 'movement_type', align: 'center' },
  { title: 'PLANT', key: 'plant' },
  { title: 'ISSUING SLOC', key: 'issuing_sloc' },
  { title: 'RECEIVING SLOC', key: 'receiving_sloc' },
  { title: 'QTY', key: 'entry_qty', align: 'center' },
  { title: 'CREATED AT', key: 'created_at' },
  { title: 'SAP ID', key: 'sap_id' },
]

onMounted(() => loadPlants())

const loadPlants = async () => {
  try {
    const response = await ApiService.query('managed-plant-storage-locations', {})
    plantsOptions.value = (response.data.plants ?? [])
      .filter(item => item.name !== null)
      .map(item => ({ value: item.id, title: item.name, plant_code: item.plant_code, storage_locations: item.storage_locations }))
    
    if (plantsOptions.value.length > 0) {
      const firstPlant = plantsOptions.value[0]
      filters.plant_id = firstPlant.value
      filters.plant_code = firstPlant.plant_code
      
      storageLocations.value = response.data.storage_locations.map(item => ({ value: item.id, title: `${item.code} - ${item.name}`, code: item.code, plant_code: item.plant_code, plant_id: item.plant_id }))
      
      if(storageLocations.value.length > 0) {
        filters.sloc = storageLocations.value[0]
      }
    }
    
    // Automatically load items after plants are loaded
    handleSearch()
  } catch (error) {
    console.error(error)
  }
}

watch(() => filters.plant_id, (newVal) => {
    const selectedSloc = storageLocations.value.find(p => p.plant_id === newVal);
    if (selectedSloc) {
        filters.plant_code = selectedSloc.plant_code;
        storageLocations.value = selectedSloc.storage_locations.map(item => ({ value: item.id, title: `${item.code} - ${item.name}`, code: item.code, plant_code: item.plant_code }));
        
        if (storageLocations.value.length > 0) {
            // filters.sloc = storageLocations.value[0].value;
            filters.sloc = selectedSloc.code;
        } else {
            filters.sloc = null;
        }
        
        handleSearch();
    }
})

watch(() => filters.sloc, () => {
    handleSearch();
})

// const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
//   if (!filters.plant_code || !filters.sloc) {
//       serverItems.value = []
//       totalItems.value = 0
//       return
//   }

//   pageLoading.value = true

//   if (sortBy && sortBy.length > 0) {
//     const sort = sortBy[0]
//     sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
//   } else {
//     sortQuery.value = '-created_at'
//   }

//   ApiService.query(`quality-control/goods-movement-logs/${filters.plant_code}/${filters.sloc?.code}`, {
//     params: {
//       page: pageVal,
//       itemsPerPage: perPage,
//       sort: sortQuery.value,
//       search: searchValue.value,
//       type: "qc-disposition"
//     },
//   })
//     .then((response) => {
//       totalItems.value = response.data.total
//       serverItems.value = response.data.data
//       pageLoading.value = false
//     })
//     .catch((error) => {
//       console.error(error)
//       pageLoading.value = false
//     })
// }

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
  if (!filters.plant_code || !filters.sloc) {
    serverItems.value = []
    totalItems.value = 0
    return
  }

  pageLoading.value = true

  if (sortBy && sortBy.length > 0) {
    const sort = sortBy[0]
    sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
  } else {
    sortQuery.value = '-created_at'
  }

  // ApiService.query(`quality-control/dispositions/${filters.plant_code}/${filters.sloc?.code}`, {
  ApiService.query(`quality-control/disposition-items/${filters.plant_code}/${filters.sloc?.code}`, {
    params: {
      page: pageVal,
      itemsPerPage: perPage,
      sort: sortQuery.value,
      search: searchValue.value,
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
  loadItems({
    page: page.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: [],
  })
}

const openDetailDialog = (log) => {
    selectedLog.value = log;
    detailDialog.value = true;
};
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
            <span class="text-subtitle-1 font-weight-bold text-grey-700">Total Postings</span>
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
        :items="plantsOptions"
        v-model="filters.plant_id"
      />
    </VCol>
    <VCol cols="12" md="3" class="d-flex align-center">
      <v-select
        label="Filter by Storage Location"
        density="compact"
        hide-details
        :items="storageLocations"
        v-model="filters.sloc"
      />
    </VCol>
    <VCol cols="12" md="4">
      <VTextField
        v-model="searchInput"
        placeholder="Search movement type, batch..."
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
      <template #item.entry_qty="{ item }">
          {{ item.entry_qty }} {{ item.entry_uom }}
      </template>

      <template #item.transfer_request="{ item }">
          <div v-if="item.transfer_request">
              <div class="text-caption font-weight-bold">{{ item.transfer_request.transfer_request_id }}</div>
              <v-chip size="x-small" variant="tonal" class="text-uppercase" color="info">{{ item.transfer_request.status_text }}</v-chip>
          </div>
          <span v-else>--</span>
      </template>

      <template #item.transfer_order="{ item }">
          <div v-if="item.transfer_order">
              <div class="text-caption font-weight-bold">{{ item.transfer_order.transfer_order_id }}</div>
              <v-chip size="x-small" variant="tonal" class="text-uppercase" color="success">{{ item.transfer_order.status_text }}</v-chip>
          </div>
          <span v-else>--</span>
      </template>

      <template #item.bin_location="{ item }">
          <span v-if="item.designated_block">
              {{ item.designated_block.label }}<span v-if="item.designated_block.lot"> - {{ item.designated_block.lot.label }}</span>
          </span>
          <span v-else>--</span>
      </template>

      <template #item.material_document="{ item }">
          {{ item.qc_disposition?.material_document || '--' }}
      </template>

      <template #item.posting_date="{ item }">
          {{ item.qc_disposition?.posting_date || '--' }}
      </template>

      <!-- <template #item.requested_by="{ item }">
          {{ item.requested_by?.name || '--' }}
      </template>

      <template #item.verified_by="{ item }">
          {{ item.validated_by?.name || '--' }}
      </template> -->

      <template #item.created_at="{ item }">
          {{ item.created_at ? new Date(item.created_at).toLocaleString('sv-SE') : '--' }}
      </template>

      <template #item.log_items_count="{ item }">
          <v-chip size="small" variant="tonal" color="secondary">
              {{ item.goods_movement_log_items?.length ?? 0 }}
          </v-chip>
      </template>

      <template #item.actions="{ item }">
          <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="openDetailDialog(item)"
          >
              <v-icon icon="ri-eye-line" />
          </v-btn>
      </template>
    </VDataTableServer>
  </VCard>

  <v-dialog
      v-model="detailDialog"
      max-width="1200"
      scrollable
  >
      <v-card v-if="selectedLog">
          <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
              <span>Disposition Item Detail</span>
              <v-btn icon variant="text" size="small" @click="detailDialog = false">
                  <v-icon icon="ri-close-line" />
              </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
              <v-row dense class="mb-4">
                  <v-col cols="4">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Material</div>
                      <div class="text-body-1">{{ selectedLog.material }}</div>
                  </v-col>
                  <v-col cols="4">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Batch</div>
                      <div class="text-body-1">{{ selectedLog.batch }}</div>
                  </v-col>
                  <v-col cols="4" class="d-flex flex-column">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Transfer Request</div>
                      <div class="text-body-1">{{ selectedLog.transfer_request?.transfer_request_id || '--' }}</div>
                      <div class="mt-1">
                          <v-chip
                              v-if="selectedLog.transfer_request"
                              size="small"
                              variant="tonal"
                              color="info"
                          >
                              {{ selectedLog.transfer_request.status_text }}
                          </v-chip>
                          <span v-else>--</span>
                      </div>
                  </v-col>
                  <v-col cols="4">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Plant</div>
                      <div class="text-body-1">{{ selectedLog.plant }}</div>
                  </v-col>
                  <v-col cols="4">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Remarks</div>
                      <div class="text-body-1">{{ selectedLog.qc_disposition?.remarks || '--' }}</div>
                  </v-col>
              </v-row>

              <v-divider class="mb-4" />

              <div class="text-subtitle-2 font-weight-bold mb-2">
                  Goods Movement Log Items ({{ selectedLog.goods_movement_log_items?.length ?? 0 }})
              </div>
              <v-table density="compact" class="text-no-wrap">
                  <thead>
                      <tr>
                          <th v-for="h in itemHeaders" :key="h.key" :class="h.align === 'center' ? 'text-center' : ''">
                              {{ h.title }}
                          </th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr v-for="item in selectedLog.goods_movement_log_items" :key="item.id">
                          <td>
                              <template v-if="item.goods_movement_log?.material_document">
                                  <div class="text-caption font-weight-bold">{{ item.goods_movement_log?.material_document }}</div>
                              </template>
                              <span v-else>--</span>
                          </td>
                          <td>{{ item.pallet_physical_id || '--' }}</td>
                          <td class="text-center">
                              <v-chip :color="item.movement_type === '313' ? 'warning' : 'success'" size="small" label>
                                  {{ item.movement_type }}
                              </v-chip>
                          </td>
                          <td>{{ item.plant }}</td>
                          <td>{{ item.issuing_sloc || '--' }}</td>
                          <td>{{ item.receiving_sloc || '--' }}</td>
                          <td>{{ item.entry_qty }} {{ item.entry_uom }}</td>
                          <td>{{ item.created_at?.slice(0, 19).replace('T', ' ') }}</td>
                          <td>
                            <span class="text-uppercase">
                              {{ item.goods_movement_log?.sap_id }}
                            </span>
                          </td>
                      </tr>
                  </tbody>
              </v-table>
          </v-card-text>
      </v-card>
  </v-dialog>
</template>
