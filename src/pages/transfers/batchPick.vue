<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const stoBatchPickingStore = useStoBatchPickingStore();

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    stoData: {
        type: Object,
        default: () => ({})
    }
});

const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const pageLoading = ref(false);

watch(() => props.stoData, async (newData) => {
    if (newData && newData.po_number) {
        pageLoading.value = true;
        const params = {
            po_number: newData.po_number,
            po_item: newData.po_item
        };

        const openQuantityParams = {
            po_number: newData.po_number,
            po_item: newData.po_item,
            po_quantity: newData.qty,
            plant_code: newData.supplying_plant,
            sloc: newData.issuing_sloc_sto
        }

        const availableParams = {
            po_number: newData.po_number,
            po_item: newData.po_item,
            po_quantity: newData.qty,
            plant_code: newData.supplying_plant,
            sloc: newData.issuing_sloc_sto,
            material_code: newData.material_code
        }

        try {

            // 1. Fetch header details and open quantity first
            await stoBatchPickingStore.fetchHeaderDetails(params);
            await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

            // 2. Check the store's state for the open quantity balance
            // Change ".openQuantity" to match your Pinia store's exact state variable name
            if (stoBatchPickingStore.stoDetails?.open_quantity > 0) {
                await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
            }

            // await stoBatchPickingStore.fetchHeaderDetails(params);
            // await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);
            // await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
            // await stoBatchPickingStore.fetchOtherAvailableCommodities(delParams);

        } catch (error) {
            console.error("Failed to fetch picking data:", error);
        } finally {
            pageLoading.value = false;
        }
    }
}, { immediate: true });

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

const handleClose = () => {
    emit('close');
};

const activeTab = ref('available_stocks');
const selectPallets = () => {
    let selectedBatchData = [];


    toast.value.show = false;
    if (stoBatchPickingStore.activeTab === 'available_stocks') {
        selectedBatchData = stoBatchPickingStore.availableStocks
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets,
                bags_quantity: stock.split_qty_bag
            }));
    } else {

        if (stoBatchPickingStore.customerApprovalFile === null) {
            toast.value.color = 'error';
            toast.value.message = 'Please select customer approval document.';
            toast.value.show = true;
            return;
        }

        // Assuming the same logic for the other data source
        selectedBatchData = stoBatchPickingStore.otherStocks
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets,
                bags_quantity: stock.split_qty_bag
            }));

    }

    if (selectedBatchData.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'No selected batches.';
        toast.value.show = true;
        return;
    }

    const totalSelectedBags = selectedBatchData.reduce((sum, batch) => sum + Number(batch.bags_quantity), 0);

    if (totalSelectedBags > stoBatchPickingStore.stoDetails?.open_quantity) {
        toast.value.color = 'error';
        toast.value.message = 'Bags on selected pallet exceeds open quantity.';
        toast.value.show = true;
        return;
    }

    stoBatchPickingStore.setBatches(selectedBatchData);
    stoBatchPickingStore.setOriginalBatchList(selectedBatchData);

    selectPalletDialogVisible.value = true;
    // router.push({
    //     name: 'sto-pallet-selection',
    //     params: { po_number: props.stoData?.po_number, po_item: props.stoData?.po_item }
    // });
}

const headers = [
    { title: 'Physical ID', key: 'physical_id' },
    { title: 'Batch', key: 'batch' },
    { title: 'Quantity', key: 'quantity' },
    { title: 'Actions', key: 'actions', sortable: false }
];

const addedPallets = ref([]);
const selectedPallet = ref(null)
const selectPalletDialogVisible = ref(false)
const loading = ref(false)
const availablePallets = ref([]);
const palletsLoading = ref(false);
const search = ref('');
const addPallet = () => {

    if (!selectedPallet.value) return;

    toast.value.show = false;

    const inventoryItem = selectedPallet.value;

    if (selectedPallet.value) {
        const targetBatch = stoBatchPickingStore.originalBatchList.find(b => b.BATCH === inventoryItem.batch);

        if (targetBatch) {
            // Count how many pallets belonging to this specific batch have already been added
            const currentBatchCount = addedPallets.value.filter(p => p.batch === inventoryItem.batch).length;

            // 3. Block additions if the action breaks your max batch limit rule
            if (currentBatchCount >= targetBatch.pallet_quantity) {
                toast.value.message = `Cannot add more than ${targetBatch.pallet_quantity} pallet(s) for batch ${inventoryItem.batch}.`;
                toast.value.color = 'error';
                toast.value.show = true;
                return;
            }
        }

        // Check if already added
        const exists = addedPallets.value.find(p => p.id === selectedPallet.value.id);
        if (!exists) {
            addedPallets.value.push({
                ...selectedPallet.value,
                is_assigned: false
            });
            selectedPallet.value = null; // Reset selection
            search.value = ''; // Reset search
        }
    }
};

