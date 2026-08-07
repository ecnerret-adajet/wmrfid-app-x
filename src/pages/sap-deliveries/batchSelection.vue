<script setup>
import DefaultModal from '@/components/DefaultModal.vue'
import Toast from '@/components/Toast.vue'
import { numberWithComma } from '@/composables/useHelpers'
import ApiService from '@/services/ApiService'
import { useSapDeliveryStore } from '@/stores/sapDeliveryStore'
import Moment from 'moment'
import { computed, reactive, ref, watch } from 'vue'

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
    customer_approval_file: null,
    remarks: '',
})

const normalizeStatusId = status => {
    if (status === null || status === undefined || status === '') return null

    const numericStatus = Number(status)
    if (!Number.isNaN(numericStatus)) return numericStatus

    const normalizedStatus = String(status).trim().toLowerCase()

    if (['approved', 'applied'].includes(normalizedStatus)) return 1
    if (['pending', 'for approval'].includes(normalizedStatus)) return 2
    if (normalizedStatus === 'rejected') return 3
    if (normalizedStatus === 'cancelled') return 4

    return null
}

const toArray = value => {
    if (Array.isArray(value)) return value
    return value ? [value] : []
}

const batchExceptionRequestCandidates = computed(() => {
    const item = store.selectedDeliveryItem ?? {}
    return [
        ...toArray(item.batch_exception),
    ]
})

const pendingBatchExceptionRequest = computed(() => {
    return batchExceptionRequestCandidates.value.find(request => {
        const statusId = normalizeStatusId(request?.status)
        return statusId === 2
    }) || null
})

const batchExceptionStatus = computed(() => {
    const batchException = store.selectedDeliveryItem?.batch_exception

    if (!batchException) return 'requestable'
    console.log('batch exception: ', batchException)
    const statusId = normalizeStatusId(
        batchException.status
        ?? batchException.application_request?.status_id
    )

    console.log('status id', statusId)

    if (statusId === 2) return 'pending'
    if (statusId === 3) return 'rejected'
    if (statusId === 4) return 'requestable'

    return 'applied'
})

const hasBatchException = computed(() => batchExceptionStatus.value === 'applied')
const hasPendingBatchExceptionRequest = computed(() => batchExceptionStatus.value === 'pending')
const hasRejectedBatchExceptionRequest = computed(() => batchExceptionStatus.value === 'rejected')
const isBatchExceptionRequestable = computed(() => batchExceptionStatus.value === 'requestable')
const canCreateBatchExceptionRequest = computed(() => {
    return isBatchExceptionRequestable.value || hasRejectedBatchExceptionRequest.value
})
const isOtherStocksTab = computed(() => store.activeTab === 'other_stocks')

const visibleBatchExceptionStatus = computed(() => {
    if (hasBatchException.value) return 'applied'
    if (hasPendingBatchExceptionRequest.value) return 'pending'
    if (hasRejectedBatchExceptionRequest.value) return 'rejected'
    return 'requestable'
})

const isVisibleBatchExceptionRequestable = computed(() => canCreateBatchExceptionRequest.value)
const showPendingBatchExceptionState = computed(() => visibleBatchExceptionStatus.value === 'pending')
const showAppliedBatchExceptionState = computed(() => visibleBatchExceptionStatus.value === 'applied')
const showRejectedBatchExceptionState = computed(() => visibleBatchExceptionStatus.value === 'rejected')

const batchExceptionRecord = computed(() => {
    if (pendingBatchExceptionRequest.value) return pendingBatchExceptionRequest.value
    return store.selectedDeliveryItem?.batch_exception ?? null
})

const batchExceptionType = computed(() => {
    const record = batchExceptionRecord.value
    return  record?.exception_type || null
})

const lockedBatchExceptionTab = computed(() => {
    if (!batchExceptionType.value || canCreateBatchExceptionRequest.value) return null
    return batchExceptionType.value === 'within_age_requirement'
        ? 'available_stocks'
        : 'other_stocks'
})

const isAvailableStocksLocked = computed(() => lockedBatchExceptionTab.value === 'other_stocks')
const isOtherStocksLocked = computed(() => lockedBatchExceptionTab.value === 'available_stocks')

