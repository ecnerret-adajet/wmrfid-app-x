<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import axios from 'axios';
import moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WarehouseMap from './warehouseMap.vue';

const route = useRoute();
const router = useRouter();
const stoBatchPickingStore = useStoBatchPickingStore();

const po_number = route.params.po_number;
const po_item = route.params.po_item
const showLostDetails = ref(false);
onMounted(() => {
    if (stoBatchPickingStore.batchList.length === 0) {
        showLostDetails.value = true;
    }
})

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

function redirectPage() {
    router.push({
        name: 'transfer-orders',
        // params: { po_number: po_number }
    });
}

const viewReservedPallets = ref(false)
function viewReserved() {
    viewReservedPallets.value = true;
}

const selectedBatch = ref(null);
function batchSelected(batch) {
    selectedBatch.value = batch;
    if (batch === null) {
        stoBatchPickingStore.setBatches(stoBatchPickingStore.originalBatchList);
        return;
    }
    stoBatchPickingStore.setBatches([batch]);
}

const calculateAge = (date) => {
    if (!date) return '';
    const now = moment();
    const mfgDate = moment(date);
    const days = now.diff(mfgDate, 'days');
    return days;
};

const parentSelectedPallets = ref([]);
const handleSelectedPalletsUpdate = (pallets) => {
    // Sort by ascending mfg_date
    parentSelectedPallets.value = [...pallets].sort((a, b) => new Date(a.mfg_date) - new Date(b.mfg_date));
};

const computedBatchList = computed(() => {
    return stoBatchPickingStore.originalBatchList.map(batch => {
        // Count how many pallets from this batch are in parentSelectedPallets
        const countInTable = parentSelectedPallets.value.filter(
            pallet => pallet.batch === batch.BATCH
        ).length;

        // Calculate the remaining quantity
        const remainingQuantity = batch.pallet_quantity - countInTable;

        // Return a new object with the updated quantity
        return {
            ...batch,
            pallet_quantity: remainingQuantity
        };
    });
});

const distributedPallets = computed(() => {
    let remaining = stoBatchPickingStore.stoDetails?.open_quantity;
    return parentSelectedPallets.value.map(item => {
        // Assume item.quantity is the max available for this pallet
        const maxTake = item.quantity || 0;
        const take = Math.min(maxTake, remaining);
        remaining -= take;
        return {
            ...item,
            take_quantity: take
        };
    });
});


const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const removeSelectedPallet = (item, index) => {
    if (toast.value.show) {
        toast.value.show = false
    }
    if (item && item.physical_id !== undefined) {
        parentSelectedPallets.value.splice(index, 1)

        toast.value.message = `PHYSICAL ID ${item.physical_id} has been removed from the selected pallets.`;
        toast.value.color = 'warning';
        toast.value.show = true;
    }
}

