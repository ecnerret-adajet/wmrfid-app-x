<script setup>
import { useAuthorization } from '@/composables/useAuthorization'
import ApiService from '@/services/ApiService'
import { computed, ref } from 'vue'
import { VDataTableServer } from 'vuetify/components'

const emits = defineEmits(['pagination-changed'])

const props = defineProps({
    search: {
        type: String,
        default: '',
    },
})

const { authUserCan } = useAuthorization()

const isLoading = ref(false)
const serverItems = ref([])
const loading = ref(true)
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-created_at')
const filters = ref(null)

const showPalletsDialog = ref(false)
const selectedRow = ref(null)

const cancelConfirmDialog = ref(false)
const isCancelling = ref(false)
const cancelError = ref(null)
const rowToCancel = ref(null)

const headers = [
    { title: 'DELIVERY', key: 'delivery_document', sortable: false },
    { title: 'ITEM NO.', key: 'delivery_item_number' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BATCH CODE', key: 'commodity_batch_code' },
    { title: 'PLANT / SLOC', key: 'plant_sloc', sortable: false },
    { title: 'RESERVED PALLETS', key: 'total_reserved_pallets', align: 'center' },
    { title: 'TOTAL QTY', key: 'total_qty', align: 'center' },
    { title: 'SAP SERVER', key: 'sap_server', align: 'center', sortable: false },
    { title: 'PICKING STATUS', key: 'picking_status', align: 'center', sortable: false },
    { title: 'STATUS', key: 'status', align: 'center', sortable: false },
    { title: 'ACTION', key: 'action', align: 'center', sortable: false },
]

const palletHeaders = [
    { title: 'Physical ID', key: 'pallet_physical_id' },
    { title: 'Location', key: 'location' },
    { title: 'Batch Code', key: 'commodity_batch_code' },
    { title: 'Qty', key: 'total_qty', align: 'center' },
    { title: 'Delivery Doc', key: 'delivery_document' },
    { title: 'Item No.', key: 'delivery_item_number', align: 'center' },
    { title: 'Mfg Date', key: 'manufacturing_date' },
    { title: 'Loaded', key: 'is_loaded', align: 'center' },
    { title: 'Status', key: 'status', align: 'center' },
]

const getRowStatus = item => {
    if (item.cancelled_at) return { label: 'Cancelled', color: 'error' }
    const hasPartialCancel = (item.reserved_pallets ?? []).some(p => p.cancelled_at)
    if (hasPartialCancel) return { label: 'Partial Cancelled', color: 'warning' }
    return { label: 'Reserved', color: 'success' }
}

const getPalletStatus = pallet => {
    if (pallet.cancelled_at) return { label: 'Cancelled', color: 'error' }
    return { label: 'Reserved', color: 'success' }
}

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    if (!filters.value) return

    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0]
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
    } else {
        sortQuery.value = '-created_at'
    }

    ApiService.query('datatable/delivery-reserved-orders', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value,
            plant_code: filters.value?.plant_code,
        },
    })
        .then(response => {
            totalItems.value = response.data.total
            serverItems.value = response.data.data
            loading.value = false
            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search })
        })
        .catch(error => console.error(error))
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

const actionList = computed(() => {
    const actions = [{ title: 'View Pallets', key: 'view_pallets' }]

    if (authUserCan('can.cancel.reservation.pallet')) {
        actions.push({ title: 'Cancel Reservation', key: 'cancel_reservation' })
    }

    return actions
})

const handleAction = (item, action) => {
    if (action.key === 'view_pallets') {
        selectedRow.value = item
        showPalletsDialog.value = true
    } else if (action.key === 'cancel_reservation') {
        rowToCancel.value = item
        cancelError.value = null
        cancelConfirmDialog.value = true
    }
}

const cancelReservation = async () => {
    if (!rowToCancel.value) return

    const item = rowToCancel.value
    const deliveryDocument = item.reserved_pallets?.[0]?.delivery_document
    const batches = (item.reserved_pallets ?? []).map(p => ({ batch: p.commodity_batch_code }))

    const payload = new FormData()
    payload.append('delivery_document', deliveryDocument)
    payload.append('delivery_item_number', item.delivery_item_number)
    payload.append('batches', JSON.stringify(batches))
    if (item.sap_server) {
        payload.append('sap_server', item.sap_server)
    }

    isCancelling.value = true
    cancelError.value = null

    try {
        await ApiService.post('deliveries/delivery-order-cancel', payload)
        cancelConfirmDialog.value = false
        rowToCancel.value = null
        applyFilters(filters.value)
    } catch (error) {
        const errors = error.response?.data?.errors
        cancelError.value = Array.isArray(errors) ? errors.join(', ') : 'Failed to cancel reservation.'
    } finally {
        isCancelling.value = false
    }
}

const closePalletsDialog = () => {
    showPalletsDialog.value = false
    selectedRow.value = null
}

