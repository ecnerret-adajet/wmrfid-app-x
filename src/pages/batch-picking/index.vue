<script setup>
import { numberWithComma } from '@/composables/useHelpers';
import { useBatchPickingStore } from '@/stores/batchPickingStore';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const batchPickingStore = useBatchPickingStore();
// const signature = route.query.signature;

const do_number = route.params.do_number;
const activeTab = ref('available_stocks');
onMounted(async () => {
    const params = {
        // signature: signature,
        do_number: do_number
    };

    await batchPickingStore.fetchHeaderDetails(params);
});

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

const showBatchSelection = ref(false);
const batchLoading = ref(false)
const selectBatch = (item) => {
    showBatchSelection.value = true;
    batchPickingStore.selectedDeliveryItem = item;
    return new Promise(async (resolve, reject) => {
        try {
            batchLoading.value = true;
            if (showBatchSelection.value === true) {
                const delParams = {
                    material_code: item.material_number,
                    delivery_document: item.delivery_document,
                    item_number: item.item_number,
                    delivery_quantity: item.delivery_quantity,
                    sales_unit: item.sales_unit,
                    storage_location: item.storage_location,
                    plant: item.plant,
                };

                await batchPickingStore.checkAgeRange(delParams);
                await batchPickingStore.fetchAvailableCommodities(delParams);
                await batchPickingStore.fetchOpenQuantity(delParams);

                // await batchPickingStore.fetchOtherAvailableCommodities(delParams);
            }

            resolve();
        } catch (error) {
            reject(error);
        } finally {
            batchLoading.value = false;
        }
    });
} 

const expirationChecking = (date) => {
    const currentDate = Moment();
    const comparisonDate = Moment(date).format('YYYY-MM-DD');
    return currentDate.isAfter(comparisonDate);
};

const selectPallets = () => {
    let selectedBatchData = [];

    if (activeTab.value === 'available_stocks') {
        selectedBatchData = batchPickingStore.availableStocks
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets
            }));
    } else {
        // Assuming the same logic for the other data source
        selectedBatchData = batchPickingStore.otherDataSource
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets
            }));
    }
    
    batchPickingStore.setBatches(selectedBatchData);
 
    router.push({ 
        name: 'pallet-selection', 
        params: { do_number: do_number } 
    });
}

