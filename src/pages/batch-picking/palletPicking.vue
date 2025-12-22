<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import { useBatchPickingStore } from '@/stores/batchPickingStore';
import axios from 'axios';
import moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WarehouseMap from './warehouseMap.vue';

const route = useRoute();
const router = useRouter();
const batchPickingStore = useBatchPickingStore();

const do_number = route.params.do_number;
const showLostDetails = ref(false);
onMounted(() => {
    if (batchPickingStore.batchList.length === 0) {
        showLostDetails.value = true;
    }
})

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

function redirectPage() {
    router.push({
        name: 'batch-picking',
        params: { do_number: do_number }
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
        batchPickingStore.setBatches(batchPickingStore.originalBatchList);
        return;
    }
    batchPickingStore.setBatches([batch]);
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
    return batchPickingStore.originalBatchList.map(batch => {
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
    let remaining = batchPickingStore.selectedDeliveryItem?.open_quantity;
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
    formData.append('do_number', batchPickingStore.deliveryDetails?.do_number);
    formData.append('material_name', batchPickingStore.selectedDeliveryItem?.material_description);
    formData.append('material_code', removeLeadingZeros(batchPickingStore.selectedDeliveryItem.material_number));
    formData.append('delivery_document', batchPickingStore.selectedDeliveryItem?.delivery_document);
    formData.append('item_number', batchPickingStore.selectedDeliveryItem?.item_number);
    formData.append('delivery_quantity', batchPickingStore.selectedDeliveryItem?.delivery_quantity);
    formData.append('numerator', batchPickingStore.selectedDeliveryItem?.numerator);
    formData.append('denominator', batchPickingStore.selectedDeliveryItem?.denominator);
    formData.append('plant', batchPickingStore.selectedDeliveryItem?.plant);
    formData.append('sloc', batchPickingStore.selectedDeliveryItem?.storage_location);
    formData.append('mode', batchPickingStore.activeTab);
    formData.append('stock_exception', batchPickingStore.activeTab !== 'available_stocks');
    formData.append(`batches`, JSON.stringify(distributedPallets.value));
    formData.append('sap_server', batchPickingStore.selectedDeliveryItem?.sap_server);
    formData.append('customer_approval_document', batchPickingStore.customerApprovalFile);

    try {
        submitProposalLoading.value = true;
        const token = JwtService.getToken();
        const { data } = await axios.post(
            `deliveries/delivery-order-proposed`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        if (!data.success) {
            // Handle validation errors
            // const errorMsg = data.errors?.customer_approval_document?.[0] 
            const batchPickError = data.errors?.length > 0 ? data.errors?.[0] : null

            if (batchPickError) {
                toast.value.color = 'error';
                toast.value.message = batchPickError;
                toast.value.show = true;
                // loadItems({
                //     page: page.value,
                //     itemsPerPage: itemsPerPage.value,
                //     sortBy: [{key: 'created_at', order: 'desc'}],
                //     search: props.search
                // });
                // closeModal()
            }

            return;
        }

        // Proceed normally if successful
        if (data.success) {

            const fetchParams = {
                delivery_document: batchPickingStore.selectedDeliveryItem?.delivery_document,
                item_number: batchPickingStore.selectedDeliveryItem?.item_number,
                delivery_quantity: batchPickingStore.selectedDeliveryItem?.delivery_quantity,
                storage_location: batchPickingStore.selectedDeliveryItem?.storage_location,
                plant: batchPickingStore.selectedDeliveryItem?.plant,
            };

            // Wait for both to finish before routing
            // await batchPickingStore.fetchOpenQuantity(fetchParams);
            await batchPickingStore.fetchHeaderDetails({ do_number: do_number });

            // Now redirect
            router.push({
                name: 'batch-picking',
                params: { do_number: do_number }
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
                    <v-btn @click="redirectPage" class="mr-2" color="secondary" variant="outlined">Back to Delivery
                        Item</v-btn>
                    <v-btn :loading="submitProposalLoading" @click="proceedReserve" color="primary">Proceed
                        Reserve</v-btn>
                </div>
            </v-card-title>
            <v-card-text>
                <VList lines="one" density="compact">
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            batchPickingStore.deliveryDetails?.do_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">BU Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document ||
                                            null }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 4px; padding-bottom: 0px; margin-top: 5px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex">
                                        <span class="text-h6 font-weight-bold text-high-emphasis ">Ship-to-Party</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{
                                            batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{
                                            batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer }}
                                        </div>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{
                                            batchPickingStore.selectedDeliveryItem?.material_description }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{
                                            removeLeadingZeros(batchPickingStore.selectedDeliveryItem?.material_number)
                                            }}</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            batchPickingStore.selectedDeliveryItem?.plant_model?.plant_code }} - {{
                                                batchPickingStore.selectedDeliveryItem?.plant_model?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Storage
                                            Location</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            batchPickingStore.selectedDeliveryItem?.storage_location_model?.code }} - {{
                                                batchPickingStore.selectedDeliveryItem?.storage_location_model?.name
                                            }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Required Quantity
                                        </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            batchPickingStore.selectedDeliveryItem?.delivery_quantity }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Age</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore?.product_age?.from }} -
                                            {{ batchPickingStore?.product_age?.to }} Days</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            batchPickingStore.selectedDeliveryItem?.open_quantity }}</span>
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
                    </VListItem>
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
                            <th class="text-center">Current Quantity</th>
                            <th class="text-center">Allocated Quantity</th>
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
                        <tr>
                            <td colspan="3" >
                            </td>
                            <td class="text-end font-weight-bold text-h6">
                                Total Allocated Quantity:
                            </td>
                            <td class="text-center">
                                <span class="font-weight-bold text-h6 ">
                                    {{
                                    distributedPallets.reduce((total, pallet) => total + pallet.take_quantity, 0)
                                    }} 
                                </span>
                            </td>
                            <td></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td colspan="3" >
                            </td>
                            <td class="text-end font-weight-bold text-h6">
                                Open Quantity:
                            </td>
                            <td class="text-center">
                                <span class="font-weight-bold text-h6">
                                    {{ batchPickingStore.selectedDeliveryItem?.open_quantity }}
                                </span>
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
                    <WarehouseMap v-if="batchPickingStore.selectedDeliveryItem"
                        :plantCode="batchPickingStore.selectedDeliveryItem?.plant"
                        :selected-batches="batchPickingStore.batchList" :selectedPallets="parentSelectedPallets"
                        :storageLocation="batchPickingStore.selectedDeliveryItem?.storage_location"
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
                    An error occured while fetching the data. You will be redirected to the batch selection page.
                </div>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="primary" @click="redirectPage" type="button">Confirm</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewReservedPallets" max-width="1200px">
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
                            <th>Item Number</th>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Stock Exception</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Age</th>
                        </tr>
                    </thead>
                    <tbody v-if="batchPickingStore.selectedDeliveryItem?.reserved_pallets?.length > 0">
                        <tr v-for="(item, index) in batchPickingStore.selectedDeliveryItem?.reserved_pallets">
                            <td>{{ item.item_number }}</td>
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">
                                <i v-if="item.is_stock_exception" style="font-size: 24px; background-color: green;"
                                    class="ri-checkbox-circle-line mt-2"></i>
                                <i v-else style="font-size: 24px; background-color: #FF4C51;"
                                    class="ri-close-circle-line mt-2"></i>
                            </td>
                            <td class="text-center">{{ item.total_qty }} {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}(s)</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="7" class="text-center py-4">No Reserved Pallets</td>
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
