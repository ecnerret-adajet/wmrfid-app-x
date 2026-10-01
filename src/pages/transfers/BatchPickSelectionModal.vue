<script setup>
import { numberWithComma } from '@/composables/useHelpers';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import Moment from 'moment';
import { onMounted, ref, watch } from 'vue';
const stoBatchPickingStore = useStoBatchPickingStore();

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'save', 'cancel-reservation']);

const dialogVisible = ref(props.show);
const pageLoading = ref(false);
const selectedBatchCodes = ref([]);

const batchHeaders = [
    { title: '', key: 'select', sortable: false },
    { title: 'Batch Code', key: 'BATCH', sortable: false },
    { title: 'Mfg. Date', key: 'MANUF_DATE', sortable: false },
    { title: 'Expiry Date', key: 'SLED_STR', sortable: false },
    { title: 'Available Qty', key: 'BAG', sortable: false, align: 'end' },
];

const fetchData = async () => {
    if (!props.item?.purchase_order_item?.po_number || !props.item?.purchase_order_item?.po_item) return;
    pageLoading.value = true;
    try {
        const openQuantityParams = {
            po_number: props.item.purchase_order_item?.po_number,
            po_item: props.item.purchase_order_item?.po_item,
            po_quantity: stoBatchPickingStore.stoDetails?.qty ?? props.item.purchase_order_item?.qty,
            plant_code: stoBatchPickingStore.stoDetails?.supplying_plant ?? props.item.purchase_order_item?.supplying_plant,
            sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto ?? props.item.purchase_order_item?.issuing_sloc_sto
        };

        // Open quantity value
        await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

        const availableParams = {
            ...openQuantityParams,
            material_code: stoBatchPickingStore.stoDetails?.material_code ?? props.item?.purchase_order_item?.material_code
        };

        // Batch selection
        await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
    } catch (error) {
        console.error('Failed to fetch picking data:', error);
    } finally {
        pageLoading.value = false;
    }
};

onMounted(() => {
    if (props.show) fetchData();
});

watch(() => props.show, (val) => {
    dialogVisible.value = val;
    if (val) {
        selectedBatchCodes.value = [];
        fetchData();
    }
});

watch(dialogVisible, (val) => {
    if (!val) emit('close');
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
    emit('save', {
        transport: props.item?.transport,
        batches: selectedBatches,
        is_alc_managed: true
    });
};

const cancelReservation = () => {
    emit('cancel-reservation', {
        item: props.item,
    });
};

const handleClose = () => {
    dialogVisible.value = false;
};
</script>

<template>
    <v-dialog v-model="dialogVisible" max-width="1300px" scrollable>
        <v-card class="d-flex flex-column" min-height="620px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Batch Picking</span>
                <v-btn icon="ri-close-line" variant="text" @click="handleClose"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <div v-if="item" class="pa-4 bg-grey-50">
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div >PO Number</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.po_number }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>PO Item</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.po_item }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Material Code</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.material_code || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Material Desc</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.material_description || '-' }}</div>
                    </v-col>
                </v-row>
                 <v-row dense>
                    <v-col cols="6" md="3">
                        <div>Issuing Plant</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.supplying_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.supplying_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Issuing SLOC</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.issuing_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.issuing_storage_location?.name }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Receiving Plant</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.receiving_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.receiving_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Receiving SLOC</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.receiving_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item.purchase_order_item?.receiving_storage_location?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Transport Number</div>
                        <div class="font-weight-bold">{{ item.transport?.transport_number || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Plate Number</div>
                        <div class="font-weight-bold">{{ item.transport?.vehicle?.plate_number || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Driver Name</div>
                        <div class="font-weight-bold">{{ item.transport?.driver?.full_name || '-' }}</div>
                    </v-col>
                    <!-- <v-col cols="6" md="3">
                        <div>Hauler</div>
                        <div class="font-weight-bold">{{ item.transport?.plate_number || '-' }}</div>
                    </v-col> -->
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <!-- Transparent background with a thin primary-colored border -->
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-primary font-weight-medium">PO Item Qty</span>
                            <span class="text-h6 text-primary font-weight-bold">
                                {{ numberWithComma(item.purchase_order_item?.qty ?? 0) }} {{ item.purchase_order_item?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <!-- Transparent background with a thin primary-colored border -->
                        <v-skeleton-loader v-if="pageLoading" type="list-item"></v-skeleton-loader>
                        <v-sheet v-else border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Open Qty</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore.stoDetails?.open_quantity ?? 0) }} {{ item.purchase_order_item?.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
            </div>

            <v-divider></v-divider>

            <v-card-text v-if="item?.sto_transactions && item.sto_transactions.length > 0" class="flex-grow-1 overflow-y-auto pt-4 text-center">
                <v-icon color="primary" size="64" class="mb-2" icon="ri-checkbox-circle-line"></v-icon>
       
                <div class="text-h4 font-weight-bold text-primary mb-4">Batch Picked Completed</div>
                
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

            <v-card-text v-else class="flex-grow-1 overflow-y-auto pt-4">

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
                <v-btn variant="text" @click="handleClose">Close</v-btn>
                <v-btn
                    v-if="item?.sto_transactions && item.sto_transactions.length > 0"
                    color="error"
                    type="button"
                    variant="elevated"
                    @click="cancelReservation"
                >
                    Cancel Reservation
                </v-btn>
                <v-btn v-else
                    color="success"
                    variant="elevated"
                    :loading="loading"
                    :disabled="selectedBatchCodes.length === 0"
                    @click="handleConfirm"
                >
                    Confirm Selection
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
