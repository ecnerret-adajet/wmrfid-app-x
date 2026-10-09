<script setup>
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import moment from 'moment';
import Swal from 'sweetalert2';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WarehouseMap from './warehouseMap.vue';

const route = useRoute();
const router = useRouter();
const stoBatchPickingStore = useStoBatchPickingStore();

const po_number = route.params.po_number;
const po_item = route.params.po_item;

const selectedBatches = computed(() => stoBatchPickingStore.batchList);

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

function redirectPage() {
    router.push({ name: 'sto-batch-selection', params: { po_number: po_number, po_item: po_item } });
}

const viewReservedPallets = ref(false)
function viewReserved() {
    viewReservedPallets.value = true;
}

const selectedBatch = ref(null);
function batchSelected(batch) {
    selectedBatch.value = batch;
    if (batch === null) {
        stoBatchPickingStore.setBatches(stoBatchPickingStore.originalBatchList);
        return;
    }
    stoBatchPickingStore.setBatches([batch]);
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
    // Sort by ascending mfg_date
    parentSelectedPallets.value = [...pallets].sort((a, b) => new Date(a.mfg_date) - new Date(b.mfg_date));
};

const computedBatchList = computed(() => {
    return stoBatchPickingStore.originalBatchList.map(batch => {
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

const distributedPallets = computed(() => {
    // open_quantity is in KG and may be a formatted string (e.g. "10,000")
    const openKg = parseFloat(String(stoBatchPickingStore.selectedPoItem?.open_quantity ?? 0).replace(/,/g, ''));
    let remainingKg = Number.isFinite(openKg) ? openKg : 0;
    return parentSelectedPallets.value.map(item => {
        // take_quantity stays in bags; its kg equivalent must not exceed the remaining open quantity
        const maxBags = Number(item.quantity) || 0;
        const kgPerBag = bagsToKg(1);
        const take = Math.max(0, Math.min(maxBags, Math.floor(remainingKg / kgPerBag)));
        remainingKg -= bagsToKg(take);
        return {
            ...item,
            take_quantity: take
        };
    });
});

const openQuantity = computed(() => {
    const open = parseFloat(String(stoBatchPickingStore.selectedPoItem?.open_quantity ?? 0).replace(/,/g, ''));
    return Number.isFinite(open) ? open : 0;
});

const totalAllocated = computed(() =>
    distributedPallets.value.reduce((sum, item) => sum + bagsToKg(item.take_quantity), 0)
);

// A pallet may still be added while there is room left, even if that pallet overshoots the open quantity
const canAddPallet = computed(() => openQuantity.value - totalAllocated.value >= bagsToKg(1));

const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const removeSelectedPallet = (item, index) => {
    if (toast.value.show) {
        toast.value.show = false
    }
    if (item && item.physical_id !== undefined) {
        parentSelectedPallets.value.splice(index, 1)

        toast.value.message = `PHYSICAL ID ${item.physical_id} has been removed from the selected pallets.`;
        toast.value.color = 'warning';
        toast.value.show = true;
    }
}

const submitProposalLoading = ref(false);
const proceedReserve = async () => {
    const pallets = distributedPallets.value.filter(item => item.take_quantity > 0);

    if (pallets.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'No Pallets Selected',
            text: 'No pallets selected to reserve.',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
        return;
    }

    const poItemData = stoBatchPickingStore.selectedPoItem;

    const formData = new FormData();
    formData.append('po_number', poItemData?.po_number ?? po_number);
    formData.append('po_item', poItemData?.po_item ?? po_item);
    formData.append('material_name', poItemData?.material_description ?? '');
    formData.append('material_code', removeLeadingZeros(poItemData?.material_code));
    formData.append('qty', poItemData?.qty ?? 0);
    formData.append('numerator', poItemData?.material?.numerator ?? 1);
    formData.append('denominator', poItemData?.material?.denominator ?? 1);
    formData.append('plant', poItemData?.supplying_plant ?? '');
    formData.append('sloc', poItemData?.issuing_sloc_sto ?? '');
    formData.append('sap_server', poItemData?.sap_server ?? '');
    formData.append('pallets', JSON.stringify(pallets));

    submitProposalLoading.value = true;
    try {
        const { data } = await ApiService.post('transfer-orders/transfer-order-proposed', formData);
        // Stop loading before the alert so the progress dialog doesn't stay open behind it
        submitProposalLoading.value = false;

        if (data && data.success === false) {
            throw { response: { data: { message: data.errors?.[0] || data.message } } };
        }

        await Swal.fire({
            icon: 'success',
            title: 'Reserved Successfully',
            text: 'STO batch reservation saved successfully.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
         router.push({ name: 'goods-issuance' });
        //         router.push({ name: 'sto-batch-selection', params: { po_number: po_number, po_item: po_item } });
    } catch (error) {
        console.error('Failed to reserve pallets:', error);

        const errorMessage = error.response?.data?.errors?.[0]
            || error.response?.data?.message
            || 'Failed to reserve selected pallets.';

        Swal.fire({
            icon: 'error',
            title: 'Error Saving',
            text: errorMessage,
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        submitProposalLoading.value = false;
    }
}

const bagsToKg = (bagsCount) => {
    let uom = stoBatchPickingStore?.selectedPoItem?.uom?.toLowerCase() || '';
    let numerator = stoBatchPickingStore?.selectedPoItem?.material?.numerator || 25;
    let denominator = stoBatchPickingStore?.selectedPoItem?.material?.denominator || 1;
    const isKg = uom === 'kg';

    let converted_weight;
    if (isKg) {
        // If UOM is KG: Convert assigned bags into KG to match item.qty
        const bagWeightMultiplier = denominator > 0 ? (numerator / denominator) : numerator;
        converted_weight = bagsCount * bagWeightMultiplier;
    } else {
        // If UOM is BAG: Keep it as bags to match item.qty directly
        converted_weight = bagsCount;
    }
    
    return converted_weight;
};

</script>

<template>
    <div>
        <v-card elevation="2" class="mx-auto">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Pallet Selection
                </div>
                <div>
                    <v-btn @click="redirectPage" class="mr-2" color="secondary" variant="outlined">Back to Batch
                        Selection</v-btn>
                    <v-btn :loading="submitProposalLoading" @click="proceedReserve" color="primary">Proceed
                        Reserve</v-btn>
                </div>
            </v-card-title>
            <v-card-text>

            <v-divider></v-divider>
         
            <div class="pa-4 bg-grey-50">
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div>PO Number</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.po_number }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>PO Item</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.po_item }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Material Code</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.material_code || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Material Desc</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.material_description || '-' }}</div>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div>Issuing Plant</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.supplying_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.supplying_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Issuing SLOC</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.issuing_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.issuing_storage_location?.name }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Receiving Plant</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.receiving_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.receiving_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Receiving SLOC</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.receiving_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore?.selectedPoItem?.receiving_storage_location?.name }}</div>
                    </v-col>
                </v-row>

                <v-row dense class="mt-4">
                     <v-col cols="6" md="3">
                        <div>PO Number</div>
                        <v-chip @click="batchSelected(null)" color="primary" class="ml-1 cursor-pointer"
                            v-if="computedBatchList.length > 0" :key="'all'"
                            :variant="selectedBatch === null ? 'elevated' : 'outlined'" label>
                            All Batches
                        </v-chip>
                        <v-chip @click="batchSelected(batch)" color="primary"
                            class="ml-1 cursor-pointer" v-if="computedBatchList.length > 0"
                            :variant="selectedBatch && selectedBatch.BATCH === batch.BATCH ? 'elevated' : 'outlined'"
                            v-for="(batch, index) in computedBatchList" :key="index" label>
                            {{ batch.BATCH }}
                        </v-chip>
                    </v-col>
                </v-row>

                <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-primary font-weight-medium">PO Item Qty</span>
                            <span class="text-h6 text-primary font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore?.selectedPoItem?.qty ?? 0) }} {{ stoBatchPickingStore?.selectedPoItem?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Open Qty</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore?.selectedPoItem?.open_quantity ?? 0) }} {{ stoBatchPickingStore?.selectedPoItem?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                 <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Estimated Pallet Count</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore?.selectedPoItem?.estimated_pallet_count  ?? 0) }} pallet(s)
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                
            </div>

            <v-divider></v-divider>
                
                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Selected Pallets
                </div>
                <v-table density="compact" striped="even" fixed-header class="border mx-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Current Quantity</th>
                            <th class="text-center">Take Quantity</th>
                            <th class="text-center">Allocated Quantity</th>
                            <th class="text-end"></th>
                        </tr>
                    </thead>
                    <tbody v-if="distributedPallets.length > 0">
                        <tr v-for="(item, index) in distributedPallets">
                            <td>{{ item.physical_id }}</td>
                            <td>{{ item.batch }}</td>
                            <td>{{ item.mfg_date ? moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</td>
                            <td class="text-center">{{ item.quantity }} bag(s)</td>
                            <td class="text-center">{{ item.take_quantity }} bag(s)</td>
                            <td class="text-center">{{ bagsToKg(item.take_quantity) }} {{ stoBatchPickingStore?.selectedPoItem?.uom }}</td>
                            <td class="text-end">
                                <i @click="removeSelectedPallet(item, index)"
                                    class="ri-close-large-line text-error cursor-pointer"></i>
                            </td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td colspan="5" class="text-end">Total Allocated Quantity</td>
                            <td class="text-center">{{ numberWithComma(totalAllocated) }} {{ stoBatchPickingStore?.selectedPoItem?.uom }}</td>
                            <td></td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr style="height: 200px;">
                            <td colspan="7" class="text-center align-middle text-h4 text-grey-500">
                                No selected pallets yet --
                            </td>
                        </tr>
                    </tbody>

                </v-table>

                <div class="text-h4 font-weight-bold ps-2 ml-2 mt-3 text-primary">
                    Warehouse Map
                </div>
                <div class="d-flex align-center my-4">
                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #28a745">
                    </div>
                    Available

                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #ffc107">
                    </div>
                    All Reserved

                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #2196f3">
                    </div>
                    Selected Bin(s)
                </div>
                <div class="mt-3 mx-4">
                    <WarehouseMap 
                        v-if="selectedBatches.length"
                        :plantCode="stoBatchPickingStore.selectedPoItem?.supplying_plant"
                        :selected-batches="selectedBatches" :selectedPallets="parentSelectedPallets"
                                                :canAddPallet="canAddPallet"
                                                :openQuantity="openQuantity"
                                                :uom="stoBatchPickingStore.selectedPoItem?.uom"                        :storageLocation="stoBatchPickingStore.selectedPoItem?.issuing_sloc_sto"
                        @update:selectedPallets="handleSelectedPalletsUpdate" />
                </div>
            </v-card-text>
        </v-card>
    </div>

    <!-- <v-dialog v-model="viewReservedPallets" max-width="1000px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false"></v-btn>
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
                    <tbody v-if="stoBatchPickingStore.stoDetails?.reserved_pallets?.length > 0">
                        <tr v-for="(item, index) in stoBatchPickingStore.stoDetails?.reserved_pallets">
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.commodity_batch_code }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">{{ item.total_qty }}</td>
                            <td class="text-center">{{ calculateAge(item.manufacturing_date) }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="7">No Reserved Pallets</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                </div>
            </v-card-text>


        </v-card>
    </v-dialog> -->

    <v-dialog v-model="submitProposalLoading" max-width="700px" persistent>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-center align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary text-center">
                    Batch Picking In Progress
                </div>
            </v-card-title>
            <v-card-text>
                <!-- Circular progress centered -->
                <div class="d-flex justify-center my-6">
                    <v-progress-circular indeterminate color="primary" size="64" width="6" />
                </div>
                <div class="px-4 mt-4 mx-2 text-h5">
                    Please wait while we process your request. Do not close this window.
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
