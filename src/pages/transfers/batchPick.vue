<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
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
            await stoBatchPickingStore.fetchHeaderDetails(params);
            await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
            // await stoBatchPickingStore.fetchOtherAvailableCommodities(delParams);
            await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);
            
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

const emit = defineEmits(['close']);

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
    console.log(props.stoData?.po_number);
    console.log(props.stoData?.po_item);
    router.push({
        name: 'sto-pallet-selection',
        params: { po_number: props.stoData?.po_number, po_item: props.stoData?.po_item }
    });
}

</script>

<template>
    <DefaultModal 
        :show="show" 
        @close="handleClose" 
        min-height="auto"
        class="position-absolute d-flex align-center justify-center" 
        :fullscreen="true"
    >
        <v-card>
            <div class="d-flex justify-space-between align-center px-4 mt-4">
                <h4 class="text-h4 mx-4 font-weight-black text-primary">Batch Picking</h4>
            </div>
            <v-card-title>
                <VList lines="one"  density="compact" class="mt-4">
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow  class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ parseInt(stoData?.material_code, 10)  }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">PO Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ stoData?.po_number  }}</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material Description</span>
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
                                        <span class="text-medium-emphasis">{{ stoData?.supplying_order_plant?.plant_code  }} - {{ stoData?.supplying_order_plant?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Plant</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ stoData?.receiving_order_plant?.plant_code  }} - {{ stoData?.receiving_order_plant?.name }}</span>
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
                                        <span class="text-medium-emphasis">{{ stoData?.issuing_storage_location?.code  }} - {{ stoData?.issuing_storage_location?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Receiving Sloc</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ stoData?.receiving_storage_location?.code  }} - {{ stoData?.receiving_storage_location?.name }}</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">PO Item Quantity</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">
                                            {{ Number(stoData?.qty ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
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
                                            {{ Number(stoBatchPickingStore?.stoDetails?.open_quantity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                                            {{ stoData?.commercial_uom?.commercial_uom }}
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

            <v-card-text>
                <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs" hide-slider>
                    <v-tab value="available_stocks" class="text-h5">
                        Available Stocks
                    </v-tab>
                    <v-tab value="other_stocks" class="text-h5">
                        Other Stocks
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
                                <tr v-for="(item, index) in stoBatchPickingStore.availableStocks" :key="index" :class="{ 'selected-row': item.selected }">
                                    <td>{{ item.BATCH }}</td>
                                    <td>
                                        {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : ''}}
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
                                <tr v-for="(item, index) in stoBatchPickingStore.otherStocks" :key="index" :class="{ 'selected-row': item.selected }">
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
                                        <v-checkbox v-model="item.selected" hide-details density="compact"></v-checkbox>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-tabs-window-item>
                </v-tabs-window>

                 <!-- Action Buttons -->
                <div class="d-flex justify-end mt-4 pa-4">
                    <v-btn variant="outlined" color="grey" class="mr-2" @click="handleClose">Back</v-btn>
                    <v-btn color="primary" @click="selectPallets" type="button">Select Pallets</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </DefaultModal>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    <Loader :show="pageLoading" />

</template>

<style scoped>
.custom-tabs {
  border-bottom: none !important;
  box-shadow: none !important; /* if there's a shadow */
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
