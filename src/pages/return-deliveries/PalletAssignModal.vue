<script setup>
import Toast from '@/components/Toast.vue'
import ApiService from '@/services/ApiService'
import { debounce } from 'lodash'
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  item: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  delivery: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'save', 'updated'])

const dialogVisible = ref(props.show)
const selectedPallet = ref(null)
const addedPallets = ref([])
const availablePallets = ref([])
const isLoading = ref(false)
const search = ref('')

const toast = ref({
  message: '',
  color: 'success',
  show: false,
})

const headers = [
  { title: 'Physical ID', key: 'physical_id', sortable: false },
  { title: 'Current', key: 'current_batch', sortable: false },
  { title: 'Quantity', key: 'quantity', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
]

const maxPallets = ref(0)
const materialConversionLoading = ref(false)

const getPlantCode = () => {
  return props.item?.plant
}

function removeLeadingZeros(value) {
  if (!value) return ''
  
  return value.replace(/^0+/, '')
}

const fetchMaterialConversion = async () => {
  if (!props.item) return

  materialConversionLoading.value = true
  try {
    const payload = {
      material_code: removeLeadingZeros(props.item?.material_code),
      quantity: props.item?.delivery_qty,
      uom: props.item?.sales_unit,
    }

    const response = await ApiService.post('/transfers/get-material-conversion', payload)
    if (response.data && response.data.quantity) {
      maxPallets.value = response.data.quantity
    } else {
      maxPallets.value = 0
    }
  } catch (error) {
    console.error('Failed to fetch material conversion:', error)
    maxPallets.value = 0
  } finally {
    materialConversionLoading.value = false
  }
}

const fetchPallets = async (query = '') => {
  isLoading.value = true
  try {
    const payload = {
      name: query,
      page: 1,
      per_page: 20,
      plant_code: getPlantCode(),
      material_code: removeLeadingZeros(props.item?.material_code),
    }

    const response = await ApiService.post('/transfers/pallet-list', payload)

    availablePallets.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch pallets:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchAssignedPallets = async () => {
  if (!props.item || !props.delivery?.do_number) return

  try {
    const payload = {
      do_number: props.delivery?.do_number,
      item_number: props.item?.item_number,
      material_code: removeLeadingZeros(props.item?.material_code),
    }

    const response = await ApiService.post('return-deliveries/get-assigned-pallets', payload)
    if (response.data && Array.isArray(response.data)) {
      addedPallets.value = response.data.map(item => {
        return {
          physical_id: item.physical_id,
          log_id: item.id,
          is_assigned: true,
          quantity: item.quantity,
          batch: item.batch,
        }
      }).filter(p => p.physical_id)
    }
  } catch (error) {
    console.error("Failed to fetch assigned pallets", error)
  }
}

const debouncedFetchPallets = debounce(query => {
  fetchPallets(query)
}, 500)

const resetPalletSelection = () => {
  selectedPallet.value = null
  if (addedPallets.value) {
    addedPallets.value = addedPallets.value.filter(pallet => pallet.is_assigned)
  }
  search.value = ''
}

watch(() => props.show, newVal => {
  dialogVisible.value = newVal
  if (newVal) {
    resetPalletSelection()
    maxPallets.value = 0
    fetchPallets()
    fetchMaterialConversion()
    fetchAssignedPallets()
  }
})

watch(() => dialogVisible.value, newVal => {
  if (!newVal) {
    emit('close')
  }
})

watch(search, newVal => {
  if (newVal !== selectedPallet.value?.physical_id) {
    debouncedFetchPallets(newVal)
  }
})

const addPallet = () => {
  if (selectedPallet.value) {
    if (maxPallets.value > 0 && addedPallets.value.length >= maxPallets.value) {
      return
    }

    const exists = addedPallets.value.find(p => p.physical_id === selectedPallet.value.physical_id)
    if (!exists) {
      addedPallets.value.push({
        ...selectedPallet.value,
        is_assigned: false,
      })
      selectedPallet.value = null
      search.value = ''
    } else {
      toast.value = {
        message: 'Pallet already added to the list or already assigned.',
        color: 'error',
        show: true,
      }
    }
  }
}

const getPlantLabel = palletItem => {
  const plant = palletItem?.material?.plant

  if (!plant) {
    return 'N/A'
  }

  if (typeof plant === 'string') {
    return plant
  }

  if (typeof plant === 'object') {
    const code = plant.plant_code || plant.code
    const name = plant.name

    if (code && name) {
      return `${code} - ${name}`
    }

    return code || name || 'N/A'
  }

  return 'N/A'
}

const removePallet = async item => {
  if (item.is_assigned) {
    if (!confirm('Are you sure you want to remove this assigned pallet? This action cannot be undone.')) return

    try {
      const response = await ApiService.post('return-deliveries/remove-assigned-pallet', {
        physical_id: item.physical_id,
        batch: item.batch || null,
        do_number: props.delivery?.do_number,
        item_number: props.item?.item_number,
        material_code: removeLeadingZeros(props.item?.material_code),
        plant: props.item?.plant,
        storage_location: props.item?.storage_location,
      })

      toast.value = {
        message: response.data?.message || 'Successfully unassigned pallet',
        color: 'success',
        show: true,
      }

      addedPallets.value = addedPallets.value.filter(p => p.physical_id !== item.physical_id)
      emit('updated')
    } catch (error) {
      console.error('Failed to remove assigned pallet:', error)
      toast.value = {
        message: error.response?.data?.message || 'Failed to remove pallet',
        color: 'error',
        show: true,
      }
    }
  } else {
    addedPallets.value = addedPallets.value.filter(p => p.physical_id !== item.physical_id)
  }
}

const handleSave = () => {
  const newPallets = addedPallets.value.filter(p => !p.is_assigned)

  const formattedPallets = newPallets.map(p => ({
    physical_id: p.physical_id,
    batch: p.batch || 'N/A',
    quantity: p.quantity || 0,
  }))

  emit('save', {
    pallets: formattedPallets,
  })
}
</script>

<template>
  <VDialog
    v-model="dialogVisible"
    max-width="900px"
    scrollable
  >
    <VCard
      class="d-flex flex-column"
      height="600px"
    >
      <VCardTitle class="d-flex justify-space-between align-center pa-4">
        <span class="text-h5">Assign Pallets</span>
        <VBtn
          icon="ri-close-line"
          variant="text"
          @click="dialogVisible = false"
        />
      </VCardTitle>

      <VDivider />

      <VCardText class="flex-grow-1 overflow-y-auto">
        <div
          v-if="item"
          class="mb-4 pa-3 bg-grey-lighten-4 rounded"
        >
          <div class="d-flex justify-space-between align-center">
            <div>
              <div><strong>Material Code:</strong> {{ removeLeadingZeros(item.material_code) }}</div>
              <div><strong>Qty:</strong> {{ item.delivery_qty }} {{ item.sales_unit }}</div>
            </div>
            <div v-if="materialConversionLoading">
              <VProgressCircular
                indeterminate
                size="20"
                width="2"
                color="primary"
              /> Calculating limit...
            </div>
            <div
              v-else
              class="text-right"
            >
              <div class="text-caption text-grey">
                Pallet Limit
              </div>
              <div
                class="text-h6"
                :class="{'text-error': addedPallets.length >= maxPallets && maxPallets > 0, 'text-success': addedPallets.length < maxPallets}"
              >
                {{ addedPallets.length }} / {{ maxPallets > 0 ? maxPallets : '∞' }}
              </div>
            </div>
          </div>
        </div>

        <VRow
          align="center"
          class="mb-2"
        >
          <VCol
            cols="12"
            md="8"
          >
            <VAutocomplete
              v-model="selectedPallet"
              v-model:search="search"
              :items="availablePallets"
              :loading="isLoading"
              item-title="physical_id"
              item-value="physical_id"
              label="Search Pallet"
              return-object
              variant="outlined"
              density="compact"
              hide-details
              placeholder="Type to search..."
              no-filter
              :disabled="maxPallets > 0 && addedPallets.length >= maxPallets"
            >
              <template #item="{ props, item }">
                <VListItem
                  v-bind="props"
                  class="pallet-option-item"
                  lines="three"
                  :title="item.raw.physical_id || 'N/A'"
                >
                  <template #subtitle>
                    <div class="pallet-option-subtitle">
                      <div>{{ getPlantLabel(item.raw) }}</div>
                      <div>Current Batch: {{ item.raw.batch || 'N/A' }}</div>
                    </div>
                  </template>
                </VListItem>
              </template>
            </VAutocomplete>
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VBtn
              color="primary"
              block
              :disabled="!selectedPallet || (maxPallets > 0 && addedPallets.length >= maxPallets)"
              @click="addPallet"
            >
              Add Pallet
            </VBtn>
          </VCol>
        </VRow>

        <VDataTable
          :headers="headers"
          :items="addedPallets"
          class="elevation-1 border rounded"
          density="compact"
        >
          <template #item.current_batch="{ item }">
            {{ item.batch || item?.inventory?.batch || '-' }}
          </template>
          <template #item.actions="{ item }">
            <VBtn
              icon="ri-delete-bin-line"
              size="small"
              :color="item.is_assigned ? 'error' : 'warning'"
              variant="text"
              :title="item.is_assigned ? 'Remove assigned pallet' : 'Remove from list'"
              @click="removePallet(item)"
            />
          </template>
          <template #no-data>
            <div class="pa-4 text-center text-grey">
              No pallets assigned. Search and add pallets above.
            </div>
          </template>
        </VDataTable>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="dialogVisible = false"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          variant="elevated"
          :loading="loading"
          @click="handleSave"
        >
          Save Changes
        </VBtn>
      </VCardActions>
    </VCard>
    <Toast
      :show="toast.show"
      :message="toast.message"
      :color="toast.color"
      @update:show="toast.show = $event"
    />
  </VDialog>
</template>

<style scoped>
:deep(.pallet-option-item .v-list-item__content) {
    overflow: visible;
}

:deep(.pallet-option-item .v-list-item-title),
:deep(.pallet-option-item .v-list-item-subtitle) {
    max-width: none;
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
}

:deep(.pallet-option-item .v-list-item-subtitle) {
    line-clamp: unset;
    -webkit-line-clamp: unset;
}

.pallet-option-subtitle {
    width: 100%;
}
</style>
