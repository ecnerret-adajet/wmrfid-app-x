<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
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
    },
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'SHIP TO',
        key: 'ship_to_name',
    },
    {
        title: 'SOLD TO',
        key: 'sold_to_name',
    },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
    {
        title: 'CREATED AT',
        key: 'created_at',
    },
]

const lastOptions = ref({});
const currentOptions = ref({});


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

        const { shipment, deliveries_table  } = response.data;
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
  return shipmentData.value?.plate_number_1 || 
    shipmentData.value?.plate_number_2 || 
    shipmentData.value?.plate_number_3 || 
         "N/A"; // Default value if none exist
});

const handleViewDelivery = (delivery) => {
    selectedDelivery.value = delivery
    deliveryItemsModalOpen.value = true;
}

const closeModal = () => {
    deliveryItemsModalOpen.value = false;
}

</script>

<template>
  
    <div>
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Shipment Details</h4>
                </div>
                <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
                <VList v-else lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData?.shipment_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Check-in Date</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ shipmentData?.check_in_date ? Moment(shipmentData?.check_in_date).format('MMMM D, YYYY') : '--' }}
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis " style="margin-top: 1px;">Hauler</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData?.hauler_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis " style="margin-top: 1px;">Plate Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ displayPlateNumber }}</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis " style="margin-top: 1px;">Driver</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData?.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                            </VCol>
                        </VRow>
                    </VListItem>
                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
        </v-card>
        <div >
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Delivery Details</h4>
                    <div class="mt-2">
                        <VDataTableServer
                            v-model:items-per-page="itemsPerPage"
                            :headers="headers"
                            :items="serverItems"
                            :items-length="totalItems"
                            :loading="pageLoading"
                            item-value="id"
                            :search="searchValue"
                            @update:options="loadItems"
                            class="text-no-wrap"
                        >

                            <template #item="{ item }">
                                <tr @click="handleViewDelivery(item)" class="clickable-row">
                                    <td>{{ item.delivery_document }}</td>
                                    <td>{{ item.plant?.name }}</td>
                                    <td>{{ item.ship_to_name }}</td>
                                    <td>{{ item.sold_to_name }}</td>
                                    <td>{{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}</td>
                                    <td>{{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}</td>
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
    </div>
    <DefaultModal :dialog-title="'Delivery Items'" :show="deliveryItemsModalOpen" @close="closeModal">
        <v-table class="mt-4">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Material</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in selectedDelivery.items" :key="index">
                    <td>{{ item.item_number }}</td>
                    <td>{{ item.material }}</td>
                    <td>{{ item.material_desc }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.sales_unit }}</td>
                </tr>
            </tbody>
        </v-table>
    </DefaultModal>

</template>

<style scoped>

.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173,215,192, 0.3); 
}
</style>
