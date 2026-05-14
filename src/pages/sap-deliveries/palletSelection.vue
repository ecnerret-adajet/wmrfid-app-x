<script setup>
import Toast from '@/components/Toast.vue'
import WarehouseMap from '@/pages/batch-picking/warehouseMap.vue'
import JwtService from '@/services/JwtService'
import { useSapDeliveryStore } from '@/stores/sapDeliveryStore'
import axios from 'axios'
import moment from 'moment'
import { computed, ref } from 'vue'

const emit = defineEmits(['back', 'reserve-success'])

const store = useSapDeliveryStore()

const toast = ref({ message: '', color: 'success', show: false })

function removeLeadingZeros(value) {
    if (!value) return ''
    return value.replace(/^0+/, '')
}

// ─── Batch Filter Chips ───────────────────────────────────────────────────────

const selectedBatch = ref(null)

const computedBatchList = computed(() =>
    store.originalBatchList.map(batch => ({
        ...batch,
        pallet_quantity: batch.pallet_quantity - parentSelectedPallets.value.filter(p => p.batch === batch.BATCH).length,
    }))
)

function batchSelected(batch) {
    selectedBatch.value = batch
    store.setBatches(batch === null ? store.originalBatchList : [batch])
}

// ─── Pallet Selection (from Warehouse Map) ────────────────────────────────────

const parentSelectedPallets = ref([])

const handleSelectedPalletsUpdate = pallets => {
    parentSelectedPallets.value = [...pallets].sort((a, b) => new Date(a.mfg_date) - new Date(b.mfg_date))
}

const distributedPallets = computed(() => {
    let remaining = store.selectedDeliveryItem?.open_quantity ?? 0
    return parentSelectedPallets.value.map(item => {
        const take = Math.min(item.quantity || 0, remaining)
        remaining -= take
        return { ...item, take_quantity: take }
    })
})

const calculateAge = date => (date ? moment().diff(moment(date), 'days') : '')

const removeSelectedPallet = (item, index) => {
    toast.value.show = false
    parentSelectedPallets.value.splice(index, 1)
    toast.value = { message: `PHYSICAL ID ${item.physical_id} removed from selected pallets.`, color: 'warning', show: true }
}

// ─── Reserved Pallets ─────────────────────────────────────────────────────────

const viewReservedPallets = ref(false)

// ─── Cancel Reservation ───────────────────────────────────────────────────────

const cancelProposalLoading = ref(false)
const cancelConfirmationModal = ref(false)

const cancelProposal = async () => {
    try {
        cancelProposalLoading.value = true
        const token = JwtService.getToken()
        const { data } = await axios.post('deliveries/delivery-order-remove', {
            delivery_id: store.deliveryData?.id,
            delivery_document: store.deliveryData?.delivery_document,
            delivery_item_number: store.selectedDeliveryItem?.item_number,
            plant: store.selectedDeliveryItem?.plant,
            storage_location: store.selectedDeliveryItem?.storage_location,
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })

        if (data.success) {
            toast.value = { message: 'Successfully cancelled reserved pallets', color: 'success', show: true }
        } else {
            const err = data.errors?.length > 0 ? data.errors[0] : 'Failed to cancel'
            toast.value = { message: err, color: 'error', show: true }
        }
    } catch (e) {
        console.error(e)
    } finally {
        cancelProposalLoading.value = false
        cancelConfirmationModal.value = false
    }
}

// ─── Proceed Reserve ──────────────────────────────────────────────────────────

const submitProposalLoading = ref(false)

