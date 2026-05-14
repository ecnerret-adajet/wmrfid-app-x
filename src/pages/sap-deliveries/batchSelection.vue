<script setup>
import Toast from '@/components/Toast.vue'
import { numberWithComma } from '@/composables/useHelpers'
import { useSapDeliveryStore } from '@/stores/sapDeliveryStore'
import Moment from 'moment'
import { ref } from 'vue'

const emit = defineEmits(['back', 'select-pallets'])

const store = useSapDeliveryStore()

const toast = ref({ message: '', color: 'success', show: false })

function removeLeadingZeros(value) {
    if (!value) return ''
    return value.replace(/^0+/, '')
}

const expirationChecking = date => {
    return Moment().isAfter(Moment(date).format('YYYY-MM-DD'))
}

const selectPallets = () => {
    toast.value.show = false

    let selectedBatchData = []

    if (store.activeTab === 'available_stocks') {
        selectedBatchData = store.availableStocks
            .filter(s => s.is_selected)
            .map(s => ({ BATCH: s.BATCH, pallet_quantity: s.split_qty_pallets, bags_quantity: s.split_qty_bag }))
    } else {
        if (!store.customerApprovalFile) {
            toast.value = { message: 'Please select customer approval document.', color: 'error', show: true }
            return
        }
        selectedBatchData = store.otherStocks
            .filter(s => s.is_selected)
            .map(s => ({ BATCH: s.BATCH, pallet_quantity: s.split_qty_pallets, bags_quantity: s.split_qty_bag }))
    }

    if (selectedBatchData.length === 0) {
        toast.value = { message: 'No selected batches.', color: 'error', show: true }
        return
    }

    const openQty = store.deliveryData?.open_quantity ?? store.selectedDeliveryItem?.open_quantity ?? 0
    const totalBags = selectedBatchData.reduce((sum, b) => sum + Number(b.bags_quantity), 0)

    if (totalBags > openQty) {
        toast.value = { message: 'Bags on selected pallets exceeds open quantity.', color: 'error', show: true }
        return
    }

    store.setBatches(selectedBatchData)
    store.setOriginalBatchList(selectedBatchData)
    emit('select-pallets')
}
</script>

