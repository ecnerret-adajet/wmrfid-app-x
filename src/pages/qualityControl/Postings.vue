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
  { title: 'MOVEMENT TYPE', key: 'movement_type', align: 'center' },
  { title: 'STATUS', key: 'status_text', align: 'center', sortable: false },
  { title: 'PLANT', key: 'plant', sortable: false },
  { title: 'ISSUING SLOC', key: 'issuing_sloc', sortable: false },
  { title: 'RECEIVING SLOC', key: 'receiving_sloc', sortable: false },
  { title: 'POSTING DATE', key: 'posting_date' },
  { title: 'DOCUMENT DATE', key: 'document_date', sortable: false },
  { title: 'MATERIAL DOC', key: 'material_document', sortable: false },
  { title: 'ITEMS', key: 'items_count', align: 'center', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const itemHeaders = [
  { title: 'MATERIAL', key: 'material' },
  { title: 'BATCH', key: 'batch' },
  { title: 'MOVEMENT TYPE', key: 'movement_type', align: 'center' },
  { title: 'PLANT', key: 'plant' },
  { title: 'ISSUING SLOC', key: 'issuing_sloc' },
  { title: 'RECEIVING SLOC', key: 'receiving_sloc' },
  { title: 'QTY', key: 'entry_qty', align: 'center' },
  { title: 'UOM', key: 'entry_uom', align: 'center' },
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

  ApiService.query(`quality-control/goods-movement-logs/${filters.plant_code}/${filters.sloc?.code}`, {
    params: {
      page: pageVal,
      itemsPerPage: perPage,
      sort: sortQuery.value,
      search: searchValue.value,
      type: "qc-disposition"
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
      <template #item.movement_type="{ item }">
          <v-chip
              :color="item.movement_type === '313' ? 'warning' : 'success'"
              size="small"
              label
          >
              {{ item.movement_type }}
          </v-chip>
      </template>

      <template #item.status_text="{ item }">
          <v-chip
              color="primary"
              size="small"
              label
          >
              {{ item.status_text }}
          </v-chip>
      </template>

      <template #item.issuing_sloc="{ item }">
          {{ item.issuing_sloc || '--' }}
      </template>

      <template #item.material_document="{ item }">
          {{ item.material_document || '--' }}
      </template>

      <template #item.items_count="{ item }">
          <v-chip size="small" variant="tonal" color="secondary">
              {{ item.items?.length ?? 0 }}
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
      max-width="800"
      scrollable
  >
      <v-card v-if="selectedLog">
          <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
              <span>Goods Movement Detail</span>
              <v-btn icon variant="text" size="small" @click="detailDialog = false">
                  <v-icon icon="ri-close-line" />
              </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
              <div class="d-flex flex-wrap gap-3 mb-4">
                  <v-card variant="tonal" color="warning" rounded="lg" class="flex-1-1">
                      <v-card-text class="pa-3">
                          <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Movement Type</div>
                          <div class="text-h6 font-weight-bold">{{ selectedLog.movement_type }}</div>
                      </v-card-text>
                  </v-card>
                  <v-card variant="tonal" color="primary" rounded="lg" class="flex-1-1">
                      <v-card-text class="pa-3">
                          <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Status</div>
                          <div class="text-h6 font-weight-bold text-capitalize">{{ selectedLog.status_text }}</div>
                      </v-card-text>
                  </v-card>
                  <v-card variant="tonal" color="secondary" rounded="lg" class="flex-1-1">
                      <v-card-text class="pa-3">
                          <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Posting Date</div>
                          <div class="text-h6 font-weight-bold">{{ selectedLog.posting_date }}</div>
                      </v-card-text>
                  </v-card>
              </div>

              <v-row dense class="mb-4">
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Plant</div>
                      <div class="text-body-1">{{ selectedLog.plant }}</div>
                  </v-col>
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Document Date</div>
                      <div class="text-body-1">{{ selectedLog.document_date }}</div>
                  </v-col>
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Issuing SLOC</div>
                      <div class="text-body-1">{{ selectedLog.issuing_sloc || '--' }}</div>
                  </v-col>
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Receiving SLOC</div>
                      <div class="text-body-1">{{ selectedLog.receiving_sloc || '--' }}</div>
                  </v-col>
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Material Document</div>
                      <div class="text-body-1">{{ selectedLog.material_document || '--' }}</div>
                  </v-col>
                  <v-col cols="6">
                      <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Material Document Year</div>
                      <div class="text-body-1">{{ selectedLog.material_document_year || '--' }}</div>
                  </v-col>
              </v-row>

              <div class="text-subtitle-2 font-weight-bold mb-2">Items ({{ selectedLog.items?.length ?? 0 }})</div>
              <v-table density="compact">
                  <thead>
                      <tr>
                          <th v-for="h in itemHeaders" :key="h.key" :class="h.align === 'center' ? 'text-center' : ''">
                              {{ h.title }}
                          </th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr v-for="item in selectedLog.items" :key="item.id">
                          <td>{{ item.material }}</td>
                          <td>{{ item.batch }}</td>
                          <td class="text-center">
                              <v-chip :color="item.movement_type === '313' ? 'warning' : 'success'" size="small" label>
                                  {{ item.movement_type }}
                              </v-chip>
                          </td>
                          <td>{{ item.plant }}</td>
                          <td>{{ item.issuing_sloc || '--' }}</td>
                          <td>{{ item.receiving_sloc || '--' }}</td>
                          <td class="text-center">{{ item.entry_qty }}</td>
                          <td class="text-center">{{ item.entry_uom }}</td>
                      </tr>
                  </tbody>
              </v-table>
          </v-card-text>
      </v-card>
  </v-dialog>
</template>
