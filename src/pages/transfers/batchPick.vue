<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import axios from 'axios';
import Moment from 'moment';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const stoBatchPickingStore = useStoBatchPickingStore();

const po_number = route.params.po_number;
const po_item = route.params.po_item;
const selectedTransportId = ref(null);

const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const pageLoading = ref(false);
const loading = ref(false);

onMounted(async () => {
    // fetchPallets()
    pageLoading.value = true;
    try {
        const params = {
            po_number: po_number,
            po_item: po_item
        };

        await stoBatchPickingStore.fetchHeaderDetails(params);

        const openQuantityParams = {
            po_number: po_number,
            po_item: po_item,
            po_quantity: stoBatchPickingStore.stoDetails?.qty,
            plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
            sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto
        }

        await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

        const availableParams = {
            po_number: po_number,
            po_item: po_item,
            po_quantity: stoBatchPickingStore.stoDetails?.qty,
            plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
            sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto,
            material_code: stoBatchPickingStore.stoDetails?.material_code
        }

        // 2. Check the store's state for the open quantity balance
        // Change ".openQuantity" to match your Pinia store's exact state variable name
        if (stoBatchPickingStore.stoDetails?.open_quantity > 0) {
            await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
        }

        await fetchTransports();

    } catch (error) {
        console.error("Failed to fetch picking data:", error);
    } finally {
        pageLoading.value = false;
    }

})

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

const expirationChecking = (date) => {
    const currentDate = Moment();
    const comparisonDate = Moment(date).format('YYYY-MM-DD');
    return currentDate.isAfter(comparisonDate);
};

const emit = defineEmits(['close', 'updated']);

const selectBatchDialog = ref(false)
function selectBatch() {
    selectBatchDialog.value = true;
}

const handleClose = () => {
    stoBatchPickingStore.selectedBatchCode = null;
    stoBatchPickingStore.selectedBatchPalletCount = 0;
    stoBatchPickingStore.availableStocks.forEach(item => {
        item.is_selected = false;
    });
    selectBatchDialog.value = false
};

const activeTab = ref('available_stocks');
const reserveBatch = async () => {
    let selectedBatchData = [];
    toast.value.show = false;

    const noBatchSelected = stoBatchPickingStore.availableStocks?.length === 0 ||
        stoBatchPickingStore.availableStocks.every(item => !item.is_selected);

    if (noBatchSelected) {
        toast.value.color = 'error';
        toast.value.message = 'No batch selected. Please select a batch.';
        toast.value.show = true;
        return;
    }

    selectedBatchData = stoBatchPickingStore.availableStocks.filter(item => item.is_selected);

    if (selectedBatchData.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'No selected batches.';
        toast.value.show = true;
        return;
    }

    stoBatchPickingStore.setBatches(selectedBatchData);
    stoBatchPickingStore.setOriginalBatchList(selectedBatchData);

    const selectedTransport = transports.value?.find(
        (item) => item.id === selectedTransportId.value
    );

    stoBatchPickingStore.selectedTransport = selectedTransport;

    await handleSave();
}

