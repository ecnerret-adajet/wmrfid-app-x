<script setup>
import Loader from '@/components/Loader.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import Moment from 'moment';
import Swal from 'sweetalert2';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const stoBatchPickingStore = useStoBatchPickingStore();

const item = ref(null);
const pageLoading = ref(false);
const selectedBatchCodes = ref([]);
const cancelConfirmationModal = ref(false);
const cancelReserveLoading = ref(false);

const batchHeaders = [
    { title: '', key: 'select', sortable: false },
    { title: 'Batch Code', key: 'BATCH', sortable: false },
    { title: 'Mfg. Date', key: 'MANUF_DATE', sortable: false },
    { title: 'Expiry Date', key: 'SLED_STR', sortable: false },
    { title: 'Available Qty', key: 'BAG', sortable: false, align: 'end' },
];

const goBack = () => {
     router.push({ name: 'goods-issuance' });
};

const hasTransactions = computed(() => (item.value?.sto_transactions?.length ?? 0) > 0);

const hasOpenQuantity = computed(() => {
    const open = parseFloat(String(stoBatchPickingStore.selectedPoItem?.open_quantity ?? 0).replace(/,/g, ''));
    return Number.isFinite(open) && open > 0;
});

// Allow picking more pallets until the open quantity is fully allocated
const canSelectBatches = computed(() => !hasTransactions.value || hasOpenQuantity.value);

const fetchData = async () => {
    pageLoading.value = true;
    try {
        const openQuantityParams = {
            po_number: item.value.po_number,
            po_item: item.value.po_item,
            po_quantity: stoBatchPickingStore.selectedPoItem?.qty ?? item.value.qty,
            plant_code: stoBatchPickingStore.selectedPoItem?.supplying_plant ?? item.value.supplying_plant,
            sloc: stoBatchPickingStore.selectedPoItem?.issuing_sloc_sto ?? item.value.issuing_sloc_sto
        };

        await stoBatchPickingStore.fetchAvailableCommodities({
            ...openQuantityParams,
            material_code: stoBatchPickingStore.selectedPoItem?.material_code ?? item.value.material_code
        });
    } catch (error) {
        console.error('Failed to fetch picking data:', error);
    } finally {
        pageLoading.value = false;
    }
};

onMounted(() => {
    const selected = stoBatchPickingStore.selectedPoItem;
    const matches = selected
        && String(selected.po_number) === String(route.params.po_number)
        && String(selected.po_item) === String(route.params.po_item);

    // The item is only held in the store, so a refresh sends the user back to the list.
    if (!matches) {
        router.replace({ name: 'goods-issuance' });
        return;
    }

    item.value = selected;

    // Pre-select batches that were already picked
    selectedBatchCodes.value = [...new Set(
        (selected.sto_transactions || []).flatMap(t => t.batch || []).map(b => b.batch)
    )];
    fetchData();
});

const toggleBatch = (batch) => {
    const index = selectedBatchCodes.value.indexOf(batch.BATCH);
    if (index === -1) {
        selectedBatchCodes.value.push(batch.BATCH);
    } else {
        selectedBatchCodes.value.splice(index, 1);
    }
};

const formatDate = (date) => date ? Moment(date).format('MMMM D, YYYY') : '';

const handleConfirm = () => {
    const selectedBatches = stoBatchPickingStore.availableStocks.filter((batch) => selectedBatchCodes.value.includes(batch.BATCH));
    stoBatchPickingStore.setOriginalBatchList(selectedBatches);
    router.push({
        name: 'sto-warehouse-map',
        params: { po_number: item.value.po_number, po_item: item.value.po_item }
    });
};

