<script setup>
import Moment from 'moment';

const props = defineProps({
    deliveryData: Object
})

</script>

<template>
    <VList lines="one" density="compact">
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">{{ deliveryData.delivery_document }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Shipment Number</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">
                                {{ deliveryData.shipment_number || null }}
                            </span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >BU Delivery</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">{{ deliveryData.bu_delivery || null }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Shipping Point</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">N/A</span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Party</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ deliveryData?.ship_to_name }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ deliveryData?.ship_to_customer }}</div>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <!-- <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Route</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">
                                {{ deliveryData?.route || null }}
                            </span>
                        </VCol>
                    </VRow> -->
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis ">Truckscale #</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">123</span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Address</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ deliveryData?.ship_to_address }}</span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
        <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Delivery Date</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">
                                {{ deliveryData?.delivery_date ? Moment(deliveryData?.delivery_date).format('MMMM D, YYYY') : '' }}
                            </span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    
                </VCol>
            </VRow>
        </VListItem>
    </VList>
</template>
