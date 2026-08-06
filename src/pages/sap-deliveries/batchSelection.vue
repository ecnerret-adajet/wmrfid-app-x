<script setup>
import DefaultModal from '@/components/DefaultModal.vue'
import Toast from '@/components/Toast.vue'
import { numberWithComma } from '@/composables/useHelpers'
import ApiService from '@/services/ApiService'
import { useSapDeliveryStore } from '@/stores/sapDeliveryStore'
import Moment from 'moment'
import { computed, reactive, ref } from 'vue'

const emit = defineEmits(['back', 'select-pallets', 'batch-exception-created'])

const store = useSapDeliveryStore()

const toast = ref({ message: '', color: 'success', show: false })
const showBatchExceptionModal = ref(false)
const createLoading = ref(false)

const createForm = reactive({
    application_request_type: 3,
    delivery_document: null,
    batches: [],
    line_item: null,
    customer_age_requirement: 'within',
    remarks: '',
})

const hasBatchException = computed(() => Boolean(store.selectedDeliveryItem?.batch_exception))

const batchExceptionRequestedBatches = computed(() => {
    const batchException = store.selectedDeliveryItem?.batch_exception

    if (!batchException) return []

    const rawBatches = Array.isArray(batchException)
        ? batchException
        : Array.isArray(batchException.batches)
            ? batchException.batches
            : batchException.batch
                ? [batchException.batch]
                : []

    return rawBatches
        .map(batch => {
            if (typeof batch === 'string' || typeof batch === 'number') return String(batch)

            return batch?.BATCH || batch?.batch || batch?.label || batch?.value || batch?.name || null
        })
        .filter(Boolean)
})

const availableBatchOptions = computed(() => {
    const batchSet = new Set(
        store.availableStocks
            .map(item => item.BATCH)
            .filter(Boolean),
    )

    return Array.from(batchSet).map(batch => ({
        title: batch,
        value: batch,
    }))
})

function removeLeadingZeros(value) {
    if (!value) return ''
    return value.replace(/^0+/, '')
}

const expirationChecking = date => {
    return Moment().isAfter(Moment(date).format('YYYY-MM-DD'))
}

const openBatchExceptionModal = () => {
    createForm.application_request_type = 3
    createForm.delivery_document = store.deliveryData?.delivery_document ?? null
    createForm.batches = []
    createForm.line_item = store.selectedDeliveryItem?.item_number ?? null
    createForm.customer_age_requirement = 'within'
    createForm.remarks = ''
    showBatchExceptionModal.value = true
}

const closeBatchExceptionModal = () => {
    showBatchExceptionModal.value = false
    createForm.batches = []
    createForm.remarks = ''
}

