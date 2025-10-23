<script setup>
import { useBatchPickingStore } from '@/stores/batchPickingStore';
import moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WarehouseMap from './warehouseMap.vue';

const route = useRoute();
const router = useRouter();
const batchPickingStore = useBatchPickingStore();

const do_number = route.params.do_number;
const showLostDetails = ref(false);
onMounted(() => {
    if (batchPickingStore.batchList.length === 0) {
        showLostDetails.value = true;
    }
})

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

function redirectPage() {
    router.push({ 
        name: 'batch-picking', 
        params: { do_number: do_number } 
    });
}

const viewReservedPallets = ref(false)
function viewReserved() {
    viewReservedPallets.value = true;
}

function batchSelected(batch) {
    console.log(batch);
}

const calculateAge = (date) => {
    if (!date) return '';
    const now = moment();
    const mfgDate = moment(date);
    const days = now.diff(mfgDate, 'days');
    return days;
};

const parentSelectedPallets = ref([]);
const handleSelectedPalletsUpdate = (pallets) => {
    parentSelectedPallets.value = pallets;
};

const computedBatchList = computed(() => {
    return batchPickingStore.batchList.map(batch => {
        // Count how many pallets from this batch are in parentSelectedPallets
        const countInTable = parentSelectedPallets.value.filter(
            pallet => pallet.batch === batch.BATCH
        ).length;

        // Calculate the remaining quantity
        const remainingQuantity = batch.pallet_quantity - countInTable;

        // Return a new object with the updated quantity
        return {
            ...batch,
            pallet_quantity: remainingQuantity
        };
    });
});

</script>

<template>
    <div class="d-flex align-center justify-center mt-6">
        <v-card elevation="2" class="mx-auto" style="min-width:1000px; max-width:1800px; width:100%;">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Pallet Selection
                </div>
            </v-card-title>
            <v-card-text>
                <VList lines="one" density="compact">
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">ALC Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.do_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >BU Delivery</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.customer_delivery?.delivery_document || null }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 4px; padding-bottom: 0px; margin-top: 5px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex">
                                        <span class="text-h6 font-weight-bold text-high-emphasis " >Ship-to-Party</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_name }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{ batchPickingStore.deliveryDetails?.customer_delivery?.ship_to_customer }}</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{ batchPickingStore.selectedDeliveryItem?.material_description }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{ removeLeadingZeros(batchPickingStore.selectedDeliveryItem?.material_number) }}</div>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.plant_model?.plant_code }} - {{ batchPickingStore.selectedDeliveryItem?.plant_model?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Storage Location</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.storage_location_model?.code }} - {{ batchPickingStore.selectedDeliveryItem?.storage_location_model?.name }}</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Required Quantity </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore.selectedDeliveryItem?.delivery_quantity }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Age</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore?.product_age?.from }} - {{ batchPickingStore?.product_age?.to }} Days</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Open Quantity </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="text-medium-emphasis">{{ batchPickingStore.deliveryDetails?.open_quantity }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Reserved Pallets </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <v-btn density="compact" @click="viewReserved">View Reserved Pallets</v-btn>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem style="padding-top: 0px; padding-bottom: 0px;">
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="2" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Selected Batches </span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <!-- <span class="text-medium-emphasis ml-1"></span> -->
                                        <v-chip @click="batchSelected(batch)" color="primary" class="ml-1 cursor-pointer" 
                                            v-if="computedBatchList.length > 0"
                                            v-for="(batch, index) in computedBatchList"
                                            :key="index" label>
                                            {{ batch.pallet_quantity }}x - {{ batch.BATCH}}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <v-divider class="mx-4"></v-divider>
                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Selected Pallets
                </div>
                <v-table density="compact" striped="even" fixed-header class="border mx-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-sm text-center">Age</th>
                            <th class="text-end"></th>
                        </tr>
                    </thead>
                    <tbody v-if="parentSelectedPallets.length > 0">
                        <tr v-for="(item, index) in parentSelectedPallets">
                            <td>{{ item.physical_id }}</td>
                            <td>{{ item.batch }}</td>
                            <td>{{ item.mfg_date ? moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</td>
                            <td class="text-center">{{ item.quantity }} {{ item.material?.base_unit }}</td>
                            <td class="text-center">{{ calculateAge(item.mfg_date) }} day(s)</td>
                            <td class="text-end">
                                <i @click="parentSelectedPallets.splice(index, 1)" class="ri-close-large-line text-error cursor-pointer"></i>
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr style="height: 200px;">
                            <td colspan="6" class="text-center align-middle text-h4 text-grey-500">
                                No selected pallets yet --
                            </td>
                        </tr>
                    </tbody>
                    
                </v-table>

                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Warehouse Map
                </div>

                <div class="mt-3 mx-4">
                    <WarehouseMap v-if="batchPickingStore.selectedDeliveryItem"
                        :plantCode="batchPickingStore.selectedDeliveryItem?.plant" 
                        :selected-batches="batchPickingStore.batchList"
                        :storageLocation="batchPickingStore.selectedDeliveryItem?.storage_location"
                        @update:selectedPallets="handleSelectedPalletsUpdate"
                    />
                </div>
            </v-card-text>
        </v-card>
    </div>

    <v-dialog v-model="showLostDetails" max-width="700px" persistent>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Ooops. Something went wrong
                </div>
            </v-card-title>
            <v-card-text>
                <div class="px-4 mt-4 mx-2 text-h5">
                    An error occured while fetching the data. You will be redirected to the batch selection page.
                </div>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="primary" @click="redirectPage" type="button">Confirm</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewReservedPallets" max-width="1000px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="viewReservedPallets = false"
                ></v-btn>
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="elevation-0 border mx-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">Age</th>
                        </tr>
                    </thead>
                    <tbody v-if="batchPickingStore.selectedDeliveryItem?.reserved_pallets?.length > 0">
                        <tr v-for="(item, index) in batchPickingStore.selectedDeliveryItem?.reserved_pallets">
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">{{ item.total_qty }}</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr colspan="7">
                            <td>No Reserved Pallets</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="secondary" @click="viewReservedPallets = false" type="button">Close</v-btn>
                </div>
            </v-card-text>

            
        </v-card>
    </v-dialog>

</template>