</script>
<template>
    <div class="d-flex align-center justify-center" style="min-height: calc(100vh - 64px);">
        <v-card elevation="2" class="mx-auto" style="min-width:400px; max-width:1200px; width:100%;">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Delivery Details
                </div>
            </v-card-title>
            <v-card-text>
                <v-skeleton-loader v-if="batchPickingStore.headerDetailsLoading" type="article"></v-skeleton-loader>
                <div v-else>
                    <VList lines="one" density="compact">
                        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.do_number }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                 <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" >BU Delivery</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document || null }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Party</span>
                                        </VCol>
                                        <VCol class="d-flex flex-column">
                                            <span class="text-medium-emphasis font-weight-medium">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer }}</div>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Address</span>
                                        </VCol>
                                        <VCol class="d-inline-flex">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_address }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Shipping Point</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">N/A</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Shipment Number</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.shipment_no }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Route</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.route }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Server</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.sap_server }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Date</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.delivery_date }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                        </VListItem>
                    </VList>
                </div>
                <v-divider class="mt-4 mb-4"></v-divider>
                <div class="text-h4 font-weight-bold ps-2 text-primary mx-2 px-2 mt-6">
                    Delivery Items
                </div>
                <v-skeleton-loader v-if="batchPickingStore.headerDetailsLoading" type="table"></v-skeleton-loader>
                <v-table v-else class="mt-4 striped">
                    <thead>
                        <tr>
                            <th>Item No.</th>
                            <th>Material</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Storage Location</th>
                            <th class="text-center">Picking</th>
                            <th class="text-center">GI</th>
                            <th class="text-center">Pallet Status</th>
                            <th class="text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in batchPickingStore.deliveryDetails?.customer_delivery?.delivery_items" :key="item.id">
                            <td>{{ item.item_number }}</td>
                            <td>
                                <div class="d-flex flex-column py-3">
                                    <span class="font-weight-bold">{{ removeLeadingZeros(item.material_number) }}</span>
                                    <span>{{ item.material_description }}</span>
                                </div>
                            </td>
                            <td class="text-center">{{ item.delivery_quantity }}</td>
                            <td class="text-center">
                                <div class="d-flex flex-column py-3">
                                    <span>{{ item?.storage_location }}</span>
                                </div>
                            </td>
                            <td class="text-center">{{ batchPickingStore.deliveryDetails?.picking_status }}</td>
                            <td class="text-center">{{ batchPickingStore.deliveryDetails?.goods_issue_status }}</td>
                            <td class="text-center">
                                <!-- If no reservation yet -->
                                <v-badge v-if="item.delivery_reserved_orders?.length === 0"
                                    color="warning"
                                    content="No Pallet"
                                    class="text-uppercase"
                                    inline
                                ></v-badge>
                                <!-- if reserved full quantity  -->
                                <v-badge v-else-if="item.total_reserved_pallets > 0 && (parseInt(item.total_reserved_pallets) === parseInt(item.required_pallets))"
                                    color="success"
                                    content="Reserved"
                                    class="text-uppercase"
                                    inline
                                ></v-badge>
                                <!-- If partially reserved  -->
                                <div v-else class="d-flex flex-column py-3">
                                    <v-badge 
                                        color="info"
                                        content="Partially Reserved"
                                        class="text-uppercase"
                                        inline
                                    ></v-badge>
                                    <span class="mt-1">{{ item.total_reserved_pallets }} out of {{ item.required_pallets }} pallet(s)</span>
                                </div>
                            </td>
                            <td class="text-center">
                                <v-btn
                                    @click="selectBatch(item)"
                                    :color="item.total_reserved_pallets > 0 && (parseInt(item.total_reserved_pallets) === parseInt(item.required_pallets)) ? 'success' : 'primary-light'"
                                    variant="outlined"
                                    size="small"
                                >
                                    {{ item.total_reserved_pallets > 0 && (parseInt(item.total_reserved_pallets) === parseInt(item.required_pallets)) ? 'View Reserved' : 'Select Batch' }}
                                </v-btn>
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>
    </div>

    <v-dialog v-model="showBatchSelection" max-width="1300px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Batch Selection
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="showBatchSelection = false"
                ></v-btn>
            </v-card-title>
            <v-card-text>
                <v-skeleton-loader v-if="batchLoading" type="article"></v-skeleton-loader>
                <div v-else>

                    <VList lines="one" density="compact">
                        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.do_number }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                 <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" >BU Delivery</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document || null }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Party</span>
                                        </VCol>
                                        <VCol class="d-flex flex-column">
                                            <span class="text-medium-emphasis font-weight-medium">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer }}</div>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                                        </VCol>
                                        <VCol class="d-flex flex-column">
                                            <span class="text-medium-emphasis font-weight-medium">{{ batchPickingStore.selectedDeliveryItem.material_description }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{ removeLeadingZeros(batchPickingStore.selectedDeliveryItem.material_number) }}</div>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Route</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.route }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Server</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.sap_server }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Date</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.delivery_date }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                 <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Item Number</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.item_number }}</span>
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
                                            <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.plant_model?.plant_code }} - {{ batchPickingStore.selectedDeliveryItem?.plant_model?.name }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                 <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Storage Location</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.storage_location_model?.code }} - {{ batchPickingStore.selectedDeliveryItem?.storage_location_model?.name }}</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Required Quantity </span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.delivery_quantity }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                 <VCol md="6" class="table-cell d-inline-flex">
                                     <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Age</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{ batchPickingStore?.product_age?.from }} - {{ batchPickingStore?.product_age?.to }} Days</span>
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
                                            <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.open_quantity }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                        </VListItem>
                    </VList>

                    <div v-if="parseInt(batchPickingStore.selectedDeliveryItem.required_pallets) !== parseInt(batchPickingStore.selectedDeliveryItem.total_reserved_pallets)">

                        <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs">
                            <v-tab value="available_stocks" class="text-h5">
                                Available Stocks
                            </v-tab>
                            <v-tab value="other_stocks" class="text-h5">
                                Other Stocks
                            </v-tab>
                        </v-tabs>

                        <v-skeleton-loader v-if="batchPickingStore.loadingAvailableStocks" type="article"></v-skeleton-loader>
                        <v-tabs-window v-else v-model="activeTab" class="mt-4" >
                            <v-tabs-window-item value="available_stocks">
                                <v-table density="compact" class="stock-table elevation-0 border">
                                    <thead>
                                        <tr>
                                            <th>Batch Code</th>
                                            <th>Mfg Date</th>
                                            <th class="text-sm">Expiration Date</th>
                                            <th class="text-sm">Age</th>
                                            <th>Avail. Qty</th>
                                            <th>Avail Pallets</th>
                                            <th>Split Qty</th>
                                            <th>Min. Pallet</th>
                                            <th>Min. Qty</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(item, index) in batchPickingStore.availableStocks" class="text-sm" :key="index" 
                                            :class="{ 
                                                'selected-row': item.is_selected, 
                                                'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                            }
                                        ">
                                            <td>{{ item.BATCH }}</td>
                                            <td>
                                                {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                            </td>
                                            <td :class="{ 'text-error font-weight-bold' : expirationChecking(item.SLED_STR) }">
                                                {{ item.SLED_STR }} 
                                            </td>
                                            <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                            <!-- Avail Quantity  -->
                                            <td>
                                                {{ numberWithComma(item.BAG) }}
                                                {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}
                                            </td>

                                            <!-- AVAIL PALLETS  -->
                                            <td>
                                                {{ item.inventory.length }} PALLET
                                            </td>
                                            <!-- Split QTY  -->
                                            <td> {{ numberWithComma(item.split_qty_bag) }} {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>

                                            <td
                                                class="text-uppercase"
                                                :class="{ 'text-error': item.saved_reserved != null }"
                                            >
                                                {{ item.split_qty_pallets }}
                                                Pallet
                                            </td>
                                            <td>{{ item.inventory_qty }} {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>
                                            <td >
                                                <v-checkbox v-model="item.is_selected"
                                                    hide-details 
                                                    :disabled="item.inventory.length === 0 || expirationChecking(item.SLED_STR) || item.split_qty_bag === 0"
                                                    
                                                    density="compact">
                                                </v-checkbox>
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </v-tabs-window-item>

                            <v-tabs-window-item value="other_stocks">
                                <div class="my-4 border pa-4">
                                    <div class="text-subtitle-1 font-weight-medium mb-2">Customer Approval Document</div>
                                    <v-file-input
                                        accept="image/*,application/pdf"
                                        v-model="customerApprovalFile"
                                        density="compact"
                                        prepend-icon=""
                                        label="Choose file"
                                    ></v-file-input>
                                    <div class="text-subtitle-1 font-weight-medium mt-4">Remarks</div>
                                    <v-textarea class="mt-1"
                                        clear-icon="ri-close-line"
                                        placeholder="Remarks/Comments"
                                        v-model="customerApprovalRemarks"
                                        clearable
                                    ></v-textarea>
                                </div>
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
                                        <tr v-for="(item, index) in otherStocks" :key="index" 
                                            :class="{ 
                                                'selected-row': item.is_selected, 
                                                'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                            }
                                        ">
                                            <td>{{ item.BATCH }}</td>
                                            <td>
                                                {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                            </td>
                                            <td :class="{ 'text-error font-weight-bold' : expirationChecking(item.SLED_STR) }">
                                                {{ item.SLED_STR }} 
                                            </td>
                                            <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                            <!-- Avail Quantity  -->
                                            <td>
                                                {{ numberWithComma(item.BAG) }}
                                                {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}
                                            </td>

                                            <!-- AVAIL PALLETS  -->
                                            <td>
                                                {{ item.inventory.length }} PALLET
                                            </td>
                                            <!-- Split QTY  -->
                                            <td> {{ numberWithComma(item.split_qty_bag) }} {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>

                                            <td
                                                class="text-uppercase"
                                                :class="{ 'text-error': item.saved_reserved != null }"
                                            >
                                                {{ item.split_qty_pallets }}
                                                Pallet
                                                
                                            </td>
                                            <td>{{ item.inventory_qty }} {{ batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>
                                            <td >
                                                <v-checkbox v-model="item.is_selected"
                                                    hide-details 
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

                    <div class="d-flex justify-end mt-8">
                        <v-btn color="secondary" variant="outlined" @click="showBatchSelection = false" class="mr-3">Back to Delivery Items</v-btn>
                        <v-btn color="primary" @click="selectPallets" type="button">Select Pallets</v-btn>
                    </div>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
