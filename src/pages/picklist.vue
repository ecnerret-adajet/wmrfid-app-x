<script setup>
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

onMounted(() => {
    
})

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
            // Find the delivery with matching batch and increment loaded_qty
            const batch = data.picklistLog.inventory?.batch;
            const is_loaded = data.picklistLog.inventory?.is_loaded;
            console.log(batch);
            if (batch && (is_loaded == false || is_loaded == 0)) {
                const delivery = shipmentData.deliveries.find(d => d.batch === batch);
                if (delivery) {
                    delivery.read_rfids.push({
                        name: data.picklistLog.name, 
                        current_quantity: data.picklistLog?.inventory?.quantity,
                        mfg_date: data.picklistLog?.inventory?.mfg_date
                    });
                }
            }
        }
    }
};

const shipmentData = reactive({
    deliveries: [],
    shipment: {}
});

const openedPanels = ref([]);
const fetchShipmentDetails = async (shipmentNumber) => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        // let url = `picklist/shipment-picklist/${shipmentNumber}`;
        let url = `test-picklist-data/${shipmentNumber}`;

        const response = await axios.get(url, {
            params: {
                reader_id: props.readerId,
                bay_no: props.bayNo
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        shipmentData.deliveries = response.data.picklists.map(delivery => ({
            ...delivery,
            read_rfids: [] // Initialize with an empty array or any default value
        }));
        shipmentData.shipment = response.data;
        openedPanels.value = shipmentData.deliveries.map((_, index) => index);
        console.log(shipmentData.deliveries);
    } catch (error) {
        console.error('Error fetching shipment details:', error);
    } finally {
        pageLoading.value = false;
    }
};

const displayPlateNumber = computed(() => {
  return shipmentData.shipment?.plate_number_1 || 
    shipmentData.shipment?.plate_number_2 || 
    shipmentData.shipment?.plate_number_3 || 
         "N/A"; // Default value if none exist
});

const formatDateTime = (date, time) => {
    // Remove time if it's '000000'
    if (time === '00:00:00' || time === '000000' || !time) return '';
    if (!date || date === '00000000') return '';

    // Pad time to 6 digits if needed (for 'HHmmss' format)
    const paddedTime = time.toString().padStart(6, '0');
    return Moment(`${date} ${paddedTime}`, 'YYYYMMDD HHmmss').format('MMMM D, YYYY hh:mm:ss A');
};

const getTotalReadQuantity = (delivery) => {
    return delivery.read_rfids.reduce((total, item) => total + (item.current_quantity || 0), 0);
};

</script>
<template>
    <div>
        <v-card class="my-4 mx-3 py-2 px-3">
            <v-card-title>
                <h3 class="text-font-bold">Shipment Details</h3>
            </v-card-title>


            <v-card-text >
                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData.shipment?.shipment }}</span>
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
                                            {{
                                                formatDateTime(shipmentData.shipment.checkin_date,
                                                    shipmentData.shipment.checkin_time) }}
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData.shipment?.hauler_name }}</span>
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ shipmentData.shipment?.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
            </v-card-text>
        </v-card>
        <v-card class="mb-4 mx-3 py-2 px-3">
            <v-card-title>
                <h3 class="text-font-bold">Picklists</h3>
            </v-card-title>

            <template v-for="(delivery, index) in shipmentData.deliveries">
                <v-card class="px-4 py-4 mx-4 mt-2">
                    <VList  lines="one" density="compact">
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Batch</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis"> {{ delivery.batch }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">DO Number</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">
                                                {{ delivery.delivery }}
                                            </span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Material</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis"> {{ delivery.material }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol cols="4" class="d-inline-flex align-center">
                                            <span class="text-h6 font-weight-bold text-high-emphasis" style="margin-top: 1px;">Required Quantity</span>
                                        </VCol>
                                        <VCol class="d-inline-flex align-center">
                                            <span class="font-weight-medium text-medium-emphasis">
                                                {{ delivery.quantity_all }} {{ delivery.sales_unit }}
                                            </span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                        </VListItem>
                    </VList>
                    <p class="text-primary text-h5 mx-4">Read Pallets</p>
                    <v-table class="mx-4">
                        <thead>
                            <tr>
                                <th class="text-left">
                                    RFID Name
                                </th>
                                <th class="text-center">
                                    Current Quantity
                                </th>
                                <th class="text-left">
                                    Mfg Date
                                </th>
                                <th class="text-left">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, index) in delivery.read_rfids"
                                :key="index"
                            >
                                <td>{{item.name}}</td>
                                <td class="text-center">{{ item.current_quantity }}</td>
                                <td>{{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : null }}</td>
                                <td>
                                    <v-btn density="compact" v-if="getTotalReadQuantity(delivery) > delivery.quantity_all"
                                        type="button" color="primary-light">
                                        Loose
                                    </v-btn>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card>
            </template>
           
        </v-card>
    </div>
    <Loader :show="pageLoading" />
</template>

<style scoped>

</style>
