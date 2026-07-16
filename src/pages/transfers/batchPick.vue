<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { numberWithCommaFixed } from '@/composables/useHelpers';
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
    message: 'Batch selected',
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
       
        await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
        
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
    const selectedTransport = transports.value?.find(
        (item) => String(item.transport_id ?? item.id) === String(selectedTransportId.value)
    );

    stoBatchPickingStore.selectedTransport = selectedTransport;

    selectBatchDialog.value = true;
}

const handleClose = () => {
    stoBatchPickingStore.availableStocks.forEach(item => {
        item.is_selected = false;
    });
    selectBatchDialog.value = false
};

const activeTab = ref('available_stocks');

const getBatchCode = (item) => item?.BATCH || item?.batch || '';

const isBatchAlreadyReserved = (item) => {
    const batchCode = getBatchCode(item);
    if (!batchCode || !transports.value?.length) return false;

    return transports.value.some(group =>
        (group?.transport_transaction_items || []).some(txItem =>
            String(txItem?.batch || '') === String(batchCode)
            && parseFloat(txItem?.reserved_qty || 0) > 0
        )
    );
};

const reserveBatch = async () => {
    pageLoading.value = true;
    toast.value.show = false;

    const selectedBatchData = stoBatchPickingStore.availableStocks.filter(
        item => item.is_selected && !isBatchAlreadyReserved(item)
    );

    if (!selectedBatchData || selectedBatchData.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'No batches selected. Please select at least one batch.';
        toast.value.show = true;
        pageLoading.value = false;
        return;
    }

    // Sync state summaries back into the local Pinia store structures
    stoBatchPickingStore.setBatches(selectedBatchData);
    stoBatchPickingStore.setOriginalBatchList(selectedBatchData);
    console.log(selectedBatchData);

    const formattedBatchesForBackend = selectedBatchData.map(batch => ({
        BATCH: batch.BATCH || batch.batch,
        selected: true,
        MANUF_DATE_STR: batch.MANUF_DATE_STR,
    }));

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
    formData.append('batches', JSON.stringify(formattedBatchesForBackend));

    formData.append('sap_server', stoBatchPickingStore.stoDetails?.sap_server ?? '');
    console.log(stoBatchPickingStore.selectedTransport);
    const transportNumber = stoBatchPickingStore.selectedTransport?.transport?.transport_number
        ?? stoBatchPickingStore.selectedTransport?.transport_number
        ?? '';
    formData.append('transport_number', transportNumber);
    formData.append('plate_number', stoBatchPickingStore.selectedTransport?.transport?.vehicle?.plate_number ?? '');
    formData.append('driver_name', stoBatchPickingStore.selectedTransport?.transport?.driver?.full_name ?? '');
  
    try {
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

        if (!data.success) {
            console.log(data.errors);
            const batchPickError = data.errors?.length > 0 ? data.errors[0] : 'Validation failed on proposal creation.';

            toast.value.color = 'error';
            toast.value.message = batchPickError;
            toast.value.show = true;
            return;
        }

        if (data.success) {
            const params = { po_number: po_number, po_item: po_item };
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
            await stoBatchPickingStore.fetchAvailableCommodities(availableParams);

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
        selectBatchDialog.value = false;
        pageLoading.value = false;
        if (typeof selectedTransportId !== 'undefined') selectedTransportId.value = null;
        if (typeof selectedTransactionItem !== 'undefined') selectedTransactionItem.value = null;
    }
}

const transports = ref([]);
const transportLoading = ref(false)

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

const cancelReservationDialogVisible = ref(false)
const cancelLoading = ref(false)
const selectedTransactionItem = ref(null);
const selectedTransportGroup = ref(null);
async function cancelReservation(item, group) {
    selectedTransactionItem.value = item
    selectedTransportGroup.value = group
    cancelReservationDialogVisible.value = true;
}

const executeCancel = async () => {
    let formData = new FormData();
    formData.append('po_number', stoBatchPickingStore.stoDetails?.po_number ?? '');
    formData.append('po_item', stoBatchPickingStore.stoDetails?.po_item ?? '');
    formData.append('batch', selectedTransactionItem.value?.batch);
    formData.append('transport_id', selectedTransportGroup.value?.transport_id);
    formData.append('transaction_item_id', selectedTransportGroup.value?.transaction_item_id);
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

            await stoBatchPickingStore.fetchAvailableCommodities(availableParams);

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
    }
}