const submitProposalLoading = ref(false);
const proceedReserve = async () => {
    if (parentSelectedPallets.value.length === 0) {
        toast.value.message = 'No pallets selected to reserve.';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }

    let formData = new FormData();
    formData.append('po_number', stoBatchPickingStore.stoDetails?.po_number);
    formData.append('po_item', stoBatchPickingStore.stoDetails?.po_item);
    formData.append('material_name', stoBatchPickingStore.stoDetails?.material_description);
    formData.append('material_code', removeLeadingZeros(stoBatchPickingStore.stoDetails.material_code));
    formData.append('qty', stoBatchPickingStore.stoDetails?.qty);
    formData.append('numerator', stoBatchPickingStore.stoDetails?.numerator);
    formData.append('denominator', stoBatchPickingStore.stoDetails?.denominator);
    formData.append('plant', stoBatchPickingStore.stoDetails?.supplying_plant);
    formData.append('sloc', stoBatchPickingStore.stoDetails?.issuing_sloc_sto);
    formData.append('mode', stoBatchPickingStore.activeTab);
    formData.append('stock_exception', stoBatchPickingStore.activeTab !== 'available_stocks');
    formData.append(`batches`, JSON.stringify(distributedPallets.value));
    formData.append('sap_server', stoBatchPickingStore.stoDetails?.sap_server);
    formData.append('transport_number', stoBatchPickingStore.selectedTransport?.transport?.transport_number);
    formData.append('plate_number', stoBatchPickingStore.selectedTransport?.transport?.vehicle?.plate_number);
    formData.append('driver_name', stoBatchPickingStore.selectedTransport?.transport?.driver?.full_name);


    try {
        submitProposalLoading.value = true;
        const token = JwtService.getToken();
        const { data } = await axios.post(
            `transfer-orders/transfer-order-proposed`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        if (!data.success) {
            console.log(data.errors)
            // Handle validation errors
            // const errorMsg = data.errors?.customer_approval_document?.[0] 
            const batchPickError = data.errors?.length > 0 ? data.errors?.[0] : null

            if (batchPickError) {
                toast.value.color = 'error';
                toast.value.message = batchPickError;
                toast.value.show = true;

            }

            return;
        }

        // Proceed normally if successful
        if (data.success) {
            // Now redirect
            router.push({
                name: 'transfer-orders',
            });
        }

    } catch (response) {
        console.log(response);
    } finally {
        submitProposalLoading.value = false;
        // customerApprovalFile.value = null;
        // customerApprovalRemarks.value = null;
    }
}
</script>

<template>
    <div>
        <v-card elevation="2" class="mx-auto">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Pallet Selection
                </div>
                <div>
                    <v-btn @click="redirectPage" class="mr-2" color="secondary" variant="outlined">Back</v-btn>
                    <v-btn :loading="submitProposalLoading" @click="proceedReserve" color="primary">Proceed
                        Reserve</v-btn>
                </div>
            </v-card-title>
            <v-card-text>
                <VList lines="one" density="compact">
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            parseInt(stoBatchPickingStore?.stoDetails?.material_code, 10) }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">PO Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.po_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material
                                            Description</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.material_description }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">PO Item No.</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">
                                            {{ stoBatchPickingStore?.stoDetails?.po_item }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row ">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Supplying Plant</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.supplying_order_plant?.plant_code }} - {{
                                                stoBatchPickingStore?.stoDetails?.supplying_order_plant?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Plant</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.receiving_order_plant?.plant_code }} - {{
                                                stoBatchPickingStore?.stoDetails?.receiving_order_plant?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>

                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row ">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Supplying Sloc</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.issuing_storage_location?.code }} - {{
                                                stoBatchPickingStore?.stoDetails?.issuing_storage_location?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Sloc</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{
                                            stoBatchPickingStore?.stoDetails?.receiving_storage_location?.code }} - {{
                                                stoBatchPickingStore?.stoDetails?.receiving_storage_location?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">PO Item
                                            Quantity</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ Number(stoBatchPickingStore?.stoDetails?.qty ??
                                                0).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }) }}
                                            {{ stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ Number(stoBatchPickingStore?.stoDetails?.open_quantity ??
                                                0).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }) }}
                                            {{ stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <!-- <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            batchPickingStore.deliveryDetails?.open_quantity }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Reserved Pallets
                                        </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <v-btn density="compact" variant="outlined" @click="viewReserved">View Reserved
                                            Pallets</v-btn>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem> -->
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="2" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Filter Batches</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <v-chip @click="batchSelected(null)" color="primary" class="ml-1 cursor-pointer"
                                            v-if="computedBatchList.length > 0" :key="'all'"
                                            :variant="selectedBatch === null ? 'elevated' : 'outlined'" label>
                                            All Batches
                                        </v-chip>
                                        <v-chip @click="batchSelected(batch)" color="primary"
                                            class="ml-1 cursor-pointer" v-if="computedBatchList.length > 0"
                                            :variant="selectedBatch && selectedBatch.BATCH === batch.BATCH ? 'elevated' : 'outlined'"
                                            v-for="(batch, index) in computedBatchList" :key="index" label>
                                            {{ batch.pallet_quantity }}x - {{ batch.BATCH }}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <v-divider class="mx-4"></v-divider>
                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Selected Pallets
                </div>
                <v-table density="compact" striped="even" fixed-header class="border mx-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">CURRENT QTY ({{ stoBatchPickingStore.stoDetails?.uom }})</th>
                            <th class="text-center">Allocated Quantity ({{ stoBatchPickingStore.stoDetails?.uom }})</th>
                            <th class="text-sm text-center">Age</th>
                            <th class="text-end"></th>
                        </tr>
                    </thead>
                    <tbody v-if="distributedPallets.length > 0">
                        <tr v-for="(item, index) in distributedPallets">
                            <td>{{ item.physical_id }}</td>
                            <td>{{ item.batch }}</td>
                            <td>{{ item.mfg_date ? moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</td>
                            <td class="text-center">{{ item.quantity }} {{ item.material?.base_unit }}</td>
                            <td class="text-center">{{ item.take_quantity }} {{ item.material?.base_unit }}</td>
                            <td class="text-center">{{ calculateAge(item.mfg_date) }} day(s)</td>
                            <td class="text-end">
                                <i @click="removeSelectedPallet(item, index)"
                                    class="ri-close-large-line text-error cursor-pointer"></i>
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr style="height: 200px;">
                            <td colspan="6" class="text-center align-middle text-h4 text-grey-500">
                                No selected pallets yet --
                            </td>
                        </tr>
                    </tbody>

                </v-table>

                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Warehouse Map
                </div>

                <div class="mt-3 mx-4">
                    <WarehouseMap v-if="stoBatchPickingStore.stoDetails"
                        :plantCode="stoBatchPickingStore.stoDetails?.supplying_plant"
                        :selected-batches="stoBatchPickingStore.batchList" :selectedPallets="parentSelectedPallets"
                        :storageLocation="stoBatchPickingStore.stoDetails?.issuing_sloc_sto"
                        @update:selectedPallets="handleSelectedPalletsUpdate" />
                </div>
            </v-card-text>
        </v-card>
    </div>

    <v-dialog v-model="showLostDetails" max-width="700px" persistent>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Ooops. Something went wrong
                </div>
            </v-card-title>
            <v-card-text>
                <div class="px-4 mt-4 mx-2 text-h5">
                    An error occured while fetching the data. You will be redirected to the transfer orders page.
                </div>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="primary" @click="redirectPage" type="button">Confirm</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewReservedPallets" max-width="1000px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="elevation-0 border mx-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Age</th>
                        </tr>
                    </thead>
                    <tbody v-if="stoBatchPickingStore.stoDetails?.reserved_pallets?.length > 0">
                        <tr v-for="(item, index) in stoBatchPickingStore.stoDetails?.reserved_pallets">
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">{{ item.total_qty }}</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr colspan="7">
                            <td>No Reserved Pallets</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                </div>
            </v-card-text>


        </v-card>
    </v-dialog>

    <v-dialog v-model="submitProposalLoading" max-width="700px" persistent>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-center align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary text-center">
                    Batch Picking In Progress
                </div>
            </v-card-title>
            <v-card-text>
                <!-- Circular progress centered -->
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
