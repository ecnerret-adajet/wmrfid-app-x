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
import { VNumberInput } from 'vuetify/labs/VNumberInput';

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
        (item) => item.id === selectedTransportId.value
    );

    stoBatchPickingStore.selectedTransport = selectedTransport;

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
    pageLoading.value = true;
    toast.value.show = false;

    // 1. Filter out only the raw checked pallet records selected by the user
    const selectedPalletsData = availablePallets.value.filter(pallet => 
        selectedPalletIds.value.includes(Number(pallet.id))
    );

    if (!selectedPalletsData || selectedPalletsData.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'No pallets selected. Please allocate pallets to a batch.';
        toast.value.show = true;
        pageLoading.value = false;
        return;
    }

    const selectedBatchData = stoBatchPickingStore.availableStocks.filter(
        item => parseInt(item.reserved_pallets, 10) > 0
    );

    if (selectedBatchData.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'No selected batches.';
        toast.value.show = true;
        pageLoading.value = false;
        return;
    }

    // 2. Prepare variables for conditional UOM weight conversion
    const uom = String(stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom || '').toUpperCase();
    const num = parseFloat(stoBatchPickingStore.stoDetails?.numerator) || 50;
    const den = parseFloat(stoBatchPickingStore.stoDetails?.denominator) || 1;
    const bagWeightMultiplier = den > 0 ? (num / den) : num;
    
    // Sync state summaries back into the local Pinia store structures
    stoBatchPickingStore.setBatches(selectedBatchData);
    stoBatchPickingStore.setOriginalBatchList(selectedBatchData);

    // 3. Format the final payload matrix array mapping variables explicitly onto each record line
    const formattedBatchesForBackend = selectedPalletsData.map(pallet => {
        const currentBatchCode = pallet.BATCH || pallet.batch;
        
        // Determine base quantity from inventory fields (supporting quantity or qty fallback properties)
        const baseInventoryQty = parseFloat(pallet.quantity ?? 0);
        
        // Convert to KG if required, otherwise preserve the raw bag inventory coun
        const finalTakeQuantity = uom === 'KG' ? (baseInventoryQty * bagWeightMultiplier) : baseInventoryQty;

        return {
            id: pallet.id,
            BATCH: currentBatchCode,
            MANUF_DATE: pallet.MANUF_DATE || pallet.mfg_date, 
            MANUF_DATE_STR: pallet.MANUF_DATE_STR || pallet.mfg_date || '', 
            rfid_code: pallet.rfid_code || pallet.RFID_CODE || '',
            physical_id: pallet.physical_id || '',
            material_id: pallet.material_id || '',
            
            // Evaluates and scales individual pallet record weights dynamically to match backend trait rules
            take_quantity: finalTakeQuantity
        };
    });

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
    formData.append('transport_number', stoBatchPickingStore.selectedTransport?.transport?.transport_number ?? '');
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
        selectPalletDialogVisible.value = false;
        pageLoading.value = false;
        if (typeof selectedTransportId !== 'undefined') selectedTransportId.value = null;
        if (typeof selectedTransactionItem !== 'undefined') selectedTransactionItem.value = null;
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
    // selectedPallet.value = null;
    // addedPallets.value = [];
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
const selectedTransportGroup = ref(null);
async function cancelReservation(item, group) {
    cancelReservationDialogVisible.value = true;
    reservedLoading.value = true;
    try {
        const response = await ApiService.query(`transfer-orders/get-reserved-pallets/${item.purchase_order_item?.po_number}/${item.purchase_order_item?.po_item}/${item.batch}`, {

        });
        reservedPallets.value = response.data.reserved_pallets;
    } catch (error) {
        console.error('Failed fetching reserved_pallets:', error);
    } finally {
        reservedLoading.value = false;
    }

    selectedTransactionItem.value = item
    selectedTransportGroup.value = group
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

// Ensures users can't manually type values outside valid inventory bounds
const validatePalletInput = (item) => {
    if (item.reserved_pallets > item.inventory.length) {
        item.reserved_pallets = item.inventory.length;
    }
    if (item.reserved_pallets < 0 || !item.reserved_pallets) {
        item.reserved_pallets = 0;
    }
};

// Computed check replacement for the Reserve Button disabled state
const isReadyToReserve = computed(() => {
    // Array safety check
    if (!stoBatchPickingStore.availableStocks) return false;

    // Must have at least one selected item that ALSO has a pallet count > 0
    return stoBatchPickingStore.availableStocks.some(item => {
        const hasValidPallets = item.reserved_pallets !== null && 
                                item.reserved_pallets !== undefined && 
                                Number(item.reserved_pallets) > 0;
                                
        return hasValidPallets;
    });
});

const selectPalletDialogVisible = ref(false);
const selectPallets = async() => {
    const chosenBatches = stoBatchPickingStore.availableStocks
        .filter(item => parseInt(item.reserved_pallets, 10) > 0)
        .map(item => item.BATCH);

    const batchString = chosenBatches.join(',');

    await fetchPallets(batchString);

    selectBatchDialog.value = false; 
    
    selectPalletDialogVisible.value = true;
}

const availablePallets = ref([]);
const selectedPalletIds = ref([]);

const fetchPallets = async (batchString) => {
    pageLoading.value = true;
    try {
      
        const response = await ApiService.query('transfer-orders/get-pallets', {
            params: {
                batch: batchString  
            }
        });
        
        const fetchedItems = response.data.data || [];
        availablePallets.value = fetchedItems;

        // Container to accumulate the correct contextual pallet IDs
        const autoSelectedIds = [];

        // 1. Get all batches that have an active pallet reservation count
        const activeBatches = stoBatchPickingStore.availableStocks.filter(
            item => parseInt(item.reserved_pallets, 10) > 0
        );

         // 2. Distribute the limits strictly mapped by batch name
        activeBatches.forEach(batchRow => {
            const batchLimit = parseInt(batchRow.reserved_pallets, 10);
            
            // Filter out only the incoming API items belonging to THIS specific batch
            // Note: Update 'item.BATCH' or 'item.batch' to match your API response schema exactly
            const matchingPalletsForBatch = fetchedItems.filter(
                item => item.BATCH === batchRow.BATCH || item.batch === batchRow.BATCH
            );

            // Slice only up to this specific batch's requested pallet allocation limit
            const slicedPallets = matchingPalletsForBatch.slice(0, batchLimit);
            
            // Map to IDs and push to the master tracking collection
            slicedPallets.forEach(pallet => autoSelectedIds.push(Number(pallet.id)));
        });

        selectedPalletIds.value = autoSelectedIds;

    } catch (error) {
        console.error('Failed fetching pallets:', error);
    } finally {
        pageLoading.value = false;
    }
};

const headers = [
    { title: 'Physical ID', key: 'physical_id' },
    { title: 'Batch', key: 'batch' },
    { title: 'Quantity', key: 'quantity' },
    { title: 'Mfg Date', key: 'mfg_date', sortable: false }
];

const totalReservedQuantity = computed(() => {
    if (!availablePallets.value || !selectedPalletIds.value.length) return 0;

    // 1. Filter out only the selected pallet records
    const activeSelectedPallets = availablePallets.value.filter(pallet => {
        const palletId = pallet.id ?? pallet.value;
        return selectedPalletIds.value.includes(Number(palletId));
    });

    // 2. Sum up total bags from selected rows
    const totalBags = activeSelectedPallets.reduce((sum, pallet) => {
        return sum + (parseFloat(pallet.quantity ?? pallet.qty) || 0);
    }, 0);

    // 3. Check the target commercial unit measurement
    const uom = String(stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom || '').toUpperCase();
    if (uom === 'KG') {
        const num = parseFloat(stoBatchPickingStore.stoDetails?.numerator) || 50;
        const den = parseFloat(stoBatchPickingStore.stoDetails?.denominator) || 1;

        // Run the math formula locally to bypass the missing store function error
        const bagWeightMultiplier = den > 0 ? (num / den) : num;

        return totalBags * bagWeightMultiplier;
    }

    return totalBags;
});

const reservedPalletsHeaders = [
    { title: 'Physical ID', key: 'physical_id' },
    { title: 'Batch', key: 'batch' },
    { title: 'Quantity', key: 'quantity' },
    { title: 'Mfg Date', key: 'mfg_date', sortable: false }
];

const reservedLoading = ref(false);
const reservedPallets = ref([])
const viewReserved = async (item) => {
    viewReservedPallets.value = true;
    reservedLoading.value = true;
    try {
        const response = await ApiService.query(`transfer-orders/get-reserved-pallets/${item.purchase_order_item?.po_number}/${item.purchase_order_item?.po_item}/${item.batch}`, {

        });
        reservedPallets.value = response.data.reserved_pallets;
    } catch (error) {
        console.error('Failed fetching reserved_pallets:', error);
    } finally {
        reservedLoading.value = false;
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
                                            {{ numberWithComma(item.qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                        </td>

                                        <!-- Batch Metrics Columns (Rendered on EVERY individual row line) -->
                                        <td>{{ item.batch }}</td>
                                        <td>
                                            {{ numberWithComma(item.reserved_qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                        </td>
                                        
                                        <!-- Actions Column (Rendered on EVERY individual row line next to its respective batch metrics) -->
                                        <td>
                                            <v-btn v-if="parseFloat(item.reserved_qty) > 0" @click="cancelReservation(item, group)"
                                                size="x-small" class="text-xs" variant="outlined" 
                                                color="error">Cancel Reserve</v-btn>
                                            <v-btn v-if="parseFloat(item.reserved_qty) > 0" @click="viewReserved(item, group)"
                                                size="x-small" class="text-xs ml-2" variant="outlined" 
                                                color="info">View Reserve</v-btn>
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
                                    <th>Avail Pallets</th>
                                    <!-- New Column Header -->
                                    <th style="width: 150px;">Reserve Pallets</th>
                                    <!-- <th></th> -->
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in stoBatchPickingStore.availableStocks" :key="index"
                                    :class="{ 'selected-row': item.is_selected }">
                                    <td>{{ item.BATCH }}</td>
                                    <td>
                                        {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                    </td>
                                    <td :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
                                        {{ item.SLED_STR }}
                                    </td>
                                    <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                    <td>
                                        {{ numberWithComma(item.BAG) }}
                                        {{ item.BASE_UOM }}
                                    </td>
                                    <td>
                                        {{ item.inventory.length }} PALLET(s)
                                    </td>
                                    <!-- New Reserve Pallets Input Column -->
                                    <td class="py-2">
                                        <v-number-input
                                            v-model="item.reserved_pallets"
                                            :reverse="false"
                                            controlVariant="default"
                                            label=""
                                            :hideInput="false"
                                            :inset="false"
                                            density="compact"
                                            hide-details
                                            variant="outlined"
                                            :min="0"
                                            :max="item.inventory.length"
                                            @update:model-value="validatePalletInput(item)"
                                        ></v-number-input>
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
                <v-btn color="primary"  :disabled="!isReadyToReserve" @click="selectPallets"
                        type="button">Select Pallets</v-btn>
            </div>
        </v-card>
    </v-dialog>

    <v-dialog v-model="selectPalletDialogVisible" max-width="1000px" scrollable>
        <v-card class="d-flex flex-column" height="600px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Assign Pallets</span>
                <v-btn icon="ri-close-line" variant="text" @click="selectPalletDialogVisible = false"></v-btn>
            </v-card-title>

            <v-divider></v-divider>
            
            <v-card-text class="flex-grow-1 overflow-y-auto">
                <div class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                   <div class="d-flex justify-space-between align-center">
                        <div>
                            <div class="mb-2"><strong>Receiving Plant:</strong> {{
                                stoBatchPickingStore?.stoDetails?.receiving_order_plant?.plant_code }} - {{
                                    stoBatchPickingStore?.stoDetails?.receiving_order_plant?.name }}
                            </div>
                            <div class="mb-2"><strong>Receiving Sloc:</strong> {{
                                stoBatchPickingStore?.stoDetails?.receiving_storage_location?.code }} - {{
                                    stoBatchPickingStore?.stoDetails?.receiving_storage_location?.name }} 
                            </div>
                            <div class="mb-2"><strong>Material:</strong> {{ removeLeadingZeros(stoBatchPickingStore?.stoDetails?.material_code) }} - 
                                {{ stoBatchPickingStore?.stoDetails?.material_description }}
                            </div>
                            
                            <div v-if="stoBatchPickingStore.selectedTransport" class="mb-2" >
                                <strong>Transport:</strong>
                                {{ stoBatchPickingStore.selectedTransport?.transport?.transport_number }}
                            </div>

                            <div v-if="stoBatchPickingStore.selectedTransport" class="mb-2" >
                                <strong>Plate Number:</strong>
                                {{ stoBatchPickingStore.selectedTransport?.transport?.vehicle?.plate_number }}
                            </div>

                            <div v-if="stoBatchPickingStore.selectedTransport" class="mb-2" >
                                <strong>Driver:</strong>
                                {{ stoBatchPickingStore.selectedTransport?.transport?.driver?.full_name }}
                            </div>

                             <div class="d-flex align-center flex-wrap gap-1 mt-1">
                                <strong>Batch:</strong>
                                <template v-for="(batchItem, index) in stoBatchPickingStore.availableStocks" :key="index">
                                    <v-chip
                                        v-if="parseInt(batchItem.reserved_pallets, 10) > 0"
                                        color="primary"
                                        variant="tonal"
                                        size="small"
                                        class="ml-1"
                                    >
                                        {{ batchItem.BATCH }} 
                                        <!-- Reflects the actual reserved pallet quantity specified by the user -->
                                        <v-avatar right class="bg-primary-darken-1 white--text ml-2 px-2" size="16">
                                            {{ batchItem.reserved_pallets }}
                                        </v-avatar>
                                    </v-chip>
                                </template>
                            </div>
                            <div class="mt-2">
                                <strong>Open Quantity:</strong>
                                <span class="text-error ml-2">
                                    {{ Number(stoBatchPickingStore?.stoDetails?.open_quantity ??
                                                0).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }) }}
                                    {{ stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom }}
                                </span>
                            </div>
                            <div class="mt-2">
                                <strong>Reserved Quantity:</strong>
                                <span class="text-success font-weight-bold ml-2">
                                    {{ Number(totalReservedQuantity).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }) }}
                                    {{ stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom }}
                                </span>
                            </div>
                        </div>
                   </div>
                </div>

                <v-data-table
                    v-model="selectedPalletIds"
                    :headers="headers"
                    :items="availablePallets"
                    class="elevation-1 border rounded"
                    show-select
                    density="compact"
                    item-value="id"
                >   
                    <template #item.mfg_date="{ item }">
                        <span>{{ item.mfg_date ? Moment(item.mfg_date).format('MMM D, YYYY') : '' }}</span>
                    </template>

                    <template #item.quantity="{ item }">
                        <span>{{ item.quantity }} {{stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom}}</span>
                    </template>

                    <template #no-data>
                        <div class="pa-4 text-center text-grey">
                            No pallets found with selected batch(es)
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="cancelPalletSelection">Cancel</v-btn>
                <v-btn color="primary" variant="elevated" @click="reserveBatch" :loading="loading">Save</v-btn>
            </v-card-actions>
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
                <v-data-table
                    :headers="reservedPalletsHeaders"
                    :items="reservedPallets"
                    :loading="reservedLoading"
                    class="elevation-1 border rounded"
                    density="compact"
                >   
                    <template #item.physical_id="{ item }">
                        <span>{{ item.pallet_physical_id }} </span>
                    </template>

                    <template #item.mfg_date="{ item }">
                        <span>{{ item.manufacturing_date ? Moment(item.manufacturing_date).format('MMM D, YYYY') : '' }}</span>
                    </template>

                    <template #item.quantity="{ item }">
                        <span>{{ item.total_qty }} {{stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom}}</span>
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

    <v-dialog v-model="viewReservedPallets" max-width="1000px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false"></v-btn>
            </v-card-title>
            <v-card-text>

                <v-data-table
                    :headers="reservedPalletsHeaders"
                    :items="reservedPallets"
                    :loading="reservedLoading"
                    class="elevation-1 border rounded"
                    density="compact"
                >   
                    <template #item.physical_id="{ item }">
                        <span>{{ item.pallet_physical_id }} </span>
                    </template>

                    <template #item.mfg_date="{ item }">
                        <span>{{ item.manufacturing_date ? Moment(item.manufacturing_date).format('MMM D, YYYY') : '' }}</span>
                    </template>

                    <template #item.quantity="{ item }">
                        <span>{{ item.total_qty }} {{stoBatchPickingStore?.stoDetails?.commercial_uom?.commercial_uom}}</span>
                    </template>

                    <template #no-data>
                        <div class="pa-4 text-center text-grey">
                            No pallets found with selected batch(es)
                        </div>
                    </template>
                </v-data-table>

                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                </div>
            </v-card-text>
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
