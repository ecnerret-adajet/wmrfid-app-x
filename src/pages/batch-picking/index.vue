<script setup>
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import JwtService from '@/services/JwtService';
import { useBatchPickingStore } from '@/stores/batchPickingStore';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';


const route = useRoute();
const router = useRouter();
const batchPickingStore = useBatchPickingStore();

const do_number = route.params.do_number;

onMounted(async () => {
    const params = {
        do_number: do_number,
    };
    await batchPickingStore.fetchHeaderDetails(params);
});

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const showBatchSelection = ref(false);
const batchLoading = ref(false);
const viewReservedPallets = ref(false);

const selectBatch = (item, isReserved) => {
    batchPickingStore.selectedDeliveryItem = item;

    if (isReserved) {
        viewReservedPallets.value = true
        return;
    }

    showBatchSelection.value = true;
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
    toast.value.show = false;
    if (batchPickingStore.activeTab === 'available_stocks') {
        selectedBatchData = batchPickingStore.availableStocks
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets,
                bags_quantity: stock.split_qty_bag
            }));
    } else {
        // Assuming the same logic for the other data source
        selectedBatchData = batchPickingStore.otherDataSource
            .filter(stock => stock.is_selected)
            .map(stock => ({
                BATCH: stock.BATCH,
                pallet_quantity: stock.split_qty_pallets,
                bags_quantity: stock.split_qty_bag
            }));
    }

    const totalSelectedBags = selectedBatchData.reduce((sum, batch) => sum + Number(batch.bags_quantity), 0);

    if (totalSelectedBags > batchPickingStore.deliveryDetails.open_quantity) {
        toast.value.color = 'error';
        toast.value.message = 'Bags on selected pallet exceeds open quantity.';
        toast.value.show = true;
        return;
    }

    batchPickingStore.setBatches(selectedBatchData);
    batchPickingStore.setOriginalBatchList(selectedBatchData);

    router.push({
        name: 'pallet-selection',
        params: { do_number: do_number }
    });
}

const calculateAge = (date) => {
    if (!date) return '';
    const now = Moment();
    const mfgDate = Moment(date);
    const days = now.diff(mfgDate, 'days');
    return days;
};

const cancelProposalLoading = ref(false);
const cancelConfirmationModal = ref(false);

const handleCancelProposal = () => {
    cancelConfirmationModal.value = true;
}