const proceedReserve = async () => {
    if (distributedPallets.value.length === 0) {
        toast.value = { message: 'No pallets selected to reserve.', color: 'error', show: true }
        return
    }

    if (store.activeTab !== 'available_stocks') {
        if (!store.customerApprovalFile) {
            toast.value = { message: 'Please choose a customer approval file.', color: 'error', show: true }
            return
        }
        if (!store.customerApprovalRemarks) {
            toast.value = { message: 'Please input remarks.', color: 'error', show: true }
            return
        }
    }

    const formData = new FormData()
    formData.append('delivery_id', store.deliveryData?.id)
    formData.append('delivery_item_id', store.selectedDeliveryItem?.id)
    formData.append('material_name', store.selectedDeliveryItem?.material_description)
    formData.append('material_code', parseInt(store.selectedDeliveryItem?.material_number))
    formData.append('delivery_document', store.deliveryData?.delivery_document)
    formData.append('item_number', store.selectedDeliveryItem?.item_number)
    formData.append('delivery_quantity', store.selectedDeliveryItem?.delivery_quantity)
    formData.append('numerator', store.selectedDeliveryItem?.numerator)
    formData.append('denominator', store.selectedDeliveryItem?.denominator)
    formData.append('plant', store.selectedDeliveryItem?.plant)
    formData.append('sloc', store.selectedDeliveryItem?.storage_location)
    formData.append('mode', store.activeTab)
    formData.append('stock_exception', store.activeTab !== 'available_stocks')
    formData.append('batches', JSON.stringify(distributedPallets.value))

    if (store.activeTab !== 'available_stocks') {
        formData.append('customer_approval_document', store.customerApprovalFile)
        formData.append('customer_approval_remarks', store.customerApprovalRemarks)
    }

    try {
        submitProposalLoading.value = true
        const token = JwtService.getToken()
        const { data } = await axios.post('deliveries/delivery-order-proposed', formData, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        })

        if (!data.success) {
            const err = data.errors?.length > 0 ? data.errors[0] : null
            if (err) toast.value = { message: err, color: 'error', show: true }
            return
        }

        emit('reserve-success')
    } catch (e) {
        console.error(e)
    } finally {
        submitProposalLoading.value = false
    }
}
</script>