defineExpose({ loadItems, applyFilters })
</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >
        <template #item.delivery_document="{ item }">
            <span class="font-weight-medium">{{ item.reserved_pallets?.[0]?.delivery_document ?? '—' }}</span>
        </template>

        <template #item.delivery_item_number="{ item }">
            {{ item.delivery_item_number }}
        </template>

        <template #item.material="{ item }">
            <div class="d-flex flex-column py-1">
                <span class="font-weight-medium">{{ item.material_code }}</span>
                <span class="text-caption text-medium-emphasis">{{ item.material_description }}</span>
            </div>
        </template>

        <template #item.commodity_batch_code="{ item }">
            {{ item.commodity_batch_code }}
        </template>

        <template #item.plant_sloc="{ item }">
            <div class="d-flex flex-column py-1">
                <span class="font-weight-medium">{{ item.plant }}</span>
                <span class="text-caption text-medium-emphasis">{{ item.sloc }} — {{ item.storage_location?.name }}</span>
            </div>
        </template>

        <template #item.total_reserved_pallets="{ item }">
            <v-chip size="small" color="primary" variant="tonal">
                {{ item.total_reserved_pallets ?? 0 }}
            </v-chip>
        </template>

        <template #item.total_qty="{ item }">
            {{ item.total_qty }} {{ item.uom }}
        </template>

        <template #item.sap_server="{ item }">
            <v-chip size="small" color="secondary" variant="tonal">
                {{ item.sap_server }}
            </v-chip>
        </template>

        <template #item.picking_status="{ item }">
            <span v-if="item.sap_delivery?.picking_status">{{ item.sap_delivery.picking_status }}</span>
            <span v-else class="text-medium-emphasis">—</span>
        </template>

        <template #item.status="{ item }">
            <v-chip
                size="small"
                :color="getRowStatus(item).color"
                variant="tonal"
            >
                {{ getRowStatus(item).label }}
            </v-chip>
        </template>

        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="start">
                    <template #activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey" />
                    </template>
                    <v-list>
                        <v-list-item
                            v-for="(action, i) in actionList"
                            :key="i"
                            :value="i"
                            @click="handleAction(item, action)"
                        >
                            <v-list-item-title>{{ action.title }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>
    </VDataTableServer>

    <!-- Reserved Pallets Dialog -->
    <v-dialog v-model="showPalletsDialog" max-width="1300" scrollable>
        <v-card max-height="70vh">
            <v-toolbar color="white"  border="b" density="compact">
                <v-toolbar-title class="text-body-1 font-weight-bold">
                    Reserved Pallets — Item {{ selectedRow?.delivery_item_number }}
                    <span class="ml-2 text-caption text-medium-emphasis">{{ selectedRow?.material_description }}</span>
                </v-toolbar-title>
                <template #append>
                    <v-btn icon="ri-close-line" variant="text" color="black" @click="closePalletsDialog" />
                </template>
            </v-toolbar>

            <v-card-text class="pa-0">
                <v-table density="compact" class="striped">
                    <thead>
                        <tr>
                            <th v-for="h in palletHeaders" :key="h.key" :class="h.align === 'center' ? 'text-center' : ''">
                                {{ h.title }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="pallet in selectedRow?.reserved_pallets" :key="pallet.id">
                            <td class="font-weight-medium">{{ pallet.pallet_physical_id }}</td>
                            <td>{{ pallet.block?.lot?.label }} - {{ pallet.block?.label }}</td>
                            <td>{{ pallet.commodity_batch_code }}</td>
                            <td class="text-center">{{ pallet.total_qty }} {{ pallet.uom }}</td>
                            <td>{{ pallet.delivery_document }}</td>
                            <td class="text-center">{{ pallet.delivery_item_number }}</td>
                            <td>{{ pallet.manufacturing_date }}</td>
                            <td class="text-center">
                                <v-chip
                                    size="x-small"
                                    :color="pallet.is_loaded ? 'success' : 'warning'"
                                    variant="tonal"
                                >
                                    {{ pallet.is_loaded ? 'Loaded' : 'Pending' }}
                                </v-chip>
                            </td>
                            <td class="text-center">
                                <v-chip
                                    size="x-small"
                                    :color="getPalletStatus(pallet).color"
                                    variant="tonal"
                                >
                                    {{ getPalletStatus(pallet).label }}
                                </v-chip>
                            </td>
                        </tr>
                        <tr v-if="!selectedRow?.reserved_pallets?.length">
                            <td :colspan="palletHeaders.length" class="text-center text-medium-emphasis py-4">
                                No reserved pallets found.
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>

            <v-card-actions class="justify-end">
                <v-btn color="secondary" variant="outlined" @click="closePalletsDialog">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Cancel Reservation Confirmation Dialog -->
    <v-dialog v-model="cancelConfirmDialog" max-width="480" persistent>
        <v-card>
            <v-card-title class="text-h6 pa-4">Cancel Reservation</v-card-title>
            <v-card-text class="pb-2">
                Are you sure you want to cancel the reservation for delivery
                <strong>{{ rowToCancel?.reserved_pallets?.[0]?.delivery_document }}</strong>
                item <strong>{{ rowToCancel?.delivery_item_number }}</strong>?
                This will unreserve all {{ rowToCancel?.total_reserved_pallets }} pallet(s).
            </v-card-text>
            <v-alert
                v-if="cancelError"
                type="error"
                variant="tonal"
                class="mx-4 mb-2"
                density="compact"
            >
                {{ cancelError }}
            </v-alert>
            <v-card-actions class="justify-end pa-4 pt-2">
                <v-btn variant="outlined" color="secondary" :disabled="isCancelling" @click="cancelConfirmDialog = false">Dismiss</v-btn>
                <v-btn color="error" variant="flat" :loading="isCancelling" @click="cancelReservation">
                    <template #loader>
                        <v-progress-circular indeterminate color="white" size="20" width="2" />
                    </template>
                    Cancel Reservation
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
