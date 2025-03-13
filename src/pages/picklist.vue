<script setup>
import Moment from 'moment';

</script>
<template>
    <div class="mt-8 px-8" >
        <VRow>
            <VCol md="8">
                <VList lines="one" border density="compact">
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Shipment</h5>
                                    </VCol>
                                    <VCol md="6">
                                        00000012345
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Gate In</h5>
                                    </VCol>
                                    <VCol md="6">
                                        {{Moment(new Date()).format('MMMM D, YYYY hh:mm A')}}
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Shipment Date</h5>
                                    </VCol>
                                    <VCol md="6">
                                        {{Moment(new Date()).format('MMMM D, YYYY')}}
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">TS Platform</h5>
                                    </VCol>
                                    <VCol md="6">
                                        <p class="text-truncate">Coming Soon</p>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Plate Number</h5>
                                    </VCol>
                                    <VCol md="6">
                                        <p class="text-truncate">CAG 4869</p>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Load start</h5>
                                    </VCol>
                                    <VCol md="6">
                                        {{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Driver Name</h5>
                                    </VCol>
                                    <VCol md="6">
                                        <p class="text-truncate">Juan Dela Cruz</p>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Load End</h5>
                                    </VCol>
                                    <VCol md="6">
                                        {{Moment(new Date()).format('MMMM D, YYYY hh:mm:ss A')}}
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row">
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol md="6">
                                        <h5 class="text-uppercase">Hauler Name</h5>
                                    </VCol>
                                    <VCol md="6">
                                        <p >Hauler Group Sample Name Incorporated</p>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <VDivider />
            </VCol>
            <VCol md="4">
                <v-sheet
                    class="text-center mx-auto"
                    elevation="2"
                    style="height: 100%"
                >
                    <!-- Count  -->
                    <h1 class="font-weight-bolder" style="font-size: 5rem !important;">15</h1>

                    <h2 class="text-h5">Total Pallet(s)</h2>

                    <h2 class="text-h5 mb-6">Bay No. 2</h2>
                    

                    <v-divider class="mb-4"></v-divider>

                </v-sheet>
            </VCol>
        </VRow>
       
    </div>
</template>