const cancelReserve = async () => {
    cancelReserveLoading.value = true;
    try {
        await ApiService.post('transfer-orders/transfer-order-remove', {
            po_number: item.value?.po_number,
            po_item: item.value?.po_item,
            transport_number: item.value?.transport?.transport_number
        });

        cancelConfirmationModal.value = false;
        await Swal.fire({
            icon: 'success',
            title: 'Batch Reservation Cancelled Successfully',
            text: 'The batch reservation has been cancelled.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        router.push({ name: 'goods-issuance' });
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error Cancelling Reservation',
            text: error.response?.data?.message || 'Failed to cancel reservation',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        cancelReserveLoading.value = false;
    }
};
</script>

<template>
    <div class="pa-4">
        <v-card v-if="item" class="d-flex flex-column" min-height="620px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Batch Picking</span>
                <v-btn color="secondary" variant="outlined" @click="goBack">Back</v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <div class="pa-4 bg-grey-50">
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div>PO Number</div>
                        <div class="font-weight-bold">{{ item?.po_number }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>PO Item</div>
                        <div class="font-weight-bold">{{ item?.po_item }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Material Code</div>
                        <div class="font-weight-bold">{{ item?.material_code || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Material Desc</div>
                        <div class="font-weight-bold">{{ item?.material_description || '-' }}</div>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div>Issuing Plant</div>
                        <div class="font-weight-bold">{{ item?.supplying_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item?.supplying_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Issuing SLOC</div>
                        <div class="font-weight-bold">{{ item?.issuing_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item?.issuing_storage_location?.name }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Receiving Plant</div>
                        <div class="font-weight-bold">{{ item?.receiving_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item?.receiving_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Receiving SLOC</div>
                        <div class="font-weight-bold">{{ item?.receiving_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item?.receiving_storage_location?.name }}</div>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-primary font-weight-medium">PO Item Qty</span>
                            <span class="text-h6 text-primary font-weight-bold">
                                {{ numberWithComma(item?.qty ?? 0) }} {{ item?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Open Qty</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore.selectedPoItem?.open_quantity ?? 0) }} {{ item?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                 <v-row dense>
                    <v-col cols="12" md="12">
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Estimated Pallet Count</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(item?.estimated_pallet_count  ?? 0) }} pallet(s)
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
            </div>

            <v-divider></v-divider>

            <v-card-text v-if="hasTransactions" class="pt-4 text-center">
                <v-icon :color="hasOpenQuantity ? 'warning' : 'primary'" size="64" class="mb-2"
                    :icon="hasOpenQuantity ? 'ri-information-line' : 'ri-checkbox-circle-line'"></v-icon>

                <div class="text-h4 font-weight-bold mb-4" :class="hasOpenQuantity ? 'text-warning' : 'text-primary'">
                    {{ hasOpenQuantity ? 'Batch Picked Partially' : 'Batch Picked Completed' }}
                </div>
                <div v-if="hasOpenQuantity" class="mb-4">
                    Open quantity is not yet fully allocated. Select batches below to add more pallets.
                </div>
                <div class="mb-2">Picked Batches:</div>
                <div class="d-flex flex-wrap justify-center gap-2">
                    <v-chip
                        v-for="batchObj in [...new Map(item.sto_transactions.flatMap(t => t.batch || []).map(b => [b.batch, b])).values()]"
                        :key="batchObj.batch"
                        color="primary"
                        variant="outlined"
                        density="comfortable"
                        class="ma-1"
                    >
                        {{ batchObj.batch }}
                    </v-chip>
                </div>
            </v-card-text>

            <v-card-text v-if="canSelectBatches" class="flex-grow-1 pt-4">
                <div class="d-flex justify-space-between align-center mb-4">
                    <span class="text-subtitle-1 font-weight-bold">Select Batch</span>
                </div>

                <v-data-table
                    :headers="batchHeaders"
                    :items="stoBatchPickingStore.availableStocks"
                    :loading="pageLoading"
                    item-value="BATCH"
                    class="elevation-1 border rounded"
                    density="compact"
                    hide-default-footer
                >
                    <template #item.select="{ item }">
                        <v-checkbox
                            :model-value="selectedBatchCodes.includes(item.BATCH)"
                            @update:model-value="toggleBatch(item)"
                            hide-details
                            density="compact"
                        ></v-checkbox>
                    </template>
                    <template #item.MANUF_DATE="{ item }">
                        {{ formatDate(item.MANUF_DATE) }}
                    </template>
                    <template #item.BAG="{ item }">
                        {{ numberWithComma(item.BAG) }} {{ item.BASE_UOM }}
                    </template>
                </v-data-table>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4 justify-end">
                <v-btn variant="text" @click="goBack">Close</v-btn>
                <v-btn
                    v-if="hasTransactions"
                    color="error"
                    type="button"
                    variant="elevated"
                    @click="cancelConfirmationModal = true"
                >
                    Cancel Reservation
                </v-btn>
                <v-btn
                    v-if="canSelectBatches"
                    color="success"
                    variant="elevated"
                    :disabled="selectedBatchCodes.length === 0"
                    @click="handleConfirm"
                >
                    {{ hasTransactions ? 'Add More Pallets' : 'Confirm Selection' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </div>

    <v-dialog v-model="cancelConfirmationModal" min-width="400px" max-width="600px">
        <v-card class="pa-6 rounded-lg" color="surface">
            <div class="text-center">
                <v-icon class="mb-4" color="error" icon="ri-close-circle-line" size="80"></v-icon>

                <h3 class="text-h5 font-weight-bold mb-2">Cancel Batch Reservation?</h3>
                <p class="text-body-2 text-medium-emphasis mb-5">
                    Are you sure you want to cancel this batch assignment? This action cannot be undone.
                </p>

                <v-card variant="flat" color="grey-lighten-4" class="pa-4 text-left rounded-md mb-6">
                    <v-row dense>
                        <v-col cols="5" class="font-weight-bold">PO Number:</v-col>
                        <v-col cols="7">{{ item?.po_number || 'N/A' }}</v-col>

                        <v-col cols="5" class="font-weight-bold">PO Item:</v-col>
                        <v-col cols="7">{{ item?.po_item || 'N/A' }}</v-col>

                        <v-col cols="12">
                            <v-divider class="my-2" color="grey-darken-2"></v-divider>
                        </v-col>

                        <v-col cols="5" class="font-weight-bold text-body-2 text-primary">
                            Reserved Batches:
                        </v-col>
                        <v-col cols="7" class="text-body-2 d-flex flex-wrap gap-1">
                            <template v-if="item?.sto_transactions?.length > 0">
                                <v-chip
                                    v-for="batchObj in [...new Map(item.sto_transactions.flatMap(t => t.batch || []).map(b => [b.batch, b])).values()]"
                                    :key="batchObj.batch"
                                    color="primary"
                                    variant="outlined"
                                    density="comfortable"
                                    class="ma-1"
                                >
                                    {{ batchObj.batch }}
                                </v-chip>
                            </template>
                            <span v-else style="color: #ffd166;">N/A</span>
                        </v-col>
                    </v-row>
                </v-card>

                <div class="d-flex justify-end align-center mt-4">
                    <v-btn color="secondary" variant="outlined" @click="cancelConfirmationModal = false" class="px-6 mr-3">
                        Cancel
                    </v-btn>
                    <v-btn color="error" @click="cancelReserve" :loading="cancelReserveLoading" class="px-6">
                        Yes, Proceed
                    </v-btn>
                </div>
            </div>
        </v-card>
    </v-dialog>

    <Loader :show="cancelReserveLoading" />
</template>