const batchExceptionRequestedBatches = computed(() => {
    const batchException = batchExceptionRecord.value

    if (!batchException) return []

    const rawBatches = Array.isArray(batchException)
        ? batchException
        : Array.isArray(batchException.batches)
            ? batchException.batches
            : Array.isArray(batchException.requested_batches)
                ? batchException.requested_batches
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

const batchExceptionRequestedBatchSet = computed(() => new Set(batchExceptionRequestedBatches.value))

const shouldFilterStocksByBatchException = computed(() => {
    return Boolean(lockedBatchExceptionTab.value) && batchExceptionRequestedBatchSet.value.size > 0
})

const filteredAvailableStocks = computed(() => {
    if (!shouldFilterStocksByBatchException.value || lockedBatchExceptionTab.value !== 'available_stocks') {
        return store.availableStocks
    }

    return store.availableStocks.filter(item => batchExceptionRequestedBatchSet.value.has(item.BATCH))
})

const filteredOtherStocks = computed(() => {
    if (showRejectedBatchExceptionState.value) {
        console.log('showing all other stocks because batch exception is rejected')
        return store.otherStocks
    }
    if (!shouldFilterStocksByBatchException.value || lockedBatchExceptionTab.value !== 'other_stocks') {
        return store.otherStocks
    }
   
    return store.otherStocks.filter(item => batchExceptionRequestedBatchSet.value.has(item.BATCH))
})

const batchExceptionRemarks = computed(() => {
    return batchExceptionRecord.value?.remarks
        || batchExceptionRecord.value?.customer_approval_remarks
        || batchExceptionRecord.value?.application_request?.remarks
        || ''
})

const batchExceptionCustomerApprovalName = computed(() => {
    const record = batchExceptionRecord.value

    return record?.original_filename || null
})

const batchExceptionCustomerApprovalUrl = computed(() => {
    const record = batchExceptionRecord.value

    return record?.customer_approval_file_url || null
})

const batchExceptionProcessedStatusId = computed(() => {
    return normalizeStatusId(
        batchExceptionRecord.value?.status_id
        ?? batchExceptionRecord.value?.status
        ?? batchExceptionRecord.value?.application_request?.status_id
        ?? batchExceptionRecord.value?.application_request?.status,
    )
})

const batchExceptionApproverName = computed(() => {
    const record = batchExceptionRecord.value

    return record?.approver?.name
        || record?.approved_by?.name
        || record?.application_request?.approver?.name
        || record?.application_request?.approved_by?.name
        || record?.approver_name
        || record?.application_request?.approver_name
        || ''
})

const batchExceptionApproverRemarks = computed(() => {
    const record = batchExceptionRecord.value

    return record?.approver_remarks
        || record?.approval_remarks
        || record?.application_request?.approver_remarks
        || record?.application_request?.approval_remarks
        || ''
})

const showBatchExceptionProcessedDetails = computed(() => {
    return batchExceptionProcessedStatusId.value !== null && batchExceptionProcessedStatusId.value !== 2
})

const buildBatchOptions = stocks => {
    const batchSet = new Set(
        stocks
            .map(item => item.BATCH)
            .filter(Boolean),
    )

    return Array.from(batchSet).map(batch => ({
        title: batch,
        value: batch,
    }))
}

const availableBatchOptions = computed(() => buildBatchOptions(filteredAvailableStocks.value))
const otherBatchOptions = computed(() => buildBatchOptions(filteredOtherStocks.value))
const requestBatchOptions = computed(() => {
    return store.activeTab === 'other_stocks' ? otherBatchOptions.value : availableBatchOptions.value
})

const batchExceptionButtonLabel = computed(() => {
    console.log(showAppliedBatchExceptionState.value, showPendingBatchExceptionState.value, showRejectedBatchExceptionState.value)
    if (showPendingBatchExceptionState.value) return 'Pending Batch Exception Request'
    if (showRejectedBatchExceptionState.value) return 'Rejected Batch Exception Request'
    if (showAppliedBatchExceptionState.value) return 'Has Batch Exception'
    return 'Request Batch Exception'
})

const batchExceptionButtonColor = computed(() => {
    if (showAppliedBatchExceptionState.value) return 'warning'
    if (showPendingBatchExceptionState.value) return 'secondary'
    if (showRejectedBatchExceptionState.value) return 'error'
    return 'primary'
})

const batchExceptionButtonVariant = computed(() => {
    if (showAppliedBatchExceptionState.value) return 'flat'
    if (showPendingBatchExceptionState.value) return 'tonal'
    if (showRejectedBatchExceptionState.value) return 'tonal'
    return 'outlined'
})

const disableBatchExceptionAction = computed(() => {
    if (!canCreateBatchExceptionRequest.value) return false
    return requestBatchOptions.value.length === 0
})

const disableSelectPalletsAction = computed(() => {
    if (store.activeTab !== 'other_stocks') return false
    return !hasBatchException.value
})

const batchExceptionModalTitle = computed(() => {
    if (showAppliedBatchExceptionState.value) return 'Batch Exception Applied'
    if (showPendingBatchExceptionState.value) return 'Pending Batch Exception Request'
    if (showRejectedBatchExceptionState.value) return 'Rejected Batch Exception Request'
    return 'Request Batch Exception'
})

const batchExceptionAlertType = computed(() => {
    if (showAppliedBatchExceptionState.value) return 'warning'
    if (showPendingBatchExceptionState.value) return 'info'
    if (showRejectedBatchExceptionState.value) return 'error'
    return 'info'
})

const batchExceptionAlertMessage = computed(() => {
    if (showAppliedBatchExceptionState.value) return 'This delivery item already has a batch exception applied.'
    if (showPendingBatchExceptionState.value) return 'This delivery item already has a pending batch exception request.'
    if (showRejectedBatchExceptionState.value) return 'This delivery item has a rejected batch exception request.'
    return ''
})

const normalizedCustomerApprovalDocument = computed(() => {
    if (Array.isArray(createForm.customer_approval_file)) return createForm.customer_approval_file[0] ?? null
    return createForm.customer_approval_file ?? null
})

function removeLeadingZeros(value) {
    if (!value) return ''
    return value.replace(/^0+/, '')
}

const expirationChecking = date => {
    return Moment().isAfter(Moment(date).format('YYYY-MM-DD'))
}

watch(lockedBatchExceptionTab, lockedTab => {
    if (lockedTab && store.activeTab !== lockedTab) {
        store.activeTab = lockedTab
    }
}, { immediate: true })

watch([
    () => store.activeTab,
    batchExceptionRemarks,
], ([activeTab, remarks]) => {
    if (activeTab !== 'other_stocks') return
    if (store.customerApprovalRemarks) return
    if (!remarks) return

    store.customerApprovalRemarks = remarks
}, { immediate: true })

const openBatchExceptionModal = () => {
    createForm.application_request_type = 3
    createForm.delivery_document = store.deliveryData?.delivery_document ?? null
    createForm.batches = []
    createForm.line_item = store.selectedDeliveryItem?.item_number ?? null
    createForm.customer_age_requirement = 'within'
    createForm.customer_approval_file = null
    createForm.remarks = ''
    showBatchExceptionModal.value = true
}

const closeBatchExceptionModal = () => {
    showBatchExceptionModal.value = false
    createForm.batches = []
    createForm.customer_approval_file = null
    createForm.remarks = ''
}

const createBatchExceptionRequest = async () => {
    toast.value.show = false

    if (createForm.batches.length === 0) {
        toast.value = { message: 'Please select at least one batch.', color: 'error', show: true }
        return
    }

    if (store.activeTab === 'other_stocks' && !normalizedCustomerApprovalDocument.value) {
        toast.value = { message: 'Please attach the customer approval document.', color: 'error', show: true }
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
        const formData = new FormData()

        formData.append('application_request_type', String(createForm.application_request_type))
        formData.append('plant_code', store.selectedDeliveryItem?.plant ?? '')
        formData.append('delivery_document', createForm.delivery_document)
        createForm.batches.forEach((batch) => {
            formData.append('batches[]', batch);
        });
        formData.append('line_item', String(createForm.line_item))
        formData.append('material_code', store.selectedDeliveryItem?.material_number ?? '')

        formData.append('customer_age_requirement',  store.activeTab === 'available_stocks' ? 'within' : 'outside')
        formData.append('age_requirement_from', store.product_age?.from ?? '')
        formData.append('age_requirement_to', store.product_age?.to ?? '')
        formData.append('remarks', createForm.remarks ?? '')
        formData.append('mode', store.activeTab)

        if (normalizedCustomerApprovalDocument.value) {
            formData.append('customer_approval_file', normalizedCustomerApprovalDocument.value)
        }

        await ApiService.post('application-requests', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
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
        store.customerApprovalFile = null
        store.customerApprovalFileName = ''
        store.customerApprovalFileUrl = ''
        store.customerApprovalRemarks = ''
        selectedBatchData = store.availableStocks
            .filter(s => s.is_selected)
            .map(s => ({ BATCH: s.BATCH, pallet_quantity: s.split_qty_pallets, bags_quantity: s.split_qty_bag }))
    } else {
        if (!hasBatchException.value) {
            toast.value = { message: 'Batch exception approval is required before selecting pallets from other stocks.', color: 'error', show: true }
            return
        }

        const hasExistingApproval = Boolean(batchExceptionCustomerApprovalName.value || batchExceptionCustomerApprovalUrl.value)

        if (!store.customerApprovalFile && !hasExistingApproval) {
            toast.value = { message: 'Please select customer approval document.', color: 'error', show: true }
            return
        }

        if (!store.customerApprovalRemarks && batchExceptionRemarks.value) {
            store.customerApprovalRemarks = batchExceptionRemarks.value
        }

        if (!store.customerApprovalFile && hasExistingApproval) {
            store.customerApprovalFileName = batchExceptionCustomerApprovalName.value ?? ''
            store.customerApprovalFileUrl = batchExceptionCustomerApprovalUrl.value ?? ''
        } else if (store.customerApprovalFile) {
            store.customerApprovalFileName = store.customerApprovalFile?.name ?? ''
            store.customerApprovalFileUrl = ''
        }

        const selectableStocks = filteredOtherStocks.value.filter(s => s.is_selected)
        const visibleStocks = filteredOtherStocks.value

        selectedBatchData = (selectableStocks.length > 0 ? selectableStocks : visibleStocks)
            .map(s => ({ BATCH: s.BATCH, pallet_quantity: s.split_qty_pallets, bags_quantity: s.split_qty_bag }))
    }

    if (selectedBatchData.length === 0) {
        toast.value = { message: store.activeTab === 'other_stocks' ? 'No batches available for this batch exception.' : 'No selected batches.', color: 'error', show: true }
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
            <v-btn @click="selectPallets" color="primary" class="mr-4" :disabled="disableSelectPalletsAction">
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
                <v-tab :disabled="isAvailableStocksLocked" value="available_stocks" class="text-h6">Available Stocks</v-tab>
                <v-tab :disabled="isOtherStocksLocked" value="other_stocks" class="text-h6">Other Stocks</v-tab>
            </v-tabs>

            <v-skeleton-loader v-if="store.loadingStocks" type="table" />
            <v-tabs-window v-else v-model="store.activeTab">

                <!-- Available Stocks tab -->
                <v-tabs-window-item value="available_stocks">
                    <div class="d-flex justify-end mb-3">
                        <v-btn
                            :color="batchExceptionButtonColor"
                            :variant="batchExceptionButtonVariant"
                            :disabled="disableBatchExceptionAction"
                            @click="openBatchExceptionModal"
                        >
                            {{ batchExceptionButtonLabel }}
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
                                v-for="(item, i) in filteredAvailableStocks"
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
                    <div class="d-flex justify-end mb-3">
                        <v-btn
                            :color="batchExceptionButtonColor"
                            :variant="batchExceptionButtonVariant"
                            :disabled="disableBatchExceptionAction"
                            @click="openBatchExceptionModal"
                        >
                            {{ batchExceptionButtonLabel }}
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
                                <th v-if="hasBatchException">Split Qty</th>
                                <th v-if="hasBatchException">Min. Pallet</th>
                                <th v-if="hasBatchException">Remaining Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody v-if="filteredOtherStocks.length > 0">
                            <tr
                                v-for="(item, i) in filteredOtherStocks"
                                :key="i"
                                :class="{
                                    'selected-row': hasBatchException && item.is_selected,
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
                                <td v-if="hasBatchException">{{ numberWithComma(item.split_qty_bag) }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td v-if="hasBatchException" :class="{ 'text-error': item.saved_reserved != null }">
                                    {{ item.split_qty_pallets }} PALLET
                                </td>
                                <td v-if="hasBatchException">{{ item.inventory_qty }} {{ store.selectedDeliveryItem?.sales_unit }}</td>
                                <td>
                                    <v-checkbox
                                        v-if="hasBatchException"
                                        v-model="item.is_selected"
                                        hide-details
                                        density="compact"
                                    />
                                </td>
                            </tr>
                        </tbody>
                        <tbody v-else>
                            <tr>
                                <td colspan="10" class="text-medium-emphasis text-center py-4">No batches available.</td>
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
        :dialog-title="batchExceptionModalTitle"
        max-width="700px"
        min-height="auto"
        @close="closeBatchExceptionModal"
    >
        <template v-if="!isVisibleBatchExceptionRequestable">
            <v-alert :type="batchExceptionAlertType" variant="tonal" class="mb-4">
                {{ batchExceptionAlertMessage }}
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

            <v-textarea
                v-if="batchExceptionRemarks"
                class="mt-4"
                label="Remarks"
                density="compact"
                :model-value="batchExceptionRemarks"
                rows="3"
                readonly
            />

            <v-text-field
                v-if="showBatchExceptionProcessedDetails && batchExceptionApproverName"
                class="mt-4"
                label="Approver"
                density="compact"
                :model-value="batchExceptionApproverName"
                readonly
            />

            <v-textarea
                v-if="showBatchExceptionProcessedDetails && batchExceptionApproverRemarks"
                class="mt-4"
                label="Approver Remarks"
                density="compact"
                :model-value="batchExceptionApproverRemarks"
                rows="3"
                readonly
            />

            <v-text-field
                v-if="batchExceptionCustomerApprovalName && !store.selectedDeliveryItem?.batch_exception?.customer_approval_file_url"
                class="mt-4"
                label="Customer Approval"
                density="compact"
                :model-value="batchExceptionCustomerApprovalName"
                readonly
            />

            <div v-else class="mt-4">
                <div v-if="store.activeTab === 'other_stocks'" class="text-subtitle-1 font-weight-medium mb-2">Customer Approval</div>
                <a v-if="store.activeTab === 'other_stocks'" :href="store.selectedDeliveryItem?.batch_exception?.customer_approval_file_url" target="_blank" class="file-link">
                    📎 {{ store.selectedDeliveryItem?.batch_exception?.original_filename }}
                </a>
            </div>

            <div class="d-flex justify-end mt-6">
                <v-btn color="secondary" variant="outlined" @click="closeBatchExceptionModal">
                    Close
                </v-btn>
            </div>
        </template>

        <v-form v-else @submit.prevent="createBatchExceptionRequest">
            <template v-if="showRejectedBatchExceptionState">
                <v-alert :type="batchExceptionAlertType" variant="tonal" class="mb-4">
                    {{ batchExceptionAlertMessage }}
                </v-alert>

                <v-text-field
                    label="Previous Delivery Document"
                    density="compact"
                    :model-value="store.deliveryData?.delivery_document ?? null"
                    readonly
                />

                <v-text-field
                    class="mt-4"
                    label="Previous Delivery Item"
                    density="compact"
                    :model-value="store.selectedDeliveryItem?.item_number ?? null"
                    readonly
                />

                <div class="mt-4">
                    <div class="text-subtitle-1 font-weight-medium mb-2">Previous Requested Batch(es)</div>
                    <div v-if="batchExceptionRequestedBatches.length > 0" class="d-flex flex-wrap ga-2">
                        <v-chip
                            v-for="batch in batchExceptionRequestedBatches"
                            :key="batch"
                            color="error"
                            variant="tonal"
                        >
                            {{ batch }}
                        </v-chip>
                    </div>
                    <div v-else class="text-medium-emphasis">
                        No batch list is available for this rejected batch exception.
                    </div>
                </div>

                <v-textarea
                    v-if="batchExceptionRemarks"
                    class="mt-4"
                    label="Previous Remarks"
                    density="compact"
                    :model-value="batchExceptionRemarks"
                    rows="3"
                    readonly
                />

                <v-text-field
                    v-if="batchExceptionApproverName"
                    class="mt-4"
                    label="Approver"
                    density="compact"
                    :model-value="batchExceptionApproverName"
                    readonly
                />

                <v-textarea
                    v-if="batchExceptionApproverRemarks"
                    class="mt-4"
                    label="Approver Remarks"
                    density="compact"
                    :model-value="batchExceptionApproverRemarks"
                    rows="3"
                    readonly
                />

                <v-text-field
                    v-if="batchExceptionCustomerApprovalName && !batchExceptionCustomerApprovalUrl"
                    class="mt-4"
                    label="Previous Customer Approval"
                    density="compact"
                    :model-value="batchExceptionCustomerApprovalName"
                    readonly
                />

                <div v-else-if="batchExceptionCustomerApprovalUrl" class="mt-4">
                    <div class="text-subtitle-1 font-weight-medium mb-2">Previous Customer Approval</div>
                    <a :href="batchExceptionCustomerApprovalUrl" target="_blank" class="file-link">
                        📎 {{ batchExceptionCustomerApprovalName }}
                    </a>
                </div>

                <v-divider class="my-4" />
            </template>

            <v-autocomplete
                v-model="createForm.batches"
                label="Requested Batch(es)"
                density="compact"
                :items="requestBatchOptions"
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

            <v-file-input
                class="mt-4"
                v-if="store.activeTab === 'other_stocks'"
                v-model="createForm.customer_approval_file"
                label="Customer Approval"
                density="compact"
                accept="image/*,application/pdf"
                prepend-icon=""
                clearable
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

.file-link {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.file-link:hover {
    text-decoration: underline;
}
</style>