<template>
    <!-- Header bar -->
    <v-toolbar color="white" border="b">
        <v-toolbar-title class="text-h5 font-weight-bold text-primary">Pallet Selection</v-toolbar-title>
        <template #append>
            <v-btn @click="emit('back')" color="secondary" variant="outlined" class="mr-2">
                Back To Delivery Items
            </v-btn>
            <v-btn :loading="submitProposalLoading" @click="proceedReserve" color="primary" class="mr-4">
                Proceed Reserve
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
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow>
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 font-weight-bold text-high-emphasis">Reserved Pallets</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <v-btn density="compact" variant="outlined" @click="viewReservedPallets = true">
                                    View Reserved Pallets
                                </v-btn>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>

            <!-- Filter Batches -->
            <VListItem style="padding-top: 6px; padding-bottom: 0">
                <VRow no-gutters align="center">
                    <VCol cols="12" class="d-inline-flex align-center gap-3">
                        <span class="text-h6 font-weight-bold text-high-emphasis">Filter Batches</span>
                        <v-chip
                            v-if="computedBatchList.length > 0"
                            @click="batchSelected(null)"
                            color="primary"
                            class="cursor-pointer"
                            :variant="selectedBatch === null ? 'elevated' : 'outlined'"
                            label
                        >
                            All Batches
                        </v-chip>
                        <v-chip
                            v-for="(batch, i) in computedBatchList"
                            :key="i"
                            @click="batchSelected(batch)"
                            color="primary"
                            class="cursor-pointer"
                            :variant="selectedBatch?.BATCH === batch.BATCH ? 'elevated' : 'outlined'"
                            label
                        >
                            {{ batch.pallet_quantity }}x - {{ batch.BATCH }}
                        </v-chip>
                    </VCol>
                </VRow>
            </VListItem>

        </VList>

        <v-divider class="mb-3" />

        <!-- Selected Pallets -->
        <div class="text-h5 font-weight-bold mb-2 text-primary">Selected Pallets</div>
        <v-table density="compact" fixed-header class="border">
            <thead>
                <tr>
                    <th>PHYSICAL ID</th>
                    <th>BATCH CODE</th>
                    <th>MFG DATE</th>
                    <th class="text-center">CURRENT QUANTITY</th>
                    <th class="text-center">ALLOCATED QUANTITY</th>
                    <th class="text-center">AGE</th>
                    <th></th>
                </tr>
            </thead>
            <tbody v-if="distributedPallets.length > 0">
                <tr v-for="(item, index) in distributedPallets" :key="item.physical_id">
                    <td>{{ item.physical_id }}</td>
                    <td>{{ item.batch }}</td>
                    <td>{{ item.mfg_date ? moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</td>
                    <td class="text-center">{{ item.quantity }} {{ item.material?.base_unit }}</td>
                    <td class="text-center">{{ item.take_quantity }} {{ item.material?.base_unit }}</td>
                    <td class="text-center">{{ calculateAge(item.mfg_date) }} day(s)</td>
                    <td class="text-end">
                        <i
                            @click="removeSelectedPallet(item, index)"
                            class="ri-close-large-line text-error cursor-pointer"
                        />
                    </td>
                </tr>
                <tr>
                    <td colspan="3" />
                    <td class="text-end font-weight-bold text-h6">Total Allocated Quantity:</td>
                    <td class="text-center font-weight-bold text-h6">
                        {{ distributedPallets.reduce((t, p) => t + p.take_quantity, 0) }}
                    </td>
                    <td colspan="2" />
                </tr>
                <tr>
                    <td colspan="3" />
                    <td class="text-end font-weight-bold text-h6">Open Quantity:</td>
                    <td class="text-center font-weight-bold text-h6">
                        {{ store.deliveryData?.open_quantity ?? store.selectedDeliveryItem?.open_quantity }}
                    </td>
                    <td colspan="2" />
                </tr>
            </tbody>
            <tbody v-else>
                <tr style="height: 150px">
                    <td colspan="7" class="text-center text-h4 text-grey-500">No selected pallets yet -- Assign Pallet from the Warehouse Map below first.</td>
                </tr>
            </tbody>
        </v-table>

        <!-- Warehouse Map -->
        <div class="text-h5 font-weight-bold mt-4 mb-2 text-primary">Warehouse Map</div>
        <WarehouseMap
            v-if="store.selectedDeliveryItem"
            :plantCode="store.selectedDeliveryItem?.plant"
            :storageLocation="store.selectedDeliveryItem?.storage_location"
            :selected-batches="store.batchList"
            :selectedPallets="parentSelectedPallets"
            @update:selectedPallets="handleSelectedPalletsUpdate"
        />

    </v-container>

    <!-- Reserved Pallets Dialog -->
    <v-dialog v-model="viewReservedPallets" max-width="1200px">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold text-primary">Reserved Pallets</div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false" />
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="border mx-4">
                    <thead>
                        <tr>
                            <th>Item Number</th>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Stock Exception</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Age</th>
                        </tr>
                    </thead>
                    <tbody v-if="store.selectedDeliveryItem?.delivery_reserved_orders?.length > 0">
                        <tr v-for="(item, index) in store.selectedDeliveryItem?.delivery_reserved_orders" :key="index">
                            <td>{{ item.item_number }}</td>
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">
                                <i
                                    v-if="item.is_stock_exception"
                                    class="ri-checkbox-circle-line text-success"
                                    style="font-size: 20px"
                                />
                                <i v-else class="ri-close-circle-line text-error" style="font-size: 20px" />
                            </td>
                            <td class="text-center">{{ item.total_qty }} {{ store.selectedDeliveryItem?.sales_unit }}(s)</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="7" class="text-center py-4">No Reserved Pallets</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-6">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false">Close</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Cancel Confirmation Dialog -->
    <v-dialog v-model="cancelConfirmationModal" min-width="400px" max-width="600px">
        <v-card class="pa-4">
            <div class="text-center">
                <v-icon class="mb-5" color="error" icon="ri-close-circle-line" size="112" />
                <p class="mb-6 text-h5">Are you sure you want to cancel reserved pallets?</p>
                <p class="font-weight-medium text-medium-emphasis">
                    This will cancel {{ store.selectedDeliveryItem?.total_reserved_pallets }} reserved
                    {{ store.selectedDeliveryItem?.sales_unit }}(s), initially held for
                    {{ store.selectedDeliveryItem?.delivery_quantity }} required
                    {{ store.selectedDeliveryItem?.sales_unit }}(s).
                </p>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="cancelConfirmationModal = false" class="px-8 mr-3">
                        Cancel
                    </v-btn>
                    <v-btn color="primary" @click="cancelProposal" :loading="cancelProposalLoading" class="px-8">
                        Proceed
                    </v-btn>
                </div>
            </div>
        </v-card>
    </v-dialog>

    <!-- Processing overlay -->
    <v-dialog v-model="submitProposalLoading" max-width="700px" persistent>
        <v-card>
            <v-card-title class="d-flex justify-center align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold text-primary text-center">Reservation In Progress</div>
            </v-card-title>
            <v-card-text>
                <div class="d-flex justify-center my-6">
                    <v-progress-circular indeterminate color="primary" size="64" width="6" />
                </div>
                <div class="px-4 mt-4 mx-2 text-h5">
                    Please wait while we process your request. Do not close this window.
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