const removePallet = (item) => {
    addedPallets.value = addedPallets.value.filter(p => p.id !== item.id);
}

const fetchPallets = async (searchQuery = '') => {
    palletsLoading.value = true;
    try {
        const batchKeys = stoBatchPickingStore.originalBatchList.map(item => item.BATCH);
        const batchString = batchKeys.join(','); 
      
        const response = await ApiService.query('transfer-orders/get-pallets', {
            params: {
                search: searchQuery,
                limit: searchQuery ? null : 10,
                batch: batchString  
            }
        });
        
        // Populate the autocomplete selections list
        availablePallets.value = response.data.data;
        console.log(availablePallets.value)
        console.log(response.data)
    } catch (error) {
        console.error('Failed fetching pallets:', error);
    } finally {
        palletsLoading.value = false;
    }
};

watch(
    () => stoBatchPickingStore.originalBatchList,
    (newBatches) => {
        // Only fetch if the store actually has batches loaded
        if (newBatches && newBatches.length > 0) {
            fetchPallets(search.value || '');
        }
    },
    { immediate: true, deep: true } 
    // immediate: true handles cases where data might already be there
);

watch(search, (newVal) => {
    if (newVal !== selectedPallet.value?.pallet_code) { // Avoid refetching when selecting an item
         debouncedFetchPallets(newVal);
    }
});


const debouncedFetchPallets = debounce((query) => {
    fetchPallets(query);
}, 500);

onMounted(() => {
    fetchPallets()
})

const distributedPallets = computed(() => {
    let remaining = stoBatchPickingStore.stoDetails?.open_quantity || 0;
    return addedPallets.value.map(item => {
        // Fallback to qty or quantity depending on your API inventory properties
        const maxTake = parseFloat(item.qty || item.quantity || 0);
        const take = Math.min(maxTake, remaining);
        remaining -= take;
        return {
            ...item,
            take_quantity: take
        };
    });
});

const handleSave = async () => {
    // 1. Validation Guard: Check if list selection is empty
    if (addedPallets.value.length === 0) {
        toast.value.message = 'No pallets selected to reserve.';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }

    // 2. Initialize and Populate FormData matching your exact reference requirements
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
    formData.append('batches', JSON.stringify(distributedPallets.value));
    
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
            selectPalletDialogVisible.value = false
            emit('updated');
            // Redirect route window view back to index overview listings dashboard
            // router.push({
            //     name: 'transfer-orders',
            // });
        }

    } catch (error) {
        console.error('Request Execution Error:', error);
        toast.value.color = 'error';
        toast.value.message = 'An unexpected connection error occurred while parsing operations.';
        toast.value.show = true;
    } finally {
        loading.value = false;
    }

}


</script>

