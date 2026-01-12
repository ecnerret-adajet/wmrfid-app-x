<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import { useBatchPickingStore } from '@/stores/batchPickingStore';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const shipmentData = ref(null);
const pageLoading = ref(false);
const shipmentNumber = route.params.shipmentNumber; // Get the shipment number from URL
const batchPickingStore = useBatchPickingStore();

// Delivery table variables
const deliveryData = ref([]);
const deliveryItemsModalOpen = ref(false);
const selectedDelivery = ref(null);
const searchValue = ref('');


const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const loadDetails = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();

        const response = await axios.get(`/shipments/${shipmentNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { shipment, deliveries } = response.data;
        console.log(deliveries);

        shipmentData.value = response.data.shipment;
        deliveryData.value = response.data.deliveries;

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

onMounted(() => {
    console.log('Mounted shipment details page');
    loadDetails();
});

const displayPlateNumber = computed(() => {
    return shipmentData.value?.shipment?.plate_number_1 ||
        shipmentData.value?.shipment?.plate_number_2 ||
        shipmentData.value?.shipment?.plate_number_3 ||
        "N/A"; // Default value if none exist
});

const handleViewDelivery = (delivery) => {
    selectedDelivery.value = delivery
    deliveryItemsModalOpen.value = true;
}

const closeModal = () => {
    deliveryItemsModalOpen.value = false;
}

const isStatusMatched = computed(() => {
    return shipmentData.value?.shipment?.bu_overall_status === shipmentData.value?.shipment?.alc_overall_status;
});

const syncingLoading = ref(false)
const syncStatus = async () => {
    syncingLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/picklist/sync/${shipmentData.value?.shipment?.shipment_number}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            await loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'created_at', order: 'desc' }],
                search: searchValue.value
            });
            toast.value.color = 'success';
            toast.value.message = 'Sync successful!';
            toast.value.show = true;
        }
    } catch (error) {
        console.log(error);
    } finally {
        syncingLoading.value = false;
    }
}

const proceedBatchPicking = (delivery) => {
    router.push({ name: 'batch-picking', params: {  do_number: delivery.sap_delivery?.servicio_delivery?.do_number, shipment_number: delivery.shipment_number } });
}

const viewReservedOnMap = () => {
    window.open(`/shipment-reserved-pallets/${shipmentData.value?.shipment?.shipment_number}`, '_blank', 'noopener');
}
const cancelConfirmationModal = ref(false);
const handleCancelProposal = () => {
    cancelConfirmationModal.value = true;
}
const cancelProposalLoading = ref(false);
const cancelProposal = async () => {
    // try {
    //     cancelProposalLoading.value = true;
    //     const token = JwtService.getToken();

    //     const { data } = await axios.post(
    //         `deliveries/delivery-order-remove`,
    //         {
    //             delivery_id: batchPickingStore.selectedDeliveryItem?.delivery_reserved_orders?.[0]?.delivery_id,
    //             delivery_document: batchPickingStore.selectedDeliveryItem?.delivery_document,
    //             delivery_item_number: batchPickingStore.selectedDeliveryItem?.item_number,
    //             plant: batchPickingStore.selectedDeliveryItem?.plant,
    //             storage_location: batchPickingStore.selectedDeliveryItem?.storage_location,
    //             do_number: do_number
    //         },
    //         {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`,
    //                 'Content-Type': 'application/json'
    //             }
    //         }
    //     );

    //     if (!data.success) {
    //         // Handle validation errors
    //         const cancelBatchError = data.errors?.length > 0 ? data.errors?.[0] : null

    //         if (cancelBatchError) {
    //             toast.value.color = 'error';
    //             toast.value.message = cancelBatchError;
    //             toast.value.show = true;
    //         }
    //     }

    //     // Proceed normally if successful
    //     if (data.success) {

    //         await batchPickingStore.fetchHeaderDetails({ do_number: do_number });
    //         cancelConfirmationModal.value = false
    //         viewReservedPallets.value = false

    //         toast.value.color = 'success';
    //         toast.value.message = "Successfully cancelled reserved pallets";
    //         toast.value.show = true;
    //         // closeModal()
    //     }

    // } catch (response) {
    //     console.log(response);
    // } finally {
    //     cancelProposalLoading.value = false;
    //     cancelConfirmationModal.value = false
    //     batchPickingStore.customerApprovalFile = null;
    //     batchPickingStore.customerApprovalRemarks = null;
    // }
}


