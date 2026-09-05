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

const showDeliveryItems = ref(false)
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
  { title: 'TRUCKSCALE NUMBER', key: 'truck_scale_num', sortable: false },
  { title: 'PLATE NUMBER', key: 'plate_number', sortable: false },
  { title: 'VENDOR', key: 'vendor', sortable: false },
  { title: 'NET WEIGHT', key: 'net_weight', align: 'end', sortable: false },
  { title: 'SHIP TO NAME', key: 'ship_to_name', sortable: false },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'GOODS ISSUE STATUS', key: 'goods_issue_status' },
  { title: 'DELIVERY ITEMS', key: 'items', align: 'center', sortable: false },
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

const handleAction = (delivery, action) => {
  if (action === 'view_delivery_items') {
    selectedDelivery.value = delivery
    showDeliveryItems.value = true
  }
}

const openPalletModal = item => {
  selectedItemForPallet.value = item
  palletModalOpen.value = true
}

const closePalletModal = () => {
  palletModalOpen.value = false
  selectedItemForPallet.value = null
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
    material_code: selectedItemForPallet.value.material_code,
    quantity: selectedItemForPallet.value.delivery_qty,
    do_number: selectedDelivery.value.do_number,
    item_number: selectedItemForPallet.value.item_number,
    plant: selectedItemForPallet.value.plant,
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
        <span class="font-weight-bold text-sm">{{ item.do_number }}</span>
        <span class="text-sm text-muted">{{ item.customerDelivery?.delivery_document }}</span>
      </div>
    </template>

    <template #item.truck_scale_num="{ item }">
      {{ item.truck_scale_num }}
    </template>

    <template #item.plate_number="{ item }">
      {{ item.customerDelivery?.plate_number }}
    </template>

    <template #item.vendor="{ item }">
      {{ item.customerDelivery?.vendor_name }}
    </template>

    <template #item.net_weight="{ item }">
      {{ item.net_weight }}
    </template>

    <template #item.ship_to_name="{ item }">
      {{ item.ship_to_name }}
    </template>

    <template #item.customer="{ item }">
      <div class="d-flex flex-column py-1">
        <span class="font-weight-bold text-sm">{{ item.ship_to_customer }}</span>
        <span class="text-sm">{{ item.ship_to_name }}</span>
      </div>
    </template>

    <template #item.items="{ item }">
      {{ item.items?.length ?? 0 }}
    </template>

    <!-- Actions -->
    <template #item.action="{ item }">
      <div class="d-flex justify-center gap-1">
        <VMenu location="end">
          <template #activator="{ props }">
            <VBtn
              icon="ri-more-2-line"
              variant="text"
              v-bind="props"
              color="grey"
            />
          </template>
          <VList>
            <VListItem @click="handleAction(item, 'view_delivery_items')">
              View Delivery Items
            </VListItem>
          </VList>
        </VMenu>
      </div>
    </template>
  </VDataTableServer>

  <VDialog
    v-model="showDeliveryItems"
    max-width="1300px"
  >
    <VCard elevation="2">
      <VCardTitle class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
        <div class="text-h4 font-weight-bold ps-2 text-primary">
          Return Delivery Items — {{ selectedDelivery?.do_number }}
        </div>
        <VBtn
          icon="ri-close-line"
          variant="text"
          @click="showDeliveryItems = false"
        />
      </VCardTitle>
      <VCardText>
        <VTable
          density="compact"
          class="elevation-0 border mx-4"
        >
          <thead>
            <tr>
              <th>Item</th>
              <th>Material</th>
              <th>Plant</th>
              <th>Storage Location</th>
              <th class="text-center">
                Quantity
              </th>
              <th class="text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in selectedDelivery?.items"
              :key="index"
            >
              <td>{{ item.item_number }}</td>
              <td>{{ item.material_code }}</td>
              <td>{{ item.plant }}</td>
              <td>{{ item.storage_location }}</td>
              <td class="text-center">
                {{ item.delivery_qty }} {{ item.sales_unit }}
              </td>
              <td class="text-center">
                <VBtn
                  icon="ri-stack-line"
                  size="small"
                  variant="text"
                  title="Assign Pallets"
                  @click="openPalletModal(item)"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
        <div class="d-flex justify-end mt-8 mx-4">
          <VBtn
            color="secondary"
            variant="outlined"
            type="button"
            @click="showDeliveryItems = false"
          >
            Close
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

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