<template>
    <DefaultModal :show="show" @close="handleClose" max-width="1400"
        class="d-flex align-center justify-center" >
        <v-card>
            <div class="d-flex justify-space-between align-center px-4 mt-4">
                <h4 class="text-h4 mx-4 font-weight-black text-primary">Batch Picking</h4>
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
                                        <span class="text-medium-emphasis">{{ parseInt(stoData?.material_code, 10)
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
                                        <span class="text-medium-emphasis">{{ stoData?.po_number }}</span>
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
                                        <span class="text-medium-emphasis">{{ stoData?.material_description }}</span>
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
                                            {{ stoData?.po_item }}
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
                                        <span class="text-medium-emphasis">{{ stoData?.supplying_order_plant?.plant_code
                                        }} - {{ stoData?.supplying_order_plant?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Plant</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ stoData?.receiving_order_plant?.plant_code
                                        }} - {{ stoData?.receiving_order_plant?.name }}</span>
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
                                        <span class="text-medium-emphasis">{{ stoData?.issuing_storage_location?.code }}
                                            - {{ stoData?.issuing_storage_location?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Sloc</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ stoData?.receiving_storage_location?.code
                                        }} - {{ stoData?.receiving_storage_location?.name }}</span>
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
                                            {{ Number(stoData?.qty ?? 0).toLocaleString('en-US', {
                                                minimumFractionDigits: 2, maximumFractionDigits: 2
                                            }) }}
                                            {{ stoData?.commercial_uom?.commercial_uom }}
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
                                            {{ stoData?.commercial_uom?.commercial_uom }}
                                        </span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Transport No.</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ stoBatchPickingStore.selectedTransport?.transport?.transport_number }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Vehicle</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ stoBatchPickingStore.selectedTransport?.transport?.vehicle?.plate_number
                                            }}
                                        </span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Driver</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ stoBatchPickingStore.selectedTransport?.transport?.driver?.full_name }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Transport QTY</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ numberWithComma(stoBatchPickingStore.selectedTransport?.qty) }} {{
                                                stoData?.uom }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>

                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
            <v-divider class="my-4"></v-divider>
            <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card-text v-else>
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
                                        <th>Split Qty</th>
                                        <th>Min. Pallet</th>
                                        <th>Min. Qty</th>
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
                                        <td
                                            :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
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
                                        <td> {{ numberWithComma(item.split_qty_bag) }} {{ item.BASE_UOM }}</td>

                                        <td class="text-uppercase"
                                            :class="{ 'text-error': item.saved_reserved != null }">
                                            {{ item.split_qty_pallets }}
                                            Pallet
                                        </td>
                                        <td>{{ item.inventory_qty }} {{ item.BASE_UOM }}</td>
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

                        <v-tabs-window-item value="other_stocks">
                            <v-table density="compact" class="stock-table elevation-0">
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
                                        <th>Min. Qty</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(item, index) in stoBatchPickingStore.otherStocks" :key="index"
                                        :class="{ 'selected-row': item.selected }">
                                        <td>{{ item.batch_code }}</td>
                                        <td>{{ item.mfg_date }}</td>
                                        <td>{{ item.expiration_date }}</td>
                                        <td>{{ item.age }}</td>
                                        <td>{{ item.avail_qty }}</td>
                                        <td>{{ item.avail_pallets }}</td>
                                        <td>{{ item.split_qty }}</td>
                                        <td>{{ item.min_pallet }}</td>
                                        <td>{{ item.min_qty }}</td>
                                        <td>
                                            <v-checkbox v-model="item.selected" hide-details
                                                density="compact"></v-checkbox>
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
                    <v-btn color="primary" v-if="parseInt(stoBatchPickingStore.stoDetails?.open_quantity) > 0"
                        @click="selectPallets" type="button">Select Pallets</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </DefaultModal>

    <v-dialog v-model="selectPalletDialogVisible" max-width="900px" scrollable>
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
                            <div class="d-flex align-center flex-wrap gap-1 mt-1">
                                <strong>Batch:</strong>
                                <v-chip
                                    v-for="(batchItem, index) in stoBatchPickingStore.originalBatchList"
                                    :key="index"
                                    color="primary"
                                    variant="tonal"
                                    size="small"
                                    class="ml-1"
                                >
                                    {{ batchItem.BATCH }} 
                                    <v-avatar right class="bg-primary-darken-1 white--text ml-2 px-2" size="16">
                                        {{ batchItem.pallet_quantity }}
                                    </v-avatar>
                                </v-chip>
                            </div>
                        </div>
                   </div>
                </div>

                <v-row align="center" class="my-2">
                    <v-col cols="12" md="8">
                        <v-autocomplete 
                            v-model="selectedPallet"
                            v-model:search="search"
                            :items="availablePallets"
                            :loading="palletsLoading"
                            item-title="physical_id"
                            item-value="id"
                            label="Search Pallet"
                            return-object
                            variant="outlined"
                            density="compact"
                            hide-details
                            placeholder="Search pallets..."
                            no-filter
                        >
                     
                              <template #item="{ props, item }">
                                <v-list-item v-bind="props">
                                    <template #title>
                                        <div class="font-weight-bold">
                                            {{ item.raw.physical_id }}
                                        </div>
                                    </template>

                                    <template #subtitle>
                                        <div class="text-caption text-wrap">
                                            {{ item.raw.batch }}
                                        </div>
                                    </template>

                                </v-list-item>
                            </template>
                        </v-autocomplete>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-btn color="primary" block @click="addPallet">
                            Add Pallet
                        </v-btn>
                    </v-col>
                </v-row>

                <v-data-table
                    :headers="headers"
                    :items="addedPallets"
                    class="elevation-1 border rounded"
                    density="compact"
                >
                    <template #item.actions="{ item }">
                        <v-btn 
                            icon="ri-delete-bin-line" 
                            size="small" 
                            :color="item.is_assigned ? 'error' : 'warning'" 
                            variant="text" 
                            :title="item.is_assigned ? 'Remove assigned pallet' : 'Remove from list'"
                            @click="removePallet(item)"
                        ></v-btn>
                    </template>
                    <template #no-data>
                        <div class="pa-4 text-center text-grey">
                            No pallets assigned. Search and add pallets above.
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="selectPalletDialogVisible = false">Cancel</v-btn>
                <v-btn color="primary" variant="elevated" @click="handleSave" :loading="loading">Save</v-btn>
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
