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

let picklistLogsChannel = null;
let picklistRefreshChannel = null;

onMounted(() => {
    fetchShipmentDetails(props.shipmentNumber);
    // Create private channels for each event type
    const channelNameBase = `shipment.${props.readerId}.${props.bayNo}`;
    
    picklistLogsChannel = echo.channel(`${channelNameBase}.picklist-logs`);
    picklistRefreshChannel = echo.channel(`${channelNameBase}.picklist-refresh`);

    picklistLogsChannel.listen('PicklistLogsEvent', onPicklistLogsEvent);
    picklistRefreshChannel.listen('PicklistRefreshEvent', onPicklistRefreshEvent);

});

const onPicklistRefreshEvent = (data) => {
    if (data.picklistRefresh === true) {
        fetchShipmentDetails(props.shipmentNumber);
    }
}

const processedEpcs = ref({});
const onPicklistLogsEvent = (data) => {
    const payload = data.picklistLog;
    if (!payload) return;

    if (payload.current_shipment_number != props.shipmentNumber) return;

    const inventoryPayload = payload.inventory || {};
    const batch = (inventoryPayload.batch || '').toString().trim();
    const epc = inventoryPayload.epc || payload.epc;
    const shipmentNumber = payload.current_shipment_number;

    if (!batch || !epc || !shipmentNumber || !props.bayNo) return;

    // unique processing key to avoid double-processing
    const key = `${shipmentNumber}_${props.bayNo}_${epc}`;
    if (processedEpcs.value[key]) return;
    processedEpcs.value[key] = true;

    // find reserved entry by batch (normalize)
    const reserved = shipmentData.reserved_inventories.find(
        r => (r.batch || '').toString().trim() === batch
    );
    if (!reserved) {
        console.warn('No reserved entry found for batch', batch);
        return;
    }

    // inventory array inside reserved entry (adjust property name if different)
    const invArray = reserved.inventory || reserved.inventories || [];

    // find specific inventory/pallet inside the reserved entry by epc / physical id / rfid_code
    const invIndex = invArray.findIndex(i =>
        (i.epc && i.epc === epc) ||
        (i.pallet_physical_id && i.pallet_physical_id == inventoryPayload.physical_id) ||
        (i.rfid_code && i.rfid_code === inventoryPayload.rfid_code)
    );

    if (invIndex === -1) {
        console.warn('No inventory item found for epc/physical id', epc, inventoryPayload.physical_id);
        return;
    }

    const inv = invArray[invIndex];

    // update only if not already marked loaded
    if (!inv.is_loaded) {
        // update the inventory object in-place so Vue reactivity picks it up
        Object.assign(inv, {
            is_loaded: true,
            loaded_datetime: inventoryPayload.loaded_datetime || new Date().toISOString(),
            current_inventory_count: typeof inventoryPayload.current_inventory_count !== 'undefined'
                ? inventoryPayload.current_inventory_count
                : inv.current_inventory_count
        });

    }
};

const shipmentData = reactive({
    reserved_inventories: [],
    shipment: {},
    total_pallet_to_load: 0
});

const openedPanels = ref([]);
const dialogVisible = ref(false);
const fetchShipmentDetails = async (shipmentNumber) => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        let url = `picklist/shipment-picklist/${shipmentNumber}`;

        const response = await axios.get(url, {
            params: {
                reader_id: props.readerId,
                bay_no: props.bayNo
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });


        if (response.data.result === 'S') {
            shipmentData.shipment = response.data.shipmentData || {};
            shipmentData.reserved_inventories = response.data.picklists || [];
            shipmentData.total_pallet_to_load = response.data.total_pallet_to_load || 0;
        } else {
            shipmentData.shipment = response.data.shipmentData || {};
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
            <v-btn @click="handleBack()" class="ma-2" color="grey-700" icon="ri-arrow-left-line" variant="text"></v-btn>
            <v-card-title class="text-h6 font-weight-bold mb-2 text-primary">
                Shipment Details
            </v-card-title>
            <v-card-text>
                <v-row dense>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Shipment:</span>
                        <span class="ms-2 text-medium-emphasis">{{ shipmentData?.shipment?.shipment_number }}</span>
                    </v-col>
                    <v-col cols="12" md="6">
                        <span class="font-weight-bold text-high-emphasis">Check-in Date:</span>
                        <span class="ms-2 text-medium-emphasis">
                            {{ shipmentData?.shipment?.check_in_date_time ?
                                Moment(shipmentData?.shipment?.check_in_date_time).format('MMMM D, YYYY h:mm A') : '' }}
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
                Reserved Pallets <span>({{ shipmentData.total_pallet_to_load }})</span>
            </v-card-title>
            <v-card-text>
                <template v-for="(delivery, index) in shipmentData.reserved_inventories" :key="index">
                    <v-card class="my-4 pa-4" rounded="md" evelation="2">
                        <v-row dense class="mt-3">
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Material:</span>
                                <span class="ms-2">{{ delivery.material_desc }}</span>
                            </v-col>
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Delivery Quantity:</span>
                                <span class="ms-2">{{ delivery.quantity }} {{ delivery.sales_unit }}</span>

                            </v-col>
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Material Code:</span>
                                <span class="ms-2">{{ delivery.material }}</span>

                            </v-col>
                            <v-col cols="12" md="6">
                                <span class="font-weight-bold">Batch:</span>
                                <span class="ms-2">{{ delivery.batch }}</span>
                            </v-col>

                        </v-row>

                        <v-alert v-for="(item, index) in delivery.inventory"
                            :key="item.physical_id + '-' + item.mfg_date + '-' + index"
                            :color="item.is_loaded ? 'success' : 'warning'" variant="tonal" density="compact"
                            border="start" class="text-high-emphasis mt-2" style="border-left-width: 4px">
                            <div class="d-flex justify-space-between align-center gap-2">
                                <div>
                                    <strong>{{ item.pallet_physical_id }}</strong><br />
                                    <div>
                                        {{ item.current_inventory_count }} bags (Current Quantity)
                                        <span v-if="item.mfg_date">
                                            (Manufactured Date: {{ Moment(item.mfg_date).format('MMM D, YYYY') }})
                                        </span>
                                    </div>
                                    <div class="font-weight-bold">
                                        {{ item.total_qty }} bags
                                        <span v-if="item.total_qty">
                                            (Allocated Quantity)
                                        </span>
                                    </div>
                                    <div v-if="item.current_inventory_count > item.total_qty && !item.is_loaded" class="text-warning">
                                        <span class="font-italic font-weight-bold">Pallet will be automatically tagged as loose when
                                            scanned.</span>
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

<style scoped></style>