const cancelProposal = async () => {
    try {
        cancelProposalLoading.value = true;
        const token = JwtService.getToken();

        const { data } = await axios.post(
            `deliveries/delivery-order-remove`,
            {
                delivery_id: batchPickingStore.selectedDeliveryItem?.delivery_reserved_orders?.[0]?.delivery_id,
                delivery_document: batchPickingStore.selectedDeliveryItem?.delivery_document,
                delivery_item_number: batchPickingStore.selectedDeliveryItem?.item_number,
                plant: batchPickingStore.selectedDeliveryItem?.plant,
                storage_location: batchPickingStore.selectedDeliveryItem?.storage_location,
                do_number: do_number
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!data.success) {
            // Handle validation errors
            const cancelBatchError = data.errors?.length > 0 ? data.errors?.[0] : null

            if (cancelBatchError) {
                toast.value.color = 'error';
                toast.value.message = cancelBatchError;
                toast.value.show = true;
            }
        }

        // Proceed normally if successful
        if (data.success) {

            await batchPickingStore.fetchHeaderDetails({ do_number: do_number });
            cancelConfirmationModal.value = false
            viewReservedPallets.value = false

            toast.value.color = 'success';
            toast.value.message = "Successfully cancelled reserved pallets";
            toast.value.show = true;
            // closeModal()
        }

    } catch (response) {
        console.log(response);
    } finally {
        cancelProposalLoading.value = false;
        cancelConfirmationModal.value = false
        // customerApprovalFile.value = null;
        // customerApprovalRemarks.value = null;
    }
}


</script>
<template>
    <div>
        <v-card elevation="2">
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">ALC
                                                Delivery</span>
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
                                                batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document
                                                || null }}</span>
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
                                            <span
                                                class="text-h6 font-weight-bold text-high-emphasis ">Ship-to-Party</span>
                                        </VCol>
                                        <VCol class="d-flex flex-column">
                                            <span class="text-medium-emphasis font-weight-medium">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name
                                                }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer
                                                }}</div>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex">
                                            <span
                                                class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Address</span>
                                        </VCol>
                                        <VCol class="d-inline-flex">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_address
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Shipping
                                                Point</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">N/A</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Shipment
                                                Number</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.shipment_no
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Route</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.route }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Server</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.sap_server
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery
                                                Date</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.delivery_date
                                                }}</span>
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
                            <th class="text-center">Batch Split</th>
                            <th class="text-center">Pallet Status</th>
                            <th class="text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in batchPickingStore.deliveryDetails?.customer_delivery?.delivery_items"
                            :key="item.id">
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
                                <i v-if="item.is_batch_split" style="font-size: 24px; background-color: green;"
                                    class="ri-checkbox-circle-line mt-2"></i>
                                <i v-else style="font-size: 24px; background-color: #FF4C51;"
                                    class="ri-close-circle-line mt-2"></i>
                            </td>
                            <td class="text-center">
                                <!-- If no reservation yet -->
                                <v-badge v-if="item.delivery_reserved_orders?.length === 0" color="warning"
                                    content="No Pallet" class="text-uppercase" inline></v-badge>
                                <!-- if reserved full quantity  -->
                                <v-badge
                                    v-else-if="item.reserved_qty > 0 && parseInt(item.reserved_qty) === parseInt(item.delivery_quantity)"
                                    color="success" content="Reserved" @click="selectBatch(item, true)"
                                    class="text-uppercase cursor-pointer" inline></v-badge>
                                <!-- If partially reserved  -->
                                <div v-else class="d-flex flex-column py-3">
                                    <v-badge color="info" content="Partially Reserved" @click="selectBatch(item, true)"
                                        class="text-uppercase cursor-pointer" inline></v-badge>
                                    <span class="mt-1 text-xs">{{ item.reserved_qty }} {{ item.sales_unit }}(s) out of
                                        {{
                                            item.delivery_quantity }} {{ item.sales_unit }}(s)</span>
                                </div>
                            </td>
                            <td class="text-center">
                                <v-btn @click="selectBatch(item, false)" color="primary-light"
                                    :disabled="item.reserved_qty > 0 && (parseInt(item.reserved_qty) === parseInt(item.delivery_quantity))"
                                    variant="outlined" size="small">
                                    Select Batch
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
                <v-btn icon="ri-close-line" variant="text" @click="showBatchSelection = false"></v-btn>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">ALC
                                                Delivery</span>
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
                                                batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document
                                                || null }}</span>
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
                                            <span
                                                class="text-h6 font-weight-bold text-high-emphasis ">Ship-to-Party</span>
                                        </VCol>
                                        <VCol class="d-flex flex-column">
                                            <span class="text-medium-emphasis font-weight-medium">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name
                                                }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer
                                                }}</div>
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
                                                batchPickingStore.selectedDeliveryItem.material_description }}</span>
                                            <div class="text-subtitle-1 font-weight-thin">{{
                                                removeLeadingZeros(batchPickingStore.selectedDeliveryItem.material_number)
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Route</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.route }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Server</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.sap_server
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery
                                                Date</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.customer_delivery?.delivery_date
                                                }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Item
                                                Number</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.selectedDeliveryItem?.item_number }}</span>
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
                                                batchPickingStore.selectedDeliveryItem?.storage_location_model?.code }}
                                                - {{
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
                                            <span class="text-medium-emphasis">{{ batchPickingStore?.product_age?.from
                                                }} - {{ batchPickingStore?.product_age?.to }} Days</span>
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
                                            <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity
                                            </span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="text-medium-emphasis">{{
                                                batchPickingStore.deliveryDetails?.open_quantity }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                        </VListItem>
                    </VList>

                    <div v-if="parseInt(batchPickingStore.deliveryDetails?.open_quantity) > 0" class="mt-4">

                        <v-tabs v-model="batchPickingStore.activeTab" bg-color="transparent" variant="tonal"
                            class="custom-tabs">
                            <v-tab value="available_stocks" class="text-h5">
                                Available Stocks
                            </v-tab>
                            <v-tab value="other_stocks" class="text-h5">
                                Other Stocks
                            </v-tab>
                        </v-tabs>

                        <v-skeleton-loader v-if="batchPickingStore.loadingAvailableStocks"
                            type="article"></v-skeleton-loader>
                        <v-tabs-window v-else v-model="batchPickingStore.activeTab" class="mt-4">
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
                                            <th>Remaining Qty</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(item, index) in batchPickingStore.availableStocks" class="text-sm"
                                            :key="index" :class="{
                                                'selected-row': item.is_selected,
                                                'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                            }
                                                ">
                                            <td>{{ item.BATCH }}</td>
                                            <td>
                                                {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : ''
                                                }}
                                            </td>
                                            <td
                                                :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
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
                                            <td> {{ numberWithComma(item.split_qty_bag) }} {{
                                                batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>

                                            <td class="text-uppercase"
                                                :class="{ 'text-error': item.saved_reserved != null }">
                                                {{ item.split_qty_pallets }}
                                                Pallet
                                            </td>
                                            <td>{{ item.inventory_qty }} {{
                                                batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>
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
                                <div class="my-4 border pa-4">
                                    <div class="text-subtitle-1 font-weight-medium mb-2">Customer Approval Document
                                    </div>
                                    <v-file-input accept="image/*,application/pdf" v-model="customerApprovalFile"
                                        density="compact" prepend-icon="" label="Choose file"></v-file-input>
                                    <div class="text-subtitle-1 font-weight-medium mt-4">Remarks</div>
                                    <v-textarea class="mt-1" clear-icon="ri-close-line" placeholder="Remarks/Comments"
                                        v-model="customerApprovalRemarks" clearable></v-textarea>
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
                                        <tr v-for="(item, index) in otherStocks" :key="index" :class="{
                                            'selected-row': item.is_selected,
                                            'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                        }
                                            ">
                                            <td>{{ item.BATCH }}</td>
                                            <td>
                                                {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : ''
                                                }}
                                            </td>
                                            <td
                                                :class="{ 'text-error font-weight-bold': expirationChecking(item.SLED_STR) }">
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
                                            <td> {{ numberWithComma(item.split_qty_bag) }} {{
                                                batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>

                                            <td class="text-uppercase"
                                                :class="{ 'text-error': item.saved_reserved != null }">
                                                {{ item.split_qty_pallets }}
                                                Pallet

                                            </td>
                                            <td>{{ item.inventory_qty }} {{
                                                batchPickingStore.selectedDeliveryItem?.sales_unit }}</td>
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

                    <div class="d-flex justify-end mt-8">
                        <v-btn color="secondary" variant="outlined" @click="showBatchSelection = false"
                            class="mr-3">Back to Delivery Items</v-btn>
                        <v-btn color="primary" @click="selectPallets" type="button">Select Pallets</v-btn>
                    </div>
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
                            <th>Item Number</th>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Age</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in batchPickingStore.selectedDeliveryItem?.reserved_pallets">
                            <td>{{ item.item_number }}</td>
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">{{ item.total_qty }}</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                    <v-btn color="error" class="ml-3" @click="handleCancelProposal" type="button">Cancel
                        Reservation</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="cancelConfirmationModal" min-width="400px" max-width="600px">
        <v-card class="pa-4">
            <div class="text-center">
                <v-icon class="mb-5" color="error" icon="ri-close-circle-line" size="112"></v-icon>
                <p class="mb-6 text-h5">Are you sure you want to cancel reserved pallets?</p>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="cancelConfirmationModal = false"
                        class="px-8 mr-3">Cancel</v-btn>
                    <v-btn color="primary" @click="cancelProposal" :loading="cancelProposalLoading"
                        class="px-8">Proceed</v-btn>
                </div>
            </div>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />

</template>
