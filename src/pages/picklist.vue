<script setup>
import rfid_icon from "@images/logos/rfid_icon.png";
import Moment from 'moment';

</script>
<template>
    <div class="mt-8 px-8" >
        <VRow >
            <VCol md="8">
                <VList lines="one" border density="compact">
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            color="green-darken-2"
                                            icon="ri-truck-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Shipment</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span>00000012345</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-calendar-2-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Gate in</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                       <span> {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-calendar-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Shipment Date</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span> {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-tools-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">TS Platform</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span class="text-truncate">Coming Soon</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-truck-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Plate number</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span class="text-truncate">CAG 4869</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-calendar-check-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Load Start</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span>{{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-user-2-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Driver Name</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span class="text-truncate">Juan Dela Cruz</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-calendar-close-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Load End</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <span>{{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <v-icon
                                            icon="ri-building-4-line"
                                            size="large"
                                        >
                                        </v-icon>
                                        <h5 class="text-uppercase ml-3">Hauler Name</h5>
                                    </VCol>
                                    <VCol md="6" class="d-inline-flex align-center">
                                        <div>Hauler Group Sample Name Incorporated</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <VDivider />
            </VCol>
            <VCol md="4">
                <v-sheet class="mx-auto px-6 py-4" elevation="2" style="height: 100%">
                    <div>
                        <h2>Bay No. 2</h2>
                    </div>
                    <div class="d-flex justify-between align-center">
                        <div class="d-flex-row">
                            <h2 class="text-h4 font-weight-black text-primary mt-8 mr-auto" style="font-size: 5rem !important;">0</h2>
                            <div class="text-h5 font-weight-medium mt-5">
                                Total Pallets(2)
                            </div>
                        </div>
                         <div class="ml-auto">
                            <img :src="rfid_icon" :width="72" :height="72" alt="RFID Icon" >
                         </div>
                    </div>
                    <v-divider class="mt-8"></v-divider>
                </v-sheet>
            </VCol>
        </VRow>
        <VRow no-gutters class="mt-4">
            <VCol md="3">
                <v-card class="mx-auto" elevation="2" rounded="0">
                    <v-card-title class="bg-primary" style="padding-left: 0 !important; padding-right: 0 !important;">
                        <div class="text-h5 text-white text-bold-emphasis text-uppercase text-center">
                            Shipment Details
                        </div>
                    </v-card-title>
                    <v-card-item class="mt-2">
                        <div class="text-center">
                            <div class="text-overline mb-1">
                                Vitamin; Riboflavin; URC
                            </div>
                            <div class="text-h5 mb-1">
                                MSSJP03C
                            </div>
                            <div class="text-uppercase">560 Bag</div>
                        </div>
                    </v-card-item>
                </v-card>
            </VCol>
            <VCol md="3">
                <v-card class="mx-auto" elevation="2" rounded="0">
                    <v-card-title class="bg-primary" style="padding-left: 0 !important; padding-right: 0 !important;">
                        <div class="text-h5 text-white text-bold-emphasis text-uppercase text-center">
                            Expected (SAP)
                        </div>
                    </v-card-title>
                    <v-card-item class="mt-2 d-flex justify-center align-center">
                        <div class="text-bold-emphasis" style="font-size: 3rem !important;">0</div>
                    </v-card-item>
                </v-card>
            </VCol>
            <VCol md="3">
                <v-card class="mx-auto" elevation="2" rounded="0">
                    <v-card-title class="bg-primary" style="padding-left: 0 !important; padding-right: 0 !important;">
                        <div class="text-h5 text-white text-bold-emphasis text-uppercase text-center">
                            Expected (WMRFID)
                        </div>
                    </v-card-title>
                    <v-card-item class="mt-2 d-flex justify-center align-center">
                        <div class="text-bold-emphasis" style="font-size: 3rem !important;">0</div>
                    </v-card-item>
                </v-card>
            </VCol>
            <VCol md="3">
                <v-card class="mx-auto" elevation="2" rounded="0">
                    <v-card-title class="bg-primary" style="padding-left: 0 !important; padding-right: 0 !important;">
                        <div class="text-h5 text-white text-bold-emphasis text-uppercase text-center">
                            Read (RFID Pallets) 
                        </div>
                    </v-card-title>
                    <v-card-item class="mt-2 d-flex justify-center align-center">
                        <div class="text-bold-emphasis" style="font-size: 3rem !important;">0</div>
                    </v-card-item>
                </v-card>
            </VCol>
        </VRow>
       
    </div>
</template>

<style scoped>
.v-card-item__content {
    padding-top: 0 !important;
}

.v-card-item {
    padding-top: 0 !important;
    padding-bottom: 15px !important;
}

</style>
