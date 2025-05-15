<script setup>
import { numberWithComma } from '@/composables/useHelpers';

const props = defineProps({
    transferOrderData: Object
})

const purchaseOrderItem = computed(() =>
    props.transferOrderData?.purchase_order_items?.[0] ?? null
)

const totalTransportQuantity = computed(() => {
    if (purchaseOrderItem.value) {
        return 0 // TODO:: Add implementation
    }
    return 0
})

// TODO:: Update calculation 
const palletCalculation = (uom) => {
    if(uom === "KG") {
        return numberWithComma(Math.ceil((props.transferOrderData?.transport_load?.qty / 25) / 40));
    }
    if(uom === "BAG") {
        return numberWithComma(Math.ceil(props.transferOrderData?.transport_load?.qty / 40));
    }
    return "N/A";
}

</script>

<template>
    <VList lines="one" density="compact">
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-start">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ purchaseOrderItem?.material_code ?? '-' }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ purchaseOrderItem?.material_description ?? '-'}}</div>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Purchase Order No.</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">
                               {{ transferOrderData.purchase_order?.po_number }}
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
                        <VCol cols="4" class="d-inline-flex align-start">
                            <span class="text-h6 font-weight-bold text-high-emphasis">Supplying Plant</span>
                        </VCol>
                         <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ purchaseOrderItem?.supplying_order_plant?.plant_code }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ purchaseOrderItem?.supplying_order_plant?.name }}</div>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis" >Purchase Order Item</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="font-weight-medium text-medium-emphasis">{{ purchaseOrderItem?.po_item }}</span>
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>
        </VListItem>
        <VListItem style="padding-top: 0px; padding-bottom: 0px;">
            <VRow class="table-row" no-gutters>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-start">
                            <span class="text-h6 font-weight-bold text-high-emphasis ">Issuing Storage Location</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ purchaseOrderItem?.issuing_storage_location?.code }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ purchaseOrderItem?.issuing_storage_location?.name }}</div>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-start">
                            <span class="text-h6 font-weight-bold text-high-emphasis ">Receiving Plant</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ purchaseOrderItem?.issuing_order_plant?.plant_code }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ purchaseOrderItem?.issuing_order_plant?.name }}</div>
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
                            <span class="text-h6 font-weight-bold text-high-emphasis">PO Item Quantity</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ purchaseOrderItem?.qty ? numberWithComma(purchaseOrderItem?.qty) : 0}}</span>
                            <span>&nbsp;{{ purchaseOrderItem?.uom }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                    <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-start">
                            <span class="text-h6 font-weight-bold text-high-emphasis ">Receiving Storage Location</span>
                        </VCol>
                        <VCol class="d-flex flex-column">
                            <span class="text-medium-emphasis font-weight-medium">{{ purchaseOrderItem?.receiving_storage_location?.code }}</span>
                            <div class="text-subtitle-1 font-weight-thin">{{ purchaseOrderItem?.receiving_storage_location?.name }}</div>
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
                            <span class="text-h6 font-weight-bold text-high-emphasis">Transport Entry Quantity</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ transferOrderData?.transport_load?.qty ? numberWithComma(transferOrderData?.transport_load?.qty) : 0}}</span>
                            <span>&nbsp;{{ purchaseOrderItem?.uom }}</span>
                        </VCol>
                    </VRow>
                </VCol>
                <VCol md="6" class="table-cell d-inline-flex">
                     <VRow class="table-row">
                        <VCol cols="4" class="d-inline-flex align-center">
                            <span class="text-h6 font-weight-bold text-high-emphasis text-primary">Open Quantity</span>
                        </VCol>
                        <VCol v-if="transferOrderData?.open_quantity" class="d-inline-flex align-center">
                             <span class="text-medium-emphasis">{{ transferOrderData?.open_quantity ? numberWithComma(transferOrderData?.open_quantity) : 0}}</span>
                             <span>&nbsp;{{ purchaseOrderItem?.uom }}</span>
                        </VCol>
                        <VCol v-else class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">{{ purchaseOrderItem?.qty ? numberWithComma(purchaseOrderItem?.qty) : 0}}</span>
                            <span>&nbsp;{{ purchaseOrderItem?.uom }}</span>
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
                            <span class="text-h6 font-weight-bold text-high-emphasis">Minimum Pallet(s)</span>
                        </VCol>
                        <VCol class="d-inline-flex align-center">
                            <span class="text-medium-emphasis">
                                {{ palletCalculation(purchaseOrderItem?.uom)  }}
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
