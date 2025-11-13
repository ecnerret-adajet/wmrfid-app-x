<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import { echo } from '@/utils/echo';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const shipment = ref(null);
const pageLoading = ref(false);
const errorMessage = ref(null);

const props = defineProps({
    shipmentNumber: String,
    readerId: String,
    bayNo: String
})


const toast = ref({
    message: 'RFID success',
    color: 'success',
    show: false
});


onMounted(() => {
    fetchShipmentDetails(props.shipmentNumber);  
    echo.channel('picklist-logs')
        .listen('PicklistLogsEvent', onPicklistLogsEvent);
});

const onPicklistLogsEvent = (data) => {
    console.log(data);
    
    // Only process if the event is for the current bay
    if (data.picklistLog?.antenna_log?.bay_no == props.bayNo) {
        if (data.picklistLog?.current_shipment_number == shipmentData.shipment?.shipment) {
           const pick = data.picklistLog;
            if (!pick) return;
            if (pick?.antenna_log?.bay_no != props.bayNo) return;

            const materialCode = pick.inventory?.material_code || pick.inventory?.material_id;
            const physicalId = pick.inventory?.pallet_physical_id;
            const rfidId = pick.inventory?.rfid_id;

            // try incremental update first
            const updated = markItemLoaded({ materialCode, physicalId, rfidId });

            if (!updated) {
                // fallback: re-sync the shipment (once) if no in-memory match found
                fetchShipmentDetails(props.shipmentNumber);
            }
        }
    }
};

const markItemLoaded = ({ materialCode, physicalId, rfidId }) => {
    const mcode = String(materialCode || '').trim();

    for (const group of shipmentData.reserved_inventories) {
        if (mcode && String(group.material_code || '').trim() !== mcode) continue;

        const items = Array.isArray(group.items) ? group.items : (group.items?.toArray ? group.items.toArray() : []);
        const itemIndex = items.findIndex(it => String(it.physical_id || '').trim() === String(physicalId || '').trim()
        || String(it.rfid_id || '').trim() === String(rfidId || '').trim());

        if (itemIndex !== -1) {
        // mutate in-place
        const target = items[itemIndex];
        target.is_loaded = true;
        target.loaded_at = new Date().toISOString();

        // ensure reactivity for templates that only watch array reference:
        if (Array.isArray(group.items)) {
            group.items.splice(itemIndex, 1, { ...target });
        } else {
            // if group.items is a collection-like, try to replace/populate accordingly
            group.items[itemIndex] = { ...target };
        }
        return true;
        }
    }
    return false;
};

const shipmentData = reactive({
    reserved_inventories: [],
    shipment: {}
});