</script>

<template>

    <div>
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Shipment Details</h4>
                    <v-badge v-if="shipmentData?.shipment?.load_end_date !== null"  class="ml-3" color="success" content="Completed"
                        inline>
                    </v-badge>
                    <v-badge v-else class="ml-3" color="warning" content="Pending"
                        inline>
                    </v-badge>
                    <v-spacer></v-spacer>
                    <v-btn :loading="syncingLoading" @click="syncStatus" v-if="isStatusMatched === false &&
                        (
                            [2, 3, 4].includes(Number(shipmentData?.shipment?.bu_overall_status)) &&
                            [2, 3, 4].includes(Number(shipmentData?.shipment?.alc_overall_status))
                        )" class="px-5" type="button" color="warning">
                        Sync Status
                    </v-btn>
                </div>
                <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                <VList v-else lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis"
                                            style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.shipment_number }}</span>
                                          
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis"
                                            style="margin-top: 1px;">Check-in Date</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ shipmentData?.shipment?.check_in_date ?
                                                Moment(shipmentData?.shipment?.check_in_date).format('MMMM D, YYYY') : '--'
                                            }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Hauler</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.hauler_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Plate Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ displayPlateNumber
                                            }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Driver</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow v-if="[2, 3, 4].includes(Number(shipmentData?.shipment?.bu_overall_status))"
                                    class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">BU Trans Status</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        {{ shipmentData?.shipment?.bu_overall_status }}
                                        <v-chip :color="isStatusMatched ? 'success' : 'error'"
                                            :content="isStatusMatched ? 'synced' : 'not synced'"
                                            class="text-uppercase ml-3" size="x-small" inline variant="outlined">
                                            {{ isStatusMatched ? 'synced' : 'not synced' }}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow v-if="[2, 3, 4].includes(Number(shipmentData?.shipment?.alc_overall_status))"
                                    class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">ALC Trans Status</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        {{ shipmentData?.shipment?.alc_overall_status }}
                                        <v-chip :color="isStatusMatched ? 'success' : 'error'"
                                            :content="isStatusMatched ? 'synced' : 'not synced'"
                                            class="text-uppercase ml-3" inline size="x-small" variant="outlined">
                                            {{ isStatusMatched ? 'synced' : 'not synced' }}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
            </v-card-title>
        </v-card>
        <div>
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Delivery Details</h4>
                    <div class="mt-2">
                        <v-table>
                            <thead>
                                <tr>
                                    <th class="text-left">
                                        DELIVERY DOCUMENT
                                    </th>
                                    <th class="text-left">
                                        DO NUMBER
                                    </th>
                                    <th class="text-left">
                                        PLANT
                                    </th>
                                    <th class="text-center">
                                        BATCH RESERVE STATUS
                                    </th>
                                    <th class="text-center">
                                        PICKING STATUS
                                    </th>
                            
                                </tr>
                            </thead>
                            <tbody>
                                 <tr v-if="deliveryData" v-for="item in deliveryData" @click="handleViewDelivery(item)" class="clickable-row">
                                    <td>{{ item.delivery_document }}</td>
                                    <td>{{ item.sap_delivery?.servicio_delivery?.do_number }}</td>
                                    <td>{{ item.plant?.name }}</td>
                                    <td class="text-center">
                                        <v-badge v-if="item.fully_reserved" color="success" content="Fully Reserved"
                                            inline>
                                        </v-badge>
                                        <v-badge v-else color="warning" content="Not Fully Reserved"
                                            inline>
                                        </v-badge>
                                    </td>
                                    <td class="text-center">
                                        <v-badge v-if="item.sap_delivery?.picking_status === 'A'" color="warning" content="A - NOT YET PICKED"
                                            inline>
                                        </v-badge>
                                        <v-badge v-else-if="item.sap_delivery?.picking_status === 'B'" color="primary-light" content="B - PARTIALLY PICKED"
                                            inline>
                                        </v-badge>
                                        <v-badge v-else-if="item.sap_delivery?.picking_status === 'C'" color="success" content="C - FULLY PICKED"
                                            inline>
                                        </v-badge>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    
                    </div>
                </v-card-text>
            </v-card>
        </div>

        <div>
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <div class="d-flex justify-space-between align-center px-4 mt-4">
                        <h4 class="text-h4 font-weight-black text-primary">Reserved Pallets</h4>
                        <v-btn v-if="shipmentData?.shipment?.reserved_pallets?.length > 0 && shipmentData?.shipment?.load_end_date === null" color="primary" @click="viewReservedOnMap" density="compact">View on Map</v-btn>
                    </div>
                    <div class="mt-2">
                        <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                        <v-table v-else>
                            <thead>
                                <tr>
                                    <th class="text-left">
                                        Pallet #
                                    </th>
                                    <th class="text-left">
                                        Batch
                                    </th>
                                    <th class="text-left">
                                        Material
                                    </th>
                                    <th class="text-center">
                                        Delivery Document
                                    </th>
                                    <th class="text-center">
                                        Item Number
                                    </th>
                                    <th class="text-center">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="shipmentData?.shipment?.reserved_pallets.length > 0" v-for="item in shipmentData?.shipment?.reserved_pallets" :key="item.id">
                                    <td>{{ item.pallet_physical_id }}</td>
                                    <td>{{ item.commodity_batch_code }}</td>
                                    <td>
                                        <span class="font-weight-bold">{{ item.material_code }}</span><br/>
                                        <span v-if="item.material_description" class="text-subtitle-1">{{ item.material_description }}</span>
                                    </td>
                                    <td class="text-center">{{ item.delivery_document }}</td>
                                    <td class="text-center">{{ item.delivery_item_number }}</td>
                                    <td class="text-center">
                                        <v-chip v-if="!item.is_loaded" color="warning">
                                            Pending
                                        </v-chip>
                                        <v-chip v-else color="primary">
                                            Loaded
                                        </v-chip>
                                    </td>
                                </tr>
                                <tr v-else>
                                    <td colspan="6" class="text-center text-medium-emphasis">
                                        No reserved pallets found. Select a DO on delivery details section to reserve batch.
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>

      

    <v-dialog v-model="deliveryItemsModalOpen" max-width="1000" transition="dialog-bottom-transition">
        <v-card class="pa-4 rounded-lg">
            <v-card-title class="d-flex pb-0">
                <span class="text-h3 font-weight-bold text-primary">Delivery Items</span>
            </v-card-title>
            <v-card-text class="mt-4">
                <v-table class="mt-4">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Material</th>
                            <th>Description</th>
                            <th class="text-center">Delivery Quantity</th>
                            <th>Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in selectedDelivery.items" :key="index">
                            <td>{{ item.item_number }}</td>
                            <td>{{ item.material }}</td>
                            <td>{{ item.material_desc }}</td>
                            <td class="text-center">{{ item.quantity }}</td>
                            <td>{{ item.sales_unit }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
            <v-card-actions class=" mt-2">
                <v-btn class="text-none px-8" color="secondary" variant="flat"  @click="deliveryItemsModalOpen = false">
                    Close
                </v-btn>
                <!-- Allow batch picking if not yet fully picked -->
                <v-btn @click="proceedBatchPicking(selectedDelivery)" v-if="selectedDelivery.sap_delivery?.picking_status !== 'C' && !selectedDelivery.fully_reserved" color="primary" variant="flat" class="px-8">
                    Batch Picking
                </v-btn>
                <v-btn v-if="!batchPickingStore.deliveryDetails?.customer_delivery?.shipment?.loadstart" color="error" class="ml-3" @click="handleCancelProposal" type="button">Cancel
                        Reservation
                </v-btn>
            </v-card-actions>
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

<style scoped>
.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173, 215, 192, 0.3);
}
</style>
