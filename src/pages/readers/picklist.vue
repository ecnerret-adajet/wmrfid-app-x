<script setup>
import ApiService from "@/services/ApiService";
import gateIcon from "@images/pick_list_icons/icons8-airport-gate.png";
import loadEndIcon from "@images/pick_list_icons/icons8-calendar-minus.png";
import loadStartIcon from "@images/pick_list_icons/icons8-calendar-plus.png";
import haulerIcon from "@images/pick_list_icons/icons8-company.png";
import plateNumberIcon from "@images/pick_list_icons/icons8-licence-plate.png";
import driverIcon from "@images/pick_list_icons/icons8-name-tag.png";
import rfidIcon from "@images/pick_list_icons/icons8-rfid-50.png";
import shipmentIcon from "@images/pick_list_icons/icons8-truck.png";
import Moment from 'moment';
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const readerId = route.params.reader;
const bay = route.params.bay;
const loading = ref(false);
const shipment = ref(null);
const noAccessLog = ref(false);
const dialogVisible = ref(false);
const errorMessage = ref(null);

// initialize null shipment data
const shipmentData = reactive({
    deliveries: [],
    shipment: {}
})

onMounted(() => {
    fetchData();  
})

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await ApiService.post(`loading-tapping/${readerId}/${bay}`);
        shipment.value = response.data

        if (response.data.shipment_number == 'NO SHIPMENT') {
            errorMessage.value = 'No shipment detected. Please tap again';
            dialogVisible.value = true
        } else {
            if (shipment.value?.shipment_number && shipment.value?.shipment_number !== "") {
                await fetchShipmentDetails(shipment.value.shipment_number);
            }  
            dialogVisible.value = false
        }
    } catch (error) {
        dialogVisible.value = true
        errorMessage.value = error.response?.data?.error || 'An unexpected error occurred.';
    } finally {
        loading.value = false
    }
};

const fetchShipmentDetails = async (shipmentNumber) => {
    try {
        const response = await ApiService.get(`picklist/shipment-picklist/${shipmentNumber}`);

        // If success
        if (response.data.result == 'S') {
            shipmentData.deliveries = response.data.picklists;
            shipmentData.shipment = response.data;
        } else {
            dialogVisible.value = true;
            errorMessage.value = 'Error encountered. Please contact admin.'
        }
    } catch (error) {
        console.error('Error fetching shipment details:', error);
    }
    
};

const refreshData = () => {
    
}

const close = () => {
    dialogVisible.value = false
}

const displayPlateNumber = computed(() => {
  return shipmentData.shipment?.plate_number_1 || 
         shipmentData.shipment?.plate_number_2 || 
         shipmentData.shipment?.plate_number_3 || 
         ""; // Default value if none exist
});

const formatDateTime = (date, time) => {
    if (!date || !time || date === '00000000' || time === '000000') return '';
    return Moment(`${date} ${time}`, 'YYYYMMDD HHmmss').format('MMMM D, YYYY hh:mm:ss A');
};

const determineSapQuantity = (quantity) => {
    return Math.ceil(quantity / 40);
}

const toast = ref({
    message: 'Inventory refreshed',
    color: 'success',
    show: false
});
  