// Computed check replacement for the Reserve Button disabled state
const isReadyToReserve = computed(() => {
    if (!stoBatchPickingStore.availableStocks) return false;

    return stoBatchPickingStore.availableStocks.some(item => Boolean(item.is_selected));
});


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
                                <th>Transport Entry Qty</th>
                                <th>Batch</th>
                                <th>Reserved Qty</th>
                                <th class="text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- 1. Show the transport rows if data exists -->
                            <template v-if="transports && transports.length > 0">
                                <!-- Master Loop: Iterates through each unique Transport Group -->
                                <template v-for="(group, groupIndex) in transports" :key="'group-' + groupIndex">
                                    <!-- Inner Loop: Iterates through the batches assigned to this transport -->
                                    <tr v-for="(item, itemIndex) in group.transport_transaction_items" :key="'item-' + item.id">
                                        
                                        <!-- FIXED: Radio Selection Button only renders ONCE per transport group -->
                                        <!-- It binds to transaction_item_id or transport_id instead of the raw pallet item id -->
                                        <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length" class="text-center">
                                            <v-radio 
                                                :value="group.transport_id" 
                                                color="primary" 
                                                density="compact"
                                                class="d-inline-flex justify-center"
                                            ></v-radio>
                                        </td>

                                        <!-- Merged Transport Headers -->
                                        <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                            {{ group.transport?.transport_number }}
                                        </td>
                                        <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                            {{ group.transport?.driver?.full_name || (group.transport?.driver?.first_name + ' ' + group.transport?.driver?.last_name) }}
                                        </td>
                                        <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                            {{ group.transport?.vehicle?.plate_number }}
                                        </td>
                                        
                                        <!-- Entry Quantity Header Column -->
                                        <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                            {{ numberWithCommaFixed(item.qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                        </td>

                                        <!-- Batch Metrics Columns (Rendered on EVERY individual row line) -->
                                        <td>{{ item.batch }}</td>
                                        <td>
                                            {{ numberWithCommaFixed(item.reserved_qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                        </td>
                                        
                                        <!-- Actions Column (Rendered on EVERY individual row line next to its respective batch metrics) -->
                                        <td>
                                            <v-btn v-if="parseFloat(item.reserved_qty) > 0" @click="cancelReservation(item, group)"
                                                size="x-small" class="text-xs" variant="outlined" 
                                                color="error">Cancel Reserve</v-btn>
                                        </td>
                                    </tr>
                                </template>
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
                    <v-btn color="primary" :disabled="selectedTransportId == null" @click="selectBatch"
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
        
            <div class="mt-4 flex-grow-1 overflow-y-auto">
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
                                    <th class="text-center" style="width: 150px;">Select</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in stoBatchPickingStore.availableStocks" :key="index"
                                    :class="{ 'selected-row': item.is_selected, 'disabled-row': isBatchAlreadyReserved(item) }">
                                    <td>{{ item.BATCH }}</td>
                                    <td>
                                        {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                    </td>
                                    <td :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
                                        {{ item.SLED_STR }}
                                    </td>
                                    <td>{{ numberWithCommaFixed(item.AGE) }} DAY(S)</td>
                                    <td>
                                        {{ numberWithCommaFixed(item.BAG) }}
                                        {{ item.BASE_UOM }}
                                    </td>
                                    <!-- Batch selection checkbox -->
                                    <td class="py-2 text-center">
                                        <v-checkbox-btn
                                            v-model="item.is_selected"
                                            :disabled="isBatchAlreadyReserved(item)"
                                            color="primary"
                                            density="compact"
                                            hide-details
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-tabs-window-item>
                </v-tabs-window>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex justify-end mt-4 pa-4">
                <v-btn variant="outlined" color="grey" class="mr-2" @click="handleClose">Back</v-btn>
                <v-btn color="primary" :disabled="!isReadyToReserve" @click="reserveBatch" type="button">Reserve Batches</v-btn>
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
                <div>
                    <div class="mb-2"><strong>Material Code:</strong>
                        {{  removeLeadingZeros(stoBatchPickingStore.stoDetails?.material_code) }}
                    </div>
                    <div class="mb-2"><strong>Material Desc:</strong>
                        {{ stoBatchPickingStore.stoDetails?.material_description }}
                    </div>
                </div>
            </div>

            <!-- Context Alert Message -->
            <v-card-text class="text-body-1 text-center text-medium-emphasis px-4 pb-4">
                Are you sure you want to cancel this reserved batch?
            </v-card-text>

            <div class="px-4 mb-4">
                <v-table density="compact" class="elevation-1 border rounded">
                    <thead>
                        <tr>
                            <th>Reserved Batch</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ selectedTransactionItem?.batch || '-' }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </div>

            <v-divider class="mx-4 mb-4"></v-divider>

            <!-- Action Control Tray -->
            <v-card-actions class="justify-end gap-2 px-4 pb-2">
                <v-btn variant="outlined" @click="cancelReservationDialogVisible = false">
                    Go Back
                </v-btn>
                <v-btn color="error" variant="elevated" :loading="cancelLoading" @click="executeCancel">
                    Yes, Cancel Reservation
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

.disabled-row {
    opacity: 0.6;
}

/* 2. Add sharp vertical lines between EVERY column */
.v-table tbody tr td {
    border-right: 1px solid #e0e0e0 !important;
}

/* 3. Strip the very last right wall border to keep the grid boundary clean */
.v-table tbody tr td:last-child {
    border-right: none !important;
}

/* 4. Draw a distinct horizontal divider ONLY at the very bottom of each transport group */
.transport-group-row:last-child td {
    border-bottom: 2px solid #b0bec5 !important; /* Slightly darker line to anchor the group */
}

/* 5. Highlight the full collective block container on hover states */
.transport-group-container:hover td {
    background-color: #f8f9fa !important;
}
</style>
