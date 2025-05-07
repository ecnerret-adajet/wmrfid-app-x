<script setup>
import Moment from 'moment';

const props = defineProps({
    deliveryData: Object,
    selectedDeliveryItem: Object
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
                            <span class="font-weight-medium text-medium-emphasis">{{ deliveryData.bu_delivery }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Delivery Item No.</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">
                                {{ selectedDeliveryItem.item_number }}
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
                            <span class="font-weight-medium text-medium-emphasis">{{ deliveryData.delivery_document || null }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Material Code</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">
                                {{  selectedDeliveryItem.material ? parseInt(selectedDeliveryItem.material) : null }}
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
                            <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Party</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ deliveryData?.ship_to_name }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ deliveryData?.ship_to_customer }}</div>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow  class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">{{ selectedDeliveryItem.material_desc }}</span>
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
                            <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Address</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ deliveryData?.ship_to_address }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis ">Plant & Storage Location</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis">{{ selectedDeliveryItem?.plant?.plant_code }} - {{ selectedDeliveryItem?.plant?.name }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ selectedDeliveryItem?.storage_location?.code }} - {{ selectedDeliveryItem?.storage_location?.name }}</div>
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
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Required Quantity</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">
                                {{ selectedDeliveryItem?.quantity }}
                            </span>
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
                            <span class="text-h6 font-weight-bold text-high-emphasis">Age</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ deliveryData?.age?.from }} - {{ deliveryData?.age?.to }} Days</span>
                            
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Open Quantity</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">
                                {{ deliveryData?.open_quantity || 0 }}
                                {{ selectedDeliveryItem?.sales_unit }}
                            </span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
    </VList>
</template>
