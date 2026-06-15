<script setup>
import Toast from '@/components/Toast.vue'
import ApiService from '@/services/ApiService'
import { useSapDeliveryStore } from '@/stores/sapDeliveryStore'
import Moment from 'moment'
import { ref } from 'vue'
import { VDataTableServer } from 'vuetify/components'
import BatchSelection from './batchSelection.vue'
import PalletSelection from './palletSelection.vue'
import ShipmentData from './shipmentData.vue'

const emits = defineEmits(['pagination-changed'])

const props = defineProps({
    search: {
        type: String,
        default: '',
    },
})

const store = useSapDeliveryStore()

const isLoading = ref(false)
const serverItems = ref([])
const loading = ref(true)
const totalItems = ref(0)
const itemsPerPage = ref(10)
const page = ref(1)
const sortQuery = ref('-created_at')
const filters = ref(null)
const pendingDeliveryId = ref(null)

// Dialog view state: 'items' | 'batch-selection' | 'pallet-selection'
const showDeliveryItems = ref(false)
const currentView = ref('items')

const toast = ref({ message: '', color: 'success', show: false })

const headers = [
    { title: 'DELIVERY NUMBER', key: 'delivery_document' },
    { title: 'CUSTOMER', key: 'customer', sortable: false },
    { title: 'PICKING STATUS', key: 'picking_status' },
    { title: 'GOODS ISSUE STATUS', key: 'goods_issue_status' },
    { title: 'DELIVERY ITEMS', key: 'delivery_items', align: 'center', sortable: false },
    { title: 'PALLET STATUS', key: 'pallet_status', align: 'center', sortable: false },
    { title: 'ACTION', key: 'action', align: 'center', sortable: false },
]

const getDeliveryPalletStatus = delivery => {
    const items = delivery.delivery_items ?? []
    if (items.length === 0) return { label: 'No Items', color: 'default' }

    const fullyReserved = items.filter(
        i => i.delivery_reserved_orders?.length > 0 &&
             parseInt(i.total_reserved_pallets) >= parseInt(i.delivery_quantity)
    ).length
    const hasAnyReserved = items.some(i => i.delivery_reserved_orders?.length > 0)

    if (fullyReserved === items.length) return { label: 'Reserved', color: 'success' }
    if (hasAnyReserved) return { label: 'Partial', color: 'info' }
    return { label: 'No Pallet', color: 'warning' }
}

const loadItems = ({ page, itemsPerPage, sortBy, search, plant_code }) => {
    if (!filters.value) return

    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0]
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key
    } else {
        sortQuery.value = '-created_at'
    }

    ApiService.query('datatable/sap-deliveries', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value,
            plant_code: plant_code !== undefined ? plant_code : filters.value?.plant_code,
        },
    })
        .then(response => {
            totalItems.value = response.data.total
            serverItems.value = response.data.data
            loading.value = false

            if (pendingDeliveryId.value !== null) {
                const refreshed = serverItems.value.find(d => d.id === pendingDeliveryId.value)
                if (refreshed) store.deliveryData = refreshed
                pendingDeliveryId.value = null
            }

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
        plant_code: data.plant_code,
    })
}

const actionList = [{ title: 'View Delivery Items', key: 'view_delivery_items' }]

const handleAction = (delivery, action) => {
    if (action.key === 'view_delivery_items') {
        store.deliveryData = delivery
        store.reset()
        currentView.value = 'items'
        showDeliveryItems.value = true
    }
}

const openBatchSelection = async item => {
    store.selectedDeliveryItem = item
    store.resetActiveTab()

    const params = {
        delivery_id: store.deliveryData?.id,
        material_code: item.material_number,
        delivery_document: store.deliveryData?.delivery_document,
        item_number: item.item_number,
        delivery_quantity: item.delivery_quantity,
        open_quantity: item.open_quantity,
        sales_unit: item.sales_unit,
        storage_location: item.storage_location,
        plant: item.plant,
        default_pallet_quantity: item.material_model?.default_pallet_quantity,
    }

    isLoading.value = true
    try {
        await store.checkAgeRange(params)
        await Promise.all([
            store.fetchAvailableCommodities(params),
            store.fetchOtherAvailableCommodities(params),
            store.fetchOpenQuantity(params),
        ])
        currentView.value = 'batch-selection'
    } catch (e) {
        console.error(e)
        toast.value = { message: 'Failed to load stock data. Please try again.', color: 'error', show: true }
    } finally {
        isLoading.value = false
    }
}

const backToDeliveryItems = () => {
    currentView.value = 'items'
    store.selectedDeliveryItem = null
}

const backToBatchSelection = () => {
    currentView.value = 'batch-selection'
}

const handleSelectPallets = () => {
    currentView.value = 'pallet-selection'
}

const handleReserveSuccess = () => {
    pendingDeliveryId.value = store.deliveryData?.id
    currentView.value = 'items'
    store.reset()
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search,
    })
}