const handleSave = async () => {
    let formData = new FormData();
    formData.append('po_number', stoBatchPickingStore.stoDetails?.po_number ?? '');
    formData.append('po_item', stoBatchPickingStore.stoDetails?.po_item ?? '');
    formData.append('material_name', stoBatchPickingStore.stoDetails?.material_description ?? '');
    formData.append('material_code', removeLeadingZeros(stoBatchPickingStore.stoDetails?.material_code));
    formData.append('qty', stoBatchPickingStore.stoDetails?.qty ?? 0);
    formData.append('numerator', stoBatchPickingStore.stoDetails?.numerator ?? 1);
    formData.append('denominator', stoBatchPickingStore.stoDetails?.denominator ?? 1);
    formData.append('plant', stoBatchPickingStore.stoDetails?.supplying_plant ?? '');
    formData.append('sloc', stoBatchPickingStore.stoDetails?.issuing_sloc_sto ?? '');
    formData.append('mode', stoBatchPickingStore.activeTab ?? '');
    formData.append('stock_exception', stoBatchPickingStore.activeTab !== 'available_stocks');

    // Pass the computed allocation matrix safely serialized as a string JSON payload
    formData.append('batches', JSON.stringify(stoBatchPickingStore.batchList));

    formData.append('sap_server', stoBatchPickingStore.stoDetails?.sap_server ?? '');
    formData.append('transport_number', stoBatchPickingStore.selectedTransport?.transport?.transport_number ?? '');
    formData.append('plate_number', stoBatchPickingStore.selectedTransport?.transport?.vehicle?.plate_number ?? '');
    formData.append('driver_name', stoBatchPickingStore.selectedTransport?.transport?.driver?.full_name ?? '');

    try {
        // Adjust variable tracking key state to match whatever button :loading bind handles
        loading.value = true;

        // Grab token securely from auth layers
        const token = JwtService.getToken();

        // Execute endpoint transmission
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

        // 3. Handle Backend Failure Operations 
        if (!data.success) {
            console.log(data.errors);
            const batchPickError = data.errors?.length > 0 ? data.errors[0] : 'Validation failed on proposal creation.';

            toast.value.color = 'error';
            toast.value.message = batchPickError;
            toast.value.show = true;
            return;
        }

        // 4. Handle Success Navigation Step
        if (data.success) {
            const params = {
                po_number: po_number,
                po_item: po_item
            };

            await stoBatchPickingStore.fetchHeaderDetails(params);


            const openQuantityParams = {
                po_number: po_number,
                po_item: po_item,
                po_quantity: stoBatchPickingStore.stoDetails?.qty,
                plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
                sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto
            }

            await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

            const availableParams = {
                po_number: po_number,
                po_item: po_item,
                po_quantity: stoBatchPickingStore.stoDetails?.qty,
                plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
                sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto,
                material_code: stoBatchPickingStore.stoDetails?.material_code
            }

            // 2. Check the store's state for the open quantity balance
            // Change ".openQuantity" to match your Pinia store's exact state variable name
            if (stoBatchPickingStore.stoDetails?.open_quantity > 0) {
                await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
            }

            toast.value.color = 'success';
            toast.value.message = 'Transfer order batch reservation saved successfully.';
            toast.value.show = true;

            await fetchTransports();
        }

    } catch (error) {
        console.error('Request Execution Error:', error);
        toast.value.color = 'error';
        toast.value.message = 'An unexpected connection error occurred while parsing operations.';
        toast.value.show = true;
    } finally {
        loading.value = false;
        selectBatchDialog.value = false;
        selectedTransportId.value = null;
        selectedTransactionItem.value = null
    }

}

const transports = ref([]);
const transportLoading = ref(false)
const viewReservedPallets = ref(false);
const fetchTransports = async (searchQuery = '') => {
    transportLoading.value = true;
    try {
        const response = await ApiService.query(`transfer-orders/get-transports/${po_number}/${po_item}`, {

        });
        transports.value = response.data.transports;
    } catch (error) {
        console.error('Failed fetching transports:', error);
    } finally {
        transportLoading.value = false;
    }
};

function cancelPalletSelection() {
    selectedPallet.value = null;
    addedPallets.value = [];
}

const cancelTableHeaders = [
    { title: 'Physical ID', align: 'start', sortable: false, key: 'pallet_physical_id' },
    { title: 'Batch', align: 'start', sortable: false, key: 'batch' },
    { title: 'Reserved Qty', align: 'end', sortable: false, key: 'quantity' },
    { title: 'Mfg. Date', align: 'center', sortable: false, key: 'mfg_date' }
];
const cancelReservationDialogVisible = ref(false)
const cancelLoading = ref(false)
const selectedTransactionItem = ref(null);
function cancelReservation(item) {
    selectedTransactionItem.value = item
    cancelReservationDialogVisible.value = true;
}