</script>
<template>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mt-2"></v-progress-linear>

    <div v-else class="mt-4 px-8 whiteBackground">
        <div>
            <VRow >
                <VCol md="8" >
                    <VList lines="one" density="compact" style="border: 2px solid #329b62; padding-top: 0px !important;">
                        <VListItem class="d-flex justify-end" style="padding-top: 0px !important; padding-bottom: 0px !important;">
                            <VTooltip location="top">
                                <template #activator="{ props }">
                                    <VIcon class="mt-2 clickable-icon"
                                        v-bind="props"
                                        size="35"
                                        color="primary"
                                        icon="ri-refresh-fill"
                                        @click="refreshData"
                                    />
                                </template>
                                <span>Refresh Data</span>
                            </VTooltip>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="shipmentIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black " style="margin-top: 1px;">Shipment</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ shipmentData.shipment?.shipment }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="gateIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black " style="margin-top: 1px;">Gate in</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                        <!-- <span class="font-weight-bold"> {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}</span> -->
                                        </VCol>
                                    </VRow>
                                
                                </VCol>
                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="plateNumberIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">Plate Number</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ displayPlateNumber }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="loadStartIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">Load Start</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ formatDateTime(shipmentData.shipment.loadstart_date, shipmentData.shipment.loadstart_time) }}</span>
                                        </VCol>
                                    </VRow>
                                
                                </VCol>
                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="driverIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">Driver Name</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{shipmentData.shipment?.driver_name}}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="loadEndIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">Load End</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ formatDateTime(shipmentData.shipment.loadend_date, shipmentData.shipment.loadend_time) }}</span>
                                        </VCol>
                                    </VRow> 
                                </VCol>

                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="haulerIcon" class="icon-class"/>
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">Hauler Name</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <div class="font-weight-bold">{{shipmentData.shipment?.hauler_name}}</div>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                
                                </VCol>
                            </VRow>
                        </VListItem>
                    </VList>
                    <VDivider />
                </VCol>
                <VCol md="4">
                    <v-sheet class="mx-auto px-6 py-4" elevation="2" style="height: 100%; display: flex; flex-direction: column; background-color: #00A36C;">
                        <div class="text-h4 text-white text-bold-emphasis font-weight-black">
                            Bay No. {{ bay }}
                        </div>
                        <div>
                            <h2 class="text-h4 font-weight-black mt-8" style="font-size: 5rem !important; color: #fff;">{{ shipmentData.shipment?.total_pallet_to_load }}</h2>
                        </div>
                        <div class="d-flex justify-between align-center mt-auto">
                            <div class="text-h4 text-white font-weight-bold">
                                Total Pallets
                            </div>
                            <div class="ml-auto">
                                <img :src="rfidIcon" :width="72" :height="72" alt="RFID Icon" >
                            </div>
                        </div>
                    </v-sheet>
                </VCol>
            </VRow>
            <div v-if="noAccessLog" >
                <div style="min-height: 200px;" class="d-flex justify-center align-center">
                    <h1>No access log found!</h1>
                </div>
            </div>
            <div v-else class="mt-4">
                <div>
                    <VRow no-gutters >
                        <VCol md="3" style="font-size: 18px; background-color: #00A36C;" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                            Shipment Details
                        </VCol>
                        <VCol md="3"  class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100" style="background-color: #00A36C; font-size: 18px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                            Expected (SAP)
                        </VCol>
                        <VCol md="3"  class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100" style="background-color: #00A36C; font-size: 18px; border-right: 1px solid #fff;">
                            Expected (WMRFID)
                        </VCol>
                        <VCol md="3" style="font-size: 18px; background-color: #00A36C;" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                            Read (RFID PALLETS)
                        </VCol>
                    </VRow>
                    <div class="table-wrapper" style="height: 550px;">

                        <!-- Loop Row  -->
                        <template v-for="(delivery, index) in shipmentData.deliveries" v-if="shipmentData.deliveries.length > 0">
                            <VRow no-gutters style="border: 1px solid #329b62;">
                                <VCol md="3" class="px-3 py-2 text-center rightBorderedGreen">
                                    <div class="text-center">
                                        <div class="text-overline mb-1 font-weight-bold" style="font-size: 14px !important;">
                                            {{ delivery.material_desc }}
                                        </div>
                                        <div>
                                            <span style="color: #00A36C;" class="text-uppercase text-h5 font-weight-black">
                                                {{ delivery.material }} - Line {{ delivery.item }}
                                            </span>
                                            <br>
                                            <p style="margin-bottom: 0px !important;" class="font-weight-bold">{{ delivery.quantity }} {{ delivery.sales_unit }}</p>
                                        </div>
                                    </div>
                                </VCol>
                                <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen" style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                                    <span class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">
                                        {{ delivery.quantity_all ? determineSapQuantity(delivery.quantity_all) : determineSapQuantity(delivery.quantity)  }}
                                    </span>
                                </VCol>
                                <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen" style="border-right: 1px solid #fff;">
                                    <div class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">
                                        <span v-if="delivery.quantity_all !== null || !delivery.quantity_all">
                                            <span v-if="delivery.quantity > 0 && delivery.inventory.length > 0">
                                                {{ delivery.inventory.length }}
                                            </span>
                                            <span v-else class="text-error text-h4 font-weight-black">
                                                NO STOCK
                                            </span>
                                        </span>
                                        <span v-else class="display-3">
                                            {{ determineSapQuantity(delivery.quantity_all) }}
                                        </span>
                                    </div>
                                </VCol>
                                <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen">
                                    <span class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">
                                        {{ delivery.expected }}
                                    </span>
                                </VCol>
                            </VRow>
                        </template>
                        <template v-else>
                            <div>
                                No delivery found
                            </div>
                        </template>
                        
                    </div>
                </div>
        </div>
        </div>
    </div>

    <v-dialog v-model="dialogVisible" max-width="600px" persistent>
        <v-sheet
            class="pa-4 text-center mx-auto"
            elevation="12"
            max-width="600"
            rounded="lg"
            width="100%"
        >
            <v-icon
            class="mb-5"
            color="error"
            icon="ri-error-warning-line"
            size="112"
            ></v-icon>

            <h2 class="text-h3 mb-6">Error</h2>

            <p class="mb-4 text-medium-emphasis text-h4">
                {{ errorMessage }}
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
            <v-btn
                class="text-none"
                color="success"
                variant="flat"
                width="90"
                @click="close"
            >
                Okay
            </v-btn>
            </div>
        </v-sheet>
    </v-dialog>
</template>

<style scoped>

.progress-with-icon {
  position: relative;
}

.icon-moving {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  transition: left 0.3s ease-in-out; /* Smooth transition for the icon movement */
}

.v-progress-linear__bar {
  position: relative;
  height: 10px; /* Progress bar height */
}

.table-wrapper {
    overflow-x: hidden; /* Enable horizontal scroll */
    overflow-y: auto; 
    -webkit-overflow-scrolling: touch; /* Smooth scrolling for iOS devices */
}

.rightBorderedGreen{
    border-right: 1px solid rgba(0, 131, 60, 0.5) !important;
}
.whiteBackground{
    background-color: white !important;
}
.v-card-item__content {
    padding-top: 0 !important;
}

.v-card-item {
    padding-top: 0 !important;
    padding-bottom: 15px !important;
}

.v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > td, .v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > th {
    border-bottom: 1px solid rgba(0, 131, 60, 0.5) !important;
}

.icon-class {
    max-width: 30px !important;
    max-height: 30px !important;
}

.clickable-icon {
  cursor: pointer;
  transition: color 0.3s ease !important; /* Smooth transition for color change */
}

.clickable-icon:hover {
  color: #006830 !important; /* Change color on hover (replace with your desired color) */
}

.v-table--density-default {
    --v-table-header-height: 36px;
}
</style>
