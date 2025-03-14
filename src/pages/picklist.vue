<script setup>
import gateIcon from "@images/pick_list_icons/icons8-airport-gate.png";
import loadEndIcon from "@images/pick_list_icons/icons8-calendar-minus.png";
import loadStartIcon from "@images/pick_list_icons/icons8-calendar-plus.png";
import calendarIcon from "@images/pick_list_icons/icons8-calendar.png";
import haulerIcon from "@images/pick_list_icons/icons8-company.png";
import plateNumberIcon from "@images/pick_list_icons/icons8-licence-plate.png";
import driverIcon from "@images/pick_list_icons/icons8-name-tag.png";
import rfidIcon from "@images/pick_list_icons/icons8-rfid-50.png";
import platformIcon from "@images/pick_list_icons/icons8-setting.png";
import statusIcon from "@images/pick_list_icons/icons8-status-50.png";
import shipmentIcon from "@images/pick_list_icons/icons8-truck.png";
import Moment from 'moment';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';


const refreshData = () => {
    console.log('Reshreshing...');
}

const value = ref(10)
const bufferValue = ref(20)
const interval = ref(0)
const responseToast = ref(false)
const toastTimeout = ref(2000)

watch(value, val => {
    if (val >= 100) {
        value.value = 100; // Ensure it caps at 100%
        bufferValue.value = 100; // Set buffer to 100% as well
        clearInterval(interval.value); // Stop the interval once it reaches 100%
        console.log('Progress Complete');
        responseToast.value = true;
    }
})

  onMounted(() => {
    startBuffer()
  })
  onBeforeUnmount(() => {
    clearInterval(interval.value)
  })

function startBuffer () {
    clearInterval(interval.value)
    interval.value = setInterval(() => {
      value.value += Math.random() * (15 - 5) + 10
      bufferValue.value += Math.random() * (15 - 5) + 8
    }, 2000)
}

const toast = ref({
    message: 'Inventory refreshed',
    color: 'success',
    show: false
});
  
</script>
<template>
    
    <div class="mt-4 px-8 whiteBackground">
        <v-progress-linear
            v-model="value"
            :buffer-value="bufferValue"
            color="primary"
            height="25"
            class="my-4 progress-with-icon"
        >
            <template v-slot:default="{ value }">
                <v-icon v-if="value > 0 && value < 100"
                    class="ri-truck-line ml-4 icon-moving"
                    color="primary"
                    :style="{ left: value + '%' }"
                    size="30"
                >
                </v-icon>
                <strong :class="value <= 50 ? 'text-primary' : 'text-white'">{{ Math.ceil(value) }}%</strong>
            </template>
        </v-progress-linear>
        <VRow >
            <VCol md="8" >
                <VList lines="one" density="compact" style="border: 2px solid #00833c; padding-top: 0px !important;">
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
                                        <span class="font-weight-bold">00000012345</span>
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
                                       <span class="font-weight-bold"> {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}</span>
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
                                        <v-img :src="calendarIcon" class="icon-class"/>
                                        <span class="text-h6 text-uppercase ml-3 font-weight-black " style="margin-top: 1px;">Shipment Date</span>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span class="font-weight-bold"> {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-img :src="platformIcon" class="icon-class"/>
                                        <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">TS Platform</span>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span class="font-weight-bold">Coming Soon</span>
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
                                        <span class="font-weight-bold">CAG 4869</span>
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
                                        <span class="font-weight-bold">{{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}</span>
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
                                        <span class="font-weight-bold">Juan Dela Cruz</span>
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
                                        <span class="font-weight-bold">{{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}</span>
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
                                        <div class="font-weight-bold">Hauler Group Sample Name Incorporated</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-img :src="statusIcon" class="icon-class"/> 
                                        <span class="text-h6 text-uppercase ml-3 font-weight-black" style="margin-top: 1px;">status</span>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-chip class="bg-primary text-on-primary">
                                            <span class="px-4 font-weight-bold">1</span>
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <VDivider />
            </VCol>
            <VCol md="4">
                <v-sheet class="mx-auto px-6 py-4 bg-primary" elevation="2" style="height: 100%; display: flex; flex-direction: column; ">
                    <div class="text-h4 text-white text-bold-emphasis font-weight-black">
                        Bay No. 2
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
                    <VCol md="3" style="font-size: 18px;" class="text-uppercase bg-primary px-3 py-2 text-center font-weight-black">
                        Shipment Details
                    </VCol>
                    <VCol md="3"  class="text-uppercase bg-primary px-3 py-2 text-center font-weight-black" style="font-size: 18px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                        Expected (SAP)
                    </VCol>
                    <VCol md="3"  class="text-uppercase bg-primary px-3 py-2 text-center font-weight-black" style="font-size: 18px; border-right: 1px solid #fff;">
                        Expected (WMRFID)
                    </VCol>
                    <VCol md="3" style="font-size: 18px;" class="text-uppercase bg-primary px-3 py-2 text-center font-weight-black">
                        Read (RFID PALLETS)
                    </VCol>
                </VRow>
                <div class="table-wrapper" style="height: 550px;">

                    <!-- Loop Row  -->
                    <VRow no-gutters style="border: 1px solid #00833c;">
                        <VCol md="3" class="px-3 py-2 text-center rightBorderedGreen">
                            <div class="text-center">
                                <div class="text-overline mb-1 font-weight-bold" style="font-size: 14px !important;">
                                    Vitamin; Riboflavin; URC
                                </div>
                                <div>
                                    <span :style="{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' }" class="text-uppercase text-h5 text-primary font-weight-black">
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