const executeCancel = async () => {
    let formData = new FormData();
    formData.append('po_number', stoBatchPickingStore.stoDetails?.po_number ?? '');
    formData.append('po_item', stoBatchPickingStore.stoDetails?.po_item ?? '');
    formData.append('batch', selectedTransactionItem.value?.batch);
    formData.append('transport_id', selectedTransactionItem.value?.transport_id);
    formData.append('transaction_item_id', selectedTransactionItem.value?.transaction_item_id);
    formData.append('plant', stoBatchPickingStore.stoDetails?.supplying_plant ?? '');
    formData.append('sloc', stoBatchPickingStore.stoDetails?.issuing_sloc_sto ?? '');

    cancelLoading.value = true
    toast.value.show = false;
    try {
        const response = await ApiService.post(`transfer-orders/transfer-order-remove`, formData);

        if (response.data?.success) {
            const params = {
                po_number: po_number,
                po_item: po_item
            };

            await stoBatchPickingStore.fetchHeaderDetails(params);

            const openQuantityParams = {
                po_number: po_number,
                po_item: po_item,
                po_quantity: stoBatchPickingStore.stoDetails?.qty,
                plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
                sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto
            }

            await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

            const availableParams = {
                po_number: po_number,
                po_item: po_item,
                po_quantity: stoBatchPickingStore.stoDetails?.qty,
                plant_code: stoBatchPickingStore.stoDetails?.supplying_plant,
                sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto,
                material_code: stoBatchPickingStore.stoDetails?.material_code
            }

            if (stoBatchPickingStore.stoDetails?.open_quantity > 0) {
                await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
            }

            toast.value.color = 'success';
            toast.value.message = 'Batch reservation cancelled successfully.';
            toast.value.show = true;

            await fetchTransports();
        } else {
            console.log(response)
            toast.value.color = 'error';
            toast.value.message = response.data?.message || 'An error encountered while cancelling batch reservation.';
            toast.value.show = true;
        }

    } catch (error) {
        console.error('Error updating:', error);
    } finally {
        cancelLoading.value = false;
        selectedTransportId.value = null;
        selectedTransactionItem.value = null
        cancelReservationDialogVisible.value = false;
        addedPallets.value = []
        search.value = null
    }
}

</script>

