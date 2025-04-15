<script setup>
import gateIcon from "@images/pick_list_icons/icons8-airport-gate.png";
import loadEndIcon from "@images/pick_list_icons/icons8-calendar-minus.png";
import loadStartIcon from "@images/pick_list_icons/icons8-calendar-plus.png";
import haulerIcon from "@images/pick_list_icons/icons8-company.png";
import plateNumberIcon from "@images/pick_list_icons/icons8-licence-plate.png";
import driverIcon from "@images/pick_list_icons/icons8-name-tag.png";
import rfidIcon from "@images/pick_list_icons/icons8-rfid-50.png";
import shipmentIcon from "@images/pick_list_icons/icons8-truck.png";
import axios from "axios";
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const shipment = ref(null);
const pageLoading = ref(false);
const shipmentNumber = route.params.shipmentNumber;
const errorMessage = ref(null);
const deliveryItems = ref([])

// UNUSED 

const refreshData = () => {
    console.log('Reshreshing...');
}

onMounted(() => {
    fetchData();  
})

const fetchData = async () => {
    pageLoading.value = true;
    try {
        const response = await axios.get(`shipment/${shipmentNumber}/picklist`);
        shipment.value = response.data
    
        // Fetch all deliveries and included delivery items inside deliveryItems array
        if (shipment.value?.deliveries?.length) {
            shipment.value.deliveries.forEach(delivery => {
                if (delivery.items?.length) {
                    delivery.items.forEach(item => {
                        deliveryItems.value.push(item);
                    });
            }
            });
        }
        console.log(shipment.value);
        console.log(deliveryItems.value);

    } catch (error) {
        errorMessage.value = error.response?.data?.error || 'An unexpected error occurred.';
    } finally {
        pageLoading.value = false
    }
};


const responseToast = ref(false)
const toastTimeout = ref(2000)

const toast = ref({
    message: 'Inventory refreshed',
    color: 'success',
    show: false
});

const displayPlateNumber = computed(() => {
  return shipment.value?.plate_number_1 || 
         shipment.value?.plate_number_2 || 
         shipment.value?.plate_number_3 || 
         ""; // Default value if none exist
});

const formatDateTime = (date, time) => {
    if (!date || !time || date === '00000000' || time === '000000') return '';
    return Moment(`${date} ${time}`, 'YYYYMMDD HHmmss').format('MMMM D, YYYY hh:mm:ss A');
};

const determineSapQuantity = (quantity, default_pallet_capacity) => {
    if (default_pallet_capacity != 0) {
        return Math.ceil(quantity / default_pallet_capacity);
    } else {
        return Math.ceil(quantity / 40);
    }
}
  
</script>
<template>
    <div class="mt-4 px-8 whiteBackground">
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
                                        <span class="font-weight-bold">{{ shipment?.shipment_number }}</span>
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
                                        <span class="font-weight-bold">{{ formatDateTime(shipment?.loadstart_date, shipment?.loadstart_time) }}</span>

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
                                        <span class="font-weight-bold">{{ shipment?.driver_name }}</span>
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
                                        <span class="font-weight-bold">{{ formatDateTime(shipment?.loadend_date, shipment?.loadend_time) }}</span>
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
                                        <div class="font-weight-bold">{{ shipment?.hauler_name }}</div>
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
                        Bay No. {{ shipment?.bay_no || 0 }}
                    </div>
                    <div>
                        <h2 class="text-h4 font-weight-black mt-8" style="font-size: 5rem !important; color: #fff;">0</h2>
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
        <div class="mt-4">
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
                    <VRow no-gutters style="border: 1px solid #329b62;">
                        <VCol md="3" class="px-3 py-2 text-center rightBorderedGreen">
                            <div class="text-center">
                                <div class="text-overline mb-1 font-weight-bold" style="font-size: 14px !important;">
                                    Vitamin; Riboflavin; URC
                                </div>
                                <div>
                                    <span style="color: #00A36C;" class="text-uppercase text-h5 font-weight-black">
                                        MSSJP03C
                                    </span>
                                    <br>
                                    <p style="margin-bottom: 0px !important;" class="font-weight-bold">560 Bag</p>
                                </div>
                            </div>
                        </VCol>
                        <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen" style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                            <span class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">0</span>
                        </VCol>
                        <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen" style="border-right: 1px solid #fff;">
                            <span class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">0</span>
                        </VCol>
                        <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen">
                            <span class="font-weight-black" style="font-size: 3rem; color: #3e3b3b !important;">0</span>
                        </VCol>
                    </VRow>
                    
                </div>
            </div>
       </div>
    </div>
    <VSnackbar
        color="secondary"
        v-model="responseToast"
        location="top"
        :timeout="toastTimeout"
        >
        Loading Success!
    </VSnackbar>
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
