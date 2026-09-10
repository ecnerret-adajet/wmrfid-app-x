<script setup>
import Toast from '@/components/Toast.vue'
import ApiService from '@/services/ApiService'
import { ref } from 'vue'
import { VDataTableServer } from 'vuetify/components'
import PalletAssignModal from './PalletAssignModal.vue'

const props = defineProps({
  search: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['pagination-changed'])

const serverItems = ref([])
const loading = ref(true)
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-created_at')
const filters = ref(null)

const selectedDelivery = ref(null)

const palletModalOpen = ref(false)
const selectedItemForPallet = ref(null)
const isSavingPallets = ref(false)

const toast = ref({
  message: 'Toast message!',
  color: 'success',
  show: false,
})

const headers = [
  { title: 'DO NUMBER', key: 'do_number' },
  { title: 'ITEM', key: 'item_number', sortable: false, width: '1%' },
  { title: 'MATERIAL', key: 'material' },
  { title: 'QUANTITY', key: 'quantity', align: 'end', sortable: false },
  { title: 'MATERIAL DOCUMENT', key: 'material_document', sortable: false },
  { title: 'TRUCKSCALE NUMBER', key: 'truck_scale_num', sortable: false },
  { title: 'PLATE NUMBER', key: 'plate_number', sortable: false, width: '1%' },
  { title: 'VENDOR', key: 'vendor', sortable: false },
  { title: 'NET WEIGHT', key: 'net_weight', align: 'end', sortable: false },
  { title: 'SHIP TO NAME', key: 'ship_to_name', sortable: false },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'GOODS ISSUE STATUS', key: 'goods_issue_status', sortable: false },
  { title: 'ASSIGNED PALLETS', key: 'assigned_pallets_total', align: 'center', sortable: false },
  { title: '', key: 'action', align: 'center', sortable: false },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
  loading.value = true
  if (sortBy && sortBy.length > 0) {
    const sort = sortBy[0]

    sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
  } else {
    sortQuery.value = '-created_at'
  }

  ApiService.query('datatable/return-deliveries', {
    params: {
      page,
      itemsPerPage,
      sort: sortQuery.value,
      search: props.search,
      filters: filters.value,
    },
  })
    .then(response => {
      totalItems.value = response.data.total
      serverItems.value = response.data.data
      loading.value = false

      emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search })
    })
    .catch(error => {
      console.log(error)
      loading.value = false
    })
}

const applyFilters = data => {
  filters.value = data
  loadItems({
    page: page.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: [{ key: 'created_at', order: 'desc' }],
    search: props.search,
  })
}

const openPalletModal = item => {
  selectedDelivery.value = item.delivery
  selectedItemForPallet.value = {
    material_number: item.material_code,
    material_description: item.material?.material_description,
    batch: item.batch,
    delivery_quantity: item.delivery_qty,
    sales_unit: item.sales_unit,
    item_number: item.item_number,
    plant: item.plant,
    storage_location: item.storage_location,
  }
  palletModalOpen.value = true
}

const closePalletModal = () => {
  palletModalOpen.value = false
  selectedItemForPallet.value = null
  selectedDelivery.value = null
}

const savePalletAssignment = async ({ pallets }) => {
  if (!selectedItemForPallet.value || !selectedDelivery.value) return

  isSavingPallets.value = true

  const payload = {
    pallets: pallets.map(p => ({
      physical_id: p.physical_id,
      batch: p.batch || null,
      quantity: p.quantity || 0,
    })),
    material_code: selectedItemForPallet.value.material_number,
    quantity: selectedItemForPallet.value.delivery_quantity,
    do_number: selectedDelivery.value.do_number,
    item_number: selectedItemForPallet.value.item_number,
    plant: selectedDelivery.value?.customer_delivery?.plant?.plant_code || selectedItemForPallet.value.plant,
    storage_location: selectedItemForPallet.value.storage_location,
    uom: selectedItemForPallet.value.sales_unit,
  }

  try {
    await ApiService.post('return-deliveries/assign-pallets', payload)

    toast.value = {
      message: 'Pallets assigned successfully',
      color: 'success',
      show: true,
    }
    closePalletModal()
    loadItems({
      page: page.value,
      itemsPerPage: itemsPerPage.value,
      sortBy: [{ key: 'created_at', order: 'desc' }],
      search: props.search,
    })
  } catch (error) {
    console.error(error)
    toast.value = {
      message: error.response?.data?.message || 'Failed to assign pallets',
      color: 'error',
      show: true,
    }
  } finally {
    isSavingPallets.value = false
  }
}

