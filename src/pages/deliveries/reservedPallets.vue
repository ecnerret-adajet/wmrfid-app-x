<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    deliveryData: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['close']);

const handleClose = () => {
    emit('close');
};

onMounted(() => {
    console.log(props.deliveryData);
})

const activeTab = ref('available_stocks');

// Sample data for Available Stocks
const availableStocks = ref([
    {
        batch_code: 'WGRCJD25',
        mfg_date: '2025-04-25',
        expiration_date: '2025-06-24',
        age: '3 DAY(S)',
        avail_qty: '2,280 BAG',
        avail_pallets: '55 PALLET',
        split_qty: '600 BAG(S)',
        min_pallet: '15 PALLET',
        min_qty: '600 BAG',
        selected: true
    }
]);

// Sample data for Other Stocks
const otherStocks = ref([
    {
        batch_code: 'WGRCJD26',
        mfg_date: '2025-04-26',
        expiration_date: '2025-06-25',
        age: '2 DAY(S)',
        avail_qty: '3,720 BAG',
        avail_pallets: '87 PALLET',
        split_qty: '0 BAG(S)',
        min_pallet: '0 PALLET',
        min_qty: '3480 BAG',
        selected: false
    }
]);
</script>

<template>
    <v-dialog v-model="dialogVisible" :max-width="maxWidth" :min-height="minHeight" :fullscreen="fullscreen">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <div class="text-h5 text-bold-emphasis ps-2">
                {{ dialogTitle }}
            </div>
            <v-btn
                icon="ri-close-line"
                variant="text"
                @click="emit('close')"
            ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
            <slot></slot>
        </v-card-text>
      </v-card>
    </v-dialog>


    <!-- <DefaultModal 
        :dialog-title="`${deliveryData?.delivery_document} - Reserved Pallets`" 
        :show="show" 
        @close="handleClose" 
        min-height="auto"
        class="position-absolute d-flex align-center justify-center" 
        :fullscreen="true"
    >
        <v-card>
            <div class="d-flex justify-space-between align-center px-4 mt-4">
                <h4 class="text-h4 mx-4 font-weight-black text-primary">Delivery Details</h4>
            </div>
            <v-card-title>
                <VList lines="one"  density="compact" class="mt-4">
                    <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                        <VRow  class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ deliveryData?.delivery_document  }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Delivery Item No.</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">
                                            {{ deliveryData?.delivery_reserved_order?.delivery_item_number }}
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">BU Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ deliveryData?.bu_delivery }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Material</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">
                                            {{ deliveryData?.delivery_reserved_order?.material_code }}
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Party</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ deliveryData?.ship_to_name }}</span>
                                        <div class="text-subtitle-1">{{ deliveryData?.ship_to_customer }}</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Material Description</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">
                                            {{ deliveryData?.delivery_reserved_order?.material_description }}
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Ship-to-Address</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ deliveryData?.ship_to_address }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Plant & Storage Location</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis">{{ deliveryData?.plant?.name }}</span>
                                        <div class="text-subtitle-1">{{ deliveryData?.storage_location?.name }}</div>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">
                                            Delivery Date
                                        </span>
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
                                            {{ deliveryData?.required_qty || '600' }}
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
                                        <span class="text-medium-emphasis">{{ deliveryData?.age || '--' }}</span>
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
                                            {{ deliveryData?.open_qty || '600' }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                   
         
                </VList>
            </v-card-title>
            <v-divider class="my-4"></v-divider>

            <v-card-text>
                <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs" hide-slider>
                    <v-tab value="available_stocks" class="text-h5">
                        Available Stocks
                    </v-tab>
                    <v-tab value="other_stocks" class="text-h5">
                        Other Stocks
                    </v-tab>
                </v-tabs>

                <v-tabs-window v-model="activeTab" class="mt-4">
                    <v-tabs-window-item value="available_stocks">
                        <v-table density="compact" class="stock-table elevation-0">
                            <thead>
                                <tr>
                                    <th>Batch Code</th>
                                    <th>Mfg Date</th>
                                    <th>Expiration Date</th>
                                    <th>Age</th>
                                    <th>Avail. Qty</th>
                                    <th>Avail Pallets</th>
                                    <th>Split Qty</th>
                                    <th>Min. Pallet</th>
                                    <th>Min. Qty</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in availableStocks" :key="index" :class="{ 'selected-row': item.selected }">
                                    <td>{{ item.batch_code }}</td>
                                    <td>{{ item.mfg_date }}</td>
                                    <td>{{ item.expiration_date }}</td>
                                    <td>{{ item.age }}</td>
                                    <td>{{ item.avail_qty }}</td>
                                    <td>{{ item.avail_pallets }}</td>
                                    <td>{{ item.split_qty }}</td>
                                    <td>{{ item.min_pallet }}</td>
                                    <td>{{ item.min_qty }}</td>
                                    <td>
                                        <v-checkbox v-model="item.selected" hide-details density="compact"></v-checkbox>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-tabs-window-item>

                    <v-tabs-window-item value="other_stocks">
                        <v-table density="compact" class="stock-table elevation-0">
                            <thead>
                                <tr>
                                    <th>Batch Code</th>
                                    <th>Mfg Date</th>
                                    <th>Expiration Date</th>
                                    <th>Age</th>
                                    <th>Avail. Qty</th>
                                    <th>Avail Pallets</th>
                                    <th>Split Qty</th>
                                    <th>Min. Pallet</th>
                                    <th>Min. Qty</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in otherStocks" :key="index" :class="{ 'selected-row': item.selected }">
                                    <td>{{ item.batch_code }}</td>
                                    <td>{{ item.mfg_date }}</td>
                                    <td>{{ item.expiration_date }}</td>
                                    <td>{{ item.age }}</td>
                                    <td>{{ item.avail_qty }}</td>
                                    <td>{{ item.avail_pallets }}</td>
                                    <td>{{ item.split_qty }}</td>
                                    <td>{{ item.min_pallet }}</td>
                                    <td>{{ item.min_qty }}</td>
                                    <td>
                                        <v-checkbox v-model="item.selected" hide-details density="compact"></v-checkbox>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-tabs-window-item>
                </v-tabs-window>

                <div class="d-flex justify-end mt-4 pa-4">
                    <v-btn variant="outlined" color="grey" class="mr-2" @click="handleClose">Back To Delivery Items</v-btn>
                    <v-btn color="success" elevation="0">Reserve Available Pallets</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </DefaultModal> -->
</template>

<style scoped>
.custom-tabs {
  border-bottom: none !important;
  box-shadow: none !important; /* if there's a shadow */
}
.delivery-details {
    margin-bottom: 8px;
}

.detail-item {
    padding: 2px 10px;
    border-radius: 4px;
}

.detail-label {
    font-weight: 600;
    color: #546e7a;
    min-width: 150px;
    flex-shrink: 0;
}

.detail-value {
    color: #263238;
    flex-grow: 1;
}

.tabs-section {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-slide-group__container {
    padding: 0 16px;
}

.v-slide-group__content {
    display: flex;
}

.v-tab {
    min-width: 150px;
    border-bottom: 2px solid transparent;
    margin-right: 8px;
    text-transform: capitalize;
    font-weight: 500;
    letter-spacing: 0.5px;
    font-size: 14px;
}

.v-tab--selected {
    border-bottom: 2px solid #4CAF50;
    font-weight: 600;
}

.text-primary {
    color: #4CAF50 !important;
}

.stock-table {
    /* border: 1px solid #e0e0e0; */
    /* border-radius: 4px; */
    overflow: hidden;
}

.stock-table th {
    background-color: #f5f5f5;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    height: 40px;
}

.selected-row {
    background-color: #e8f5e9;
}
</style>
