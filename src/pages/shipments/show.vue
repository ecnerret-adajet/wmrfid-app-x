<script setup>
import Loader from '@/components/Loader.vue';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import deliveriesDataTable from './deliveriesDataTable.vue';

const route = useRoute();
const router = useRouter();
const shipment = ref(null);
const isLoading = ref(false);
const shipmentNumber = route.params.shipmentNumber; // Get the shipment number from URL

onMounted(async () => {
    isLoading.value = true;
    try {
        // Fetch shipment details from API
        const response = await axios.get(`shipments/${shipmentNumber}`);
        const { data } = response.data; 
        shipment.value = data; // Set shipment details
        isLoading.value = false; // Stop loading
    } catch (error) {
        console.error("Shipment not found:", error);
        router.replace('/404'); // Redirect to 404 page
    } finally {
        isLoading.value = false; // Stop loading
    }
});

const displayPlateNumber = computed(() => {
  return shipment.value?.plate_number_1 || 
         shipment.value?.plate_number_2 || 
         shipment.value?.plate_number_3 || 
         "N/A"; // Default value if none exist
});

const goToScreen = (screen) => {
    // Add parameters
    const route = screen === 'picklist' ? '/picklist' : '/curtain';
    window.open(route, '_blank');
}


</script>

<template>
    <div v-if="shipment">
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Shipment Details</h4>
                    
                    <div class="d-flex gap-2">
                        <v-btn color="primary" @click="goToScreen('picklist')" class="px-8">View Picklist</v-btn>
                    </div>
                </div>

                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black" style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ shipment.shipment_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black" style="margin-top: 1px;">Check-in Date</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">
                                            {{ shipment.check_in_date ? Moment(shipment.check_in_date).format('MMMM D, YYYY') : '--' }}
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
                                        <span class="text-h6 text-uppercase font-weight-black " style="margin-top: 1px;">Hauler</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ shipment.hauler_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black " style="margin-top: 1px;">Plate Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ displayPlateNumber }}</span>
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
                                        <span class="text-h6 text-uppercase font-weight-black " style="margin-top: 1px;">Driver</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ shipment.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <!-- <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black " style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-bold">00000012345</span>
                                    </VCol>
                                </VRow> -->
                            </VCol>
                        </VRow>
                    </VListItem>
                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
            <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>
            <v-card-text class="mx-2">
                <h4 class="text-h4 font-weight-black text-primary">Delivery Details</h4>
                <div class="mt-2">
                    <deliveries-data-table />
                </div>
            </v-card-text>
        </v-card>
    </div>
    <Loader :show="isLoading"/>
</template>
