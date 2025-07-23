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
            // Find the delivery with matching batch and increment loaded_qty
            const batch = data.picklistLog.inventory?.batch;
            const is_loaded = data.picklistLog.inventory?.is_loaded;
          
            if (batch && (is_loaded == false || is_loaded == 0)) {
                const delivery = shipmentData.deliveries.find(d => d.batch === batch);
                if (delivery) {
                    delivery.read_rfids.push({
                        name: data.picklistLog.name, 
                        current_quantity: data.picklistLog?.inventory?.quantity,
                        mfg_date: data.picklistLog?.inventory?.mfg_date,
                        loaded_date: Moment().format('MMMM D YYYY, h:mm:ss a'),
                        loose_pallet: false,
                        loose_quantity: 0,
                        rfid_id: data.picklistLog?.inventory?.rfid_id,
                        rfid_code: data.picklistLog?.inventory?.rfid_code,
                        rfid_type: data.picklistLog?.inventory?.rfid_type,
                        material_id: data.picklistLog?.inventory?.material_id,
                        batch: data.picklistLog?.inventory?.batch,
                        shipment_number: data.picklistLog?.current_shipment_number
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
        let url = `picklist/shipment-picklist/${shipmentNumber}`;
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
        
        if (response.data.picklists?.length > 0) {
            shipmentData.deliveries = response.data.picklists.map(delivery => {
                
                const readRfids = delivery.inventory
                    ? delivery.inventory
                        .filter(item => item.is_loaded || (item.is_loose && item.shipment_id === response.data.shipment_id))
                        .map(item => ({
                            name: item.rfid?.name || '',
                            current_quantity: item.quantity,
                            mfg_date: item.mfg_date || null,
                            loaded_date: item.loaded_datetime,
                            loose_pallet: item.is_loose, 
                            is_loose: item.is_loose,
                            rfid_id: item.rfid_id,
                            rfid_code: item.rfid_code,
                            rfid_type: item.rfid_type,
                            material_id: item.material_id,
                            batch: item.batch,
                            shipment_number: item.shipment_number,
                            loose_original_quantity: item.loose_original_quantity,
                            loose_quantity: item.loose_quantity, 
                        }))
                    : [];

                return {
                    ...delivery,
                    read_rfids: readRfids
                };
            });
            
            shipmentData.shipment = response.data;
            openedPanels.value = shipmentData.deliveries.map((_, index) => index);
        }

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

const saveLoose = async (item) => {
  
    if (!item.loose_quantity || item.loose_quantity <= 0) {
        toast.value.message = 'Please input valid loose quantity.';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }

    pageLoading.value = true;

    try {
        const token = JwtService.getToken();

        const response = await axios.post('warehouse/store-loose-rfid', {
            shipment_number: shipmentData.shipment?.shipment,
            physical_id: item.name,
            rfid_code: item.rfid_code,
            rfid_id: item.rfid_id,
            rfid_type: item.rfid_type,
            original_quantity: item.current_quantity,
            loose_quantity: item.loose_quantity,
            batch: item.batch,          
            material_id: item.material_id,
            mfg_date: item.mfg_date,
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data?.result === 'S') {
            toast.value.message = 'Tagged as loose successfully';
            toast.value.color = 'success';
            toast.value.show = true;
            item.is_loose = true;

            await fetchShipmentDetails(props.shipmentNumber);
        }

    } catch (error) {
        console.error('Error saving loose pallet:', error);
        alert('Failed to save loose pallet.');
    } finally {
        pageLoading.value = false;
    }
};

const toggleLoose = (delivery, selectedItem) => {
    delivery.read_rfids.forEach(item => {
        if (item !== selectedItem) {
            item.loose_pallet = false;  // Close others
        }
    });

    selectedItem.loose_pallet = !selectedItem.loose_pallet;  // Toggle current

    if (selectedItem.loose_pallet) {
        const totalReadQuantity = delivery.read_rfids.reduce((sum, item) => {
            return sum + (item.current_quantity || 0);
        }, 0);

        const overloadQuantity = Math.max(totalReadQuantity - delivery.quantity_all, 0);

        selectedItem.loose_quantity = Math.min(overloadQuantity, selectedItem.current_quantity);
    }
};

const handleBack = () => {
    router.push({
        path: `/shipments`,
    });
}


const handleMismatchedAction = async (item, action) => {
    let inventory_id = item.id;

    if (action === 'accept') {
        // TODO:: Check if with implementation for accepting
        // toast.value.message = `Accepted mismatched pallet: ${item.name}`;
        // toast.value.color = 'success';
        // toast.value.show = true;
    } else if (action === 'reject') {

        const token = JwtService.getToken();

        const response = await axios.post('picklist/update-mismatched-inventory', {
            inventory_id: inventory_id,
            action: action
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data?.result === 'S') {
            toast.value.message = `Removed mismatched pallet: ${item.rfid?.name} from shipment #${shipmentData.shipment?.shipment}`;
            toast.value.color = 'success';
            toast.value.show = true;
            await fetchShipmentDetails(props.shipmentNumber);
        }
    }
    
};

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
            <span class="ms-2 text-medium-emphasis">{{ shipmentData.shipment?.shipment }}</span>
          </v-col>
          <v-col cols="12" md="6">
            <span class="font-weight-bold text-high-emphasis">Check-in Date:</span>
            <span class="ms-2 text-medium-emphasis">
              {{ formatDateTime(shipmentData.shipment.checkin_date, shipmentData.shipment.checkin_time) }}
            </span>
          </v-col>
          <v-col cols="12" md="6">
            <span class="font-weight-bold text-high-emphasis">Hauler:</span>
            <span class="ms-2 text-medium-emphasis">{{ shipmentData.shipment?.hauler_name }}</span>
          </v-col>
          <v-col cols="12" md="6">
            <span class="font-weight-bold text-high-emphasis">Plate Number:</span>
            <span class="ms-2 text-medium-emphasis">{{ displayPlateNumber }}</span>
          </v-col>
          <v-col cols="12" md="6">
            <span class="font-weight-bold text-high-emphasis">Driver:</span>
            <span class="ms-2 text-medium-emphasis">{{ shipmentData.shipment?.driver_name }}</span>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

        <!-- Picklists -->
        <v-card class="mb-6 mx-2 px-4 py-3 elevation-2" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold text-primary">
            Picklists
        </v-card-title>

        <template v-for="(delivery, index) in shipmentData.deliveries" :key="index">
            <v-card class="my-4 pa-4 elevation-1" rounded="md">
            <v-row dense>
                <v-col cols="12" md="6">
                <span class="font-weight-bold">Batch:</span>
                <span class="ms-2">{{ delivery.batch }}</span>
                </v-col>
                <v-col cols="12" md="6">
                <span class="font-weight-bold">DO Number:</span>
                <span class="ms-2">{{ delivery.delivery }}</span>
                </v-col>
                <v-col cols="12" md="6">
                <span class="font-weight-bold">Material:</span>
                <span class="ms-2">{{ delivery.material }}</span>
                </v-col>
                <v-col cols="12" md="6">
                <span class="font-weight-bold">Required Quantity:</span>
                <span class="ms-2">{{ delivery.quantity_all }} {{ delivery.sales_unit }}</span>
                </v-col>
            </v-row>

            <div class="mt-4">
                <p class="text-subtitle-1 font-weight-bold text-primary mb-2">Read Pallets</p>

                <transition-group
                    name="fade"
                    tag="div"
                    class="d-flex flex-column gap-2"
                >
                    <v-alert
                        v-if="delivery.read_rfids.length === 0"
                        color="warning"
                        variant="outlined"
                        density="comfortable"
                        border="start"
                        class="text-medium-emphasis"
                        style="border-left-width: 4px"
                    >
                        <div class="d-flex justify-space-between align-center">
                        <div>
                            <strong>No read pallets yet</strong><br />
                            <div class="text-caption text-medium-emphasis">
                                Waiting for pallet reads on this batch.
                            </div>
                        </div>
                        </div>
                    </v-alert>
                    <v-alert
                        v-for="(item, index) in delivery.read_rfids"
                        :key="item.name + '-' + item.mfg_date + '-' + index"
                        color="primary"
                        variant="tonal"
                        density="compact"
                        border="start"
                        class="text-high-emphasis"
                        style="border-left-width: 4px"
                    >
                        <!-- Show this template if pallet is tagged as loose on this shipment only -->
                        <div class="d-flex justify-space-between align-center" v-if="item.is_loose === true && item.shipment_number === shipmentData.shipment?.shipment">
                            <div>
                                <div class="d-flex align-center">
                                    <strong>{{ item.name }}</strong><br />
                                    <v-badge class="ml-3" color="primary-light" content="Loose"
                                    inline></v-badge>
                                </div>
                                {{ item.loose_original_quantity - item.loose_quantity }} bags 
                                <span v-if="item.mfg_date">
                                    (Manufactured Date: {{ Moment(item.mfg_date).format('MMM D, YYYY') }})<br />
                                </span>
                                Remaining Quantity: {{ item.current_quantity }} bags
                            </div>
                            <div v-if="item.is_loose">
                                <span class="text-error">Tagged as Loose</span>
                            </div>
                        </div>
                        <div v-else class="d-flex justify-space-between align-center">
                            <div>
                                <strong>{{ item.name }}</strong><br />
                                {{ item.current_quantity }} bags
                                <span v-if="item.mfg_date">
                                    (Manufactured Date: {{ Moment(item.mfg_date).format('MMM D, YYYY') }})
                                </span>
                                <div class="text-caption text-medium-emphasis">
                                    Loaded Date: {{ Moment(item.loaded_date).format('MMM D, YYYY - h:mm A') }}
                                </div>
                            </div>
                            <!-- Toggle Loose Input -->
                            <div class="mt-2" v-if="getTotalReadQuantity(delivery) > delivery.quantity_all">
                                
                                <v-row dense align="center">
                                    <!-- Tag as Loose / Cancel button -->
                                    <v-col :cols="!item.loose_pallet ? 12 : 5" >
                                        <v-btn
                                            :color="item.loose_pallet ? 'warning' : 'primary'"
                                            variant="outlined"
                                            @click="toggleLoose(delivery, item)"
                                        >
                                            {{ item.loose_pallet ? 'Cancel Loose Tag' : 'Tag as Loose' }}
                                        </v-btn>
                                    </v-col>

                                    <!-- Input Field (shown only if loose_pallet is true) -->
                                    <template v-if="item.loose_pallet">
                                    <v-col cols="4">
                                        <v-text-field
                                            label="Remaining"
                                            v-model.number="item.loose_quantity"
                                            type="number"
                                            min="1"
                                            :max="item.current_quantity"
                                            density="compact"
                                            hide-details
                                            variant="outlined"
                                            class="ma-0"
                                        />
                                    </v-col>

                                    <!-- Confirm Button -->
                                    <v-col cols="3">
                                        <v-btn
                                        color="success"
                                        block
                                        @click="saveLoose(item)"
                                        >
                                        Confirm
                                        </v-btn>
                                    </v-col>
                                    </template>
                                </v-row>
                            </div>
                        </div>
                    </v-alert>
                </transition-group>
            </div>
            
            
            
            </v-card>
        </template>
        </v-card>

        <!-- Mismatched pallets area  -->
        <v-card class="my-4 mx-2 px-4 py-3 elevation-2" rounded="lg">
            <v-card-title class="text-h6 font-weight-bold mb-2 text-error">
                Mismatched Pallets <br/>
                <span class="text-caption text-medium-emphasis">
                    Pallets read but not on the list of picklist batches. Please confirm if you want to accept or reject.
                </span>
            </v-card-title>
            <v-card-text>
                <transition-group
                    name="fade"
                    tag="div"
                    class="d-flex flex-column gap-2"
                >
                    <v-alert v-if="shipmentData.shipment?.mismatched_pallets?.length > 0" v-for="(item, index) in shipmentData.shipment?.mismatched_pallets" :key="item.id"
                        color="error"
                        variant="outlined"
                        density="comfortable"
                        border="start"
                    >
                        <div class="d-flex justify-space-between align-center">
                            <div>
                                <strong>{{ item.rfid?.name }}</strong><br />
                                {{ item.batch }}
                                <div class="text-caption text-medium-emphasis">
                                    {{ item.quantity }} bags
                                    <span v-if="item.mfg_date">
                                        (Manufactured Date: {{ Moment(item.mfg_date).format('MMM D, YYYY') }})
                                    </span>
                                </div>
                            </div>
                        
                            <div class="mt-2 d-flex gap-2">
                                <!-- <v-btn icon color="success" @click="handleMismatchedAction(item, 'accept')" size="small">
                                    <v-icon>ri-check-line</v-icon>
                                </v-btn> -->
                                <v-btn icon color="error" @click="handleMismatchedAction(item, 'reject')" size="small">
                                    <v-icon>ri-close-line</v-icon>
                                </v-btn>
                            </div>
                        </div>
                    </v-alert>

                    <v-alert
                        v-else
                        color="warning"
                        variant="outlined"
                        density="comfortable"
                        border="start"
                        class="text-medium-emphasis"
                        style="border-left-width: 4px"
                    >
                        <div class="d-flex justify-space-between align-center">
                        <div>
                            <strong>No mismatched pallets read</strong><br />
                        </div>
                        </div>
                    </v-alert>
                </transition-group>
            </v-card-text>
        </v-card>
    </v-container>
    <Loader :show="pageLoading" />
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />

</template>

<style scoped>

</style>
