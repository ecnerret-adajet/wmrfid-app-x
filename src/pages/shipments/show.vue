<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';


const route = useRoute();
const router = useRouter();
const shipmentData = ref(null);
const pageLoading = ref(false);
const shipmentNumber = route.params.shipmentNumber; // Get the shipment number from URL

// Delivery table variables
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort
const deliveryItemsModalOpen = ref(false);
const selectedDelivery = ref(null);
const searchValue = ref('');

const headers = [
    {
        title: 'DELIVERY DOCUMENT',
        key: 'delivery_document',
        sortable: false
    },
    {
        title: 'DO NUMBER',
        key: 'do_number',
        sortable: false
    },
    {
        title: 'PLANT',
        key: 'plant_id',
        sortable: false
    },
    {
        title: 'PICKING STATUS',
        key: 'picking_status',
        align: 'center',
        sortable: false
    },
]

const lastOptions = ref({});
const currentOptions = ref({});

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

// TODO:: Consider separating the API for calling the header and for the datatable
// to avoid loading the header if next/prev page 
const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
    const options = { page, itemsPerPage, sortBy, search: searchValue.value };

    // Check if the options are the same as the last call
    const isSame = JSON.stringify(lastOptions.value) === JSON.stringify(options);
    if (isSame) return;

    // Store the current options
    lastOptions.value = options;
    currentOptions.value = options;

    pageLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-updated_at';
    }

    try {
        const token = JwtService.getToken();

        const response = await axios.get(`/shipments/${shipmentNumber}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { shipment, deliveries_table } = response.data;
        
        shipmentData.value = shipment
        totalItems.value = deliveries_table.total;
        serverItems.value = deliveries_table.data;

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

onMounted(async () => {
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

</script>

<template>

    <div>
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Shipment Details</h4>
                    <v-badge v-if="shipmentData?.shipment?.load_end_date === null"  class="ml-3" color="warning" content="Pending"
                        inline>
                    </v-badge>
                    <v-badge v-else class="ml-3" color="success" content="Completed"
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
                        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
                            :items-length="totalItems" :loading="pageLoading" item-value="id" :search="searchValue"
                            @update:options="loadItems" class="text-no-wrap">

                            <template #item="{ item }">
                                <tr @click="handleViewDelivery(item)" class="clickable-row">
                                    <td>{{ item.delivery_document }}</td>
                                    <td>{{ item.sap_delivery?.servicio_delivery?.do_number }}</td>
                                    <td>{{ item.plant?.name }}</td>
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
                            </template>

                        </VDataTableServer>
                    </div>
                </v-card-text>
            </v-card>
            <!-- <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Reserved Orders</h4>
                    <div class="mt-2">
                        <reserved-orders-data-table />
                    </div>
                </v-card-text>
            </v-card> -->
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
                                <tr v-for="item in shipmentData?.shipment?.reserved_pallets" :key="item.id">
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
                <v-btn @click="proceedBatchPicking(selectedDelivery)" v-if="selectedDelivery.sap_delivery?.picking_status !== 'C'" color="primary" variant="flat" class="px-8">
                    Batch Picking
                </v-btn>
            </v-card-actions>
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