const closeDialog = () => {
    showDeliveryItems.value = false
    currentView.value = 'items'
    store.reset()
    // loadItems({
    //     page: page.value,
    //     itemsPerPage: itemsPerPage.value,
    //     sortBy: [{ key: 'created_at', order: 'desc' }],
    //     search: props.search,
    // })
}

const expirationChecking = date => {
    const currentDate = Moment()
    const comparisonDate = Moment(date).format('YYYY-MM-DD')
    return currentDate.isAfter(comparisonDate)
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
            {{ item.delivery_document }}
        </template>

        <template #item.customer="{ item }">
            <div class="d-flex flex-column py-1">
                <span class="font-weight-medium">{{ item.ship_to_name }}</span>
                <span class="text-caption text-medium-emphasis">{{ item.ship_to_customer }}</span>
            </div>
        </template>

        <template #item.picking_status="{ item }">{{ item.picking_status }}</template>
        <template #item.goods_issue_status="{ item }">{{ item.goods_issue_status }}</template>
        <template #item.delivery_items="{ item }">{{ item.delivery_items.length }}</template>

        <template #item.pallet_status="{ item }">
            <v-chip
                size="small"
                :color="getDeliveryPalletStatus(item).color"
                variant="tonal"
                class="text-uppercase"
            >
                {{ getDeliveryPalletStatus(item).label }}
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

    <!-- Fullscreen Delivery Dialog -->
    <v-dialog v-model="showDeliveryItems" fullscreen :scrim="false" transition="dialog-bottom-transition">
        <v-card>

            <!-- View 1: Delivery Items -->
            <template v-if="currentView === 'items'">
                <v-toolbar color="white" border="b">
                    <v-toolbar-title class="text-h5 font-weight-bold">Delivery Details</v-toolbar-title>
                    <template #append>
                        <v-btn @click="closeDialog" color="secondary" variant="outlined" class="mr-2">
                            Close
                        </v-btn>
                    </template>
                </v-toolbar>

                <v-card-text>
                    <v-skeleton-loader v-if="isLoading" type="article" />
                    <div v-else>
                        <ShipmentData :delivery-data="store.deliveryData" />
                        <v-divider class="my-4 mx-5" />
                        <v-table class="mt-4 striped">
                            <thead>
                                <tr>
                                    <th>Item No.</th>
                                    <th>Material</th>
                                    <th class="text-center">Quantity</th>
                                    <th class="text-center">Storage Location</th>
                                    <th class="text-center">Picking</th>
                                    <th class="text-center">GI</th>
                                    <th class="text-center">Pallet Status</th>
                                    <th class="text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in store.deliveryData?.delivery_items" :key="index">
                                    <td>{{ item.item_number }}</td>
                                    <td>
                                        <div class="d-flex flex-column py-3">
                                            <span class="font-weight-bold">{{ item.material_number }}</span>
                                            <span>{{ item.material_description }}</span>
                                        </div>
                                    </td>
                                    <td class="text-center">{{ item.delivery_quantity }}</td>
                                    <td class="text-center">
                                        <div class="d-flex flex-column py-3">
                                            <span class="font-weight-bold">{{ item.plant }}</span>
                                            <span>{{ item.storage_location }}</span>
                                        </div>
                                    </td>
                                    <td class="text-center">{{ store.deliveryData?.picking_status }}</td>
                                    <td class="text-center">{{ store.deliveryData?.goods_issue_status }}</td>
                                    <td class="text-center">
                                        <v-badge
                                            v-if="!item.delivery_reserved_orders || item.delivery_reserved_orders.length === 0"
                                            color="warning"
                                            content="No Pallet"
                                            class="text-uppercase"
                                            inline
                                        />
                                        <v-badge
                                            v-else-if="parseInt(item.total_reserved_pallets) === parseInt(item.delivery_quantity)"
                                            color="success"
                                            content="Reserved"
                                            class="text-uppercase"
                                            inline
                                        />
                                        <div v-else class="d-flex flex-column py-3">
                                            <v-badge
                                                color="info"
                                                content="Partially Reserved"
                                                class="text-uppercase"
                                                inline
                                            />
                                            <span class="mt-1">
                                                {{ item.total_reserved_pallets }} out of
                                                {{ item.delivery_quantity }} {{ item.sales_unit }}(S)
                                            </span>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <v-btn
                                            @click="openBatchSelection(item)"
                                            color="primary-light"
                                            variant="outlined"
                                            size="small"
                                            :loading="isLoading && store.selectedDeliveryItem?.id === item.id"
                                        >
                                            Select Batch
                                        </v-btn>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-card-text>
            </template>

            <!-- View 2: Batch Selection -->
            <BatchSelection
                v-else-if="currentView === 'batch-selection'"
                @back="backToDeliveryItems"
                @select-pallets="handleSelectPallets"
            />

            <!-- View 3: Pallet Selection -->
            <PalletSelection
                v-else-if="currentView === 'pallet-selection'"
                @back="backToBatchSelection"
                @reserve-success="handleReserveSuccess"
            />

        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>
.selected-row {
    background-color: #e8f5e9;
}
</style>