<template>
    <v-toolbar color="white" border="b">
        <v-toolbar-title class="text-h5 font-weight-bold text-primary">Batch Selection</v-toolbar-title>
        <template #append>
            <v-btn @click="emit('back')" color="secondary" variant="outlined" class="mr-2">
                Back To Delivery Items
            </v-btn>
            <v-btn @click="selectPallets" color="primary" class="mr-4">
                Select Pallets
            </v-btn>
        </template>
    </v-toolbar>

    <v-container fluid class="pa-4">

        <!-- Delivery Info -->
        <VList lines="one" density="compact" class="mb-2">
            <VListItem style="padding-top: 0; padding-bottom: 0">
                <VRow no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Number</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-medium-emphasis">{{ store.deliveryData?.delivery_document }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Item No.</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-medium-emphasis">{{ store.selectedDeliveryItem?.item_number }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
            <VListItem style="padding-top: 4px; padding-bottom: 0">
                <VRow no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Party</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{ store.deliveryData?.ship_to_name }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ store.deliveryData?.ship_to_customer }}</div>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{ store.selectedDeliveryItem?.material_description }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ removeLeadingZeros(store.selectedDeliveryItem?.material_number) }}</div>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
            <VListItem style="padding-top: 0; padding-bottom: 0">
                <VRow no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Plant</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="text-medium-emphasis">{{ store.selectedDeliveryItem?.plant }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Storage Location</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="text-medium-emphasis">{{ store.selectedDeliveryItem?.storage_location }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
            <VListItem style="padding-top: 0; padding-bottom: 0">
                <VRow no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Required Quantity</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="text-medium-emphasis">{{ store.selectedDeliveryItem?.delivery_quantity }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Age</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="text-medium-emphasis">{{ store.product_age?.from }} - {{ store.product_age?.to }} Days</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
            <VListItem style="padding-top: 0; padding-bottom: 0">
                <VRow no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="text-medium-emphasis">
                                    {{ store.deliveryData?.open_quantity ?? store.selectedDeliveryItem?.open_quantity }}
                                    {{ store.selectedDeliveryItem?.sales_unit }}(S)
                                </span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
        </VList>

        <v-divider class="mb-4" />

        <!-- Stock tables (only when open_quantity > 0) -->
        <div v-if="parseInt(store.deliveryData?.open_quantity ?? store.selectedDeliveryItem?.open_quantity) > 0">
            <v-tabs v-model="store.activeTab" bg-color="transparent" variant="tonal" class="mb-4">
                <v-tab value="available_stocks" class="text-h6">Available Stocks</v-tab>
                <v-tab value="other_stocks" class="text-h6">Other Stocks</v-tab>
            </v-tabs>

            <v-skeleton-loader v-if="store.loadingStocks" type="table" />
            <v-tabs-window v-else v-model="store.activeTab">

                <!-- Available Stocks tab -->
                <v-tabs-window-item value="available_stocks">
                    <v-table density="compact" class="border">
                        <thead>
                            <tr>
                                <th>Batch Code</th>
                                <th>Mfg Date</th>
                                <th>Expiration Date</th>
                                <th>Age</th>
                                <th>Avail. Qty</th>
                                <th>Avail Pallets</th>
                                <th>Split Qty</th>
                                <th>Min. Pallet</th>
                                <th>Remaining Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, i) in store.availableStocks"
                                :key="i"
                                :class="{
                                    'selected-row': item.is_selected,
                                    'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0,
                                }"
                            >
                                <td>{{ item.BATCH }}</td>
                                <td>{{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}</td>
                                <td :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
                                    {{ item.SLED_STR }}
                                </td>
                                <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                <td>{{ numberWithComma(item.BAG) }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td>{{ item.inventory.length }} PALLET</td>
                                <td>{{ numberWithComma(item.split_qty_bag) }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td :class="{ 'text-error': item.saved_reserved != null }">
                                    {{ item.split_qty_pallets }} PALLET
                                </td>
                                <td>{{ item.inventory_qty }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td>
                                    <v-checkbox
                                        v-model="item.is_selected"
                                        hide-details
                                        density="compact"
                                        :disabled="item.inventory.length === 0 || expirationChecking(item.SLED_STR) || item.split_qty_bag === 0"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-tabs-window-item>

                <!-- Other Stocks tab -->
                <v-tabs-window-item value="other_stocks">
                    <div class="border pa-4 rounded mb-4">
                        <div class="text-subtitle-1 font-weight-medium mb-2">Customer Approval Document</div>
                        <v-file-input
                            accept="image/*,application/pdf"
                            v-model="store.customerApprovalFile"
                            density="compact"
                            prepend-icon=""
                            label="Choose file"
                        />
                        <div class="text-subtitle-1 font-weight-medium mt-4">Remarks</div>
                        <v-textarea
                            class="mt-1"
                            clear-icon="ri-close-line"
                            placeholder="Remarks/Comments"
                            v-model="store.customerApprovalRemarks"
                            clearable
                        />
                    </div>
                    <v-table density="compact" class="border">
                        <thead>
                            <tr>
                                <th>Batch Code</th>
                                <th>Mfg Date</th>
                                <th>Expiration Date</th>
                                <th>Age</th>
                                <th>Avail. Qty</th>
                                <th>Avail Pallets</th>
                                <th>Split Qty</th>
                                <th>Min. Pallet</th>
                                <th>Remaining Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, i) in store.otherStocks"
                                :key="i"
                                :class="{
                                    'selected-row': item.is_selected,
                                    'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0,
                                }"
                            >
                                <td>{{ item.BATCH }}</td>
                                <td>{{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}</td>
                                <td :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
                                    {{ item.SLED_STR }}
                                </td>
                                <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                <td>{{ numberWithComma(item.BAG) }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td>{{ item.inventory.length }} PALLET</td>
                                <td>{{ numberWithComma(item.split_qty_bag) }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td :class="{ 'text-error': item.saved_reserved != null }">
                                    {{ item.split_qty_pallets }} PALLET
                                </td>
                                <td>{{ item.inventory_qty }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td>
                                    <v-checkbox
                                        v-model="item.is_selected"
                                        hide-details
                                        density="compact"
                                        :disabled="item.inventory.length === 0 || item.split_qty_bag === 0"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-tabs-window-item>

            </v-tabs-window>
        </div>

        <div v-else class="d-flex justify-center align-center" style="height: 100px">
            <span class="text-h3 text-primary">Reserved</span>
        </div>

    </v-container>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>
.selected-row {
    background-color: #e8f5e9;
}
</style>