defineExpose({
  loadItems,
  applyFilters,
})
</script>

<template>
  <VDataTableServer
    v-model:items-per-page="itemsPerPage"
    fixed-header
    :headers="headers"
    :items="serverItems"
    :items-length="totalItems"
    :loading="loading"
    item-value="id"
    :search="search"
    @update:options="loadItems"
  >
    <template #item.do_number="{ item }">
      <div class="d-flex flex-column py-1">
        <span class="font-weight-bold text-sm">{{ item.delivery?.do_number }}</span>
        <span class="text-sm text-muted">{{ item.delivery?.customer_delivery?.delivery_document }}</span>
      </div>
    </template>

    <template #item.item_number="{ item }">
      {{ item.item_number }}
    </template>

    <template #item.material="{ item }">
      <div class="d-flex flex-column py-1">
        <span class="font-weight-bold text-sm">{{ item.material_code }}</span>
        <span class="text-sm text-muted">{{ item.material?.material_description }}</span>
      </div>
    </template>

    <template #item.quantity="{ item }">
      {{ item.delivery_qty }} {{ item.sales_unit }}
    </template>

    <template #item.material_document="{ item }">
      {{ item.material_document }}
    </template>

    <template #item.truck_scale_num="{ item }">
      {{ item.delivery?.truck_scale_num }}
    </template>

    <template #item.plate_number="{ item }">
      <span class="text-no-wrap">{{ item.delivery?.do_truck_scale?.truckscale?.plate_number }}</span>
    </template>

    <template #item.vendor="{ item }">
      {{ item.delivery?.do_truck_scale?.truckscale?.vendor_name }}
    </template>

    <template #item.net_weight="{ item }">
      {{ item.delivery?.net_weight }}
    </template>

    <template #item.ship_to_name="{ item }">
      {{ item.delivery?.ship_to_name }}
    </template>

    <template #item.customer="{ item }">
      <div class="d-flex flex-column py-1">
        <span class="font-weight-bold text-sm">{{ item.delivery?.ship_to_customer }}</span>
        <span class="text-sm">{{ item.delivery?.ship_to_name }}</span>
      </div>
    </template>

    <template #item.goods_issue_status="{ item }">
      {{ item.delivery?.goods_issue_status }}
    </template>

    <template #item.assigned_pallets_total="{ item }">
      <VChip
        size="small"
        :color="(item.assigned_pallets_total ?? 0) > 0 ? 'success' : 'default'"
      >
        {{ item.assigned_pallets_total ?? 0 }}
      </VChip>
    </template>

    <!-- Actions -->
    <template #item.action="{ item }">
      <div class="d-flex justify-center gap-1">
        <VBtn
          icon="ri-stack-line"
          size="small"
          variant="text"
          title="Assign Pallets"
          @click="openPalletModal(item)"
        />
      </div>
    </template>
  </VDataTableServer>

  <Toast
    :show="toast.show"
    :message="toast.message"
    :color="toast.color"
    @update:show="toast.show = $event"
  />

  <PalletAssignModal
    :show="palletModalOpen"
    :item="selectedItemForPallet"
    :delivery="selectedDelivery"
    :loading="isSavingPallets"
    @close="closePalletModal"
    @save="savePalletAssignment"
  />
</template>