const openedPanels = ref([]);
const dialogVisible = ref(false);
const fetchShipmentDetails = async (shipmentNumber) => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        let url = `shipments/get-picklist-data/${shipmentNumber}`;
        // let url = `test-picklist-data/${shipmentNumber}`;

        const response = await axios.get(url, {
            params: {
                reader_id: props.readerId,
                bay_no: props.bayNo
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log(response.data);

        if (response.data.success) {
            shipmentData.shipment = response.data.shipment || {};
            shipmentData.reserved_inventories = response.data.reserved_inventories || [];
        } else {
            shipmentData.shipment = response.data.shipment || {};
            dialogVisible.value = true;
            errorMessage.value = response.data.message || 'Failed to fetch shipment details.';
        }

    } catch (error) {
        console.error('Error fetching shipment details:', error);
    } finally {
        pageLoading.value = false;
    }
};

const displayPlateNumber = computed(() => {
  return shipmentData?.shipment?.plate_number_1 || 
    shipmentData?.shipment?.plate_number_2 || 
    shipmentData?.shipment?.plate_number_3 || 
         "N/A"; // Default value if none exist
});

const handleBack = () => {
    router.push({
        path: `/shipments`,
    });
}

</script>

<template>
    <v-container fluid>
        <!-- Shipment Details -->
        <v-card class="my-4 mx-2 px-4 py-3 elevation-2" rounded="lg">
            <v-btn @click="handleBack()" class="ma-2" color="grey-700" icon="ri-arrow-left-line"
                        variant="text"></v-btn>
            <v-card-title class="text-h6 font-weight-bold mb-2 text-primary">
                Shipment Details
            </v-card-title>
            <v-card-text>
                <v-row dense>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Shipment:</span>
                        <span class="ms-2 text-medium-emphasis">{{shipmentData?.shipment?.shipment_number}}</span>
                    </v-col>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Check-in Date:</span>
                        <span class="ms-2 text-medium-emphasis">
                        {{ shipmentData?.shipment?.check_in_date_time ? Moment(shipmentData?.shipment?.check_in_date_time).format('MMMM D, YYYY h:mm A') : ''}}
                        </span>
                    </v-col>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Hauler:</span>
                        <span class="ms-2 text-medium-emphasis">{{ shipmentData?.shipment?.hauler_name }}</span>
                    </v-col>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Plate Number:</span>
                        <span class="ms-2 text-medium-emphasis">{{ displayPlateNumber }}</span>
                    </v-col>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Driver:</span>
                        <span class="ms-2 text-medium-emphasis">{{ shipmentData?.shipment?.driver_name }}</span>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Picklists -->
        <v-card class="mb-6 mx-2 px-4 py-3 elevation-2" rounded="lg">
            <v-card-title class="text-h6 font-weight-bold text-primary">
                Reserved Pallets
            </v-card-title>
            <v-card-text>
                <template v-for="(delivery, index) in shipmentData.reserved_inventories" :key="index">
                    <v-card class="my-4 pa-4" rounded="md" evelation="2">
                        <v-row dense class="mt-3">
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Material:</span>
                                <span class="ms-2">{{ delivery.material_description }}</span>
                            </v-col>
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Material Code:</span>
                                <span class="ms-2">{{ delivery.material_code }}</span>
                            </v-col>
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Required Quantity:</span>
                                <span class="ms-2">{{ delivery.total_allocated }} {{ delivery.sales_unit }}</span>
                            </v-col>
                        </v-row>
                    
                        <v-alert
                            v-for="(item, index) in delivery.items"
                            :key="item.physical_id + '-' + item.mfg_date + '-' + index"
                            color="primary"
                            variant="tonal"
                            density="compact"
                            border="start"
                            class="text-high-emphasis mt-2"
                            style="border-left-width: 4px"
                        >
                            <div class="d-flex justify-space-between align-center gap-2">
                                <div>
                                    <strong>{{ item.physical_id }}</strong><br />
                                    <div>
                                        {{ item.quantity }} bags
                                        <span v-if="item.mfg_date">
                                            (Manufactured Date: {{ Moment(item.mfg_date).format('MMM D, YYYY') }})
                                        </span>
                                    </div>
                                    <div class="font-weight-bold">
                                        {{ item.allocated_quantity }} bags
                                        <span v-if="item.mfg_date">
                                            (Allocated Quantity)
                                        </span>
                                    </div>
                                    <div v-if="item.quantity > item.allocated_quantity" class="text-warning">
                                        <span class="font-italic">Pallet will be automatically tagged as loose when scanned.</span>
                                    </div>
                                </div>
                                <div>
                                    <v-chip v-if="!item.is_loaded" color="warning">
                                        Awaiting Loading..
                                    </v-chip>
                                    <v-chip v-else color="primary">
                                        Loaded
                                    </v-chip>
                                </div>
                            </div>
                        </v-alert>
                    </v-card>
                </template>
            </v-card-text>
        </v-card>
    </v-container>
 
    <v-dialog v-model="dialogVisible" max-width="600px" persistent>
        <v-sheet class="pa-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="error" icon="ri-error-warning-line" size="72"></v-icon>

            <h2 class="text-h3 mb-6">Fetching Error</h2>

            <p class="mb-4 text-medium-emphasis text-h5">
                {{ errorMessage }}
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
                <v-btn class="text-none" color="primary" variant="flat" width="90" @click="dialogVisible = false">
                    Okay
                </v-btn>
            </div>
        </v-sheet>
    </v-dialog>
    <Loader :show="pageLoading" />
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />

</template>

<style scoped>

</style>