const createBatchExceptionRequest = async () => {
    toast.value.show = false

    if (createForm.batches.length === 0) {
        toast.value = { message: 'Please select at least one batch.', color: 'error', show: true }
        return
    }

    createForm.delivery_document = store.deliveryData?.delivery_document ?? null
    createForm.line_item = store.selectedDeliveryItem?.item_number ?? null

    if (!createForm.delivery_document || !createForm.line_item) {
        toast.value = { message: 'Missing delivery information for this request.', color: 'error', show: true }
        return
    }

    createLoading.value = true

    try {
        await ApiService.post('application-requests', {
            application_request_type: createForm.application_request_type,
            plant_code: store.selectedDeliveryItem?.plant ?? null,
            delivery_document: createForm.delivery_document,
            batches: createForm.batches,
            line_item: createForm.line_item,
            material_code: store.selectedDeliveryItem?.material_number ?? null,
            customer_age_requirement: createForm.customer_age_requirement,
            age_requirement_from: store.product_age?.from ?? null,
            age_requirement_to: store.product_age?.to ?? null,
            remarks: createForm.remarks,
        })

        toast.value = { message: 'Batch exception request created successfully.', color: 'success', show: true }
        closeBatchExceptionModal()
        emit('batch-exception-created')
    } catch (error) {
        console.error('Error creating batch exception request:', error)
        toast.value = {
            message: error.response?.data?.message || 'An error occurred while creating the batch exception request.',
            color: 'error',
            show: true,
        }
    } finally {
        createLoading.value = false
    }
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

    // const openQty = store.deliveryData?.open_quantity ?? store.selectedDeliveryItem?.open_quantity ?? 0
    // const totalBags = selectedBatchData.reduce((sum, b) => sum + Number(b.bags_quantity), 0)

    // if (totalBags > openQty) {
    //     toast.value = { message: 'Bags on selected pallets exceeds open quantity.', color: 'error', show: true }
    //     return
    // }

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
                    <div class="d-flex justify-end mb-3">
                        <v-btn
                            :color="store.selectedDeliveryItem?.batch_exception ? 'warning' : 'primary'"
                            :variant="store.selectedDeliveryItem?.batch_exception ? 'flat' : 'outlined'"
                            :disabled="availableBatchOptions.length === 0"
                            @click="openBatchExceptionModal"
                        >
                            {{ store.selectedDeliveryItem?.batch_exception ? 'Has Batch Exception' : 'Request Batch Exception' }}
                        </v-btn>
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
                                v-for="(item, i) in store.availableStocks"
                                :key="i"
                                :class="{
                                    'selected-row': item.is_selected,
                                    // 'bg-grey-100 opacity-20': item.inventory.length === 0,
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
                                    // 'bg-grey-100 opacity-20': item.inventory.length === 0
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

    <DefaultModal
        :show="showBatchExceptionModal"
        :dialog-title="hasBatchException ? 'Batch Exception Applied' : 'Request Batch Exception'"
        max-width="700px"
        min-height="auto"
        @close="closeBatchExceptionModal"
    >
        <template v-if="hasBatchException">
            <v-alert type="warning" variant="tonal" class="mb-4">
                This delivery item already has a batch exception applied.
            </v-alert>

            <v-text-field
                label="Delivery Document"
                density="compact"
                :model-value="store.deliveryData?.delivery_document ?? null"
                readonly
            />

            <v-text-field
                class="mt-4"
                label="Delivery Item"
                density="compact"
                :model-value="store.selectedDeliveryItem?.item_number ?? null"
                readonly
            />

            <div class="mt-4">
                <div class="text-subtitle-1 font-weight-medium mb-2">Requested Batch(es)</div>
                <div v-if="batchExceptionRequestedBatches.length > 0" class="d-flex flex-wrap ga-2">
                    <v-chip
                        v-for="batch in batchExceptionRequestedBatches"
                        :key="batch"
                        color="warning"
                        variant="tonal"
                    >
                        {{ batch }}
                    </v-chip>
                </div>
                <div v-else class="text-medium-emphasis">
                    No batch list is available for this batch exception.
                </div>
            </div>

            <div class="d-flex justify-end mt-6">
                <v-btn color="secondary" variant="outlined" @click="closeBatchExceptionModal">
                    Close
                </v-btn>
            </div>
        </template>

        <v-form v-else @submit.prevent="createBatchExceptionRequest">
            <v-autocomplete
                v-model="createForm.batches"
                label="Requested Batch(es)"
                density="compact"
                :items="availableBatchOptions"
                item-title="title"
                item-value="value"
                chips
                clearable
                multiple
            />

            <v-text-field
                class="mt-4"
                label="Delivery Document"
                density="compact"
                :model-value="createForm.delivery_document"
                readonly
            />

            <v-textarea
                class="mt-4"
                v-model="createForm.remarks"
                label="Remarks (Optional)"
                density="compact"
                rows="3"
                clearable
            />

            <div class="d-flex justify-end mt-6">
                <v-btn class="mr-3" color="secondary" variant="outlined" @click="closeBatchExceptionModal">
                    Cancel
                </v-btn>
                <v-btn color="primary" :loading="createLoading" @click="createBatchExceptionRequest">
                    Submit Request
                </v-btn>
            </div>
        </v-form>
    </DefaultModal>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>
.selected-row {
    background-color: #e8f5e9;
}
</style>