<template>
    <div>
        <v-card>
            <div class="d-flex justify-space-between align-center px-4 mt-4">
                <h4 class="text-h4 mx-4 font-weight-black text-primary">STO Batch Picking</h4>
            </div>
            <v-card-title>
                <VList lines="one" density="compact" class="mt-4">
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{
                                            parseInt(stoBatchPickingStore?.stoDetails?.material_code, 10)
                                            }}</span>
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
                                            stoBatchPickingStore?.stoDetails?.supplying_order_plant?.plant_code
                                            }} - {{ stoBatchPickingStore?.stoDetails?.supplying_order_plant?.name
                                            }}</span>
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
                                            stoBatchPickingStore?.stoDetails?.receiving_order_plant?.plant_code
                                            }} - {{ stoBatchPickingStore?.stoDetails?.receiving_order_plant?.name
                                            }}</span>
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
                                            stoBatchPickingStore?.stoDetails?.issuing_storage_location?.code }}
                                            - {{ stoBatchPickingStore?.stoDetails?.issuing_storage_location?.name
                                            }}</span>
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
                                            stoBatchPickingStore?.stoDetails?.receiving_storage_location?.code
                                            }} - {{ stoBatchPickingStore?.stoDetails?.receiving_storage_location?.name
                                            }}</span>
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
                                                    minimumFractionDigits: 2, maximumFractionDigits: 2
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

                    <!-- <VListItem v-if="stoBatchPickingStore?.stoDetails?.reserved_pallets?.length > 0" class="mt-2"  style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">View Reserved Pallets</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <v-btn @click="viewReservedPallets" size="small" variant="outlined" width="120" color="primary">View</v-btn>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem> -->

                </VList>
            </v-card-title>
            <v-divider class="my-4"></v-divider>
            <v-skeleton-loader v-if="transportLoading" type="article"></v-skeleton-loader>
            <v-card-text v-else>
                <v-radio-group v-model="selectedTransportId" hide-details class="w-100">
                    <v-table density="compact" class="elevation-0 border mx-4">
                        <thead>
                            <tr>
                                <th class="text-center" style="width: 60px;"></th>
                                <th>Transport Number</th>
                                <th>Driver</th>
                                <th>Plate Number</th>
                                <th>Batch</th>
                                <th>Transport Entry Qty</th>
                                <th>Reserved Qty</th>
                                <th class="text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- 1. Show the transport rows if data exists -->
                            <template v-if="transports && transports.length > 0">
                                <tr v-for="(item, index) in transports" :key="index">
                                    <td class="text-center">
                                        <v-radio :value="item.id" color="primary" density="compact"
                                            class="d-inline-flex justify-center"></v-radio>
                                    </td>
                                    <td>{{ item.transport?.transport_number }}</td>
                                    <td>{{ item.transport?.driver?.full_name }}</td>
                                    <td>{{ item.transport?.vehicle?.plate_number }}</td>
                                    <td>{{ item.batch }}</td>
                                    <td>{{ numberWithComma(item.qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}</td>
                                    <td>{{ numberWithComma(item.reserved_qty) }} {{
                                        stoBatchPickingStore?.stoDetails?.uom }}</td>
                                    <td>
                                        <v-btn v-if="parseFloat(item.reserved_qty) > 0" @click="cancelReservation(item)"
                                            size="x-small" class="text-xs" variant="outlined" width="120"
                                            color="error">Cancel Reserve</v-btn>
                                    </td>
                                </tr>
                            </template>

                            <!-- 2. Fallback empty state row -->
                            <tr v-else>
                                <td colspan="7" class="text-center text-grey-darken-1 py-8">
                                    <v-icon icon="ri-truck-line" size="large" class="mb-1 mr-2"></v-icon>
                                    No transport data found for this item.
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-radio-group>
                <!-- Action Buttons -->
                <div class="d-flex justify-end mt-4 pa-4">
                    <v-btn color="primary" :disabled="selectedTransportId == null"
                        v-if="parseInt(stoBatchPickingStore.stoDetails?.open_quantity) > 0" @click="selectBatch"
                        type="button">Select
                        Batch</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </div>

    <v-dialog v-model="selectBatchDialog" max-width="1600px" scrollable>
        <v-card class="d-flex flex-column px-6" height="700px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Select Batch</span>
                <v-btn icon="ri-close-line" variant="text" @click="selectBatchDialog = false"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <div v-if="parseInt(stoBatchPickingStore.stoDetails?.open_quantity) > 0" class="mt-4">
                <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs" hide-slider>
                    <v-tab value="available_stocks" class="text-h5">
                        Available Stocks
                    </v-tab>
                </v-tabs>
                <v-tabs-window v-model="activeTab" class="mt-4">
                    <v-tabs-window-item value="available_stocks">
                        <v-table density="compact" class="stock-table elevation-0">
                            <thead>
                                <tr>
                                    <th>Batch Code</th>
                                    <th>Mfg Date</th>
                                    <th>Expiration Date</th>
                                    <th>Age</th>
                                    <th>Avail. Qty</th>
                                    <th>Avail Pallets</th>
                                    <!-- <th>Split Qty</th> -->
                                    <!-- <th>Min. Pallet</th> -->
                                    <!-- <th>Remain. Qty</th> -->
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in stoBatchPickingStore.availableStocks" :key="index"
                                    :class="{ 'selected-row': item.selected }">
                                    <td>{{ item.BATCH }}</td>
                                    <td>
                                        {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                    </td>
                                    <td :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
                                        {{ item.SLED_STR }}
                                    </td>
                                    <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                    <!-- Avail Quantity  -->
                                    <td>
                                        {{ numberWithComma(item.BAG) }}
                                        {{ item.BASE_UOM }}
                                    </td>
                                    <!-- AVAIL PALLETS  -->
                                    <td>
                                        {{ item.inventory.length }} PALLET(s)
                                    </td>
                                    <!-- Split QTY  -->
                                    <!-- <td> {{ numberWithComma(item.split_qty_bag) }} {{ item.BASE_UOM }}</td> -->

                                    <!-- <td class="text-uppercase"
                                        :class="{ 'text-error': item.saved_reserved != null }">
                                        {{ item.split_qty_pallets }}
                                        Pallet
                                    </td>
                                    <td>{{ item.inventory_qty }} {{ item.BASE_UOM }}</td> -->
                                    <td>
                                        <v-checkbox v-model="item.is_selected" hide-details
                                            :disabled="item.inventory.length === 0 || expirationChecking(item.SLED_STR) || item.split_qty_bag === 0"
                                            density="compact">
                                        </v-checkbox>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-tabs-window-item>
                </v-tabs-window>
            </div>
            <div v-else style="display: flex; justify-content: center; align-items: center; height: 100px;">
                <span class="text-h3 text-primary">Reserved</span>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex justify-end mt-4 pa-4">
                <v-btn variant="outlined" color="grey" class="mr-2" @click="handleClose">Back</v-btn>
                <v-btn color="primary" :disabled="!stoBatchPickingStore.availableStocks.some(item => item.is_selected)"
                    v-if="parseInt(stoBatchPickingStore.stoDetails?.open_quantity) > 0" @click="reserveBatch"
                    type="button">Reserve Batch</v-btn>
            </div>
        </v-card>
    </v-dialog>

    <v-dialog v-model="cancelReservationDialogVisible" max-width="850px" persistent>
        <v-card class="pa-4" rounded="lg" elevation="24">
            <!-- Header Section -->
            <div class="text-center w-100">
                <v-icon class="mb-2" color="warning" icon="ri-alert-line" size="64"></v-icon>
                <v-card-title class="text-h5 justify-center font-weight-bold pt-0">
                    Cancel Batch Reservation?
                </v-card-title>
            </div>

            <div class="d-flex justify-space-between align-center px-4 pb-4">
                <div>
                    <div class="mb-2"><strong>PO Number:</strong>
                        {{ po_number }}
                    </div>
                    <div class="mb-2"><strong>PO Item:</strong>
                        {{ po_item }}
                    </div>
                </div>
            </div>

            <!-- Context Alert Message -->
            <v-card-text class="text-body-1 text-center text-medium-emphasis px-4 pb-4">
                Are you sure you want to cancel? The following reserved pallets will be made available again for other
                orders.
            </v-card-text>

            <!-- Pallets To Be Released Table -->
            <div class="px-4 mb-4">
                <div class="text-subtitle-2 font-weight-bold mb-1 text-grey-darken-2">
                    Pallets to release:
                </div>
                <v-data-table :headers="cancelTableHeaders" :items="stoBatchPickingStore?.stoDetails?.reserved_pallets"
                    class="elevation-0 border rounded" density="compact" hide-default-footer disable-pagination
                    max-height="200px" fixed-header>
                    <!-- Formatting Quantity with a generic fallback Unit -->
                    <template #item.quantity="{ item }">
                        {{ item.total_qty }}
                    </template>

                    <!-- Formatting Manufacturing Date if available -->
                    <template #item.mfg_date="{ item }">
                        {{ item.manufacturing_date || '—' }}
                    </template>

                    <template #no-data>
                        <div class="pa-2 text-center text-grey text-caption">
                            No active staging records selected.
                        </div>
                    </template>
                </v-data-table>
            </div>

            <v-divider class="mx-4 mb-4"></v-divider>

            <!-- Action Control Tray -->
            <v-card-actions class="justify-end gap-2 px-4 pb-2">
                <v-btn variant="outlined" @click="cancelReservationDialogVisible = false">
                    Go Back
                </v-btn>
                <v-btn color="error" variant="elevated" :loading="cancelLoading" @click="executeCancel">
                    Yes, Release & Discard
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    <Loader :show="pageLoading" />

</template>

<style scoped>
.custom-tabs {
    border-bottom: none !important;
    box-shadow: none !important;
    /* if there's a shadow */
}

.delivery-details {
    margin-bottom: 8px;
}

.detail-item {
    padding: 2px 10px;
    border-radius: 4px;
}

.detail-label {
    font-weight: 600;
    color: #546e7a;
    min-width: 150px;
    flex-shrink: 0;
}

.detail-value {
    color: #263238;
    flex-grow: 1;
}

.tabs-section {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-slide-group__container {
    padding: 0 16px;
}

.v-slide-group__content {
    display: flex;
}

.v-tab {
    min-width: 150px;
    border-bottom: 2px solid transparent;
    margin-right: 8px;
    text-transform: capitalize;
    font-weight: 500;
    letter-spacing: 0.5px;
    font-size: 14px;
}

.v-tab--selected {
    border-bottom: 2px solid #4CAF50;
    font-weight: 600;
}

.text-primary {
    color: #4CAF50 !important;
}

.stock-table {
    /* border: 1px solid #e0e0e0; */
    /* border-radius: 4px; */
    overflow: hidden;
}

.stock-table th {
    background-color: #f5f5f5;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    height: 40px;
}

.selected-row {
    background-color: #e8f5e9;
}
</style>
